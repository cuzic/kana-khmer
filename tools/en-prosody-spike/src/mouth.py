"""母音が付く l・r を「無音の口形」で書く(ADR-0035)。右肩の ˡ ʳ の代わりに、口の形のカナを手前に置いて斜線で消す。

  l(ˡ)     ラ行の手前に、同じ母音のナ行(ラˡ → ナラ)。舌先を歯茎に当てる形。
  r(ʳ)     ラ行の手前に ウ(レʳ → ウレ)。唇を丸める形。ただし直前が ウ段 か 子音だけの音(ㇷ゚ ㇰ など)なら、
           ウ は書かない(ㇷ゚ᵇラʳイ → ㇷ゚ᵇライ)。
  対象外   母音が付かない l・r は、右肩の字のまま(語末の ㇽˡ、母音の r 色の ʳ)。

符号化は 2 通り(環境変数 EN_KANA_MOUTH か引数で選ぶ)。どちらも同じ字形になる(フォント kana-multi。ADR-0035):
  pua   私用領域の 1 字(U+E100-E106)。字幕レンダラー(ASS)で確実。文字列として持ち出すとフォントがないと豆腐。
  lig   カナ + U+0338(COMBINING LONG SOLIDUS OVERLAY)。フォントが合字にする。フォントがなければ、斜線(/)つきのカナに縮退する。
  off   何もしない(右肩の ˡ ʳ のまま)。既定。
"""
from __future__ import annotations

import os

from ir import MODS

MODES = ("off", "pua", "lig")
ENV = "EN_KANA_MOUTH"

NA = {"ラ": "ナ", "リ": "ニ", "ル": "ヌ", "レ": "ネ", "ロ": "ノ"}
PUA = {"ナ": "", "ニ": "", "ヌ": "", "ネ": "", "ノ": "", "ㇴ": "", "ウ": ""}
SLASH = "̸"
# 直前がこれなら r の ウ は書かない(ウ段のカナ・子音だけの小書きカナ)
UDAN = set("ウクスツヌフムユルグズブプヴㇰㇲㇳㇷㇺㇽ")
VOICING = {"゙", "゚"}   # 小書きカナに付く濁点・半濁点は、直前の基底カナを変えない


def resolve_mode(opt: str | None = None) -> str:
    """引数 → 環境変数 EN_KANA_MOUTH → off の順で決める。"""
    m = opt or os.environ.get(ENV) or "off"
    if m not in MODES:
        raise ValueError(f"mouth mode must be one of {MODES}, got {m!r}")
    return m


def _shape(ch: str, mode: str) -> str:
    return PUA[ch] if mode == "pua" else ch + SLASH


def silent_mouth(kana: str, mode: str = "pua") -> str:
    if mode == "off":
        return kana
    out: list[str] = []
    prev = ""
    cs = list(kana)
    i = 0
    while i < len(cs):
        c = cs[i]
        n = cs[i + 1] if i + 1 < len(cs) else ""
        if c in NA and n in ("ˡ", "ʳ"):
            if n == "ˡ":
                out.append(_shape(NA[c], mode))
            elif prev not in UDAN:
                out.append(_shape("ウ", mode))
            out.append(c)
            prev = c
            i += 2
            continue
        out.append(c)
        if c not in MODS and c not in VOICING:
            prev = c
        i += 1
    return "".join(out)


MOUTH_PUA = set(PUA.values())


def is_mouth_unit(s: str) -> bool:
    return s in MOUTH_PUA or (len(s) == 2 and s[1] == SLASH)


def _selftest() -> None:
    cases = [  # (入力, モード, 期待)
        ("ラˡイㇳ", "pua", "ライㇳ"), ("ラˡイㇳ", "lig", "ナ̸ライㇳ"), ("ラˡイㇳ", "off", "ラˡイㇳ"),
        ("レʳㇳ゙", "pua", "レㇳ゙"), ("レʳㇳ゙", "lig", "ウ̸レㇳ゙"),
        ("ㇷ゚ᵇラʳイ", "pua", "ㇷ゚ᵇライ"), ("ㇷ゚ʰレˡイ", "pua", "ㇷ゚ʰレイ"),
        ("ワᶟʳㇽˡ", "pua", "ワᶟʳㇽˡ"), ("ヤʳ", "pua", "ヤʳ"), ("リʳᶦリˡー", "pua", "リᶦリー"),
        ("ㇰʰリˡᶦʳ", "pua", "ㇰʰリᶦʳ"),
    ]
    bad = [(k, m, silent_mouth(k, m), want) for k, m, want in cases if silent_mouth(k, m) != want]
    for b in bad:
        print("NG", b)
    from ass_font import uudecode, uuencode
    blob = bytes(range(256)) * 3 + b"xy"
    assert uudecode(uuencode(blob)) == blob, "uuencode roundtrip"
    assert not bad
    print("mouth selftest ok")


if __name__ == "__main__":
    _selftest()
