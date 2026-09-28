# /// script
# requires-python = ">=3.10"
# dependencies = ["fonttools", "brotli"]
# ///
"""Build kana-support.woff2: the modifier letters the notation needs, subset from Noto Sans (OFL).

This is the "Kana Support" @font-face in apps/web/src/style.css, loaded after Kana C so a device's own
font never has to supply these (some Android builds lack a few of them, showing tofu instead).

Contents: every code point apps/web/src/style.css's "Kana Support" unicode-range lists, plus U+1D51 (ᵑ,
the ŋ marker added when khmer-kana switched from the half-voiced-mark notation to the multi-language ᵑ
convention -- see docs/design.md §2.3) and U+02C0 (ˀ, the ʔ prefix marker, khmer-kana-spec.md §5.4/§11-1).

U+02B0 (ʰ, aspiration) is NOT Noto's own glyph: after subsetting, its outline is replaced with a custom
"dot+tail" shape (khmer-kana-spec.md, 2026-09-28 addendum) -- a round head near the top-right tapering to
a point at the bottom-left, in the same slot as the glyph it replaces. Noto's own small "h" looks enough
like a literal h to be misread as "add an h sound"; the same corner is also where dakuten/handakuten sit,
so the new shape is also deliberately unlike either of those (1 stroke, not 2; no ring). See the aspiration
marker artifact/discussion this was designed from for the full comparison against those alternatives.

There was no build script for the version originally committed; a later one reproduced its coverage
exactly and added U+1D51. This version adds U+02C0 and the custom U+02B0 glyph. Re-run whenever
style.css's unicode-range grows, or the custom glyph's shape changes.

The U+02B0 outline is built from straight line segments (a flattened polygon), not `TTGlyphPen.curveTo`.
fontTools' cubic-to-quadratic conversion for that call produced a glyph fontTools itself could read back,
but that real browsers rejected outright (`document.fonts.load` rejects with a NetworkError -- confirmed
2026-09-28 by bisecting against the committed font, a plain square via `lineTo`, and a circle via native
`qCurveTo`: only the `curveTo`-built glyph failed to load). Flattening the same curve to ~56 line segments
sidesteps whatever in that conversion path browsers choke on. If this glyph's shape changes, regenerate
the polygon the same way (sample the cubic Bezier and pass the points to `lineTo`) rather than reintroducing
`curveTo`.

usage: uv run scripts/build-kana-support-font.py NotoSans-Regular.ttf [out.woff2]
  NotoSans-Regular.ttf https://github.com/notofonts/notofonts.github.io/raw/main/fonts/NotoSans/full/ttf/NotoSans-Regular.ttf
"""
import sys
from fontTools import subset
from fontTools.pens.ttGlyphPen import TTGlyphPen

OUT_DEFAULT = "public/kana-font/kana-support.woff2"
# U+032F (◌̯), U+02B0-02B3 (ʰ ʱ ʲ ʳ), U+02C0 (ˀ), U+02E1 (ˡ), U+1D45 U+1D4A U+1D4B U+1D53 U+1DA4
# (ᵅ ᵊ ᵋ ᵓ ᶤ), U+1D9C (ᶜ, unused by current tables.ts but kept for parity with the committed font),
# U+1D51 (ᵑ).
CODEPOINTS = [0x032F, *range(0x02B0, 0x02B4), 0x02C0, 0x02E1, 0x1D45, 0x1D4A, 0x1D4B, 0x1D51, 0x1D53, 0x1D9C, 0x1DA4]

# Target bbox for the replacement U+02B0 glyph: the old Noto "ʰ" glyph's own bbox in this 1000-unit-em
# font (x:[55,349] y:[287,743]), so the new mark sits in the same slot. Control points otherwise mirror
# the SVG mockup (viewBox 0 0 34 34) from the aspiration-marker design discussion; each entry is one cubic
# Bezier segment (start, c1, c2, end) of the round-head-tapering-to-a-point-tail outline.
HA_CUBIC_SEGMENTS = [
    ((254, 622), (289, 622), (289, 515), (237, 488)),
    ((237, 488), (185, 461), (133, 408), (116, 381)),
    ((116, 381), (142, 461), (176, 542), (211, 596)),
    ((211, 596), (224, 616), (237, 622), (254, 622)),
]
HA_STEPS_PER_SEGMENT = 14  # flattening resolution; see the module docstring for why this isn't curveTo


def _cubic_point(p0, p1, p2, p3, t):
    x = (1 - t) ** 3 * p0[0] + 3 * (1 - t) ** 2 * t * p1[0] + 3 * (1 - t) * t ** 2 * p2[0] + t ** 3 * p3[0]
    y = (1 - t) ** 3 * p0[1] + 3 * (1 - t) ** 2 * t * p1[1] + 3 * (1 - t) * t ** 2 * p2[1] + t ** 3 * p3[1]
    return (round(x), round(y))


def build_ha_glyph():
    """Dot+tail: round head near the top-right, tapering to a point at the bottom-left. A flattened
    polygon (see the module docstring for why), not curveTo/qCurveTo."""
    points = []
    for p0, p1, p2, p3 in HA_CUBIC_SEGMENTS:
        for i in range(HA_STEPS_PER_SEGMENT):
            p = _cubic_point(p0, p1, p2, p3, i / HA_STEPS_PER_SEGMENT)
            if not points or p != points[-1]:
                points.append(p)
    pen = TTGlyphPen(None)
    pen.moveTo(points[0])
    for p in points[1:]:
        pen.lineTo(p)
    pen.closePath()
    return pen.glyph()


def main(latin_path, out):
    o = subset.Options()
    o.layout_features = []
    o.notdef_outline = True
    o.name_IDs = ["*"]
    f = subset.load_font(latin_path, o)
    s = subset.Subsetter(o)
    s.populate(unicodes=CODEPOINTS)
    s.subset(f)

    assert f["head"].unitsPerEm == 1000, "HA_OUTLINE assumes a 1000-unit em"
    gname = f.getBestCmap()[0x02B0]
    glyph = build_ha_glyph()
    glyph.recalcBounds(f["glyf"])
    f["glyf"][gname] = glyph
    f["hmtx"][gname] = (402, glyph.xMin)  # keep the original advance width; lsb = the new glyph's own xMin

    f.flavor = "woff2"
    f.save(out)
    print(out, "saved with", len(CODEPOINTS), "code points (U+02B0 custom-drawn)")


if __name__ == "__main__":
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    main(sys.argv[1], sys.argv[2] if len(sys.argv) > 2 else OUT_DEFAULT)
