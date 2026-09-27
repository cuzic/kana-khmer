# /// script
# requires-python = ">=3.10"
# dependencies = ["fonttools", "brotli"]
# ///
"""Build kana-multi.woff2: katakana + every mark the multi-language notation needs, in ONE font.

Why one font: on Android a base and its combining mark must be covered by a single font, else the cluster is tofu.

Contents
  - Katakana U+30A0-30FF from Noto Sans JP (wght 400, OFL).
  - The small final-consonant kana ㇰ..ㇿ (U+31F0-31FF), redrawn smaller and set on the baseline, and ㇷ + U+309A
    ligated to one glyph (the same treatment as kana-c.woff2).
  - Superscript letters, all drawn here from Noto Sans Latin letters at one scale so they look like one family:
      ʰ ʱ ʲ ʷ ⁿ ˣ ˠ ʶ ˀ ˤ 𐞥(U+107A5, q) ʳ ˡ ᶿ ᶞ ᵑ  and the vowel-quality set ᵓ ᵊ ᵋ ᵅ ᶤ.
  - ħ: the sequence ʰ + U+0335 (combining short stroke) ligates to one superscript ħ. Without GSUB it degrades to ʰ
    with a stroke, so the text keeps its meaning.
  - U+0323 (dot below): a real zero-advance mark centred under a kana. Hindi retroflex / Arabic emphatic.
  - U+0330 (tilde below): creaky voice, drawn as a wave under the kana (Burmese creaky tone).
  - Tone: the canonical encoding is 1-3 Chao tone bars (U+02E5..U+02E9, high to low), per docs/tone-notation.md.
    A solo bar is a flat line at that level, no arrowhead; a 2- or 3-bar sequence is a polyline through those levels
    with an arrowhead at the end, against a thin reference stem so height reads. Every 1-3 length combination of the
    five levels has its own contour glyph (155 total: 5 solo + 25 pairs + 125 triples), reached either directly
    (a bar sequence ligates to it) or via the five legacy single-codepoint diacritic aliases (U+0304/0300/0302/0301/
    030C -- kept as shortcuts to the same glyphs; new data should write bar sequences).
    The contour is centred on, and stretched to, the whole syllable (kana + modifiers) rather than drawn over just
    the last kana, following the design settled by the docs/tone-spike.md CI spike (real iOS/Android devices):
    syllable data carries a U+E000 start marker plus a U+2062/U+2063 width hint right before the tone bars, because
    neither signal alone survives shaping in every engine (see docs/tone-notation.md §3.1.1). The line's length is
    capped at SPAN_MAX so it doesn't go flat on long syllables.

usage: uv run scripts/build-kana-multi-font.py NotoSansJP-VF.ttf NotoSans-Regular.ttf [out.woff2]
Both source fonts are OFL-licensed; keep the license notice when shipping.
"""
import itertools, math, os, sys, tempfile
from fontTools import subset
from fontTools.feaLib.builder import addOpenTypeFeaturesFromString
from fontTools.pens.boundsPen import BoundsPen
from fontTools.pens.recordingPen import DecomposingRecordingPen
from fontTools.pens.transformPen import TransformPen
from fontTools.pens.ttGlyphPen import TTGlyphPen
from fontTools.ttLib import TTFont, newTable
from fontTools.ttLib.tables._c_m_a_p import cmap_format_12
from fontTools.varLib import instancer

SUP_SCALE = 0.62     # Latin letter -> superscript size
SUP_RAISE = 400      # baseline of a superscript, in font units (kana cell is 1000 wide, ~880 tall)
STEM = 30            # thickness of the reference stem
STROKE = 58          # tone line thickness
SMALL_SCALE = 0.80   # ㇰ..ㇿ relative to Noto's own small kana
ANCHOR_X = 500
HANDAKUTEN_GAP, HANDAKUTEN_SCALE = 40, 0.8
SMALL = list(range(0x31F0, 0x3200))
MARK_H = 0x309A
OUT_DEFAULT = "public/kana-font/kana-multi.woff2"

# code point -> Latin letter it is drawn from
SUPERSCRIPTS = {
    0x02B0: "h", 0x02B1: "ɦ", 0x02B2: "j", 0x02B7: "w", 0x207F: "n", 0x02E3: "x", 0x02E0: "ɣ", 0x02B6: "ʁ",
    0x02C0: "ʔ", 0x02E4: "ʕ", 0x107A5: "q", 0x02B3: "r", 0x02E1: "l",
    0x1DBF: "θ", 0x1D9E: "ð", 0x1D51: "ŋ",
    0x1D53: "ɔ", 0x1D4A: "ə", 0x1D4B: "ɛ", 0x1D45: "ɑ", 0x1DA4: "ɨ",
}
HBAR_CP = 0x0127     # ħ, drawn as the superscript for the ʰ + U+0335 ligature
STROKE_CP, DOT_CP, CREAKY_CP = 0x0335, 0x0323, 0x0330
TONE_X0, TONE_X1 = -800, -200                          # relative to the cell centre (the mark sits at x=-500)
TONE_Y = {1: 1010, 2: 1130, 3: 1250, 4: 1370, 5: 1490}  # level -> height above the kana
TONE_BAR_CP = {5: 0x02E5, 4: 0x02E6, 3: 0x02E7, 2: 0x02E8, 1: 0x02E9}   # Chao tone bars ˥˦˧˨˩, canonical encoding
# legacy combining-diacritic aliases (docs/tone-notation.md §2.3): code point -> level tuple, same glyph as the bar form
TONE_LEGACY_CP = {0x0304: (3,), 0x0300: (2, 1), 0x0302: (5, 1), 0x0301: (4, 5), 0x030C: (1, 4)}
# syllable-wide positioning (docs/tone-notation.md §3.1.1-3.1.3, settled by docs/tone-spike.md's device CI)
SYLLABLE_MARKER_CP, HINT_A_CP, HINT_B_CP = 0xE000, 0x2062, 0x2063
MAX_NF, MAX_NS, MAX_SYLLABLE_LEN = 5, 4, 9    # bounds the spike validated on real devices
SPAN_MARGIN, SPAN_MAX = 100, 2400             # stretched line: margin each side, and a length cap so it doesn't flatten


def poly(pen, pts):
    """Closed clockwise polygon (TrueType outer contour); overlaps of same-direction contours fill under non-zero winding."""
    pen.moveTo(pts[0])
    for p in pts[1:]:
        pen.lineTo(p)
    pen.closePath()


def cw(pts):
    area = sum(x0 * y1 - x1 * y0 for (x0, y0), (x1, y1) in zip(pts, pts[1:] + pts[:1]))
    return pts if area < 0 else pts[::-1]


def segment(pen, p0, p1, w):
    dx, dy = p1[0] - p0[0], p1[1] - p0[1]
    n = math.hypot(dx, dy)
    nx, ny = -dy / n * w / 2, dx / n * w / 2
    poly(pen, cw([(p0[0] + nx, p0[1] + ny), (p1[0] + nx, p1[1] + ny), (p1[0] - nx, p1[1] - ny), (p0[0] - nx, p0[1] - ny)]))


def stem(pen):
    """Reference stem (as in printed Chao tone letters): top/bottom mark pitch levels 5 and 1, so a line's height reads."""
    sx = TONE_X0 - 60
    poly(pen, [(sx, TONE_Y[1] - 40), (sx, TONE_Y[5] + 40), (sx + STEM, TONE_Y[5] + 40), (sx + STEM, TONE_Y[1] - 40)])


def contour_glyph(levels, x0=TONE_X0, x1=TONE_X1):
    """Chao tone contour through 1-3 levels, from x0 to x1: a flat line (1 level) or a polyline ending in an
    arrowhead (2-3 levels). x0/x1 default to a single kana's width; the syllable-wide stretch (below) passes a
    wider span so the same shape covers the whole syllable."""
    n = len(levels)
    xs = [x0, x1] if n <= 2 else [x0, (x0 + x1) // 2, x1]
    pts = [(x0, TONE_Y[levels[0]]), (x1, TONE_Y[levels[0]])] if n == 1 else [(x, TONE_Y[l]) for x, l in zip(xs, levels)]
    pen = TTGlyphPen(None)
    stem(pen)
    last = len(pts) - 1
    head, half = 190, 105
    for i in range(last):
        p0, p1 = pts[i], pts[i + 1]
        if n > 1 and i == last - 1:
            dx, dy = p1[0] - p0[0], p1[1] - p0[1]
            d = math.hypot(dx, dy); ux, uy = dx / d, dy / d
            base = (p1[0] - ux * head, p1[1] - uy * head)
            segment(pen, p0, base, STROKE)
            px, py = -uy, ux
            poly(pen, cw([p1, (base[0] + px * half, base[1] + py * half), (base[0] - px * half, base[1] - py * half)]))
        else:
            segment(pen, p0, p1, STROKE)
        if 0 < i:   # square at the joint hides the notch between two rectangles
            r = STROKE / 2
            poly(pen, cw([(p0[0] - r, p0[1] - r), (p0[0] - r, p0[1] + r), (p0[0] + r, p0[1] + r), (p0[0] + r, p0[1] - r)]))
    return pen.glyph()


def dot_glyph(cx, cy, r):
    pen = TTGlyphPen(None)
    k = r / math.cos(math.pi / 8)
    pts = [(cx + k * math.cos(-i * math.pi / 4), cy + k * math.sin(-i * math.pi / 4)) for i in range(8)]   # clockwise
    pen.qCurveTo(*pts, None)
    pen.closePath()
    return pen.glyph()


def wave_glyph(cx, cy, half_w, amp, w):
    """A tilde: one sine period drawn as a stroked polyline (U+0330, creaky voice)."""
    pen = TTGlyphPen(None)
    pts = [(cx - half_w + 2 * half_w * i / 16, cy + amp * math.sin(2 * math.pi * i / 16)) for i in range(17)]
    for a, b in zip(pts, pts[1:]):
        segment(pen, a, b, w)
    return pen.glyph()


def rect_glyph(x0, y0, x1, y1):
    pen = TTGlyphPen(None)
    poly(pen, [(x0, y0), (x0, y1), (x1, y1), (x1, y0)])
    return pen.glyph()


def scaled(gs, name, sx, cx=ANCHOR_X):
    rec = DecomposingRecordingPen(gs); gs[name].draw(rec)
    pen = TTGlyphPen(None)
    rec.replay(TransformPen(pen, (sx, 0, 0, sx, cx - cx * sx, 0)))
    return pen.glyph()


def sequences():
    """Every (nF, nS, pattern) a syllable body can take: starts with a full-width kana, at most MAX_NF of them and
    MAX_NS superscripts, at most MAX_SYLLABLE_LEN glyphs total. Excludes (1, 0): a single bare kana already sits at
    the default (unwidened) position, so it needs no stretch rule."""
    out = []
    for n in range(1, MAX_SYLLABLE_LEN + 1):
        for pat in itertools.product("FS", repeat=n):
            if pat[0] != "F": continue
            nf, ns = pat.count("F"), pat.count("S")
            if nf <= MAX_NF and ns <= MAX_NS and (nf, ns) != (1, 0):
                out.append((nf, ns, pat))
    return out


def main(jp_path, latin_path, out):
    tmp = tempfile.mkdtemp()
    jp = TTFont(jp_path)
    if "fvar" in jp:
        jp = instancer.instantiateVariableFont(jp, {"wght": 400})
    jp.save(f"{tmp}/jp400.ttf")

    o = subset.Options(); o.layout_features = []; o.notdef_outline = True; o.name_IDs = ["*"]
    f = subset.load_font(f"{tmp}/jp400.ttf", o); s = subset.Subsetter(o)
    s.populate(unicodes=[*range(0x30A0, 0x3100), *SMALL, MARK_H]); s.subset(f)
    f.save(f"{tmp}/base.ttf")
    t = TTFont(f"{tmp}/base.ttf")
    for tag in ("GSUB", "GPOS", "GDEF", "BASE", "vmtx", "vhea", "STAT"):   # OTS rejects vmtx lacking new glyphs
        if tag in t: del t[tag]

    glyf, hmtx = t["glyf"], t["hmtx"]
    order = list(t.getGlyphOrder())
    lat = TTFont(latin_path); lgs = lat.getGlyphSet(); lcmap = lat.getBestCmap()
    new_cmap = {}

    def put(name, glyph, advance, cp=None):
        if name not in order: order.append(name)
        glyf.glyphs[name] = glyph
        glyph.recalcBounds(glyf)
        hmtx.metrics[name] = (advance, getattr(glyph, "xMin", 0))
        if cp is not None: new_cmap[cp] = name

    # small final-consonant kana: redraw every ㇰ..ㇿ in place, then build ㇷ゚ (゚ is drawn left of the pen at the
    # base's advance, so it is shrunk and moved onto the top of the small ㇷ)
    gs = t.getGlyphSet(); cmap0 = t.getBestCmap()
    small_top = {}
    for cp in SMALL:
        g = scaled(gs, cmap0[cp], SMALL_SCALE)
        put(cmap0[cp], g, 1000)
        small_top[cp] = g.yMax
    bp = BoundsPen(gs); gs[cmap0[MARK_H]].draw(bp); mx0, my0, mx1, my1 = bp.bounds
    pen = TTGlyphPen(None)
    fgs = t.getGlyphSet()   # fresh: the small ㇷ was just redrawn
    r1 = DecomposingRecordingPen(fgs); fgs[cmap0[0x31F7]].draw(r1); r1.replay(pen)
    hs = HANDAKUTEN_SCALE
    r2 = DecomposingRecordingPen(gs); gs[cmap0[MARK_H]].draw(r2)
    r2.replay(TransformPen(pen, (hs, 0, 0, hs, 1000 + mx1 - mx1 * hs, small_top[0x31F7] + HANDAKUTEN_GAP - my0 * hs)))
    put("uni31F7_309A", pen.glyph(), 1000)
    fu_name, h_name = cmap0[0x31F7], cmap0[MARK_H]

    def sup(letter):
        name = lcmap[ord(letter)]
        rec = DecomposingRecordingPen(lgs); lgs[name].draw(rec)
        pen = TTGlyphPen(None)
        rec.replay(TransformPen(pen, (SUP_SCALE, 0, 0, SUP_SCALE, 0, SUP_RAISE)))
        return pen.glyph(), round(lgs[name].width * SUP_SCALE)

    for cp, letter in SUPERSCRIPTS.items():
        g, adv = sup(letter)
        put(f"sup_{cp:X}", g, adv, cp)
    g, adv = sup("ħ")
    put("sup_hbar", g, adv)                         # only reachable through the ʰ + U+0335 ligature
    h_adv = hmtx.metrics["sup_2B0"][0]
    # U+0335 as a real mark: a short bar over the preceding ʰ (fallback when the ligature does not fire)
    put("uni0335", rect_glyph(-h_adv + 10, SUP_RAISE + 250, -10, SUP_RAISE + 250 + 34), 0, STROKE_CP)
    # U+0323: dot under the kana (mark shifted half an em left so it sits under a 1000-wide cell)
    put("uni0323", dot_glyph(-500, -190, 50), 0, DOT_CP)
    # U+0330: creaky voice (Burmese creaky tone), a tilde under the kana
    put("uni0330", wave_glyph(-500, -190, 170, 45, 42), 0, CREAKY_CP)

    # Tone: one contour glyph per distinct level-tuple (155: 5 solo + 25 pairs + 125 triples), shared by the
    # canonical bar sequence and any legacy single-codepoint alias.
    combos = [c for n in (1, 2, 3) for c in itertools.product((5, 4, 3, 2, 1), repeat=n)]
    shape_glyph = {levels: f"tone_{''.join(map(str, levels))}" for levels in combos}
    for levels, name in shape_glyph.items():
        put(name, contour_glyph(levels), 0)

    bar_name = {level: shape_glyph[(level,)] for level in TONE_BAR_CP}   # solo bar = flat tone at that level
    for level, cp in TONE_BAR_CP.items():
        new_cmap[cp] = bar_name[level]
    for cp, levels in TONE_LEGACY_CP.items():                            # old diacritics point at the same shapes
        new_cmap[cp] = shape_glyph[levels]
    # bar sequence -> contour glyph (GSUB liga). Longest first: a 3-bar rule must be tried before a 2-bar rule that
    # is its prefix, or the shorter rule would consume the first two bars and strand the third with no match.
    tone_ligs = [f"  sub {' '.join(bar_name[l] for l in levels)} by {shape_glyph[levels]};"
                 for levels in reversed(combos) if len(levels) > 1]

    # Syllable-wide tone (docs/tone-notation.md §3.1.1-3.1.3): stretch and centre the contour on the whole syllable
    # (kana + modifiers), using two width signals in parallel -- CI on real devices (docs/tone-spike.md §8) found
    # neither survives shaping alone in every engine:
    #   marker: U+E000 syllable start + the actual glyph sequence (works on iOS/WebKit; it ignores the hint glyphs)
    #   hint:   U+2062 x(nF-1), U+2063 xnS right before the tone bars (works on Android/Chrome; a script change
    #           between kana and a Latin-script superscript splits the shaping run, so a rule anchored on the marker
    #           can't reach across it, but the hint sits right next to the tone and always shares its run)
    F = [cmap0[cp] for cp in [*range(0x30A1, 0x30FB), 0x30FC, *SMALL] if cp in cmap0 and hmtx.metrics[cmap0[cp]][0] == 1000]
    F.append("uni31F7_309A")                          # ㇷ゚ ligature result: full-width once ligated
    S = [f"sup_{cp:X}" for cp in SUPERSCRIPTS] + ["sup_hbar"]
    put("sylB", TTGlyphPen(None).glyph(), 0, SYLLABLE_MARKER_CP)
    put("hintA", TTGlyphPen(None).glyph(), 0, HINT_A_CP)
    put("hintB", TTGlyphPen(None).glyph(), 0, HINT_B_CP)

    seqs = sequences()
    widths = sorted({1000 * nf + 480 * ns for nf, ns, _ in seqs})
    stretch_lookups, stretch_names = [], []
    for w in widths:
        half = min(w - 2 * SPAN_MARGIN, SPAN_MAX) / 2
        cx = -w / 2   # the pen sits at the syllable's right edge, so the syllable spans x = -w .. 0
        for levels, name in shape_glyph.items():
            wname = f"{name}_w{w}"
            put(wname, contour_glyph(levels, round(cx - half), round(cx + half)), 0)
            stretch_names.append(wname)
        body = " ".join(f"sub {name} by {name}_w{w};" for name in shape_glyph.values())
        stretch_lookups.append(f"lookup SUB_{w} {{ {body} }} SUB_{w};")

    marker_rules = [f"  sub sylB {' '.join('@F' if p == 'F' else '@S' for p in pat)} @T' lookup SUB_{1000 * nf + 480 * ns};"
                    for nf, ns, pat in seqs]
    # hint rules: longest first (e.g. "hintB hintB" also matches the tail of "hintA hintB hintB", so the more
    # specific 3-glyph rule must be tried first or the 2-glyph one would fire on the wrong width)
    hint_combos = sorted(((a, b) for a in range(MAX_NF) for b in range(MAX_NS + 1) if (a, b) != (0, 0)),
                          key=lambda ab: -(ab[0] + ab[1]))
    hint_rules = [f"  sub {' '.join(['hintA'] * a + ['hintB'] * b)} @T' lookup SUB_{1000 * (a + 1) + 480 * b};"
                  for a, b in hint_combos]

    # The format-12 subtable (needed for any code point above the BMP, e.g. U+107A5) must exist *before* the merge
    # loop below, seeded only from what's already in the font -- otherwise a supplementary-plane entry in new_cmap
    # has nowhere to go (the loop skips it for every non-format-12 table) and is silently dropped.
    if not any(st.format == 12 and st.isUnicode() for st in t["cmap"].tables):
        st12 = cmap_format_12(12); st12.platformID, st12.platEncID, st12.language = 3, 10, 0
        st12.cmap = {cp: n for st in t["cmap"].tables if st.isUnicode() for cp, n in st.cmap.items()}
        t["cmap"].tables.append(st12)
    for st in t["cmap"].tables:
        if not st.isUnicode(): continue
        for cp, name in new_cmap.items():
            if cp > 0xFFFF and st.format != 12: continue
            st.cmap[cp] = name

    t.setGlyphOrder(order); glyf.glyphOrder = order
    t["post"].formatType = 3.0
    t["maxp"].numGlyphs = len(order)
    for rec in t["name"].names:
        if rec.nameID in (1, 16): rec.string = "Kana Multi"
        elif rec.nameID in (4, 6): rec.string = "Kana Multi" if rec.nameID == 4 else "KanaMulti-Regular"

    marks = " ".join([h_name, "uni0335", "uni0323", "uni0330", "sylB", "hintA", "hintB",
                       *shape_glyph.values(), *stretch_names])
    fea = f"""
languagesystem DFLT dflt;
languagesystem kana dflt;
languagesystem latn dflt;
table GDEF {{ GlyphClassDef , , [{marks}], ; }} GDEF;
@F = [{' '.join(F)}];
@S = [{' '.join(S)}];
@T = [{' '.join(shape_glyph.values())}];
feature liga {{
  sub sup_2B0 uni0335 by sup_hbar;
  sub {fu_name} {h_name} by uni31F7_309A;
{chr(10).join(tone_ligs)}
}} liga;
{chr(10).join(stretch_lookups)}
feature calt {{
{chr(10).join(marker_rules)}
{chr(10).join(hint_rules)}
}} calt;
"""
    addOpenTypeFeaturesFromString(t, fea)
    t.flavor = "woff2"; t.save(out)
    print(out, os.path.getsize(out), "bytes,", len(order), "glyphs")


if __name__ == "__main__":
    if len(sys.argv) < 3:
        sys.exit(__doc__)
    main(sys.argv[1], sys.argv[2], sys.argv[3] if len(sys.argv) > 3 else OUT_DEFAULT)
