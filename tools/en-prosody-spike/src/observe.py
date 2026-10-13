"""音素認識の出力(wav2vec2 espeak CTC の貪欲デコード)を、字幕の語ごとの期待音素(CMUdict の引用形)と系列で整列し、
語ごとの観測(母音が弱まったか・弾き音か・語末の音)を返す。

語への割り当ては、自動字幕の時刻(粗い)ではなく、音素列どうしの帯つき動的計画法で行う。
観測は認識の誤りを含む。整列の一致率が低い語は reliable=False とし、使う側は規則に戻すこと。
"""
from __future__ import annotations

from dataclasses import dataclass, field

import numpy as np

from kana import VOWELS, split_phone
from pron import lookup

# espeak の音素 → ARPABET の種類(ストレスなし)。ɾ は FLAP、ʔ は GLOT
IPA = {
    "p": ["P"], "b": ["B"], "t": ["T"], "d": ["D"], "k": ["K"], "ɡ": ["G"], "g": ["G"], "f": ["F"], "v": ["V"], "θ": ["TH"], "ð": ["DH"],
    "s": ["S"], "z": ["Z"], "ʃ": ["SH"], "ʒ": ["ZH"], "h": ["HH"], "m": ["M"], "n": ["N"], "n̩": ["N"], "ŋ": ["NG"], "l": ["L"], "ɫ": ["L"],
    "l̩": ["L"], "ɹ": ["R"], "r": ["R"], "ɻ": ["R"], "j": ["Y"], "w": ["W"], "tʃ": ["CH"], "dʒ": ["JH"], "ts": ["T", "S"],
    "ɾ": ["FLAP"], "ʔ": ["GLOT"], "ʋ": ["V"], "β": ["V"],
    "i": ["IY"], "iː": ["IY"], "ɪ": ["IH"], "ᵻ": ["IH"], "e": ["EY"], "eː": ["EY"], "eɪ": ["EY"], "ɛ": ["EH"], "æ": ["AE"], "ɑ": ["AA"], "ɑː": ["AA"],
    "ɒ": ["AA"], "ɔ": ["AO"], "ɔː": ["AO"], "ʊ": ["UH"], "u": ["UW"], "uː": ["UW"], "ʌ": ["AH"], "ɐ": ["AH"], "ə": ["AH"], "ɜ": ["ER"],
    "ɜː": ["ER"], "ɚ": ["ER"], "oʊ": ["OW"], "oː": ["OW"], "aɪ": ["AY"], "aʊ": ["AW"], "ɔɪ": ["OY"], "əl": ["AH", "L"],
    "ɑːɹ": ["AA", "R"], "ɔːɹ": ["AO", "R"], "ɪɹ": ["IH", "R"], "ɛɹ": ["EH", "R"], "ʊɹ": ["UH", "R"], "aː": ["AA"], "aɪɚ": ["AY", "ER"],
}
REDUCED_IPA = {"ə", "ɐ", "ɪ", "ᵻ", "ɚ"}
PALATAL = {"dʒ": "JH", "tʃ": "CH", "ʃ": "SH", "ʒ": "ZH"}
PAIRS = {frozenset(p) for p in [("T", "D"), ("K", "G"), ("P", "B"), ("S", "Z"), ("F", "V"), ("TH", "DH"), ("SH", "ZH"), ("CH", "JH")]}
CONS_STOP = {"T", "D", "FLAP", "GLOT"}
GAP = 0.9
MATCH_MIN = 0.6  # 語の期待音素のうち、一致または近い音に整列した割合がこれ未満なら観測を信頼しない


def is_v(c: str) -> bool:
    return c in VOWELS


def sub_cost(a: str, b: str) -> float:
    if a == b:
        return 0.0
    if is_v(a) and is_v(b):
        return 0.35
    if frozenset((a, b)) in PAIRS:
        return 0.4
    if a in CONS_STOP and b in CONS_STOP:
        return 0.25
    return 1.0


def band_align(exp: list[tuple[str, float]], rec: list[tuple[str, float]], width=2.5) -> list[tuple[int | None, int | None]]:
    """期待(種類, 推定時刻)と認識(種類, 時刻)を帯つきの大域整列。戻り値は (期待の index, 認識の index) の対の列(None は挿入・脱落)。"""
    rt = np.array([t for _, t in rec])
    n, m = len(exp), len(rec)
    lo = np.searchsorted(rt, np.array([t for _, t in exp]) - width)
    hi = np.searchsorted(rt, np.array([t for _, t in exp]) + width)
    lo = np.maximum.accumulate(lo)
    hi = np.maximum.accumulate(hi)
    for i in range(1, n):  # 帯が前の行と必ず重なるようにする(長い無音で帯が飛んでも経路が切れない)
        lo[i] = min(lo[i], hi[i - 1] + 1)
        hi[i] = max(hi[i], lo[i])
    INF = 1e9
    rows: list[dict[int, tuple[float, int]]] = [{0: (0.0, 0)}]
    for j in range(1, int(hi[0]) + 2):
        rows[0][j] = (j * GAP, 2)
    for i in range(1, n + 1):
        row: dict[int, tuple[float, int]] = {}
        prev = rows[i - 1]
        for j in range(int(lo[i - 1]), int(hi[i - 1]) + 2):
            if j > m:
                break
            best, bp = INF, 0
            if j in prev:  # 期待だけ進む(脱落)
                best, bp = prev[j][0] + GAP, 1
            if j - 1 in prev and j >= 1:  # 一致または置換
                c = prev[j - 1][0] + sub_cost(exp[i - 1][0], rec[j - 1][0])
                if c < best:
                    best, bp = c, 0
            if j - 1 in row:  # 認識だけ進む(挿入)
                c = row[j - 1][0] + GAP
                if c < best:
                    best, bp = c, 2
            if best < INF:
                row[j] = (best, bp)
        rows.append(row)
    j = min(rows[n], key=lambda k: rows[n][k][0] + (m - k) * GAP)
    i, pairs = n, []
    while i > 0 or j > 0:
        bp = rows[i][j][1] if j in rows[i] else (1 if i > 0 else 2)
        if i > 0 and bp == 0:
            pairs.append((i - 1, j - 1)); i -= 1; j -= 1
        elif i > 0 and bp == 1:
            pairs.append((i - 1, None)); i -= 1
        else:
            pairs.append((None, j - 1)); j -= 1
    return pairs[::-1]


@dataclass
class Obs:
    match: float                      # 期待音素のうち、一致・近い音に整列した割合
    reliable: bool
    reduced: bool | None              # 引用形の最初の母音が弱まったか(None は観測できず)
    flap: dict[int, bool | None] = field(default_factory=dict)  # 母音の後の T/D の位置 → 弾き音か(False は t/d か声門閉鎖、None は他・欠測)
    final_ipa: str | None = None      # 引用形の最後の音素に整列した認識の音(None は脱落)


def observe(words: list[tuple[str, float, bool]], raw: list[dict]) -> list[Obs | None]:
    """words: (norm, start_ms, 注記か) の列。raw: [{"t": 秒, "p": espeak の音素}]。語ごとの観測(発音を引けない語・注記は None)。"""
    rec: list[tuple[str, float]] = []
    rec_ipa: list[str] = []
    for r in raw:
        kinds = IPA.get(r["p"]) or IPA.get(r["p"].rstrip("ː"))
        for k in kinds or []:
            rec.append((k, r["t"])); rec_ipa.append(r["p"])
    t_lo, t_hi = raw[0]["t"] - 1, raw[-1]["t"] + 1
    exp: list[tuple[str, float]] = []
    meta: list[tuple[int, int]] = []
    cits: dict[int, list[str]] = {}
    for wi, (norm, start_ms, note) in enumerate(words):
        cit = None if note else lookup(norm)
        if not cit or not (t_lo <= start_ms / 1000 <= t_hi):
            continue
        cits[wi] = [split_phone(p)[0] for p in cit]
        for k, ph in enumerate(cits[wi]):
            exp.append((ph, start_ms / 1000 + 0.075 * k)); meta.append((wi, k))
    e2r: dict[int, int | None] = {}
    for ei, rj in band_align(exp, rec):
        if ei is not None:
            e2r[ei] = rj
    by_word: dict[int, list[int]] = {}
    for ei, (wi, _) in enumerate(meta):
        by_word.setdefault(wi, []).append(ei)
    out: list[Obs | None] = [None] * len(words)
    for wi, cit in cits.items():
        eis = by_word[wi]
        rj = [e2r.get(ei) for ei in eis]
        ok = sum(1 for ei, j in zip(eis, rj) if j is not None and sub_cost(exp[ei][0], rec[j][0]) <= 0.4)
        match = ok / len(cit)
        first_v = next((k for k, c in enumerate(cit) if is_v(c)), None)
        reduced = None if first_v is None or rj[first_v] is None else rec_ipa[rj[first_v]] in REDUCED_IPA
        flap: dict[int, bool | None] = {}
        for k, c in enumerate(cit):
            if c in ("T", "D") and k > 0 and (is_v(cit[k - 1]) or (cit[k - 1] == "R" and k > 1 and is_v(cit[k - 2]))):
                j = rj[k]
                kind = None if j is None else rec[j][0]
                flap[k] = True if kind == "FLAP" else False if kind in ("T", "D", "GLOT") else None
        out[wi] = Obs(match, match >= MATCH_MIN, reduced, flap, None if rj[-1] is None else rec_ipa[rj[-1]])
    return out
