# /// script
# requires-python = ">=3.10"
# dependencies = ["fonttools", "brotli"]
# ///
"""SPIKE: can a font alone draw a tone contour over a whole syllable? (docs/tone-spike.md)

Two ways to tell the font how wide the syllable is (both in every font, they do not interfere):
  marker: B glyph* tone-letters. Needs the whole syllable to be one shaping run (browsers split runs where the script
          changes, so a Latin-script ʰ between kana breaks it).
  hint:   glyph* (nF-1)x U+2062 nS x U+2063 tone-letters. The hint sits next to the tone, so it always shares its run.
Marker form: B is an invisible syllable-start marker (three code points map to it:
U+2060, U+200B, U+E000) and glyph is F (full-width kana, advance 1000) or S (superscript letter, advance 480).
  - GSUB liga: tone letters U+02E5..02E9 (5..1), 1-3 in a row, become one contour glyph (zero advance, drawn at x=-800..-200,
    i.e. over the last 1000 units of the pen).
  - The syllable width W = 1000*nF + 480*nS is known from the glyphs between B and the tone, so the contour is moved left by
    dx = -(W-1000)/2. Two ways, chosen with --mode:
      gpos: chained contextual GPOS (kern) adjusts the placement of the tone glyph.
      gsub: chained contextual GSUB (calt) swaps the tone glyph for a copy stretched over the whole syllable.
  - Rules are enumerated over every F/S pattern that starts with F (1<=nF<=5, 0<=nS<=4, at most 9 glyphs), anchored on B.

usage: uv run scripts/build-tone-spike-font.py NotoSansJP-VF.ttf NotoSans-Regular.ttf out.woff2 --mode=gpos|gsub
Both source fonts are OFL-licensed; keep the license notice when shipping.
"""
import itertools, math, os, sys, tempfile
from fontTools import subset
from fontTools.feaLib.builder import addOpenTypeFeaturesFromString
from fontTools.pens.recordingPen import DecomposingRecordingPen
from fontTools.pens.transformPen import TransformPen
from fontTools.pens.ttGlyphPen import TTGlyphPen
from fontTools.ttLib import TTFont
from fontTools.ttLib.tables._c_m_a_p import cmap_format_12
from fontTools.varLib import instancer

SUP_SCALE, SUP_RAISE, SUP_ADV = 0.62, 400, 480
STROKE = 58
TONE_X0, TONE_X1 = -900, -100   # a one-kana syllable: 100 units of margin each side (centre stays at -500)
SPAN_MARGIN = 100
TONE_Y = {1: 1000, 2: 1115, 3: 1230, 4: 1345, 5: 1460}
TONE_LETTERS = {0x02E5: 5, 0x02E6: 4, 0x02E7: 3, 0x02E8: 2, 0x02E9: 1}
MARKERS = (0x2060, 0x200B, 0xE000)
HINT_A, HINT_B = 0x2062, 0x2063   # width hint: (nF-1) x HINT_A then nS x HINT_B, right before the tone letters
MAX_NF, MAX_NS, MAX_LEN = 5, 4, 9
SMALL = list(range(0x31F0, 0x3200))
SUPERSCRIPTS = {
    0x02B0: "h", 0x02B1: "ɦ", 0x02B2: "j", 0x02B7: "w", 0x207F: "n", 0x02E3: "x", 0x02E0: "ɣ", 0x02B6: "ʁ",
    0x02C0: "ʔ", 0x02E4: "ʕ", 0x02B3: "r", 0x02E1: "l", 0x1D53: "ɔ", 0x1D4A: "ə", 0x1D4B: "ɛ", 0x1D45: "ɑ", 0x1DA4: "ɨ",
}


def poly(pen, pts):
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


def contour_glyph(levels, x0=TONE_X0, x1=TONE_X1):
    """Polyline through the Chao levels (1-3 of them) from x0 to x1. A contour (2+ levels) ends in an arrowhead of fixed size."""
    n = len(levels)
    xs = [x0, x1] if n <= 2 else [x0, (x0 + x1) // 2, x1]
    pts = [(x, TONE_Y[l]) for x, l in zip(xs, levels)] if n > 1 else [(x0, TONE_Y[levels[0]]), (x1, TONE_Y[levels[0]])]
    pen = TTGlyphPen(None)
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


def sequences():
    """Every (nF, nS, pattern) for a syllable body: starts with F, at most MAX_NF F, MAX_NS S, MAX_LEN glyphs."""
    out = []
    for n in range(1, MAX_LEN + 1):
        for pat in itertools.product("FS", repeat=n):
            if pat[0] != "F": continue
            nf, ns = pat.count("F"), pat.count("S")
            if nf <= MAX_NF and ns <= MAX_NS:
                out.append((nf, ns, pat))
    return out


def main(jp_path, latin_path, out, mode):
    tmp = tempfile.mkdtemp()
    jp = TTFont(jp_path)
    if "fvar" in jp:
        jp = instancer.instantiateVariableFont(jp, {"wght": 400})
    jp.save(f"{tmp}/jp400.ttf")
    o = subset.Options(); o.layout_features = []; o.notdef_outline = True; o.name_IDs = ["*"]
    f = subset.load_font(f"{tmp}/jp400.ttf", o); s = subset.Subsetter(o)
    s.populate(unicodes=[*range(0x30A0, 0x3100), *SMALL]); s.subset(f)
    f.save(f"{tmp}/base.ttf")
    t = TTFont(f"{tmp}/base.ttf")
    for tag in ("GSUB", "GPOS", "GDEF", "BASE", "vmtx", "vhea", "STAT"):
        if tag in t: del t[tag]
    glyf, hmtx = t["glyf"], t["hmtx"]
    order = list(t.getGlyphOrder())
    cmap0 = t.getBestCmap()
    lat = TTFont(latin_path); lgs = lat.getGlyphSet(); lcmap = lat.getBestCmap()
    new_cmap = {}

    def put(name, glyph, advance, cp=None):
        if name not in order: order.append(name)
        glyf.glyphs[name] = glyph
        glyph.recalcBounds(glyf)
        hmtx.metrics[name] = (advance, getattr(glyph, "xMin", 0))
        if cp is not None: new_cmap[cp] = name

    # F class: full-width katakana + small final kana
    F = [cmap0[cp] for cp in [*range(0x30A1, 0x30FB), 0x30FC, *SMALL] if cp in cmap0 and hmtx.metrics[cmap0[cp]][0] == 1000]
    S = []
    for cp, letter in SUPERSCRIPTS.items():
        name = lcmap[ord(letter)]
        rec = DecomposingRecordingPen(lgs); lgs[name].draw(rec)
        pen = TTGlyphPen(None)
        adv = lgs[name].width * SUP_SCALE
        rec.replay(TransformPen(pen, (SUP_SCALE, 0, 0, SUP_SCALE, (SUP_ADV - adv) / 2, SUP_RAISE)))
        put(f"sup_{cp:X}", pen.glyph(), SUP_ADV, cp)
        S.append(f"sup_{cp:X}")
    put("sylB", TTGlyphPen(None).glyph(), 0)
    for cp in MARKERS: new_cmap[cp] = "sylB"
    put("hintA", TTGlyphPen(None).glyph(), 0, HINT_A)
    put("hintB", TTGlyphPen(None).glyph(), 0, HINT_B)

    # tone glyphs: c_<levels> for every 1-3 level combination; single levels carry the cmap entries
    combos = [c for n in (1, 2, 3) for c in itertools.product("54321", repeat=n)]
    T = []
    for c in combos:
        key = "".join(c)
        put(f"c_{key}", contour_glyph([int(x) for x in c]), 0)
        T.append(f"c_{key}")
    for cp, lv in TONE_LETTERS.items(): new_cmap[cp] = f"c_{lv}"

    seqs = [(nf, ns, pat) for nf, ns, pat in sequences() if (nf, ns) != (1, 0)]
    widths = sorted({1000 * nf + 480 * ns for nf, ns, _ in seqs})
    lookups, rules = [], []
    for w in widths:
        dx = -(w - 1000) // 2
        if mode == "gpos":
            lookups.append(f"lookup DX_{w} {{ pos @T <{dx} 0 0 0>; }} DX_{w};")
        else:
            for c in combos:
                key = "".join(c)
                # stretch the line over the whole syllable (pen is at its right end): x = -(W - margin) .. -margin
                put(f"c_{key}_w{w}", contour_glyph([int(x) for x in c], -(w - SPAN_MARGIN), -SPAN_MARGIN), 0)
            body = " ".join(f"sub c_{''.join(c)} by c_{''.join(c)}_w{w};" for c in combos)
            lookups.append(f"lookup SUB_{w} {{ {body} }} SUB_{w};")
    for nf, ns, pat in seqs:
        w = 1000 * nf + 480 * ns
        ctx = " ".join("@F" if p == "F" else "@S" for p in pat)
        verb, look = ("pos", f"DX_{w}") if mode == "gpos" else ("sub", f"SUB_{w}")
        rules.append(f"  {verb} sylB {ctx} @T' lookup {look};")
    # hint rules: the data itself says how wide the syllable is, so nothing has to be looked up behind the syllable
    # (a browser splits shaping runs where the script changes, e.g. between kana and the Latin-script ʰ, and a rule cannot
    # see across that). Longest hint first: HB HB also matches the tail of HA HB HB.
    hints = sorted(((a, b) for a in range(MAX_NF) for b in range(MAX_NS + 1) if (a, b) != (0, 0)), key=lambda ab: -(ab[0] + ab[1]))
    for a, b in hints:
        w = 1000 * (a + 1) + 480 * b
        ctx = " ".join(["hintA"] * a + ["hintB"] * b)
        verb, look = ("pos", f"DX_{w}") if mode == "gpos" else ("sub", f"SUB_{w}")
        rules.append(f"  {verb} {ctx} @T' lookup {look};")

    for st in t["cmap"].tables:
        if not st.isUnicode(): continue
        for cp, name in new_cmap.items():
            if cp > 0xFFFF and st.format != 12: continue
            st.cmap[cp] = name
    if not any(st.format == 12 and st.isUnicode() for st in t["cmap"].tables):
        st12 = cmap_format_12(12); st12.platformID, st12.platEncID, st12.language = 3, 10, 0
        st12.cmap = {cp: n for st in t["cmap"].tables if st.isUnicode() for cp, n in st.cmap.items()}
        t["cmap"].tables.append(st12)
    t.setGlyphOrder(order); glyf.glyphOrder = order
    t["post"].formatType = 2.0   # keep glyph names so verify-tone-spike.py can read them
    t["post"].extraNames, t["post"].mapping = [], {}
    t["maxp"].numGlyphs = len(order)
    label = f"Tone Spike {mode.upper()}"
    for rec in t["name"].names:
        if rec.nameID in (1, 16): rec.string = label
        elif rec.nameID == 4: rec.string = label
        elif rec.nameID == 6: rec.string = label.replace(" ", "") + "-Regular"

    ligs = "\n".join(f"  sub {' '.join('c_' + str(l) for l in c)} by c_{''.join(c)};" for c in reversed(combos) if len(c) > 1)
    feat = "kern" if mode == "gpos" else "calt"
    fea = f"""
languagesystem DFLT dflt;
languagesystem kana dflt;
languagesystem latn dflt;
@F = [{' '.join(F)}];
@S = [{' '.join(S)}];
@T = [{' '.join(T)}];
feature liga {{
{ligs}
}} liga;
{chr(10).join(lookups)}
feature {feat} {{
{chr(10).join(rules)}
}} {feat};
"""
    open(f"{tmp}/spike.fea", "w").write(fea)
    addOpenTypeFeaturesFromString(t, fea)
    t.flavor = "woff2"; t.save(out)
    print(out, os.path.getsize(out), "bytes,", len(order), "glyphs,", len(rules), "rules,", len(widths), "widths")


if __name__ == "__main__":
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    mode = next((a.split("=", 1)[1] for a in sys.argv[1:] if a.startswith("--mode=")), None)
    if len(args) < 3 or mode not in ("gpos", "gsub"):
        sys.exit(__doc__)
    main(args[0], args[1], args[2], mode)
