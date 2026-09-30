"""使い方:
  uv run python src/cli.py build MANUAL.json3 AUTO.json3 AUDIO.wav OUT_IR.json [--phones PHONES.json] [--from SEC --to SEC]
  uv run python src/cli.py convert IR.json --to ass|srt|html [--lite] [-o FILE]

build は字幕・自動字幕・音声から IR を作る。convert は IR だけを読んで各形式に変換する。
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from align import align, load_auto, load_manual
from analyze import analyze
from audio import Audio
from ir import build_ir
from to_ass import to_ass
from to_html import to_html
from to_srt import to_srt


def cmd_build(a) -> None:
    manual = load_manual(a.manual)
    words, audio = align(manual, load_auto(a.auto)), Audio(a.audio)
    rule = analyze(words, audio)
    ws = analyze(words, audio, json.load(open(a.phones))) if a.phones else rule
    lo, hi = (a.t_from or 0) * 1000, (a.t_to * 1000 if a.t_to else float("inf"))
    keep = [n for n, w in enumerate(ws) if lo <= manual[w.event][0] < hi]
    source = {"manual": Path(a.manual).name, "auto": Path(a.auto).name, "audio": Path(a.audio).name}
    if a.phones:
        source["phones"] = Path(a.phones).name
    ir = build_ir([ws[n] for n in keep], manual, source, [rule[n] for n in keep])
    Path(a.out).parent.mkdir(parents=True, exist_ok=True)
    Path(a.out).write_text(json.dumps(ir, ensure_ascii=False, indent=1))
    n = sum(len(e["words"]) for e in ir["events"])
    print(f"IR: events={len(ir['events'])} words={n} -> {a.out}")


def cmd_convert(a) -> None:
    ir = json.loads(Path(a.ir).read_text())
    if a.to == "ass":
        s = to_ass(ir, lite=a.lite)
    elif a.to == "srt":
        s = to_srt(ir, lite=a.lite)
    else:
        s = to_html(ir)
    out = a.output or str(Path(a.ir).with_suffix("." + a.to))
    Path(out).write_text(s)
    print("wrote", out)


def main() -> None:
    ap = argparse.ArgumentParser()
    sub = ap.add_subparsers(required=True)
    b = sub.add_parser("build")
    b.add_argument("manual"); b.add_argument("auto"); b.add_argument("audio"); b.add_argument("out")
    b.add_argument("--phones", help="音素認識の出力(phone_rec.py の JSON)。あれば弱形・弾き音・口蓋化を音声で決める")
    b.add_argument("--from", dest="t_from", type=float); b.add_argument("--to", dest="t_to", type=float)
    b.set_defaults(fn=cmd_build)
    c = sub.add_parser("convert")
    c.add_argument("ir"); c.add_argument("--to", required=True, choices=["ass", "srt", "html"])
    c.add_argument("--lite", action="store_true"); c.add_argument("-o", "--output")
    c.set_defaults(fn=cmd_convert)
    a = ap.parse_args()
    a.fn(a)


if __name__ == "__main__":
    main()
