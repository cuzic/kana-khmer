"""IR → SRT。SRT にはフォントサイズの標準が無いので、強勢は <b>、核は <u>+色、弱形は色(灰)で近似する。"""
from __future__ import annotations

from html import escape


def _ts(ms: float) -> str:
    ms = round(ms)
    return f"{ms // 3600000:02d}:{ms // 60000 % 60:02d}:{ms // 1000 % 60:02d},{ms % 1000:03d}"


def _eng(words: list[dict]) -> str:
    out = []
    for w in words:
        t, pr = escape(w["text"]), w["prominence"]
        if w["kind"] == "note":
            t = f"<i>{t}</i>"
        elif pr == 3:
            t = f'<font color="#ff6b5b"><b><u>{t}</u></b></font>'
        elif pr == 2:
            t = f"<b>{t}</b>"
        elif pr == 0:
            t = f'<font color="#a9aeb8">{t}</font>'
        out.append(t)
        if w["break_after"] and w["kind"] != "note":
            out.append('<font color="#9aa0a6">' + ("//" if w["break_after"] == 2 else "/") + "</font>")
    return " ".join(out)


def _kana(words: list[dict], lite: bool) -> str:
    parts = []
    for w in words:
        k = w["kana_lite" if lite else "kana"]
        if w["kind"] == "speech" and k:
            parts.append(k + ("‿" if w["linked_next"] else ""))
    return " ".join(parts).replace("‿ ", "‿")


def to_srt(ir: dict, lite: bool = False) -> str:
    out = []
    for i, ev in enumerate(ir["events"], 1):
        k = _kana(ev["words"], lite)
        body = (f'<font color="#8cc4ff">{escape(k)}</font>\n' if k else "") + _eng(ev["words"])
        out.append(f"{i}\n{_ts(ev['start_ms'])} --> {_ts(ev['end_ms'])}\n{body}\n")
    return "\n".join(out)
