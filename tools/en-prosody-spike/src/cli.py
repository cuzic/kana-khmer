"""使い方:
  uv run python src/cli.py build MANUAL.json3 AUTO.json3 AUDIO.wav OUT_IR.json [--phones PHONES.json] [--from SEC --to SEC]
  uv run python src/cli.py convert IR.json --to ass|srt|html [--layers 標準] [--lite] [-o FILE]

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
from dataclasses import replace

from ir import build_ir
from layers import ALL, PRESETS, Layers
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
    L = Layers.parse(a.layers)
    if a.lite:
        L = replace(L, ipa=False)
    if a.mouth and a.to != "ass":
        print(f"warning: --mouth は --to ass のときだけ効きます(--to {a.to} では無視)", file=sys.stderr)
    if a.to == "ass":
        s = to_ass(ir, layers=L, mouth=a.mouth, embed_font=a.embed_font)
    elif a.to == "srt":
        s = to_srt(ir, layers=L)
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
    c.add_argument("--lite", action="store_true", help="右肩の IPA を除く(--layers -ipa と同じ)")
    c.add_argument("--layers", help=f"見せる層。プリセット({' / '.join(PRESETS)})、列挙(size,beat,kana)、差し引き(詳細,-ipa)。層: {', '.join(ALL)}")
    c.add_argument("--mouth", choices=["off", "pua", "lig"], help="母音が付く l・r を無音の口形(斜線で消したナ行・ウ)で書く。pua=私用領域の 1 字、lig=カナ+U+0338 の合字。環境変数 EN_KANA_MOUTH でも指定できる(既定 off)。ADR-0035")
    c.add_argument("--embed-font", action=argparse.BooleanOptionalAction, default=True, help="ASS に kana-multi の字幕用サブセットを埋め込む(既定 on。環境変数 EN_KANA_FONT で元の woff2 を指定)")
    c.add_argument("-o", "--output")
    c.set_defaults(fn=cmd_convert)
    a = ap.parse_args()
    a.fn(a)


if __name__ == "__main__":
    main()
