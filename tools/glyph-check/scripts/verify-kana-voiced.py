# /// script
# requires-python = ">=3.10"
# dependencies = ["fonttools", "brotli", "uharfbuzz"]
# ///
"""Shape-verify the small voiced kana and the silent mouth shapes in the shipped kana-multi.woff2 (ADR-0033, ADR-0035).

verify-kana-multi.py rebuilds the font to check the tone machinery; it knows nothing about these glyphs. This one reads
the shipped file as is (woff2 -> ttf in a temp dir, because HarfBuzz does not read woff2) and checks with uharfbuzz:
  - each voiceless small kana + U+3099 ligates to ONE full-width glyph (ㇰ ㇱ ㇲ ㇳ ㇷ = グ ジ ズ ド ブ, ゥ = ヴ),
    and b (ㇷ + U+3099) and v (ゥ + U+3099) and p (ㇷ + U+309A) are three different glyphs;
  - each PUA mouth shape (U+E100..E106) and its kana + U+0338 form shape to the same single narrow glyph (a small
    kana in parentheses at the left shoulder of the next kana, advance 300-800, the SAME advance for all seven);
  - a kana with no mouth ligature + U+0338 degrades to the kana plus a zero-advance slash mark (2 glyphs).
Shape and look still need an eye (docs/adr/0004): this only checks the wiring.

usage: uv run scripts/verify-kana-voiced.py [public/kana-font/kana-multi.woff2]
"""
import os, sys, tempfile
import uharfbuzz as hb
from fontTools.ttLib import TTFont

D, H, SL = "゙", "゚", "̸"
MOUTH = [("ナ", ""), ("ニ", ""), ("ヌ", ""), ("ネ", ""), ("ノ", ""), ("ㇴ", ""), ("ウ", "")]
VOICED = ["ㇰ", "ㇱ", "ㇲ", "ㇳ", "ㇷ", "ゥ"]   # ㇷ + ゙ = ブ, ゥ + ゙ = ヴ


def main(path):
    f = TTFont(path); f.flavor = None
    tmp = tempfile.NamedTemporaryFile(suffix=".ttf", delete=False).name
    f.save(tmp)
    font = hb.Font(hb.Face(hb.Blob.from_file_path(tmp)))
    os.unlink(tmp)

    def shape(t):
        b = hb.Buffer(); b.add_str(t); b.guess_segment_properties(); hb.shape(font, b, {})
        return [(i.codepoint, p.x_advance) for i, p in zip(b.glyph_infos, b.glyph_positions)]

    bad = []
    def check(ok, msg):
        if not ok: bad.append(msg)

    seen = {}
    for base in VOICED:
        g = shape(base + D)
        check(len(g) == 1 and g[0][1] == 1000 and g[0][0] != 0, f"{base}+U+3099 should be one full-width glyph, got {g}")
        seen[base] = g[0][0] if g else None
    p = shape("ㇷ" + H)
    check(len(p) == 1, f"ㇷ+U+309A should be one glyph, got {p}")
    ids = [*seen.values(), p[0][0] if p else None]
    check(len(set(ids)) == len(ids), f"voiced glyphs must be distinct from each other and from ㇷ゚ (b/v/p): {seen} {p}")
    for kana, pua in MOUTH:
        a, b = shape(pua), shape(kana + SL)
        check(len(a) == 1 and 300 <= a[0][1] <= 800 and a[0][0] != 0, f"PUA {ord(pua):04X} should be one narrow (left-shoulder) glyph, got {a}")
        check(a == b, f"PUA {ord(pua):04X} and {kana}+U+0338 should shape alike: {a} vs {b}")
        plain = shape(kana)
        check(a != plain, f"mouth shape for {kana} must differ from the plain kana")
    advs = {shape(pua)[0][1] for _, pua in MOUTH}
    check(len(advs) == 1, f"the seven mouth glyphs must share one advance, got {sorted(advs)}")
    d = shape("カ" + SL)
    check(len(d) == 2 and d[1][1] == 0 and d[1][0] != 0, f"カ+U+0338 should degrade to カ + a zero-advance slash, got {d}")
    for m in bad: print("FAIL", m)
    print("ALL CHECKS PASSED" if not bad else f"{len(bad)} FAILED")
    return 1 if bad else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1] if len(sys.argv) > 1 else "public/kana-font/kana-multi.woff2"))
