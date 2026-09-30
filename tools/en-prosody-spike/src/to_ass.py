"""IR → ASS。強勢・弱化はフォントサイズ(\\fs)で表す。上の行=推定の発音のカナ、下の行=英語。見せる層は Layers で選ぶ。

語ごとの位置合わせ(ルビのようにカナを語の真上に置く)はしていない。カナ行と英語行は別々に折り返す。
ビートは、語の直前に小さな ● / ◎ を置いて出す(語に付くので位置はずれない)。
"""
from __future__ import annotations

from ir import lite as strip_ipa
from layers import Layers

PROFILE = {
    "font": "Noto Sans JP", "play_res": (1920, 1080), "base_fs": 58, "kana_scale": 0.62, "margin_v": 70,
    # prominence 0..3 → 基準サイズに対する倍率
    "size": {0: 0.72, 1: 0.86, 2: 1.0, 3: 1.22},
    "bold_from": 2,
    "colors": {"text": "FFFFFF", "weak": "A9AEB8", "nucleus": "FF6B5B", "kana": "8CC4FF", "brk": "9AA0A6", "note": "9AA0A6", "beat": "8CC4FF"},
}


def _bgr(rgb: str) -> str:
    return f"&H{rgb[4:6]}{rgb[2:4]}{rgb[0:2]}&"


def _ts(ms: float) -> str:
    cs = round(ms / 10)
    return f"{cs // 360000}:{cs // 6000 % 60:02d}:{cs // 100 % 60:02d}.{cs % 100:02d}"


def _esc(s: str) -> str:
    return s.replace("\\", "").replace("{", "(").replace("}", ")")


def _kana_of(w: dict, L: Layers) -> str:
    k = w["kana"] if L.audio else w.get("kana_rule", w["kana"])
    return k if L.ipa else strip_ipa(k)


def _line(words: list[dict], kana: bool, p: dict, L: Layers) -> str:
    c, out = p["colors"], []
    for w in words:
        pr = w["prominence"]
        scale = p["kana_scale"] if kana else 1
        if w["kind"] == "note":
            fs, col, extra = round(p["base_fs"] * 0.7 * scale), c["note"], r"\i1"
        else:
            fs = round(p["base_fs"] * (p["size"][pr] if L.size else 1) * scale)
            if kana:
                col, extra = c["kana"], r"\b0"
            else:
                col = c["weak"] if (L.weak and pr == 0) else c["nucleus"] if (L.nucleus and pr == 3) else c["text"]
                extra = r"\b1" if (L.bold and pr >= p["bold_from"]) else r"\b0"
                if L.nucleus and pr == 3:
                    extra += r"\u1"
        if kana:
            k = _kana_of(w, L)
            if w["kind"] == "note" or not k:
                continue
            txt = k
        else:
            txt = w["text"]
            if L.beat and w["kind"] != "note" and w.get("beat", 0) > 0:
                out.append(f"{{\\fs{round(p['base_fs'] * 0.5)}\\c{_bgr(c['beat'])}\\b0\\u0\\i0}}{'●◎'[w['beat'] - 1]}")
        out.append(f"{{\\fs{fs}\\c{_bgr(col)}{extra}}}{_esc(txt)}")
        if kana and L.link and w["linked_next"]:
            out.append(f"{{\\fs{fs}\\c{_bgr(c['brk'])}\\b0\\u0}}‿")
        elif not kana and L.breaks and w["break_after"]:
            out.append(f"{{\\fs{p['base_fs']}\\c{_bgr(c['brk'])}\\b0\\u0}} {'//' if w['break_after'] == 2 else '/'}")
        out.append("{\\u0\\b0\\i0\\c" + _bgr(c["text"]) + "} ")
    return "".join(out).rstrip()


def to_ass(ir: dict, profile: dict | None = None, layers: Layers | None = None) -> str:
    p = {**PROFILE, **(profile or {})}
    L = layers or Layers()
    w, h = p["play_res"]
    hdr = ("[Script Info]\nScriptType: v4.00+\nWrapStyle: 0\nScaledBorderAndShadow: yes\n"
           f"PlayResX: {w}\nPlayResY: {h}\n\n[V4+ Styles]\n"
           "Format: Name,Fontname,Fontsize,PrimaryColour,SecondaryColour,OutlineColour,BackColour,Bold,Italic,Underline,StrikeOut,"
           "ScaleX,ScaleY,Spacing,Angle,BorderStyle,Outline,Shadow,Alignment,MarginL,MarginR,MarginV,Encoding\n"
           f"Style: Default,{p['font']},{p['base_fs']},{_bgr(p['colors']['text'])},&H000000FF&,&H00000000&,&H80000000&,0,0,0,0,"
           f"100,100,0,0,1,3,1,2,60,60,{p['margin_v']},1\n\n[Events]\n"
           "Format: Layer,Start,End,Style,Name,MarginL,MarginR,MarginV,Effect,Text\n")
    lines = []
    for ev in ir["events"]:
        kana = _line(ev["words"], True, p, L) if L.kana else ""
        eng = _line(ev["words"], False, p, L)
        text = (kana + "\\N" if kana else "") + eng
        lines.append(f"Dialogue: 0,{_ts(ev['start_ms'])},{_ts(ev['end_ms'])},Default,,0,0,0,,{text}")
    return hdr + "\n".join(lines) + "\n"
