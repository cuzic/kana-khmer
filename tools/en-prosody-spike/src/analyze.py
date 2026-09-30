"""語のリスト(時刻つき)から、意味のまとまり・強く読む語・核・推定の発音(カナ+右肩IPA)を作る。

規則による推定が基本。音素認識の観測(observe.py)を渡すと、弱形・強形、弾き音・t、口蓋化を音声で決める。
観測が無い語、整列の一致率が低い語(reliable=False)は規則に戻す。どちらも正解データでの検証はしていない(v0)。
"""
from __future__ import annotations

import re
from dataclasses import dataclass, field

from align import Word
from audio import Audio
from kana import is_vowel, phones_to_kana, split_phone
from observe import PALATAL, Obs, observe
from pron import lookup  # noqa: F401  (phonecheck.py が analyze.lookup を使う)

FUNCTION = set("""
a an the this that these those my your his her its our their me him us them i you he she it we they
am is are was were be been being do does did have has had will would shall should can could may might must
to of in on at by for with from into onto about as than and or but nor so if because while though although
not no there here what which who whom whose when where why how some any just then very too also
""".split())

# 弱形(機能語で、まとまりの末尾でないときだけ使う)。ARPABET、ストレス 0
WEAK = {
    "the": "DH AH0", "a": "AH0", "an": "AH0 N", "to": "T AH0", "of": "AH0 V", "and": "AH0 N D",
    "for": "F ER0", "can": "K AH0 N", "you": "Y AH0", "your": "Y ER0", "he": "IY0", "him": "IH0 M",
    "her": "ER0", "them": "DH AH0 M", "was": "W AH0 Z", "were": "W ER0", "at": "AH0 T", "that": "DH AH0 T",
    "have": "AH0 V", "has": "AH0 Z", "had": "AH0 D", "do": "D AH0", "does": "D AH0 Z", "would": "W AH0 D",
    "could": "K AH0 D", "should": "SH AH0 D", "are": "ER0", "been": "B IH0 N", "from": "F R AH0 M",
    "than": "DH AH0 N", "or": "ER0", "there": "DH ER0", "some": "S AH0 M", "as": "AH0 Z", "but": "B AH0 T",
    "just": "JH AH0 S T", "if": "IH0 F",
    "it's": "IH0 T S", "he's": "IY0 Z", "she's": "SH IY0 Z", "there's": "DH ER0 Z",
    "you're": "Y ER0", "we're": "W ER0", "they're": "DH ER0",
}
YOU = {"you", "your", "you're", "you've", "you'll"}
_CLITIC = re.compile(r"^(.+?)('s|'re|'ve|'ll|'d|'m)$")


def is_function(norm: str) -> bool:
    """機能語か。it's / she's / you're / I'm のように、機能語 + 縮約は機能語。否定の縮約(don't isn't)は強く読まれるので含めない。"""
    if norm in FUNCTION:
        return True
    m = _CLITIC.match(norm)
    return bool(m and (m.group(1) in FUNCTION or m.group(1) == "let"))


@dataclass
class W:
    text: str
    norm: str
    event: int
    start_ms: float
    timed: bool
    phones: list[str] | None = None
    content: bool = False
    weak: bool = False
    nucleus: bool = False
    pause_ms: float = 0.0
    break_after: int = 0           # 0 なし / 1 小さな切れ / 2 大きな切れ
    flap_at: set[int] = field(default_factory=set)
    kana: str = ""
    linked_next: bool = False       # 子音で終わり、次の語が母音で始まる(語間の連結)
    carry_out: str | None = None    # 次の語の頭に移した語末の子音(音素、ストレス数字なし)
    carry_in: str | None = None     # 前の語から受け取った子音
    flap_carry: bool = False        # 受け取った子音を弾き音にする
    pal_out: str | None = None      # 口蓋化: 語末の子音が次の you と融合(音声で観測したときだけ)
    pal_in: str | None = None       # you の Y が融合後の音(JH CH SH ZH)に置き換わる
    obs: Obs | None = None          # 音素認識の観測


def analyze(words: list[Word], audio: Audio | None, raw_phones: list[dict] | None = None,
            pause_minor_ms=250, pause_major_ms=600) -> list[W]:
    ws = [W(w.text, w.norm, w.event, w.start_ms, w.timed) for w in words]
    for i, w in enumerate(ws):
        w.phones = None if re.match(r"[(\[]", w.text) else lookup(w.norm)  # (Laughter) 等の注記には発音を付けない
        w.content = not is_function(w.norm) and w.phones is not None or (w.phones is None and not re.match(r"[(\[]", w.text))
        if audio is not None and i + 1 < len(ws):
            w.pause_ms = audio.trailing_pause_ms(w.start_ms, ws[i + 1].start_ms)
        # まとまりの境界: 文末記号 > 読点類 > 無音
        if re.search(r"[.?!]+[\"”')\]]*$", w.text):
            w.break_after = 2
        elif re.search(r"[,;:—–…]+[\"”')\]]*$", w.text):
            w.break_after = 1
        if w.pause_ms >= pause_major_ms:
            w.break_after = 2
        elif w.pause_ms >= pause_minor_ms:
            w.break_after = max(w.break_after, 1)
    if ws:
        ws[-1].break_after = 2
    if raw_phones:
        for w, o in zip(ws, observe([(w.norm, w.start_ms, bool(re.match(r"[(\[]", w.text))) for w in ws], raw_phones)):
            w.obs = o
    # まとまりごとに核(最後の内容語)と弱形
    start = 0
    for i, w in enumerate(ws):
        if w.break_after == 0 and i != len(ws) - 1:
            continue
        grp = ws[start : i + 1]
        cw = [g for g in grp if g.content]
        (cw[-1] if cw else grp[-1]).nucleus = True
        for g in grp:
            if g.content or g.norm not in WEAK or not g.phones:
                continue
            o = g.obs
            if o is not None and o.reliable and o.reduced is not None:
                use = o.reduced  # 音声が弱まっていれば弱形、そうでなければ強形
            else:
                use = g is not grp[-1]  # 規則: まとまりの末尾でなければ弱形
            if use:
                g.weak = True
                g.phones = WEAK[g.norm].split()
        _flap_and_kana(grp)
        start = i + 1
    return ws


def _weak_vowel(ph: str) -> bool:
    b, st = split_phone(ph)
    return b in ("AH", "IH", "ER") and st == 0


def _after_vowel(p: list[str], i: int) -> bool:
    return i > 0 and (is_vowel(p[i - 1]) or (p[i - 1] == "R" and i > 1 and is_vowel(p[i - 2])))


def _flap_and_kana(grp: list[W]) -> None:
    # 1: 語内の弾き音と、語末の子音が次の語の母音に乗り換える連結(what I → wʌ + tai)
    for gi, w in enumerate(grp):
        if not w.phones:
            continue
        p = w.phones
        o = w.obs if (w.obs is not None and w.obs.reliable) else None
        cit = [split_phone(x)[0] for x in (lookup(w.norm) or [])]
        is_cit = [split_phone(x)[0] for x in p] == cit  # 弱形に置き換えていない
        nxt = grp[gi + 1] if gi + 1 < len(grp) and w.break_after == 0 and grp[gi + 1].phones else None
        for i, ph in enumerate(p[:-1]):
            if split_phone(ph)[0] in ("T", "D") and _after_vowel(p, i) and is_vowel(p[i + 1]):
                seen = o.flap.get(i) if (o is not None and is_cit) else None
                if seen is not None:
                    if seen:
                        w.flap_at.add(i)  # 音声が弾き音
                elif _weak_vowel(p[i + 1]):
                    w.flap_at.add(i)  # 規則: 次が弱母音
        if nxt and o is not None and o.final_ipa in PALATAL and nxt.norm in YOU and nxt.phones[0] == "Y" \
                and split_phone(p[-1])[0] in ("T", "D", "S", "Z"):
            # 音声で語末の子音が you と融合していた(did you → ディジュ)。規則だけでは入れない
            w.pal_out = nxt.pal_in = PALATAL[o.final_ipa]
            w.linked_next = True
            continue
        if nxt and not is_vowel(p[-1]) and is_vowel(nxt.phones[0]):
            w.linked_next = True
            last = p[-1]
            if last != "NG" and len(p) >= 2 and any(is_vowel(x) for x in p[:-1]):
                w.carry_out, nxt.carry_in = last, last
                if last in ("T", "D") and _after_vowel(p, len(p) - 1):
                    seen = o.flap.get(len(cit) - 1) if o is not None else None
                    # 語をまたぐ弾き音: 音声があればそれに従い、無ければ規則(次の母音の強弱によらない。what I / put us)
                    nxt.flap_carry = True if seen is None else seen
    # 2: カナにする(移した子音は次の語の頭に付ける)
    for w in grp:
        if not w.phones:
            continue
        p = list(w.phones)
        flaps = set(w.flap_at)
        if w.carry_out or w.pal_out:
            p = p[:-1]
        if w.pal_in:
            p = [w.pal_in] + p[1:]
        if w.carry_in:
            p = [w.carry_in] + p
            flaps = {i + 1 for i in flaps} | ({0} if w.flap_carry else set())
        w.kana = phones_to_kana(p, flaps)
