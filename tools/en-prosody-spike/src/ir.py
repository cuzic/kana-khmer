"""中間表現(IR)。分析結果(analyze.W)を JSON にする。変換器(to_*.py)は IR だけを読む。

IR v0.1 の形:
{
  "version": "0.1",
  "source": {"id": ..., "manual": ..., "auto": ..., "audio": ...},
  "provenance": {"method": "rule-v0", "note": "規則による推定。正解データでの検証は未実施"},
  "events": [{
    "index": 0, "start_ms": 61200, "end_ms": 63100, "text": "The second is that it's put us in a place",
    "words": [{
      "text": "second",              # 手動字幕のまま(句読点つき)
      "norm": "second",
      "start_ms": 61500, "timed": true,   # timed=false は補間した時刻
      "kind": "speech" | "note",          # note は (Laughter) 等。発音・強勢を付けない
      "prominence": 0..3,                 # 0 弱形 / 1 機能語 / 2 内容語 / 3 核(まとまりの最後の内容語)
      "beat": 0|1|2,                      # 0 · / 1 ● 強い語 / 2 ◎ 核を兼ねる強い語。語単位(音節単位ではない)
      "group": 12,                        # 意味のまとまりの番号(イベントをまたぐ通し番号)
      "break_after": 0|1|2,               # 0 なし / 1 小さな切れ / 2 大きな切れ
      "pause_ms": 0,                      # 語の直後の無音(音声から測定)
      "linked_next": false,               # 次の語と連結する
      "carry_out": "T" | null,            # 次の語の頭に移した語末の子音(what I → what の t)。kana は移した後の形
      "carry_in": "T" | null,             # 前の語から受け取った子音
      "phones": ["S","EH1",...] | null,   # 推定の発音(弱形・語境界の変化を反映)。ARPABET
      "kana": "セㇰᵊンㇳ゙",                # 詳細(カナ + 右肩の IPA)。音素認識を渡したときは音声による形(信頼できない語は規則)
      "kana_rule": "セㇰᵊンㇳ゙",           # 規則だけで作った形(音声を使わない)
      "audio": {"match": 0.83, "reliable": true} | null,  # 音素認識の整列の一致率。null は観測なし(規則のまま)
      "kana_lite": "セㇰンㇳ"              # ライト(右肩の IPA を除く)
    }]
  }]
}
"""
from __future__ import annotations

import re

from analyze import W

IR_VERSION = "0.1"
MODS = set("ʳˡᶿᶞᵛᵆᶺᶦᶷᵓᵊᵑᵈᵇᵍᶻᶾᵗʰᶟ")


def lite(kana: str) -> str:
    return "".join(c for c in kana if c not in MODS)


def _prominence(w: W) -> int:
    if w.nucleus:
        return 3
    if w.content:
        return 2
    return 0 if w.weak else 1


def build_ir(ws: list[W], manual: list[tuple[int, int, str]], source: dict, rule: list[W] | None = None) -> dict:
    events: dict[int, dict] = {}
    group = 0
    for n, w in enumerate(ws):
        ev = events.setdefault(w.event, {
            "index": w.event, "start_ms": manual[w.event][0], "end_ms": manual[w.event][0] + manual[w.event][1],
            "text": manual[w.event][2], "words": []})
        note = bool(re.match(r"[(\[]", w.text))
        ev["words"].append({
            "text": w.text, "norm": w.norm, "start_ms": round(w.start_ms), "timed": w.timed,
            "kind": "note" if note else "speech",
            "prominence": 2 if note else _prominence(w),
            "beat": 0 if note else {3: 2, 2: 1}.get(_prominence(w), 0),
            "group": group, "break_after": w.break_after, "pause_ms": round(w.pause_ms),
            "linked_next": w.linked_next, "carry_out": w.carry_out, "carry_in": w.carry_in, "phones": w.phones, "kana": w.kana, "kana_lite": lite(w.kana),
            "kana_rule": rule[n].kana if rule else w.kana,
            "audio": {"match": round(w.obs.match, 2), "reliable": w.obs.reliable} if w.obs else None,
        })
        if w.break_after:
            group += 1
    return {"version": IR_VERSION, "source": source,
            "provenance": {"method": "rule-v0", "note": "規則による推定。正解データでの検証は未実施"},
            "events": [events[k] for k in sorted(events)]}
