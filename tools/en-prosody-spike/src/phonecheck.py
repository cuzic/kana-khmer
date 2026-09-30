"""音素認識(wav2vec2 espeak CTC)の出力を、字幕の語ごとの期待音素と系列で照合し、規則(弾き音・弱形)が実際の音と合うかを測る。

使い方: uv run python src/phonecheck.py MANUAL.json3 AUTO.json3 AUDIO.wav PHONES.json [OUT_DIR]
PHONES.json は [{"t": 秒, "p": espeak の音素}, ...](音素認識の貪欲デコード。~ 作り方は README)。
語への割り当ては、自動字幕の時刻(粗い)ではなく、音素列どうしの帯つき動的計画法で行う。
"""
from __future__ import annotations

import json
import sys
from collections import Counter
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from align import align, load_auto, load_manual
from analyze import WEAK, analyze, lookup
from audio import Audio
from kana import split_phone

from observe import CONS_STOP, IPA, REDUCED_IPA, band_align, is_v  # noqa: E402


def main() -> None:
    manual_p, auto_p, wav_p, phones_p = sys.argv[1:5]
    out_dir = Path(sys.argv[5] if len(sys.argv) > 5 else Path(__file__).parent.parent / "out")
    out_dir.mkdir(parents=True, exist_ok=True)
    manual = load_manual(manual_p)
    ws = analyze(align(manual, load_auto(auto_p)), Audio(wav_p))
    raw = json.load(open(phones_p))
    # 認識列を種類に展開(複合トークンは同じ時刻で展開)
    rec: list[tuple[str, float]] = []
    rec_ipa: list[str] = []
    for r in raw:
        p = r["p"].replace("ː", "ː")
        kinds = IPA.get(p) or IPA.get(p.rstrip("ː"))
        if not kinds:
            continue
        for k in kinds:
            rec.append((k, r["t"])); rec_ipa.append(p)
    t_lo, t_hi = raw[0]["t"] - 1, raw[-1]["t"] + 1
    # 期待列: 各語の引用形(CMUdict)。規則の予測は W から取る
    exp: list[tuple[str, float]] = []
    exp_meta: list[tuple[int, int]] = []  # (語 index, 語内の位置)
    used = []
    for wi, w in enumerate(ws):
        if not w.phones or w.start_ms / 1000 < t_lo or w.start_ms / 1000 > t_hi or w.text[:1] in "([":
            continue
        cit = lookup(w.norm) or []
        used.append(wi)
        for k, ph in enumerate(cit):
            exp.append((split_phone(ph)[0], w.start_ms / 1000 + 0.075 * k))
            exp_meta.append((wi, k))
    pairs = band_align(exp, rec)
    # 語ごとの集計: 期待の index → 認識の index
    e2r: dict[int, int | None] = {}
    for ei, rj in pairs:
        if ei is not None:
            e2r[ei] = rj
    match = sum(1 for ei, rj in e2r.items() if rj is not None and rec[rj][0] == exp[ei][0])
    sub = sum(1 for ei, rj in e2r.items() if rj is not None and rec[rj][0] != exp[ei][0])
    dele = sum(1 for rj in e2r.values() if rj is None)
    ins = sum(1 for ei, rj in pairs if ei is None)
    lines = [f"語数 {len(used)} / 期待音素 {len(exp)} / 認識音素 {len(rec)}",
             f"整列: 一致 {match} ({100*match/len(exp):.1f}%) 置換 {sub} 脱落 {dele} 挿入 {ins}", ""]
    # 語ごとの位置 → 期待 index
    by_word: dict[int, list[int]] = {}
    for ei, (wi, k) in enumerate(exp_meta):
        by_word.setdefault(wi, []).append(ei)

    def obs(ei: int):
        rj = e2r.get(ei)
        return None if rj is None else (rec[rj][0], rec_ipa[rj])

    # ---- 弾き音 ----
    cnt = Counter()
    for wi in used:
        w = ws[wi]
        eis = by_word[wi]
        cit = [split_phone(p)[0] for p in (lookup(w.norm) or [])]
        nxt = ws[wi + 1] if wi + 1 < len(ws) and w.break_after == 0 and ws[wi + 1].phones else None
        for k, c in enumerate(cit):
            if c not in ("T", "D") or k == 0:
                continue
            prev_v = is_v(cit[k - 1]) or (cit[k - 1] == "R" and k > 1 and is_v(cit[k - 2]))
            if not prev_v:
                continue
            if k + 1 < len(cit):
                nv = is_v(cit[k + 1])
                kind = "語内"
            else:
                nv = bool(nxt and nxt.phones and is_v(split_phone(nxt.phones[0])[0]))
                kind = "語末→母音語" if nv else "語末→子音/休止"
            if not nv:
                continue
            pred = (k in w.flap_at) or (k == len(cit) - 1 and bool(nxt and nxt.flap_carry))
            o = obs(eis[k])
            o_kind = "欠測" if o is None else ("弾き音" if o[0] == "FLAP" else "声門閉鎖" if o[0] == "GLOT" else "t/d" if o[0] in ("T", "D") else "他")
            cnt[(kind, "規則=弾き音" if pred else "規則=弾かない", o_kind)] += 1
    lines.append("## 弾き音(母音にはさまれた T/D)")
    lines.append("場所, 規則の予測, 認識された音 → 件数")
    for k, v in sorted(cnt.items()):
        lines.append(f"  {k[0]:10} {k[1]:10} {k[2]:6} {v}")
    tot = sum(v for k, v in cnt.items() if k[1] == "規則=弾き音")
    ok = sum(v for k, v in cnt.items() if k[1] == "規則=弾き音" and k[2] == "弾き音")
    lines.append(f"  → 規則が弾き音と予測した {tot} 件のうち、認識も弾き音: {ok} ({100*ok/max(1,tot):.0f}%)")
    # ---- 弱形 ----
    lines.append("")
    lines.append("## 機能語の母音が弱まったか(認識が ə ɐ ɪ ᵻ ɚ のいずれか)")
    wc = Counter()
    per_word: dict[str, Counter] = {}
    for wi in used:
        w = ws[wi]
        if w.norm not in WEAK:
            continue
        cit = [split_phone(p)[0] for p in (lookup(w.norm) or [])]
        vi = [k for k, c in enumerate(cit) if is_v(c)]
        if not vi:
            continue
        o = obs(by_word[wi][vi[0]])
        red = None if o is None else (o[1] in REDUCED_IPA)
        wc[("規則=弱形" if w.weak else "規則=強形(句末など)", "欠測" if red is None else "弱まった" if red else "強いまま")] += 1
        if w.weak and red is not None:
            per_word.setdefault(w.norm, Counter())["弱" if red else "強"] += 1
    for k, v in sorted(wc.items()):
        lines.append(f"  {k[0]:18} {k[1]:6} {v}")
    for lab in ("規則=弱形", "規則=強形(句末など)"):
        a = wc[(lab, "弱まった")]; b = wc[(lab, "強いまま")]
        lines.append(f"  → {lab}: 弱まった {a} / 強いまま {b} ({100*a/max(1,a+b):.0f}% が弱まった)")
    lines.append("  語ごと(規則=弱形のもの。弱 = 認識が弱い母音、強 = 強いまま):")
    for wn, c in sorted(per_word.items(), key=lambda kv: -sum(kv[1].values())):
        if sum(c.values()) >= 3:
            lines.append(f"    {wn:8} 弱 {c['弱']:3} / 強 {c['強']:3}  ({100*c['弱']/sum(c.values()):.0f}% 弱)")
    # ---- 語末 T/D の脱落(次が子音の語) ----
    lines.append("")
    lines.append("## 語末の T/D(次の語が子音で始まる、または休止)が認識されたか")
    dc = Counter()
    for wi in used:
        w = ws[wi]
        cit = [split_phone(p)[0] for p in (lookup(w.norm) or [])]
        if not cit or cit[-1] not in ("T", "D") or len(cit) < 2:
            continue
        nxt = ws[wi + 1] if wi + 1 < len(ws) and ws[wi + 1].phones else None
        if nxt and is_v(split_phone(nxt.phones[0])[0]) and w.break_after == 0:
            continue
        o = obs(by_word[wi][len(cit) - 1])
        dc["欠測(脱落)" if o is None else "認識された" if o[0] in ("T", "D") else "他の音"] += 1
    for k, v in dc.items():
        lines.append(f"  {k}: {v}")
    # ---- 口蓋化の候補 ----
    lines.append("")
    lines.append("## 口蓋化の候補(語末の T/D/S/Z + you/your)で、境界に tʃ dʒ ʃ ʒ が出たか")
    pc = Counter()
    for wi in used:
        w = ws[wi]
        nxt = ws[wi + 1] if wi + 1 < len(ws) else None
        cit = [split_phone(p)[0] for p in (lookup(w.norm) or [])]
        if not (nxt and nxt.norm in ("you", "your", "you're", "you've", "you'll") and cit and cit[-1] in ("T", "D", "S", "Z") and w.break_after == 0):
            continue
        o = obs(by_word[wi][len(cit) - 1])
        pc[f"{w.text} {nxt.text}: " + ("欠測" if o is None else o[1])] += 1
    for k, v in sorted(pc.items()):
        lines.append(f"  {k} ×{v}")
    text = "\n".join(lines)
    (out_dir / "phonecheck.txt").write_text(text)
    print(text)


if __name__ == "__main__":
    main()
