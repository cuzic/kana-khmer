# /// script
# requires-python = ">=3.10"
# dependencies = ["fonttools", "brotli", "uharfbuzz"]
# ///
"""Shape-verify kana-multi.woff2 with uharfbuzz (docs/tone-notation.md §6).

Why this exists: the first version of the syllable-wide tone stretch (docs/tone-notation.md §8-12) shipped with
several real bugs that two Opus reviews caught by rebuilding the font and shaping test strings, not by anything
in this repo -- most of them things a script like this one should have caught mechanically. Run it after any
change to build-kana-multi-font.py, before trusting a glyph-check screenshot.

Judgement is still by eye for anything about how a shape *looks* (glyph-check, docs/tone-notation.md's own
policy); this only checks what a script can check: does the intended glyph get selected, does its outline
exactly match an independently-recomputed expectation (so a mispositioned stem or a wrong stretch span fails
here, not just "some tone glyph exists"), does a mark between the kana and the tone get skipped by the marker
path, does a widened syllable's tone glyph stay opaque to the next syllable's context matching, and do the
marker path (a literal glyph sequence) and the hint path (per-class counts) agree on every width the font builds
a lookup for.

This builds its own named copy of the font (build_kana_multi_font.main(..., keep_names=True)) rather than reading
the shipped kana-multi.woff2 directly: the shipped file uses post format 3 (no glyph names, to save space), and
there is no way to recover the real names (tone_431 etc.) from a format-3 file after the fact -- flipping
formatType back to 2 on an already-format-3 TTFont just keeps whatever placeholder names fontTools synthesized on
load, it does not un-erase the originals. Building a second, named copy from the same source fonts is the only
way to get readable names back, and it also means this script exercises the exact same code path that produces
the shipped file (same function, only the last few lines differ).

usage: uv run scripts/verify-kana-multi.py NotoSansJP-VF.ttf NotoSans-Regular.ttf
Both source fonts are OFL-licensed; keep the license notice when shipping.
"""
import importlib.util, itertools, os, re, sys, tempfile
import uharfbuzz as hb
from fontTools.ttLib import TTFont

HERE = os.path.dirname(os.path.abspath(__file__))
spec = importlib.util.spec_from_file_location("build_kana_multi_font", os.path.join(HERE, "build-kana-multi-font.py"))
bk = importlib.util.module_from_spec(spec)
spec.loader.exec_module(bk)

MARKER = ""   # written as an escape, not the literal invisible character, so it's visible in a diff/review


def main(jp_path, latin_path):
    tmp = tempfile.NamedTemporaryFile(suffix=".woff2", delete=False).name
    bk.main(jp_path, latin_path, tmp, keep_names=True)
    ttf = tempfile.NamedTemporaryFile(suffix=".ttf", delete=False).name
    t = TTFont(tmp); t.flavor = None; t.save(ttf)
    order = t.getGlyphOrder()
    glyf = t["glyf"]
    face = hb.Face(open(ttf, "rb").read())
    font = hb.Font(face)
    fails = []

    def shape(text, features=None):
        buf = hb.Buffer(); buf.add_str(text); buf.guess_segment_properties()
        hb.shape(font, buf, features or {})
        names, x = [], 0
        for info, pos in zip(buf.glyph_infos, buf.glyph_positions):
            names.append((order[info.codepoint], x, pos.x_advance))
            x += pos.x_advance
        return names

    def bounds(name):
        g = glyf[name]
        if g.numberOfContours == 0: return None
        g.recalcBounds(glyf)
        return (g.xMin, g.yMin, g.xMax, g.yMax)

    def expect_tone(label, text, pattern, note=""):
        seq = shape(text)
        tones = [n for n, _, _ in seq if n.startswith("tone_")]
        if len(tones) != 1:
            fails.append(f"{label}: expected exactly one tone glyph, got {tones} ({note})"); return None
        if not re.match(pattern, tones[0]):
            fails.append(f"{label}: expected glyph matching {pattern!r}, got {tones[0]} ({note})")
        return tones[0]

    def assert_matches_expected(label, name, levels, x0, x1):
        """The strong version of a shape check: recompute the glyph build-kana-multi-font.py *should* have
        produced for this exact (levels, x0, x1) -- via the same contour_glyph() the build uses, not a copy of
        the logic -- and require the real shaped glyph's bounding box to match exactly. This is what the
        original stem check should have been: that one derived its "expected" value from the same glyph it was
        checking (bounds' own xMin), so it could never fail -- comparing against an independent recomputation can."""
        expected = bk.contour_glyph(levels, x0, x1)
        expected.recalcBounds(glyf)
        exp_b = (expected.xMin, expected.yMin, expected.xMax, expected.yMax)
        got_b = bounds(name)
        if got_b != exp_b:
            fails.append(f"{label}: glyph {name} bounds {got_b} != recomputed expectation {exp_b} for x0={x0}")

    # 1. Every 1-3 bar sequence ligates to exactly one contour glyph, at the default (unstretched) position
    # (docs/tone-notation.md §6, row 1), and its outline exactly matches a fresh contour_glyph() call.
    bar_cp = {5: "˥", 4: "˦", 3: "˧", 2: "˨", 1: "˩"}
    for n in (1, 2, 3):
        for levels in itertools.product((5, 4, 3, 2, 1), repeat=n):
            text = "マ" + "".join(bar_cp[l] for l in levels)
            name = expect_tone(f"bars {levels}", text, rf"^tone_{''.join(map(str, levels))}$")
            if name: assert_matches_expected(f"bars {levels}", name, levels, bk.TONE_X0, bk.TONE_X1)

    # 2. Legacy single-codepoint aliases point at the documented shapes (docs/tone-notation.md §2.3).
    for cp, levels in {"̄": "3", "̀": "21", "̂": "51", "́": "45", "̌": "14"}.items():
        expect_tone(f"legacy {hex(ord(cp))}", "マ" + cp, rf"^tone_{levels}$")

    # 3. A bare single kana (nF=1, nS=0) is never stretched -- it sits at the default position (docs/tone-notation.md
    #    §3.1.1, the "excludes (1,0)" rule).
    expect_tone("bare single kana", "カ˨˩", r"^tone_21$")

    # 4. Every width the font builds a lookup for (bk.width_combos()): the marker path (an actual glyph
    #    sequence: nf kana, then n1/n2/n3 superscripts of each class) and the hint path (the same counts, as
    #    hintA/hintS1-3) must select the *same* glyph, and that glyph's outline must exactly match an
    #    independently recomputed one -- this is the R2 fix (the old check only compared a glyph name suffix
    #    like "_w1280" against the formula, never the real geometry) and doubles as the C1 stem regression test
    #    (contour_glyph draws the stem first, at x0-60, so a wrong x0 fails the bounds comparison) and the R1
    #    width-bias check (SCLASS_WIDTH now an average, not a ceiling -- width_combos() and w_of() already use
    #    whatever SCLASS_WIDTH the build computed, so this check is correct either way; it is what would have
    #    shown the R1 bias directly, since the expected geometry is computed from the same formula, not eyeballed).
    letter = {1: "ʲ", 2: "ᵊ", 3: "ʷ"}   # one representative superscript per class (ʲ, ᵊ, ʷ)
    levels = (2, 1)
    tested_widths = set()
    for nf, n1, n2, n3 in bk.width_combos():
        body = "カ" * nf + letter[1] * n1 + letter[2] * n2 + letter[3] * n3
        w = bk.w_of(nf, n1, n2, n3)
        tested_widths.add(w)
        half = min(w - 2 * bk.SPAN_MARGIN, bk.SPAN_MAX) / 2
        cx = -w / 2
        x0, x1 = round(cx - half), round(cx + half)
        marker_name = expect_tone(f"marker nf={nf} n1={n1} n2={n2} n3={n3}",
                                   MARKER + body + "˨˩", rf"^tone_21_w{w}$")
        hint_body = "カ" * nf + "⁢" * (nf - 1) + "⁡" * n1 + "⁣" * n2 + "⁤" * n3
        hint_name = expect_tone(f"hint nf={nf} n1={n1} n2={n2} n3={n3}", hint_body + "˨˩", rf"^tone_21_w{w}$")
        if marker_name and hint_name and marker_name != hint_name:
            fails.append(f"nf={nf} n1={n1} n2={n2} n3={n3}: marker path picked {marker_name}, hint path picked {hint_name}")
        if marker_name:
            assert_matches_expected(f"marker nf={nf} n1={n1} n2={n2} n3={n3}", marker_name, levels, x0, x1)
    print(f"  ({len(tested_widths)} distinct widths exercised via both paths)")

    # 5. Mark filtering (the M1 fix): a dot-below/creaky/handakuten between two kana must not knock the marker
    #    path back to the default (unstretched) position.
    for label, text in [
        ("dot-below mid-syllable", MARKER + "タ̣ラ˧˩"),
        ("creaky mid-syllable", MARKER + "カ̰タ˧˩"),
        ("handakuten mid-syllable", MARKER + "カ゚タ˧˩"),
    ]:
        expect_tone(label, text, r"^tone_31_w2000$")

    # 6. Consecutive syllables: syllable 1's own stretched tone glyph must not become invisible to syllable 2's
    #    matching (the regression the first UseMarkFilteringSet attempt introduced, and this script would have
    #    caught immediately).
    seq = shape(MARKER + "カタ⁢˨˩ラ˧")
    tones = [n for n, _, _ in seq if n.startswith("tone_")]
    if tones != ["tone_21_w2000", "tone_3"]:
        fails.append(f"consecutive syllables: expected ['tone_21_w2000', 'tone_3'], got {tones}")

    # 7. ccmp/rclt are not discretionary: disabling liga/calt/clig (which no longer host anything) must not
    #    affect the result (the M2 fix).
    seq = shape("マ˨˩", {"liga": False, "calt": False, "clig": False})
    if not any(n == "tone_21" for n, _, _ in seq):
        fails.append(f"tone ligature broke with liga/calt/clig off: {[n for n,_,_ in seq]}")

    print(f"{len(fails)} failure(s)" if fails else "ALL CHECKS PASSED")
    for f in fails: print(" -", f)
    return 1 if fails else 0


if __name__ == "__main__":
    if len(sys.argv) != 3:
        sys.exit(__doc__)
    sys.exit(main(sys.argv[1], sys.argv[2]))
