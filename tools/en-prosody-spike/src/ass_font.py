"""ASS の [Fonts] に埋め込むフォントを作る(ADR-0035)。

kana-multi.woff2(tools/glyph-check)から、字幕に要る字だけの小さな TTF を切り出し、ファミリー名を KanaMulti に変えて、
ASS の UU エンコード(3 バイト → 4 文字、各文字 = 6 ビット + 33、1 行 80 文字)にする。ファミリー名を変えるのは、
システムの Noto Sans JP と取り違えられないようにするため。libass(mpv・VLC・JASSUB)は読める。
古い VSFilter 系は、環境によって読めない。
"""
from __future__ import annotations

import hashlib
import io
import os
import tempfile
from pathlib import Path

import fontTools
from fontTools import subset
from fontTools.ttLib import TTFont

FAMILY = "KanaMulti"
DEFAULT_WOFF2 = Path(__file__).resolve().parents[2] / "glyph-check" / "public" / "kana-font" / "kana-multi.woff2"
ENV_FONT = "EN_KANA_FONT"

# 字幕に要る字: かな・小書きカナ(U+31F0-31FF)・濁点/半濁点・U+0338・口形の PUA・右肩の字(kana-multi が持つもの)
_RANGES = [(0x3040, 0x30FF), (0x31F0, 0x31FF), (0x3099, 0x309A), (0x0338, 0x0338), (0xE100, 0xE106)]


def font_path() -> Path:
    return Path(os.environ.get(ENV_FONT) or DEFAULT_WOFF2)


def slim_font_ttf(woff2: Path | None = None) -> bytes:
    """サブセットは 1 分ほどかかる(声調の GSUB が大きい)ので、元ファイルの内容のハッシュで一時ディレクトリに保存する。"""
    src = Path(woff2) if woff2 else font_path()
    if not src.exists():
        raise FileNotFoundError(f"フォントがありません: {src}(環境変数 {ENV_FONT} で指定できます)")
    key = hashlib.sha256(src.read_bytes() + Path(__file__).read_bytes() + fontTools.version.encode()).hexdigest()[:16]
    cache_dir = Path(os.environ.get("XDG_CACHE_HOME") or Path.home() / ".cache") / "en-prosody-spike"
    cache = cache_dir / f"{FAMILY}-slim-{key}.ttf"
    if cache.exists():
        return cache.read_bytes()
    data = _slim(src)
    try:   # 共有の場所には書かない。一時ファイルに書いてから置き換える(途中まで書かれたファイルを読ませない)
        cache_dir.mkdir(parents=True, exist_ok=True)
        fd, tmp = tempfile.mkstemp(dir=cache_dir, suffix=".tmp")
        with os.fdopen(fd, "wb") as fh:
            fh.write(data)
        os.replace(tmp, cache)
    except OSError:
        try:
            os.unlink(tmp)
        except (OSError, NameError, UnboundLocalError):
            pass
    return data


def _slim(src: Path) -> bytes:
    f = TTFont(str(src))
    f.flavor = None
    cmap = f.getBestCmap()
    keep = {cp for lo, hi in _RANGES for cp in range(lo, hi + 1) if cp in cmap}
    keep |= {cp for cp in cmap if 0x02B0 <= cp <= 0x02FF or 0x1D00 <= cp <= 0x1DBF or cp in (0x207F, 0x0127, 0x107A5)}
    o = subset.Options()
    o.layout_features = ["ccmp"]
    o.notdef_outline = True
    o.name_IDs = [0, 13, 14]   # OFL 1.1 の著作権表示とライセンス(再配布のコピーに残す)
    o.drop_tables += ["DSIG"]
    s = subset.Subsetter(o)
    s.populate(unicodes=sorted(keep))
    s.subset(f)
    name = f["name"]
    name.names = [n for n in name.names if n.nameID in (0, 13, 14)]
    for nid, val in ((1, FAMILY), (2, "Regular"), (4, FAMILY), (6, FAMILY)):
        name.setName(val, nid, 3, 1, 0x409)
        name.setName(val, nid, 1, 0, 0)
    buf = io.BytesIO()
    f.save(buf)
    return buf.getvalue()


def uuencode(data: bytes) -> str:
    """ASS の埋め込みフォントの符号化(Aegisub・libass と同じ)。"""
    out, line = [], []
    for i in range(0, len(data), 3):
        chunk = data[i:i + 3]
        n = len(chunk)
        b = chunk + b"\0" * (3 - n)
        v = (b[0] << 16) | (b[1] << 8) | b[2]
        chars = [(v >> 18) & 63, (v >> 12) & 63, (v >> 6) & 63, v & 63][: n + 1]
        line.extend(chr(c + 33) for c in chars)
        while len(line) >= 80:
            out.append("".join(line[:80]))
            line = line[80:]
    if line:
        out.append("".join(line))
    return "\n".join(out)


def fonts_section(woff2: Path | None = None) -> str:
    data = slim_font_ttf(woff2)
    return f"[Fonts]\nfontname: {FAMILY}_0.ttf\n{uuencode(data)}\n\n"


def uudecode(text: str) -> bytes:
    """テスト用の逆変換。"""
    bs = bytearray()
    for line in text.splitlines():
        vals = [ord(c) - 33 for c in line]
        for i in range(0, len(vals), 4):
            g = vals[i:i + 4]
            k = len(g)
            g = g + [0] * (4 - k)
            v = (g[0] << 18) | (g[1] << 12) | (g[2] << 6) | g[3]
            bs.extend(bytes([(v >> 16) & 255, (v >> 8) & 255, v & 255])[: k - 1])
    return bytes(bs)
