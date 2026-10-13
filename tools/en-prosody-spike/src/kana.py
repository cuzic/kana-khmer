"""ARPABET の音素列 → 「カナ + 右肩の IPA 修飾文字」(v0 叩き台)。

基本のカナは日本語話者が読める最も近い音。日本語にない区別は、IPA の小文字を右肩に付けて示す。
  r=ラ行+ʳ / l=ラ行+ˡ / θ=サ行+ᶿ / ð=ザ行+ᶞ / v=ヴ行(慣用) / æ=ア+ᵆ / ʌ=ア+ᶺ / ɪ=イ+ᶦ / ʊ=ウ+ᶷ / ɔ=オ+ᵓ / ə=ᵊ
母音の直前以外の子音は、母音を足さない小書きカナ(ko-kana の ㇰ ㇳ ㇷ゚ と同じ考え方)で書く。
表記の文字列に NFKC/NFKD を適用しないこと(修飾文字が通常の文字に置き換わる)。
"""
from __future__ import annotations

VOWELS = {"AA", "AE", "AH", "AO", "AW", "AY", "EH", "ER", "EY", "IH", "IY", "OW", "OY", "UH", "UW"}

# 行: a i u e o の順
ROWS = {
    "k": "カキクケコ", "g": "ガギグゲゴ", "s": ["サ", "スィ", "ス", "セ", "ソ"], "z": ["ザ", "ズィ", "ズ", "ゼ", "ゾ"],
    "th": ["サ", "シ", "ス", "セ", "ソ"], "dh": ["ザ", "ジ", "ズ", "ゼ", "ゾ"],
    "sh": ["シャ", "シ", "シュ", "シェ", "ショ"], "ch": ["チャ", "チ", "チュ", "チェ", "チョ"],
    "ts": ["ツァ", "ツィ", "ツ", "ツェ", "ツォ"],
    "dz": ["ヅァ", "ヅィ", "ヅ", "ヅェ", "ヅォ"],
    "j": ["ジャ", "ジ", "ジュ", "ジェ", "ジョ"], "dj": ["ヂャ", "ヂ", "ヂュ", "ヂェ", "ヂョ"],
    "t": ["タ", "ティ", "トゥ", "テ", "ト"], "d": ["ダ", "ディ", "ドゥ", "デ", "ド"],
    "n": "ナニヌネノ", "h": "ハヒフヘホ", "f": ["ファ", "フィ", "フ", "フェ", "フォ"],
    "b": "バビブベボ", "p": "パピプペポ", "v": ["ヴァ", "ヴィ", "ヴ", "ヴェ", "ヴォ"], "m": "マミムメモ", "r": "ラリルレロ",
    "w": ["ワ", "ウィ", "ウ", "ウェ", "ウォ"], "y": ["ヤ", "イ", "ユ", "イェ", "ヨ"],
}
ROWS = {k: list(v) for k, v in ROWS.items()}

# 音素 → (行, 子音の右肩, 母音の前以外での小書き形)
CONS = {
    "P": ("p", "", "ㇷ゚"), "B": ("b", "", "ㇷ゚\u3099"), "T": ("t", "", "ㇳ"), "D": ("d", "", "ㇳ\u3099"),
    "K": ("k", "", "ㇰ"), "G": ("g", "", "ㇰ\u3099"),
    "F": ("f", "", "ㇷ"), "V": ("v", "", "ㇷ\u3099"),
    "S": ("s", "", "ㇲ"), "Z": ("z", "", "ㇲ\u3099"),
    "SH": ("sh", "", "ㇱ"), "ZH": ("j", "ᶾ", "ㇱ\u3099"),
    "CH": ("ch", "", "チ"), "TS": ("ts", "", "ツ"), "DZ": ("dz", "", "ヅ"), "JH": ("dj", "", "ヂ"),
    "TH": ("th", "ᶿ", "ㇲᶿ"), "DH": ("dh", "ᶞ", "ㇲᶞ"),
    "M": ("m", "", "ㇺ"), "N": ("n", "", "ン"), "NG": ("n", "ᵑ", "ンᵑ"),
    "L": ("r", "ˡ", "ㇽˡ"), "R": ("r", "ʳ", "ㇽʳ"),
    "HH": ("h", "", ""), "W": ("w", "", "ウ"), "Y": ("y", "", "イ"),
}

# 母音 → (母音の行 0-4、母音の右肩、後ろに足す音)。ER は R の色づけを含む。
VOW = {
    "IY": (1, "", "ー"), "IH": (1, "ᶦ", ""), "EH": (3, "", ""), "EY": (3, "", "イ"), "AE": (0, "ᵆ", ""),
    "AA": (0, "", ""), "AH": (0, "ᶺ", ""), "AO": (4, "ᵓ", ""), "OW": (4, "", "ウ"), "UH": (2, "ᶷ", ""),
    "UW": (2, "", "ー"), "AY": (0, "", "イ"), "AW": (0, "", "ウ"), "OY": (4, "", "イ"), "ER": (0, "ᶟʳ", ""),
}
# 子音 + y + 母音 → 子音の i 段 + 小書きの ャュョ(future → フュー、cute → キュー、music → ミュー)。L は ˡ を付ける
YBASE = {"K": ("キ", ""), "G": ("ギ", ""), "B": ("ビ", ""), "P": ("ピ", ""), "M": ("ミ", ""), "F": ("フ", ""), "V": ("ヴ", ""),
         "HH": ("ヒ", ""), "N": ("ニ", ""), "T": ("テ", ""), "D": ("デ", ""), "S": ("シ", ""), "Z": ("ジ", ""), "L": ("リ", "ˡ")}
YVOW = {"UW": ("ュ", "", "ー"), "UH": ("ュ", "ᶷ", ""), "AA": ("ャ", "", ""), "AE": ("ャ", "ᵆ", ""), "OW": ("ョ", "", "ウ"), "AO": ("ョ", "ᵓ", "")}
FLAP = {"T": "ᵗ", "D": "ᵈ"}  # ɾ の右肩形(U+107A9)は対応フォントが少ないので採らず、元の音の字を付ける(ADR-0031)


def split_phone(p: str) -> tuple[str, int | None]:
    if p[-1].isdigit():
        return p[:-1], int(p[-1])
    return p, None


def is_vowel(p: str) -> bool:
    return split_phone(p)[0] in VOWELS


def _nucleus(base: str, stress: int | None, onset: tuple[str, str, str] | None, flap: str | None, nxt: str | None = None) -> str:
    """母音 1 つ + 直前の子音 1 つ(無ければ None)を 1 単位のカナにする。"""
    schwa = base == "AH" and stress == 0
    r_color = base == "ER"
    if schwa or (r_color and stress == 0):
        # 弱母音。ɚ は ʳ だけ、ə は ᵊ。ch jh sh zh の後は チャ ジャ シャ(future → フューチャʳ、nation → ネイシャン)
        mark = "ʳ" if r_color else "ᵊ"
        if flap:
            return "ラ" + flap + mark
        if r_color and onset and onset[0] not in ("ch", "j", "dj", "sh"):
            return ROWS[onset[0]][0] + onset[1] + "ʳ"  # ɚ は子音の ア 段 + ʳ(never → ネヴァʳ、dinner → ディᶦナʳ)
        if r_color and not onset:
            return "アʳ"
        if onset and onset[0] == "y" and not r_color:
            return ROWS["y"][0] + "ᵊ"  # y + 弱い母音は ヤᵊ(you の弱形)。強い /ju:/ は ユー(子音 + 母音の規則)
        if onset and onset[0] in ("ch", "j", "dj", "sh"):
            if r_color:
                return ROWS[onset[0]][0] + onset[1] + "ʳ"
            if nxt == "N":  # 音節を成す n(nation → ネイシン、education の末尾): i 段 + ᵊ で シᵊン チᵊン ヂᵊン
                return ROWS[onset[0]][1] + onset[1] + "ᵊ"
            return ROWS[onset[0]][0] + onset[1]  # 語末など(Asia → エイジャ)
        return (onset[2] if onset else "ァ") + mark
    row, vmod, tail = VOW[base]
    if base == "IH" and stress == 0:
        vmod = "ᶦ"
    if flap:
        head, cmod = ROWS["r"][row], flap
    elif onset:
        head, cmod = ROWS[onset[0]][row], onset[1]
    else:
        head, cmod = "アイウエオ"[row], ""
    return head + cmod + vmod + tail


def _aspirated(phones: list[str], no_asp: set[int]) -> set[int]:
    """有気音にする P T K CH の index。強勢(1・2)のある母音の前(R L W Y をはさんでもよい)で、S の直後でないもの。
    連結で移った子音・融合した子音(no_asp)は対象外。"""
    out: set[int] = set()
    for i, ph in enumerate(phones):
        b = split_phone(ph)[0]
        if b not in ("P", "T", "K", "CH") or i in no_asp:
            continue
        if i > 0 and split_phone(phones[i - 1])[0] == "S":
            continue
        j = i + 1
        if b != "CH" and j < len(phones) and split_phone(phones[j])[0] in ("R", "L", "W", "Y"):
            j += 1
        if j < len(phones) and is_vowel(phones[j]) and split_phone(phones[j])[1] in (1, 2):
            out.add(i)
    return out


def _merge_ts(phones: list[str], flap_at: set[int], asp: set[int]) -> tuple[list[str], set[int], set[int]]:
    """T+S は破擦音 TS(ツ)、D+Z は DZ(ヅ)にする(it's → イᶦツ、kids → キᶦヅ)。弾き音の T/D は対象外。index の集合も付け替える。"""
    pairs = {("T", "S"): "TS", ("D", "Z"): "DZ"}
    out: list[str] = []
    flaps: set[int] = set()
    asps: set[int] = set()
    i = 0
    while i < len(phones):
        if i not in flap_at and i + 1 < len(phones):
            merged = pairs.get((split_phone(phones[i])[0], split_phone(phones[i + 1])[0]))
            if merged:
                out.append(merged)
                i += 2
                continue
        if i in flap_at:
            flaps.add(len(out))
        if i in asp:
            asps.add(len(out))
        out.append(phones[i])
        i += 1
    return out, flaps, asps


def phones_to_kana(phones: list[str], flap_at: set[int] | None = None, no_asp: set[int] | None = None) -> str:
    """phones: ARPABET(ストレス数字つき)。flap_at: 弾き音にする T/D の index。no_asp: 有気音にしない index(連結で移った子音など)。"""
    phones, flap_at, asp = _merge_ts(phones, flap_at or set(), _aspirated(phones, no_asp or set()))
    # R が母音の直後で、次が母音でなければ母音の色づけに吸収する(car → アʳ)
    seq: list[tuple[str, int | None, int]] = []
    i = 0
    n = len(phones)
    while i < n:
        b, s = split_phone(phones[i])
        if b == "R" and i > 0 and is_vowel(phones[i - 1]) and split_phone(phones[i - 1])[0] not in ("ER",) \
                and not (i + 1 < n and is_vowel(phones[i + 1])):
            seq.append(("<r>", None, i))
        else:
            seq.append((b, s, i))
        i += 1
    out: list[str] = []
    pending: list[tuple[str, int]] = []  # 母音の前の子音(小書き候補)
    for k, (b, s, idx) in enumerate(seq):
        if b == "<r>":
            if out:
                out[-1] += "ʳ"
            continue
        if b in VOWELS:
            onset = None
            flap = None
            if len(pending) >= 2 and pending[-1][0] == "Y" and pending[-2][0] in YBASE and b in YVOW:
                *rest, (c, cidx0), _y = pending
                for cc, ccidx in rest:
                    out.append(CONS[cc][2] + ("ʰ" if ccidx in asp else ""))
                base_k, cmod = YBASE[c]
                small, vm, tail = YVOW[b]
                out.append(base_k + cmod + ("ʰ" if cidx0 in asp else "") + small + vm + tail)
                pending = []
                continue
            if pending:
                *rest, (last, lidx) = pending
                for c, cidx in rest:
                    out.append(CONS[c][2] + ("ʰ" if cidx in asp else ""))
                if lidx in flap_at and last in FLAP:
                    flap = FLAP[last]
                else:
                    onset = CONS[last]
                    if lidx in asp:  # 強勢のある母音の前の p t k ch は有気音(ʰ)
                        onset = (onset[0], onset[1] + "ʰ", onset[2])
                pending = []
            nxt = seq[k + 1][0] if k + 1 < len(seq) else None
            out.append(_nucleus(b, s, onset, flap, nxt))
        else:
            pending.append((b, idx))
    for c, cidx in pending:
        out.append("ㇻ" + FLAP[c] if cidx in flap_at and c in FLAP else CONS[c][2])
    return "".join(out)
