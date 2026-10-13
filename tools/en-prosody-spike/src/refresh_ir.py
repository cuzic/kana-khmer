"""古い IR のカナを、新しい表記(ADR-0033・0034)に移行する。

IR は字幕・音声・音素認識の出力から作る(`cli.py build`)ので、入力が残っていれば作り直すのが正しい。入力が無いとき
(`out/` の古い IR)のために、語ごとの `kana`・`kana_rule` を文字列として書き換え、`kana_lite` を作り直す。

  ADR-0033  語末の有声子音(b = ㇷ + 濁点、v = ゥ + 濁点。入力は ADR-0033 より前の形で、b と v を同じ ㇷ + 濁点にしていた途中の形は移行できない): ㇷ゚ᵇ ㇳᵈ ㇰᵍ ㇲᶻ ㇱᶾ ㇷᵛ → 無声の小書きカナ + U+3099(濁点)
  ADR-0034  語末でない dʒ + 弱い母音の デュ → ヂャ(音素に JH があり、デュ の後ろが ー でない語だけ)

何度かけても同じ結果になる。分析をやり直すわけではないので、規則の変更のうち上の 2 つしか反映しない。
usage: uv run python src/refresh_ir.py IR.json [IR.json ...]   (その場で上書き)
"""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

from ir import lite

VOICED = {"ㇷ゚ᵇ": "ㇷ゙", "ㇳᵈ": "ㇳ゙", "ㇰᵍ": "ㇰ゙", "ㇲᶻ": "ㇲ゙", "ㇱᶾ": "ㇱ゙", "ㇷᵛ": "ゥ゙"}
_DJU = re.compile("デュ(?!ー)")


def migrate_kana(kana: str, phones: list[str] | None) -> str:
    for old, new in VOICED.items():
        kana = kana.replace(old, new)
    if phones and any(p.rstrip("012") == "JH" for p in phones):
        kana = _DJU.sub("ヂャ", kana, count=1)
    return kana


NOTATION = "ADR-0033 v2(語末の有声子音は小書きカナ + 濁点: b = ㇷ + 濁点、v = ゥ + 濁点。dʒ + 弱い母音は ヂャ)"


def migrate(ir: dict) -> int:
    done = ir.get("provenance", {}).get("kana_notation")
    if done and done != NOTATION:   # b と v を同じ ㇷ + 濁点にしていた途中の形。文字列だけでは b と v を区別できない
        raise SystemExit(f"途中の表記({done[:40]}…)の IR は移行できません。作り直すか、ADR-0033 より前の IR から移行してください。")
    changed = 0
    for ev in ir["events"]:
        for w in ev["words"]:
            for key in ("kana", "kana_rule"):
                if isinstance(w.get(key), str):
                    new = migrate_kana(w[key], w.get("phones"))
                    changed += new != w[key]
                    w[key] = new
            if isinstance(w.get("kana"), str):
                w["kana_lite"] = lite(w["kana"])
    prov = ir.setdefault("provenance", {})
    prov["kana_notation"] = NOTATION
    return changed


def main(paths: list[str]) -> None:
    for p in paths:
        path = Path(p)
        ir = json.loads(path.read_text(encoding="utf-8"))
        n = migrate(ir)
        path.write_text(json.dumps(ir, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
        print(f"{p}: {n} kana fields rewritten")


if __name__ == "__main__":
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    main(sys.argv[1:])
