# /// script
# requires-python = ">=3.10"
# dependencies = ["fonttools", "brotli"]
# ///
"""Build kana-hangul.woff2: the right-shoulder romaji marks of the Japanese -> Hangul notation, in ONE font.

Why a separate font: docs/adr/0019-ja-hangul-lite-detail-boundary.md. The notation writes a long vowel as the
superscript vowel of the preceding mora plus a combining macron (ᵃ̄ ⁱ̄ ᵘ̄ ᵉ̄ ᵒ̄) and the j of じゃ/じょ as ʲ.
Two problems with leaving these to the device's fonts:
  - The superscript letter and U+0304 come from different fonts, so the macron is placed for a full-size base
    and lands off-centre (measured in headless Chrome, 2026-09-29: shifted right and too wide).
  - On Android a base and its combining mark must be covered by one font, else the cluster is tofu (ADR-0003).
kana-multi cannot carry it: there U+0304 is a legacy alias for a tone contour (docs/tone-notation.md §2.3).

Contents (all drawn from Noto Sans Latin letters at the same scale/raise as kana-multi's superscripts):
  - ʲ U+02B2, ᵃ U+1D43, ⁱ U+2071, ᵘ U+1D58, ᵉ U+1D49, ᵒ U+1D52.
  - Five composite glyphs, one per vowel: the superscript letter with a macron centred on that letter's own
    bounding box. ⁱ is drawn from the dotless ı so the dot does not collide with the macron.
    ccmp: <vowel> + U+0304 -> composite.
  - U+0304 as a zero-advance mark, only a fallback if the ccmp substitution does not fire.
The font maps nothing else (no ASCII), so it can be listed first for these code points only.

usage: uv run scripts/build-kana-hangul-font.py NotoSans-Regular.ttf [out.woff2]
  NotoSans-Regular.ttf https://github.com/notofonts/notofonts.github.io/raw/main/fonts/NotoSans/full/ttf/NotoSans-Regular.ttf
Noto Sans is OFL-licensed; keep the license notice when shipping.
"""
import os, sys, tempfile
from fontTools import subset
from fontTools.feaLib.builder import addOpenTypeFeaturesFromString
from fontTools.pens.boundsPen import BoundsPen
from fontTools.pens.recordingPen import DecomposingRecordingPen
from fontTools.pens.transformPen import TransformPen
from fontTools.pens.ttGlyphPen import TTGlyphPen
from fontTools.ttLib import TTFont, newTable
from fontTools.ttLib.tables._c_m_a_p import cmap_format_4

OUT_DEFAULT = "public/kana-font/kana-hangul.woff2"
SUP_SCALE = 0.62     # same as build-kana-multi-font.py
SUP_RAISE = 400
MACRON_W = 0.90      # macron width relative to the letter's bounding box
MACRON_T = 40        # macron thickness
MACRON_GAP = 45      # gap between the letter's top and the macron
MACRON_CP = 0x0304

# code point -> source Latin letter
PLAIN = {0x02B2: "j", 0x1D43: "a", 0x2071: "i", 0x1D58: "u", 0x1D49: "e", 0x1D52: "o"}
# vowel code point -> letter used under the macron (ⁱ uses the dotless ı)
UNDER_MACRON = {0x1D43: "a", 0x2071: "ı", 0x1D58: "u", 0x1D49: "e", 0x1D52: "o"}


def main(latin_path, out):
    tmp = tempfile.mkdtemp()
    o = subset.Options(); o.layout_features = []; o.notdef_outline = True; o.name_IDs = ["*"]
    f = subset.load_font(latin_path, o); s = subset.Subsetter(o)
    s.populate(unicodes=[0x20]); s.subset(f)
    f.save(f"{tmp}/base.ttf")
    t = TTFont(f"{tmp}/base.ttf")
    for tag in ("GSUB", "GPOS", "GDEF", "BASE", "vmtx", "vhea", "STAT", "kern"):
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

    def sup_pen(letter, pen):
        name = lcmap[ord(letter)]
        rec = DecomposingRecordingPen(lgs); lgs[name].draw(rec)
        rec.replay(TransformPen(pen, (SUP_SCALE, 0, 0, SUP_SCALE, 0, SUP_RAISE)))
        return round(lgs[name].width * SUP_SCALE), name

    def bounds(letter):
        bp = BoundsPen(lgs); name = lcmap[ord(letter)]; lgs[name].draw(bp)
        x0, y0, x1, y1 = bp.bounds
        return x0 * SUP_SCALE, y0 * SUP_SCALE + SUP_RAISE, x1 * SUP_SCALE, y1 * SUP_SCALE + SUP_RAISE

    for cp, letter in PLAIN.items():
        pen = TTGlyphPen(None); adv, _ = sup_pen(letter, pen)
        put(f"sup_{cp:X}", pen.glyph(), adv, cp)

    subs = []
    for cp, letter in UNDER_MACRON.items():
        pen = TTGlyphPen(None); adv, _ = sup_pen(letter, pen)
        x0, y0, x1, y1 = bounds(letter)
        cx = (x0 + x1) / 2
        half = max(60, (x1 - x0) * MACRON_W / 2)
        top = y1 + MACRON_GAP
        pen.moveTo((round(cx - half), round(top))); pen.lineTo((round(cx - half), round(top + MACRON_T)))
        pen.lineTo((round(cx + half), round(top + MACRON_T))); pen.lineTo((round(cx + half), round(top)))
        pen.closePath()
        name = f"sup_{cp:X}_macron"
        put(name, pen.glyph(), adv)
        subs.append(f"  sub sup_{cp:X} uni0304 by {name};")

    # U+0304 alone: a zero-advance bar drawn to the left of the pen, sized for an average superscript
    a0, a1 = hmtx.metrics["sup_1D43"][0], 0
    top = bounds("o")[3] + MACRON_GAP
    pen = TTGlyphPen(None)
    x0, x1 = -round(a0 * 0.92), -round(a0 * 0.08)
    pen.moveTo((x0, round(top))); pen.lineTo((x0, round(top + MACRON_T)))
    pen.lineTo((x1, round(top + MACRON_T))); pen.lineTo((x1, round(top))); pen.closePath()
    put("uni0304", pen.glyph(), 0, MACRON_CP)

    t.setGlyphOrder(order); glyf.glyphOrder = order
    cm = cmap_format_4(4); cm.platformID, cm.platEncID, cm.language = 3, 1, 0; cm.cmap = new_cmap
    t["cmap"] = newTable("cmap"); t["cmap"].tableVersion = 0; t["cmap"].tables = [cm]
    fea = f"""
languagesystem DFLT dflt;
languagesystem latn dflt;
table GDEF {{ GlyphClassDef , , [uni0304], ; }} GDEF;
feature ccmp {{
{chr(10).join(subs)}
}} ccmp;
"""
    addOpenTypeFeaturesFromString(t, fea)
    t.flavor = "woff2"; t.save(out)
    print(out, os.path.getsize(out), "bytes,", len(order), "glyphs")


if __name__ == "__main__":
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    main(sys.argv[1], sys.argv[2] if len(sys.argv) > 2 else OUT_DEFAULT)
