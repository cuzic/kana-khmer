# /// script
# requires-python = ">=3.10"
# dependencies = ["fonttools", "brotli"]
# ///
"""Build kana-c.woff2: the kana glyphs that the notation draws itself, in ONE font.

Contents (all from Noto Sans JP, weight 400, OFL; the mark from Noto Sans):
  - チ + U+032F  →  ligature to a small チ ("chi.small"). The code points stay チ U+032F; only the glyph changes.
  - ㇰ..ㇿ (U+31F0-31FF, the Ainu small consonants) redrawn smaller, sitting on the baseline.
  - ㇷ + U+309A  →  ligature to a small ㇷ with the handakuten placed just above it.
  - カキクケコン + U+309A  →  unchanged, but bundled: on Android a base and its combining mark must be
    covered by a single font, otherwise the cluster renders as tofu (iOS composes across fonts).
  - U+032F / U+309A remain as real (zero-advance) marks, so text still degrades to チ + mark if GSUB is off.

Sizes are tuned by SMALL_SCALE / CHI_SCALE below; check on real devices with tools/glyph-check.

usage: uv run scripts/build-kana-font.py NotoSansJP-VF.ttf NotoSans-Regular.ttf [out.woff2]
  NotoSansJP-VF.ttf  https://github.com/notofonts/noto-cjk/raw/main/Sans/Variable/TTF/Subset/NotoSansJP-VF.ttf
  NotoSans-Regular.ttf https://github.com/notofonts/notofonts.github.io/raw/main/fonts/NotoSans/full/ttf/NotoSans-Regular.ttf
(fontsource's Noto Sans JP subset has no U+31F0-31FF and fontsource's Noto Sans has no U+032F, hence the full files.)
Both fonts are OFL-licensed; keep the license notice when shipping.
"""
import os, sys, tempfile
from fontTools import subset
from fontTools.feaLib.builder import addOpenTypeFeaturesFromString
from fontTools.pens.recordingPen import DecomposingRecordingPen
from fontTools.pens.boundsPen import BoundsPen
from fontTools.pens.transformPen import TransformPen
from fontTools.pens.ttGlyphPen import TTGlyphPen
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer

SMALL_SCALE = 0.80   # ㇰ..ㇿ relative to Noto's own small kana (Noto's are ~0.64 em tall)
CHI_SCALE = 0.67     # チ → small チ (チ is ~0.77 em tall; this makes it as tall as the shrunk ㇰ)
ANCHOR_X = 500       # scale around the horizontal centre of the 1000-wide cell, on the baseline
HANDAKUTEN_GAP = 40  # space between a small ㇷ and its ゚
HANDAKUTEN_SCALE = 0.8
N_HANDAKUTEN_DX, N_HANDAKUTEN_DY = 0, 0   # ン゚ has no precomposed glyph in Noto; ゚ is put at its own drawn position + this offset

SMALL = list(range(0x31F0, 0x3200))
BASES_FOR_HANDAKUTEN = [0x30AB, 0x30AD, 0x30AF, 0x30B1, 0x30B3, 0x30F3]   # カキクケコン
CHI, MARK_U, MARK_H = 0x30C1, 0x032F, 0x309A
OUT_DEFAULT = "public/kana-font/kana-c.woff2"


def scaled(gs, name, sx, dx=0, dy=0, cx=ANCHOR_X):
    """Draw glyph `name` scaled by sx around (cx, 0), then shifted by (dx, dy)."""
    rec = DecomposingRecordingPen(gs); gs[name].draw(rec)
    pen = TTGlyphPen(None)
    rec.replay(TransformPen(pen, (sx, 0, 0, sx, cx - cx * sx + dx, dy)))
    return pen.glyph()


def main(jp_path, latin_path, out):
    tmp = tempfile.mkdtemp()
    jp = TTFont(jp_path)
    if "fvar" in jp:
        jp = instancer.instantiateVariableFont(jp, {"wght": 400})
    jp.save(f"{tmp}/jp400.ttf")

    o = subset.Options(); o.layout_features = ["ccmp", "liga", "calt", "locl"]; o.notdef_outline = True; o.name_IDs = ["*"]
    f = subset.load_font(f"{tmp}/jp400.ttf", o); s = subset.Subsetter(o)
    s.populate(unicodes=[CHI, MARK_H, *SMALL, *BASES_FOR_HANDAKUTEN]); s.subset(f)
    f.save(f"{tmp}/base.ttf")
    t = TTFont(f"{tmp}/base.ttf")
    cmap0 = t.getBestCmap()
    # Noto ships precomposed glyphs for カ+゚ etc. (a GSUB ligature). Keep those rules: a bare ゚ would float too high.
    composed = {}
    for lk in t["GSUB"].table.LookupList.Lookup:
        for st in lk.SubTable:
            st = getattr(st, "ExtSubTable", st)
            for first, ligs in getattr(st, "ligatures", {}).items():
                for lig in ligs:
                    if len(lig.Component) == 1 and lig.Component[0] == cmap0[MARK_H]:
                        composed[(first, lig.Component[0])] = lig.LigGlyph
    for tag in ("GSUB", "GPOS", "GDEF", "BASE", "vmtx", "vhea", "STAT"):   # OTS rejects vmtx lacking new glyphs
        if tag in t: del t[tag]

    glyf, hmtx, cmap = t["glyf"], t["hmtx"], t.getBestCmap()
    gs = t.getGlyphSet()
    order = list(t.getGlyphOrder())

    def put(name, glyph, advance):
        if name not in order: order.append(name)
        glyf.glyphs[name] = glyph
        glyph.recalcBounds(glyf)
        hmtx.metrics[name] = (advance, getattr(glyph, "xMin", 0))

    # 1) small consonants: redraw every ㇰ..ㇿ in place (before adding new glyphs, so `gs` still matches)
    small_top = {}
    for cp in SMALL:
        name = cmap[cp]
        g = scaled(gs, name, SMALL_SCALE)
        put(name, g, 1000)
        small_top[cp] = g.yMax
    # 1b) bases that Noto has no precomposed X゚ glyph for (ン): compose one ourselves. A bare zero-advance ゚
    #     would be placed by the shaper's fallback (it lands over the base's left part), so never rely on that.
    made = {}
    for base_cp in BASES_FOR_HANDAKUTEN:
        bname = cmap[base_cp]
        if (bname, cmap[MARK_H]) in composed:
            continue
        pen = TTGlyphPen(None)
        r1 = DecomposingRecordingPen(gs); gs[bname].draw(r1); r1.replay(pen)
        r2 = DecomposingRecordingPen(gs); gs[cmap[MARK_H]].draw(r2)
        r2.replay(TransformPen(pen, (1, 0, 0, 1, 1000 + N_HANDAKUTEN_DX, N_HANDAKUTEN_DY)))   # ゚ is drawn left of the pen at the base's advance
        made[bname] = f"{bname}_309A"
        put(made[bname], pen.glyph(), 1000)
    composed.update({(b, cmap[MARK_H]): g for b, g in made.items()})
    # 2) small ㇷ with handakuten, as one glyph. ゚ has zero advance and is drawn at negative x, i.e. to the
    #    left of the pen after the base advance (1000): right edge at 1000 + mx1. Shrink it and sit it on top of ㇷ.
    bp = BoundsPen(gs); gs[cmap[MARK_H]].draw(bp); mx0, my0, mx1, my1 = bp.bounds
    fgs = t.getGlyphSet(); fu_name = cmap[0x31F7]
    pen = TTGlyphPen(None)
    r1 = DecomposingRecordingPen(fgs); fgs[fu_name].draw(r1); r1.replay(pen)
    hs = HANDAKUTEN_SCALE
    r2 = DecomposingRecordingPen(gs); gs[cmap[MARK_H]].draw(r2)
    r2.replay(TransformPen(pen, (hs, 0, 0, hs, 1000 + mx1 - mx1 * hs, small_top[0x31F7] + HANDAKUTEN_GAP - my0 * hs)))
    put("uni31F7_309A", pen.glyph(), 1000)
    # 3) small チ
    put("chi.small", scaled(gs, cmap[CHI], CHI_SCALE), 1000)
    # 4) U+032F as a real combining mark (zero advance, shifted left by half an em to sit under a 1000-wide kana)
    lat = TTFont(latin_path); lgs = lat.getGlyphSet(); lname = lat.getBestCmap()[MARK_U]
    rec = DecomposingRecordingPen(lgs); lgs[lname].draw(rec)
    pen = TTGlyphPen(None); rec.replay(TransformPen(pen, (1, 0, 0, 1, -500, 0)))
    g = pen.glyph(); g.recalcBounds(glyf)
    put("uni032F", g, 0); hmtx.metrics["uni032F"] = (0, g.xMin)
    for st in t["cmap"].tables:
        if st.isUnicode(): st.cmap[MARK_U] = "uni032F"

    t.setGlyphOrder(order); glyf.glyphOrder = order
    t["post"].formatType = 3.0
    t["maxp"].numGlyphs = len(order)

    fea = f"""
languagesystem DFLT dflt;
languagesystem kana dflt;
languagesystem latn dflt;
table GDEF {{ GlyphClassDef , , [uni032F {cmap[MARK_H]}], ; }} GDEF;
feature liga {{
  sub {cmap[CHI]} uni032F by chi.small;
  sub {cmap[0x31F7]} {cmap[MARK_H]} by uni31F7_309A;
}} liga;
"""
    # precomposed カ゚ etc.: only for the bases we bundle (the ㇷ゚ rule above is ours and replaces Noto's)
    keep = [f"  sub {a} {b} by {g};" for (a, b), g in sorted(composed.items()) if a != cmap[0x31F7]]
    fea = fea.replace("} liga;", "\n".join(keep) + "\n} liga;")
    addOpenTypeFeaturesFromString(t, fea)
    t.flavor = "woff2"; t.save(out)
    print(out, os.path.getsize(out), "bytes,", len(order), "glyphs")


if __name__ == "__main__":
    if len(sys.argv) < 3:
        sys.exit(__doc__)
    main(sys.argv[1], sys.argv[2], sys.argv[3] if len(sys.argv) > 3 else OUT_DEFAULT)
