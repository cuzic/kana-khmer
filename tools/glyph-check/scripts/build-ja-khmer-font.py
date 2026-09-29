# /// script
# requires-python = ">=3.10"
# dependencies = ["fonttools", "brotli"]
# ///
"""Build ja-khmer.woff2: the right-shoulder romaji of the ja-khmer notation (docs/ja-khmer-spec.md §3.2) in ONE font.

Contents
  - Superscript letters at Noto Sans's own standard glyphs, unchanged:
      consonants ˢ ʰ ᵗ ᶜ ʲ ᶻ ᶠ ʸ ʷ   vowels ᵃ ᵉ ⁱ ᵒ ᵘ
    ʰ here is the STANDARD h shape, meaning "h" (the s of ˢʰ = sh). It must not be mixed with kana-support.woff2's ʰ,
    which is the ADR-0015 custom shape (dot + tail) for aspiration; that is why this is a separate font
    (spec §3.2 "ʰ の字形の衝突", ADR-0014's fourth font). Never load both under one font-family.
  - Long-vowel marker (spec §3.2 form (a), D9): superscript vowel + U+0304 as five composite glyphs ᵃ̄ ⁱ̄ ᵘ̄ ᵉ̄ ᵒ̄,
    made by ccmp ligature (ADR-0003: the base and the combining mark live in the same font, else Android tofus the
    mark). Each composite = the vowel's outline + a bar above it, same advance as the bare vowel, so the marker is
    exactly as wide as ᵃ (the point of choosing (a) over the doubled-vowel fallback (c)).
  - U+0304 as a real zero-advance mark (fallback when the ligature does not fire), drawn left of the pen at the width of
    a typical superscript vowel, at the same height as the composites' bars.
  Khmer letters are NOT in this font: load Noto Sans Khmer separately (see ../public/ja-khmer.html and the note there).

Geometry (font units, 1000/em; every number derived from the source glyph's own bounds, not hard-coded per vowel):
  bar bottom = vowel ink top + BAR_GAP;  bar thickness = BAR_H;  bar is centred on the vowel's ink and is
  max(ink width * BAR_RATIO, BAR_MIN) wide. ⁱ keeps its dot (the sequence is ⁱ + U+0304, not ī): bar sits above the dot.

usage: uv run scripts/build-ja-khmer-font.py NotoSans-Regular.ttf [out.woff2]
Source font is OFL-licensed (Noto Project Authors); LICENSE.txt next to the output carries the notice -- keep it.
"""
import os, sys, tempfile
from fontTools import subset
from fontTools.feaLib.builder import addOpenTypeFeaturesFromString
from fontTools.pens.boundsPen import BoundsPen
from fontTools.pens.recordingPen import DecomposingRecordingPen
from fontTools.pens.ttGlyphPen import TTGlyphPen
from fontTools.ttLib import TTFont

OUT_DEFAULT = "public/ja-khmer-font/ja-khmer.woff2"
CONSONANTS = "ˢʰᵗᶜʲᶻᶠʸʷ"
VOWELS = "ᵃᵉⁱᵒᵘ"
MACRON = 0x0304
BAR_GAP, BAR_H = 45, 42       # gap between the vowel's ink top and the bar; bar thickness
BAR_RATIO, BAR_MIN = 0.85, 180  # bar width = max(ink width * ratio, min); ⁱ is only ~67 wide, so it needs the floor
FALLBACK_HALF = 183           # standalone U+0304: centred this far left of the pen (~half an average vowel advance)
FALLBACK_Y = 630              # standalone U+0304 bar bottom (just above the tops of ᵃ ᵉ ᵒ ᵘ, ~615)


def bounds_of(gs, name):
    bp = BoundsPen(gs); gs[name].draw(bp)
    return bp.bounds


def cw(x0, y0, x1, y1):
    return [(x0, y0), (x0, y1), (x1, y1), (x1, y0)]   # clockwise = TrueType outer contour


def with_bar(gs, name, x0, y0, x1, y1):
    """The glyph's outline plus one rectangle (x0,y0)-(x1,y1)."""
    rec = DecomposingRecordingPen(gs); gs[name].draw(rec)
    pen = TTGlyphPen(None)
    rec.replay(pen)
    pts = cw(x0, y0, x1, y1)
    pen.moveTo(pts[0])
    for p in pts[1:]: pen.lineTo(p)
    pen.closePath()
    return pen.glyph()


def main(src_path, out):
    tmp = tempfile.mkdtemp()
    o = subset.Options(); o.layout_features = []; o.notdef_outline = True; o.name_IDs = ["*"]; o.glyph_names = True
    f = subset.load_font(src_path, o); s = subset.Subsetter(o)
    s.populate(unicodes=[ord(c) for c in CONSONANTS + VOWELS] + [MACRON]); s.subset(f)
    f.save(f"{tmp}/base.ttf")
    t = TTFont(f"{tmp}/base.ttf")
    for tag in ("GSUB", "GPOS", "GDEF", "BASE", "vmtx", "vhea", "STAT"):
        if tag in t: del t[tag]
    glyf, hmtx = t["glyf"], t["hmtx"]
    cmap = t.getBestCmap()
    gs = t.getGlyphSet()
    order = list(t.getGlyphOrder())
    new_cmap = {}

    def put(name, glyph, advance, cp=None):
        if name not in order: order.append(name)
        glyf.glyphs[name] = glyph
        glyph.recalcBounds(glyf)
        hmtx.metrics[name] = (advance, getattr(glyph, "xMin", 0))
        if cp is not None: new_cmap[cp] = name

    ligs = []
    for ch in VOWELS:
        base = cmap[ord(ch)]
        x0, y0, x1, y1 = bounds_of(gs, base)
        adv = hmtx.metrics[base][0]
        cx, half = (x0 + x1) / 2, max((x1 - x0) * BAR_RATIO, BAR_MIN) / 2
        by = y1 + BAR_GAP
        name = f"{base}_macron"
        put(name, with_bar(gs, base, round(cx - half), by, round(cx + half), by + BAR_H), adv)
        ligs.append(f"  sub {base} uni0304 by {name};")
    # standalone mark (fallback): zero advance, bar to the left of the pen
    pen = TTGlyphPen(None)
    pts = cw(-2 * FALLBACK_HALF, FALLBACK_Y, 0, FALLBACK_Y + BAR_H)
    pen.moveTo(pts[0]); [pen.lineTo(p) for p in pts[1:]]; pen.closePath()
    put("uni0304", pen.glyph(), 0, MACRON)

    for st in t["cmap"].tables:
        if st.isUnicode():
            for cp, n in new_cmap.items(): st.cmap[cp] = n
    t.setGlyphOrder(order); glyf.glyphOrder = order
    t["post"].formatType = 3.0
    t["maxp"].numGlyphs = len(order)
    for rec in t["name"].names:
        if rec.nameID in (1, 16): rec.string = "Ja Khmer"
        elif rec.nameID == 4: rec.string = "Ja Khmer"
        elif rec.nameID == 6: rec.string = "JaKhmer-Regular"
    fea = f"""
languagesystem DFLT dflt;
languagesystem latn dflt;
table GDEF {{ GlyphClassDef , , [uni0304], ; }} GDEF;
feature ccmp {{
{chr(10).join(ligs)}
}} ccmp;
"""
    addOpenTypeFeaturesFromString(t, fea)
    t.flavor = "woff2"; t.save(out)
    print(out, os.path.getsize(out), "bytes,", len(order), "glyphs")
    names = {r.nameID: r.toUnicode() for r in TTFont(src_path)["name"].names if r.platformID == 3}
    with open(os.path.join(os.path.dirname(out), "LICENSE.txt"), "w") as fp:
        fp.write("ja-khmer.woff2 is a subset of Noto Sans Regular with added composite glyphs.\n\n"
                 f"{names.get(0, '')}\n\n{names.get(13, '')}\n{names.get(14, '')}\n")


if __name__ == "__main__":
    if len(sys.argv) < 2: sys.exit(__doc__)
    out = sys.argv[2] if len(sys.argv) > 2 else OUT_DEFAULT
    os.makedirs(os.path.dirname(out) or ".", exist_ok=True)
    main(sys.argv[1], out)
