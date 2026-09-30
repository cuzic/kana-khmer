"""IR → HTML(目視確認用)。語ごとに上にカナ、下に英語。強勢・弱化は文字サイズで表す(ASS と同じ倍率)。"""
from __future__ import annotations

import html

from ir import MODS
from to_ass import PROFILE

CSS = """
body{font-family:system-ui,"Noto Sans JP",sans-serif;margin:16px auto;max-width:980px;padding:0 16px;line-height:1.35;background:#fff;color:#1a1a1a}
@media(prefers-color-scheme:dark){body{background:#16181c;color:#e6e6e6}.ev{border-color:#333}.p0 .en{color:#8a8f98}.kana{color:#7fb4ff}}
h1{font-size:1.2rem}.legend{font-size:.85rem;color:#666;margin:8px 0 16px}
.ev{border-top:1px solid #ddd;padding:10px 0;display:flex;gap:12px}.t{font-size:.75rem;color:#888;width:48px;flex:none;padding-top:1.6rem}
.line{display:flex;flex-wrap:wrap;align-items:flex-end;row-gap:6px}
.w{display:inline-flex;flex-direction:column;align-items:flex-start;margin-right:.35em}
.kana{color:#2a5db0;min-height:1.1em;white-space:nowrap}
.p2 .en,.p3 .en{font-weight:700}.p0 .en{color:#7b808a}
.p3 .en{text-decoration:underline;text-decoration-thickness:2px;text-underline-offset:3px;color:#c0392b}
.note .en{font-weight:400;font-style:italic;color:#8a8f98}
.link{align-self:flex-end;margin:0 .3em 0 -.3em;color:#2a5db0}.brk{align-self:flex-end;color:#999;margin:0 .5em 0 -.1em;font-size:1.1rem}
.beat{color:#2a5db0;text-align:center;align-self:stretch;line-height:1}.b1,.b2{font-size:.9em}.nobeat .beat{display:none}.lite .m{display:none}.ctl{margin:8px 0}
"""


def _k(k: str) -> str:
    return "".join(f'<span class="m">{html.escape(c)}</span>' if c in MODS else html.escape(c) for c in k)


def to_html(ir: dict, profile: dict | None = None) -> str:
    p = {**PROFILE, **(profile or {})}
    sizes = "".join(f".p{k} .en{{font-size:{1.15 * v:.3f}rem}}.p{k} .kana{{font-size:{1.15 * v * p['kana_scale'] * 1.45:.3f}rem}}" for k, v in p["size"].items())
    out = [f"<!doctype html><meta charset=utf-8><meta name=viewport content='width=device-width,initial-scale=1'><title>en-prosody spike</title><style>{CSS}{sizes}</style>",
           "<h1>英語字幕の韻律表示 スパイク(v0・規則による推定)</h1>",
           "<div class=legend>文字の大きさ=強勢(小=弱形、大=核)／<b>太字</b>=内容語／<span style='color:#c0392b;text-decoration:underline'>赤の下線</span>=核／"
           "<b>/</b>・<b>//</b>=まとまりの切れ目／‿=語のつながり／上段のカナ=推定の発音(右肩は IPA)。すべて規則による推定。</div>",
           "<div class=ctl><label><input type=checkbox id=lite> ライト(右肩の IPA を隠す)</label> <label><input type=checkbox id=beat checked> ビート(· 弱 / ● 強 / ◎ 核)</label></div><div id=root>"]
    for ev in ir["events"]:
        out.append(f"<div class=ev><div class=t>{ev['start_ms'] / 1000:.1f}s</div><div class=line>")
        for w in ev["words"]:
            cls = f"w p{w['prominence']}" + (" note" if w["kind"] == "note" else "")
            kana = "" if w["kind"] == "note" else (_k(w["kana"]) if w["kana"] else "?")
            beat = "" if w["kind"] == "note" else "·●◎"[w["beat"]]
            out.append(f"<span class='{cls}'><span class=kana>{kana}</span><span class='beat b{w['beat']}'>{beat}</span><span class=en>{html.escape(w['text'])}</span></span>")
            if w["linked_next"]:
                out.append("<span class=link>‿</span>")
            if w["break_after"] and w["kind"] != "note":
                out.append(f"<span class=brk>{'//' if w['break_after'] == 2 else '/'}</span>")
        out.append("</div></div>")
    out.append("</div><script>document.getElementById('lite').onchange=e=>document.getElementById('root').classList.toggle('lite',e.target.checked);document.getElementById('beat').onchange=e=>document.getElementById('root').classList.toggle('nobeat',!e.target.checked)</script>")
    return "".join(out)
