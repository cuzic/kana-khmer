"""packages/en-prosody/test/sentences.txt の各文を 1 列ずつ規則で分析し、IR の語を golden.json に書く(TS 移植の正解)。"""
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from align import Word, norm  # noqa: E402
from analyze import analyze  # noqa: E402
from ir import build_ir  # noqa: E402

FIELDS = ("text", "norm", "kind", "prominence", "beat", "break_after", "linked_next", "phones", "kana", "kana_lite")
pkg = Path(__file__).resolve().parents[3] / "packages" / "en-prosody" / "test"
out = []
for line in (pkg / "sentences.txt").read_text(encoding="utf-8").splitlines():
    if not line.strip():
        continue
    words = [Word(w, norm(w), 0) for w in line.split() if norm(w)]
    ir = build_ir(analyze(words, None), [(0, 0, line)], {})
    out.append({"sentence": line, "words": [{k: w[k] for k in FIELDS} for w in ir["events"][0]["words"]]})
(pkg / "golden.json").write_text(json.dumps(out, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
print(f"{len(out)} sentences, {sum(len(s['words']) for s in out)} words")
