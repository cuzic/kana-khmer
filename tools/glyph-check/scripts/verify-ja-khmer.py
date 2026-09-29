# /// script
# requires-python = ">=3.10"
# dependencies = ["fonttools", "brotli", "uharfbuzz"]
# ///
"""Shape-verify public/ja-khmer-font/ja-khmer.woff2 with uharfbuzz (docs/ja-khmer-spec.md §3.2, ADR-0009).

ADR-0009 policy: this does NOT import build-ja-khmer-font.py or call any of its functions. It shapes the SHIPPED
woff2 and recomputes every expectation from the source Noto Sans font (the same file the build reads) and plain
arithmetic, so a bug in the build's geometry code cannot pass on both sides. The thresholds below are written here on
purpose, independently of the build's constants (a wider band than the build's exact numbers: a real regression --
bar on the wrong side, off-centre, wrong width, advance changed -- still fails; a 1-unit tweak does not).

Checks
  1 each of ᵃ ᵉ ⁱ ᵒ ᵘ + U+0304 shapes to ONE glyph (ccmp), not .notdef, advance == the bare vowel's source advance
  2 that glyph = the source vowel outline (unchanged) + one bar above it: gap, thickness, centring, width, in range
  3 with ccmp disabled (no ligature) the fallback mark is zero-advance, above the vowel and roughly centred on it
  4 the nine consonant letters and five vowels are in the font, not .notdef; ʰ is the STANDARD source shape and
    differs from kana-support.woff2's custom ʰ (ADR-0015) if that file is present
  5 ˢʰ shapes to two glyphs, side by side with no overlap, same baseline (not tofu)
  6 no dotted circle (U+25CC) and no .notdef for any string, in this font and (if given) in Noto Sans Khmer for the
    Khmer bases the notation uses
  7 NFKC/NFKD collapse ᵒ + U+0304 to ō (U+014D) / o + U+0304: the reason NFKC/NFKD must never be applied (CLAUDE.md)

Judgement about how it LOOKS stays by eye (glyph-check page, ADR-0004); this only checks what a script can.

usage: uv run scripts/verify-ja-khmer.py NotoSans-Regular.ttf [NotoSansKhmer.ttf] [ja-khmer.woff2]
"""
import os, sys, unicodedata
import uharfbuzz as hb
from fontTools.pens.boundsPen import BoundsPen
from fontTools.ttLib import TTFont

HERE = os.path.dirname(os.path.abspath(__file__))
DEFAULT_FONT = os.path.join(HERE, "..", "public", "ja-khmer-font", "ja-khmer.woff2")
SUPPORT_FONT = os.path.join(HERE, "..", "public", "kana-font", "kana-support.woff2")
CONS, VOW, MACRON = "ˢʰᵗᶜʲᶻᶠʸʷ", "ᵃᵉⁱᵒᵘ", "̄"
PLAIN = {"ᵃ": "ā", "ᵉ": "ē", "ⁱ": "ī", "ᵒ": "ō", "ᵘ": "ū"}   # ā ē ī ō ū
# Khmer bases the notation uses (spec §5): every consonant-with-subscript / vowel-sign shape class it emits
KHMER_SAMPLES = ["អា", "អ៊ី", "តូ", "កុ", "ត្ស៊ឹ", "ហ្កា", "ហ្សូ", "ឆូ", "រ៉ូ", "យ៉ា", "ម៉ា", "ក្យូ", "ឃ្យូ", "ប៊ី", "ហ្វូ", "តៃ", "គីន", "ស៊ូក", "កេត"]


def main(src_path, khmer_path, font_path):
    fails, n = [], [0]

    def check(cond, msg):
        n[0] += 1
        if not cond: fails.append(msg)

    src = TTFont(src_path); scmap = src.getBestCmap(); sgs = src.getGlyphSet(); sglyf = src["glyf"]
    t = TTFont(font_path); t.flavor = None
    order = t.getGlyphOrder(); glyf = t["glyf"]; cmap = t.getBestCmap(); hmtx = t["hmtx"]
    tmp = font_path + ".tmp.ttf"
    t.save(tmp); font = hb.Font(hb.Face(open(tmp, "rb").read())); os.remove(tmp)

    def shape(text, features=None, fnt=None):
        buf = hb.Buffer(); buf.add_str(text); buf.guess_segment_properties()
        hb.shape(fnt or font, buf, features or {})
        return [(i.codepoint, p.x_advance, p.x_offset) for i, p in zip(buf.glyph_infos, buf.glyph_positions)]

    def src_bounds(ch):
        bp = BoundsPen(sgs); sgs[scmap[ord(ch)]].draw(bp); return bp.bounds

    def glyph_contours(name):
        """[(xMin, yMin, xMax, yMax)] per contour, straight from the glyph's own points."""
        g = glyf[name]
        coords, ends, _ = g.getCoordinates(glyf)
        out, start = [], 0
        for e in ends:
            xs = [c[0] for c in coords[start:e + 1]]; ys = [c[1] for c in coords[start:e + 1]]
            out.append((min(xs), min(ys), max(xs), max(ys))); start = e + 1
        return out

    def src_points(ch):
        g = sglyf[scmap[ord(ch)]]; coords, ends, flags = g.getCoordinates(sglyf)
        return list(coords), list(ends), list(flags)

    # ---- 1-3: the five composites
    for v in VOW:
        label = v + "+U+0304"
        base_gid, adv0 = cmap[ord(v)], hmtx.metrics[cmap[ord(v)]][0]
        sb = src_bounds(v); sadv = sgs[scmap[ord(v)]].width
        seq = shape(v + MACRON)
        check(len(seq) == 1, f"{label}: expected 1 glyph after shaping, got {len(seq)}")
        if len(seq) != 1: continue
        gid, adv, _ = seq[0]
        check(gid != 0, f"{label}: .notdef")
        name = order[gid]
        check(name != base_gid, f"{label}: shaped to the bare vowel glyph (no composite)")
        check(adv == sadv, f"{label}: advance {adv} != source vowel advance {sadv}")
        cs = glyph_contours(name)
        # the bar is the contour highest up; everything else must reproduce the source vowel's ink exactly
        bar = max(cs, key=lambda c: c[1]); rest = [c for c in cs if c is not bar]
        check(len(cs) >= 2, f"{label}: {len(cs)} contour(s), expected vowel + bar")
        if not rest: continue
        rb = (min(c[0] for c in rest), min(c[1] for c in rest), max(c[2] for c in rest), max(c[3] for c in rest))
        check(tuple(round(x) for x in rb) == tuple(round(x) for x in sb), f"{label}: vowel part bounds {rb} != source {sb}")
        gap, thick, bw = bar[1] - sb[3], bar[3] - bar[1], bar[2] - bar[0]
        ink_w, ink_c = sb[2] - sb[0], (sb[0] + sb[2]) / 2
        check(25 <= gap <= 90, f"{label}: gap between vowel top and bar {gap} outside 25..90")
        check(30 <= thick <= 60, f"{label}: bar thickness {thick} outside 30..60")
        check(abs((bar[0] + bar[2]) / 2 - ink_c) <= 15, f"{label}: bar centre {(bar[0]+bar[2])/2} vs vowel ink centre {ink_c}")
        check(bw >= min(0.6 * ink_w, 150) and bw <= max(1.1 * ink_w, 230), f"{label}: bar width {bw} vs ink width {ink_w}")
        check(bar[0] >= -40 and bar[2] <= sadv + 40, f"{label}: bar {bar[0]}..{bar[2]} sticks out of advance 0..{sadv}")
        # 3: fallback (ligature switched off)
        fb = shape(v + MACRON, {"ccmp": False})
        check(len(fb) == 2 and fb[0][0] == base_gid_id(cmap, v, order) and fb[1][1] == 0,
              f"{label}: no-ccmp fallback should be [vowel, zero-advance mark], got {fb}")
        if len(fb) == 2 and v == "ⁱ":
            print("  note: no-GSUB fallback for ⁱ is not positioned (one shared mark glyph; ⁱ is narrow and taller). Only reachable where ccmp does not run.")
        elif len(fb) == 2:
            mc = glyph_contours(order[fb[1][0]])[0]
            mid = sadv + (mc[0] + mc[2]) / 2
            check(abs(mid - ink_c) <= 45, f"{label}: fallback mark centre {mid} vs vowel ink centre {ink_c}")
            check(mc[1] - sb[3] >= 10, f"{label}: fallback mark bottom {mc[1]} not above vowel top {sb[3]}")

    # ---- 4: letters present, ʰ is the standard shape
    for ch in CONS + VOW:
        seq = shape(ch)
        check(len(seq) == 1 and seq[0][0] != 0, f"{ch} U+{ord(ch):04X}: missing/.notdef")
        check(seq and seq[0][1] == sgs[scmap[ord(ch)]].width, f"{ch}: advance differs from source Noto Sans")
    hc = shape("ʰ")[0][0]
    src_h = [tuple(c) for c in _contours_from(src_points("ʰ"))]
    check([tuple(c) for c in glyph_contours(order[hc])] == src_h, "ʰ is not the standard Noto Sans shape")
    if os.path.exists(SUPPORT_FONT):
        sup = TTFont(SUPPORT_FONT); sc = sup.getBestCmap()
        sg = sup["glyf"]; co, en, _ = sg[sc[0x02B0]].getCoordinates(sg)
        custom = [tuple(c) for c in _contours_from((list(co), list(en), None))]
        check(custom != src_h, "kana-support.woff2's ʰ (ADR-0015 custom) equals the standard ʰ: conflict test is vacuous")
        print(f"  kana-support ʰ: {len(custom)} contours (custom), ja-khmer ʰ: {len(src_h)} contours (standard)")
    else:
        print("  (kana-support.woff2 absent; ADR-0015 distinctness not checked)")

    # ---- 5: ˢʰ side by side
    sh = shape("ˢʰ")
    check(len(sh) == 2 and 0 not in [g for g, _, _ in sh], f"ˢʰ: {sh}")
    if len(sh) == 2:
        a, b = glyph_contours(order[sh[0][0]]), glyph_contours(order[sh[1][0]])
        s_right = max(c[2] for c in a); h_left = sh[0][1] + min(c[0] for c in b)
        check(h_left - s_right >= 20, f"ˢʰ: ink of ˢ ends at {s_right}, ʰ starts at {h_left} (touching/overlapping)")
        check(abs(min(c[1] for c in a) - min(c[1] for c in b)) <= 12, "ˢʰ: different baselines")

    # ---- 6: no dotted circle, no .notdef
    dc = cmap.get(0x25CC)
    check(dc is None, "font maps U+25CC (dotted circle)")
    for text in ["ˢʰ", "ˢʰᵒ̄", "ᵃ̄ⁱ̄ᵘ̄ᵉ̄ᵒ̄", "ᵗᶜʲᶻᶠʸʷ", "ᵃᵃ ⁱⁱ ᵘᵘ ᵉᵉ ᵒᵒ".replace(" ", "")]:
        gids = [g for g, _, _ in shape(text)]
        check(0 not in gids, f"{text!r}: .notdef in {gids}")
    if khmer_path:
        kfont = hb.Font(hb.Face(open(khmer_path, "rb").read()))
        kt = TTFont(khmer_path); kn = kt.getGlyphOrder(); kcm = kt.getBestCmap(); dcg = kcm.get(0x25CC)
        for text in KHMER_SAMPLES:
            names = [kn[g] for g, _, _ in shape(text, None, kfont)]
            check(all(nm != ".notdef" for nm in names), f"Khmer {text}: .notdef {names}")
            check(dcg is None or dcg not in names, f"Khmer {text}: dotted circle {names}")
        print(f"  Khmer font checked on {len(KHMER_SAMPLES)} samples")

    # ---- 7: NFKC/NFKD
    for v, plain in PLAIN.items():
        nfkc = unicodedata.normalize("NFKC", v + MACRON)
        check(nfkc == plain, f"NFKC({v}+U+0304) = {[hex(ord(c)) for c in nfkc]}, expected {hex(ord(plain))}")
        check(v not in nfkc, f"NFKC kept the superscript {v}")
        nfkd = unicodedata.normalize("NFKD", v + MACRON)
        check(nfkd == unicodedata.normalize("NFKD", plain) and v not in nfkd and len(nfkd) == 2, f"NFKD({v}+U+0304) = {[hex(ord(c)) for c in nfkd]}")
    check(unicodedata.normalize("NFKC", "ᵒ̄") == "ō", "NFKC(ᵒ+U+0304) != ō (U+014D)")
    check(unicodedata.normalize("NFKC", "ˢʰ") == "sh", "NFKC(ˢʰ) != 'sh'")

    print(f"{n[0]} checks, {len(fails)} failed")
    for f in fails: print("FAIL:", f)
    print("ALL CHECKS PASSED" if not fails else "FAILED")
    return 1 if fails else 0


def base_gid_id(cmap, ch, order):
    return order.index(cmap[ord(ch)])


def _contours_from(pts):
    coords, ends = pts[0], pts[1]
    out, start = [], 0
    for e in ends:
        xs = [c[0] for c in coords[start:e + 1]]; ys = [c[1] for c in coords[start:e + 1]]
        out.append((min(xs), min(ys), max(xs), max(ys))); start = e + 1
    return out


if __name__ == "__main__":
    if len(sys.argv) < 2: sys.exit(__doc__)
    args = sys.argv[1:]
    src = args[0]
    khmer = args[1] if len(args) > 1 and args[1].endswith(".ttf") else None
    font = next((a for a in args[1:] if a.endswith(".woff2")), DEFAULT_FONT)
    sys.exit(main(src, khmer, font))
