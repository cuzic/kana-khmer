"""手動字幕(文単位の時刻)と自動字幕(語ごとの時刻)を語単位で対応付け、手動字幕の各語に開始時刻を付ける。"""
from __future__ import annotations

import difflib
import json
import re
from dataclasses import dataclass


@dataclass
class Word:
    text: str          # 句読点つき(手動字幕のまま)
    norm: str          # 小文字・句読点なし
    event: int         # 手動字幕のイベント番号
    start_ms: float = 0.0
    timed: bool = False  # 自動字幕の語に対応付いたか(False は補間)


def norm(w: str) -> str:
    return re.sub(r"[^a-z0-9']", "", w.lower().replace("’", "'"))


def load_manual(path: str) -> list[tuple[int, int, str]]:
    ev = []
    for e in json.load(open(path))["events"]:
        if "segs" not in e:
            continue
        txt = "".join(s.get("utf8", "") for s in e["segs"]).replace("\n", " ").strip()
        if txt:
            ev.append((e["tStartMs"], e.get("dDurationMs", 0), txt))
    return ev


def load_auto(path: str) -> list[tuple[str, float]]:
    out = []
    for e in json.load(open(path))["events"]:
        for s in e.get("segs", []):
            t = norm(s.get("utf8", "").strip())
            if t:
                out.append((t, e["tStartMs"] + s.get("tOffsetMs", 0)))
    return out


def align(manual: list[tuple[int, int, str]], auto: list[tuple[str, float]]) -> list[Word]:
    words = [Word(w, norm(w), i) for i, (_, _, t) in enumerate(manual) for w in t.split() if norm(w)]
    sm = difflib.SequenceMatcher(None, [a[0] for a in auto], [w.norm for w in words], autojunk=False)
    for b in sm.get_matching_blocks():
        for k in range(b.size):
            w = words[b.b + k]
            w.start_ms, w.timed = auto[b.a + k][1], True
    # 未対応の語は、前後の対応語の間(イベントの窓内)で等分に補間する
    i = 0
    while i < len(words):
        if words[i].timed:
            i += 1
            continue
        j = i
        while j < len(words) and not words[j].timed:
            j += 1
        ev_lo = manual[words[i].event][0]
        ev_hi = manual[words[j - 1].event][0] + manual[words[j - 1].event][1]
        lo = words[i - 1].start_ms if i > 0 else ev_lo
        hi = words[j].start_ms if j < len(words) else ev_hi
        lo, hi = max(lo, min(ev_lo, lo)), max(hi, lo)
        n = j - i
        for k in range(n):
            words[i + k].start_ms = lo + (hi - lo) * (k + 1) / (n + 1)
        i = j
    return words
