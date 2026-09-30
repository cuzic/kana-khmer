"""CMUdict による引き(米国英語の引用形)。"""
from __future__ import annotations

import cmudict

from kana import split_phone

_CMU = cmudict.dict()


def lookup(n: str) -> list[str] | None:
    for cand in (n, n.strip("'")):
        if cand in _CMU:
            return list(_CMU[cand][0])
    if n.endswith("'s") and n[:-2] in _CMU:  # 所有格・縮約の 's
        p = list(_CMU[n[:-2]][0])
        last = split_phone(p[-1])[0]
        return p + (["IH0", "Z"] if last in ("S", "Z", "SH", "ZH", "CH", "JH") else ["S"] if last in ("P", "T", "K", "F", "TH") else ["Z"])
    return None
