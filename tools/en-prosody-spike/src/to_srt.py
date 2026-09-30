"""IR → SRT。SRT にはフォントサイズの標準が無いので、強勢は <b>、核は <u>+色、弱形は色(灰)で近似する。見せる層は Layers で選ぶ。
ビートは、語の直前に小さな ● / ◎ を置いて出す。"""
from __future__ import annotations

from html import escape

from ir import lite as strip_ipa
from layers import Layers


def _ts(ms: float) -> str:
    ms = round(ms)
    return f"{ms // 3600000:02d}:{ms // 60000 % 60:02d}:{ms // 1000 % 60:02d},{ms % 1000:03d}"


def _eng(words: list[dict], L: Layers) -> str:
    out = []
    for w in words:
        t, pr = escape(w["text"]), w["prominence"]
        if w["kind"] == "note":
            t = f"<i>{t}</i>"
        else:
            if L.nucleus and pr == 3:
                t = f'<font color="#ff6b5b"><u>{t}</u></font>'
            elif L.weak and pr == 0:
                t = f'<font color="#a9aeb8">{t}</font>'
            if L.bold and pr >= 2:
                t = f"<b>{t}</b>"
            if L.beat and w.get("beat", 0) > 0:
                t = f'<font color="#8cc4ff">{"●◎"[w["beat"] - 1]}</font>{t}'
        out.append(t)
        if L.breaks and w["break_after"] and w["kind"] != "note":
            out.append('<font color="#9aa0a6">' + ("//" if w["break_after"] == 2 else "/") + "</font>")
    return " ".join(out)


def _kana(words: list[dict], L: Layers) -> str:
    parts = []
    for w in words:
        k = w["kana"] if L.audio else w.get("kana_rule", w["kana"])
        if not L.ipa:
            k = strip_ipa(k)
        if w["kind"] == "speech" and k:
            parts.append(k + ("‿" if (L.link and w["linked_next"]) else ""))
    return " ".join(parts).replace("‿ ", "‿")


def to_srt(ir: dict, layers: Layers | None = None) -> str:
    L = layers or Layers()
    out = []
    for i, ev in enumerate(ir["events"], 1):
        k = _kana(ev["words"], L) if L.kana else ""
        body = (f'<font color="#8cc4ff">{escape(k)}</font>\n' if k else "") + _eng(ev["words"], L)
        out.append(f"{i}\n{_ts(ev['start_ms'])} --> {_ts(ev['end_ms'])}\n{body}\n")
    return "\n".join(out)
