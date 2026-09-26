# /// script
# requires-python = ">=3.10"
# dependencies = ["fonttools", "brotli"]
# ///
"""Build public/kana-font/kana-c.woff2: チ (Noto Sans JP) + U+032F (Noto Sans) in ONE font.

Why: Chrome on Android needs a base char and its combining mark to be covered by a single font,
otherwise the cluster renders as tofu (iOS CoreText composes across fonts, so it is fine there).
fontsource's Noto Sans subsets do not contain U+032F, so the full NotoSans-Regular.ttf is required.

usage: uv run scripts/build-kana-font.py path/to/NotoSans-Regular.ttf
   (NotoSans-Regular.ttf: https://github.com/notofonts/notofonts.github.io/raw/main/fonts/NotoSans/full/ttf/NotoSans-Regular.ttf)
Run `pnpm install && pnpm prepare-fonts` first (needs node_modules/@fontsource/noto-sans-jp).
Both fonts are OFL-licensed; keep the license notice when shipping.
"""
import sys, tempfile, os
from fontTools import subset
from fontTools.ttLib import TTFont
from fontTools.pens.recordingPen import DecomposingRecordingPen
from fontTools.pens.transformPen import TransformPen
from fontTools.pens.ttGlyphPen import TTGlyphPen

JP = "node_modules/@fontsource/noto-sans-jp/files/noto-sans-jp-japanese-400-normal.woff2"
BASE, MARK = 0x30C1, 0x032F
OUT = "public/kana-font/kana-c.woff2"

def sub(src, cp, out):
    o = subset.Options(); o.layout_features = []; o.notdef_outline = True; o.name_IDs = ["*"]
    f = subset.load_font(src, o); s = subset.Subsetter(o); s.populate(unicodes=[cp]); s.subset(f); f.save(out)

tmp = tempfile.mkdtemp()
sub(JP, BASE, f"{tmp}/base.ttf")
sub(sys.argv[1], MARK, f"{tmp}/mark.ttf")
t, m = TTFont(f"{tmp}/base.ttf"), TTFont(f"{tmp}/mark.ttf")

# copy the mark glyph, decomposed, shifted left by half an em so it sits under the (1000-wide) kana
gs = m.getGlyphSet(); src = m.getBestCmap()[MARK]
rec = DecomposingRecordingPen(gs); gs[src].draw(rec)
pen = TTGlyphPen(None); rec.replay(TransformPen(pen, (1, 0, 0, 1, -500, 0)))
g = pen.glyph(); name = "uni032F"
order = t.getGlyphOrder() + [name]; t.setGlyphOrder(order)
t["glyf"].glyphs[name] = g; t["glyf"].glyphOrder = order; g.recalcBounds(t["glyf"])
t["hmtx"].metrics[name] = (0, g.xMin)                      # zero advance: a real combining mark
for st in t["cmap"].tables:
    if st.isUnicode(): st.cmap[MARK] = name
t["post"].formatType = 3.0
t["maxp"].numGlyphs = len(order)
for tag in ("vmtx", "vhea"):                                 # OTS rejects vmtx lacking the new glyph
    if tag in t: del t[tag]
t.flavor = "woff2"; t.save(OUT)
print(OUT, os.path.getsize(OUT), "bytes")
