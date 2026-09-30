"""cmudict の第1発音を `word PH PH ...` の1行1語で packages/en-prosody/data/cmudict.txt に書く(生成物。.gitignore 済み)。"""
from pathlib import Path

import cmudict

out = Path(__file__).resolve().parents[3] / "packages" / "en-prosody" / "data" / "cmudict.txt"
out.parent.mkdir(parents=True, exist_ok=True)
d = cmudict.dict()
with out.open("w", encoding="utf-8") as f:
    for w in sorted(d):
        f.write(f"{w} {' '.join(d[w][0])}\n")
print(f"{len(d)} words -> {out}")
