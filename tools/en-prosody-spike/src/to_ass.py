"""IR → ASS。強勢・弱化はフォントサイズ(\\fs)で表す。上の行=推定の発音のカナ、下の行=英語。見せる層は Layers で選ぶ。

語ごとの位置合わせ(ルビのようにカナを語の真上に置く)はしていない。カナ行と英語行は別々に折り返す。
ビートは、語の直前に小さな ● / ◎ を置いて出す(語に付くので位置はずれない)。
"""
from __future__ import annotations

import re
import sys

from ass_font import FAMILY, fonts_section
from ir import lite as strip_ipa
from layers import Layers
from mouth import resolve_mode, silent_mouth

PROFILE = {
    "font": "Noto Sans JP", "play_res": (1920, 1080), "base_fs": 58, "kana_scale": 0.62, "margin_v": 70,
    # prominence 0..3 → 基準サイズに対する倍率
    "size": {0: 0.72, 1: 0.86, 2: 1.0, 3: 1.22},
    "bold_from": 2,
    # 無音の口形(斜線で消したナ行・ウ)は、淡く小さく(\1a \3a \4a は本文・縁・影の透明度。縁と影も淡くしないと、小さい口形が黒い縁に埋もれて暗く見える。戻すときは Style の値に。16 進で 78 ≒ 47%)。ADR-0035
    "mouth_alpha": "78", "mouth_scale": 0.72,
    "style_alpha": {"outline": "00", "shadow": "80"},   # Style 行の OutlineColour / BackColour の alpha(戻すときの値)
    "colors": {"text": "FFFFFF", "weak": "A9AEB8", "nucleus": "FF6B5B", "kana": "8CC4FF", "brk": "9AA0A6", "note": "9AA0A6", "beat": "8CC4FF"},
}


def _bgr(rgb: str) -> str:
    return f"&H{rgb[4:6]}{rgb[2:4]}{rgb[0:2]}&"


def _ts(ms: float) -> str:
    cs = round(ms / 10)
    return f"{cs // 360000}:{cs // 6000 % 60:02d}:{cs // 100 % 60:02d}.{cs % 100:02d}"


def _esc(s: str) -> str:
    return s.replace("\\", "").replace("{", "(").replace("}", ")")


def _kana_of(w: dict, L: Layers, mouth: str = "off") -> str:
    k = w["kana"] if L.audio else w.get("kana_rule", w["kana"])
    k = silent_mouth(k, mouth)   # 口形は右肩の字ではないので、ライトでも残る
    return k if L.ipa else strip_ipa(k)


_MOUTH_RE = re.compile("[\ue100-\ue106]|[ナニヌネノウㇴ]\u0338")


def _style_mouth(txt: str, fs: int, p: dict) -> str:
    """斜線で消した口形のカナを、淡く小さくする。"""
    ms = round(fs * p["mouth_scale"])
    a, st = p["mouth_alpha"], p["style_alpha"]
    on = f"{{\\1a&H{a}&\\3a&H{a}&\\4a&H{a}&\\fs{ms}}}"
    off = f"{{\\1a&H00&\\3a&H{st['outline']}&\\4a&H{st['shadow']}&\\fs{fs}}}"
    return _MOUTH_RE.sub(lambda m: on + m.group(0) + off, txt)


def _line(words: list[dict], kana: bool, p: dict, L: Layers, mouth: str = "off", fn: bool = False) -> str:
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
            k = _kana_of(w, L, mouth)
            if w["kind"] == "note" or not k:
                continue
            txt = k
        else:
            txt = w["text"]
            if L.beat and w["kind"] != "note" and w.get("beat", 0) > 0:
                out.append(f"{{\\fs{round(p['base_fs'] * 0.5)}\\c{_bgr(c['beat'])}\\b0\\u0\\i0}}{'●◎'[w['beat'] - 1]}")
        fnt = f"\\fn{FAMILY if kana else p['font']}" if fn else ""
        body = _style_mouth(_esc(txt), fs, p) if kana and mouth != "off" else _esc(txt)
        out.append(f"{{\\fs{fs}\\c{_bgr(col)}{extra}{fnt}}}{body}")
        if kana and L.link and w["linked_next"]:
            out.append(f"{{\\fs{fs}\\c{_bgr(c['brk'])}\\b0\\u0}}‿")
        elif not kana and L.breaks and w["break_after"]:
            out.append(f"{{\\fs{p['base_fs']}\\c{_bgr(c['brk'])}\\b0\\u0}} {'//' if w['break_after'] == 2 else '/'}")
        out.append("{\\u0\\b0\\i0\\c" + _bgr(c["text"]) + (f"\\fn{p['font']}" if fn else "") + "} ")
    return "".join(out).rstrip()


def to_ass(ir: dict, profile: dict | None = None, layers: Layers | None = None, mouth: str | None = None, embed_font: bool = True) -> str:
    p = {**PROFILE, **(profile or {})}
    L = layers or Layers()
    mouth = resolve_mode(mouth)
    fonts = ""
    if embed_font:   # 小書きの濁音・口形のグリフは kana-multi にしかないので、埋め込んで kana の行に使う
        try:
            fonts = fonts_section()
        except FileNotFoundError as e:
            print(f"warning: フォントを埋め込めません({e})", file=sys.stderr)
            if mouth == "pua":   # PUA はフォントがないと豆腐になる。合字なら、斜線つきのカナに縮退する
                print("warning: --mouth pua を lig に切り替えます", file=sys.stderr)
                mouth = "lig"
    if mouth == "pua" and not embed_font:
        print("warning: --mouth pua で --no-embed-font です。KanaMulti がシステムにないと、口形は豆腐になります", file=sys.stderr)
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
        kana = _line(ev["words"], True, p, L, mouth, bool(fonts)) if L.kana else ""
        eng = _line(ev["words"], False, p, L, mouth, bool(fonts))
        text = (kana + "\\N" if kana else "") + eng
        lines.append(f"Dialogue: 0,{_ts(ev['start_ms'])},{_ts(ev['end_ms'])},Default,,0,0,0,,{text}")
    return hdr + "\n".join(lines) + "\n" + (("\n" + fonts) if fonts else "")
