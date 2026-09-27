# /// script
# requires-python = ">=3.10"
# dependencies = ["fonttools", "brotli"]
# ///
"""Build kana-support.woff2: the modifier letters the notation needs, subset from Noto Sans (OFL).

This is the "Kana Support" @font-face in apps/web/src/style.css, loaded after Kana C so a device's own
font never has to supply these (some Android builds lack a few of them, showing tofu instead).

Contents: every code point apps/web/src/style.css's "Kana Support" unicode-range lists, plus U+1D51 (ᵑ,
the ŋ marker added when khmer-kana switched from the half-voiced-mark notation to the multi-language ᵑ
convention -- see docs/design.md §2.3).

There was no build script for the version already committed; this one reproduces its coverage exactly
(verified against the committed file) and adds U+1D51. Re-run whenever style.css's unicode-range grows.

usage: uv run scripts/build-kana-support-font.py NotoSans-Regular.ttf [out.woff2]
  NotoSans-Regular.ttf https://github.com/notofonts/notofonts.github.io/raw/main/fonts/NotoSans/full/ttf/NotoSans-Regular.ttf
"""
import sys
from fontTools import subset

OUT_DEFAULT = "public/kana-font/kana-support.woff2"
# U+032F (◌̯), U+02B0-02B3 (ʰ ʱ ʲ ʳ), U+02E1 (ˡ), U+1D45 U+1D4A U+1D4B U+1D53 U+1DA4 (ᵅ ᵊ ᵋ ᵓ ᶤ), U+1D9C (ᶜ, unused
# by current tables.ts but kept for parity with the committed font), plus U+1D51 (ᵑ, new).
CODEPOINTS = [0x032F, *range(0x02B0, 0x02B4), 0x02E1, 0x1D45, 0x1D4A, 0x1D4B, 0x1D51, 0x1D53, 0x1D9C, 0x1DA4]


def main(latin_path, out):
    o = subset.Options()
    o.layout_features = []
    o.notdef_outline = True
    o.name_IDs = ["*"]
    f = subset.load_font(latin_path, o)
    s = subset.Subsetter(o)
    s.populate(unicodes=CODEPOINTS)
    s.subset(f)
    f.flavor = "woff2"
    f.save(out)
    print(out, "saved with", len(CODEPOINTS), "code points")


if __name__ == "__main__":
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    main(sys.argv[1], sys.argv[2] if len(sys.argv) > 2 else OUT_DEFAULT)
