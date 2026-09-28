# /// script
# requires-python = ">=3.10"
# dependencies = ["fonttools", "brotli", "uharfbuzz"]
# ///
"""Shape-verify kana-multi.woff2 with uharfbuzz (docs/tone-notation.md §6).

Why this exists: the first version of the syllable-wide tone stretch (docs/tone-notation.md §8-12) shipped with
several real bugs that three Opus reviews caught by rebuilding the font and shaping test strings, not by anything
in this repo -- most of them things a script like this one should have caught mechanically. Run it after any
change to build-kana-multi-font.py, before trusting a glyph-check screenshot.

Judgement is still by eye for anything about how a shape *looks* (glyph-check, docs/tone-notation.md's own
policy); this only checks what a script can check. Two kinds of check, and they are not interchangeable:
  - "does the right glyph get selected, and does its outline match what contour_glyph()/w_of() say it should be
    for this (levels, x0, x1)" (assert_matches_expected). This catches wiring bugs (wrong lookup, wrong glyph
    chosen) but NOT a bug inside contour_glyph()/stem()/w_of() themselves -- both sides of the comparison call
    the same code, so a bug there passes on both sides. A third Opus review proved this by reintroducing the C1
    stem bug in a scratch copy and confirming this script still printed ALL CHECKS PASSED.
  - "does the shipped glyph's actual geometry match a value computed independently, from plain arithmetic and
    the font's own real advances, without calling contour_glyph()/stem()/w_of() for the expectation"
    (check_stem_independent, check_centring_independent). These are what can catch a bug in that code itself,
    including a regression back to the old fixed-stem or ceiling-width bugs. If you add a check and aren't sure
    which kind it is, ask: "would this still pass if I reintroduced the bug it's supposed to catch?" -- if you
    haven't tried that, you don't know.

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

MARKER = chr(0xE000)   # U+E000, built via chr() rather than written as a source character so it can't silently
HINT_A = chr(0x2062)   # collapse back into a literal invisible glyph the way a hand-typed escape has before.
HINT_S = {1: chr(0x2061), 2: chr(0x2063), 3: chr(0x2064)}


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
        """Wiring check, not a geometry check (see the module docstring): recomputes the glyph via the same
        contour_glyph() the build uses, so this catches the build picking the wrong lookup/glyph for a given
        (levels, x0, x1), but a bug inside contour_glyph()/stem() itself passes here either way."""
        expected = bk.contour_glyph(levels, x0, x1)
        expected.recalcBounds(glyf)
        exp_b = (expected.xMin, expected.yMin, expected.xMax, expected.yMax)
        got_b = bounds(name)
        if got_b != exp_b:
            fails.append(f"{label}: glyph {name} bounds {got_b} != recomputed expectation {exp_b} for x0={x0}")

    def check_stem_independent(label, name, x0):
        """The actual C1 regression test: computes the stem's expected position from plain arithmetic (x0-60,
        STEM wide -- the literal values stem() is supposed to draw) without calling contour_glyph() or stem()
        for the expectation, then reads the glyph's *first* contour (stem() draws the stem before the line) and
        requires its x-range to be exactly that pair. Confirmed to fail when the C1 bug is reintroduced (a
        scratch copy with stem()'s old fixed sx)."""
        g = glyf[name]
        coords, endPts, _ = g.getCoordinates(glyf)
        if not endPts:
            fails.append(f"{label}: {name} has no contours"); return
        first = coords[:endPts[0] + 1]
        xs = sorted({p[0] for p in first})
        expected_sx = x0 - 60
        if xs != [expected_sx, expected_sx + bk.STEM]:
            fails.append(f"{label}: {name}'s first contour (the stem) has x in {xs}, "
                         f"expected [{expected_sx}, {expected_sx + bk.STEM}] (independent arithmetic)")

    def check_centring_independent(label, text, tol):
        """The actual R1 regression test: uses the font's *real* x_advance for everything before the tone glyph
        (not w_of()'s class-average approximation) to compute where the syllable's true centre is, and requires
        the shaped tone glyph's own geometric centre to land within `tol` of it -- independent of SCLASS_WIDTH,
        SCLASS_CEIL, or any function in build-kana-multi-font.py. Confirmed to fail (by a wide margin) against a
        scratch copy with SCLASS_WIDTH reset to SCLASS_CEIL (the pre-R1 ceiling bug)."""
        seq = shape(text)
        tone = next(((n, x, a) for n, x, a in seq if n.startswith("tone_")), None)
        if tone is None:
            fails.append(f"{label}: no tone glyph in {[n for n,_,_ in seq]}"); return
        name, tone_x, _ = tone
        g = glyf[name]
        if g.numberOfContours == 0:
            fails.append(f"{label}: {name} has no outline"); return
        # Centre of the *line* (its own contours), not the whole glyph: the whole-glyph bounding box also
        # includes the reference stem, whose left edge sits a further STROKE units left of the line's own
        # start (see stem()) -- folding that into the centre computation biases it by about half that offset,
        # which is a measurement artefact of this check, not something the design is trying to keep small.
        coords, endPts, _ = g.getCoordinates(glyf)
        line_pts = coords[endPts[0] + 1:]
        if not line_pts:
            fails.append(f"{label}: {name} has only a stem contour"); return
        xs = [p[0] for p in line_pts]
        real_body_adv = sum(a for _, _, a in seq if a > 0)   # marker/hints are 0-width; only real kana+superscripts count
        expected_centre = -real_body_adv / 2                 # body spans -real_body_adv..0 in the tone glyph's own frame
        actual_centre = (min(xs) + max(xs)) / 2
        diff = actual_centre - expected_centre
        if abs(diff) > tol:
            fails.append(f"{label}: {name} centre off by {diff:.0f} from the real-advance centre (tol {tol}); "
                         f"real body width {real_body_adv}, line x-range [{min(xs)}, {max(xs)}]")

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
    #    sequence: nf kana, then n1/n2/n3 superscripts of each class) and the hint path (the same counts) must
    #    select the *same* glyph (a real cross-check between two independently-built rule sets), and that glyph
    #    must be the one assert_matches_expected() recomputes -- a wiring check, see its docstring for what it
    #    does and does not prove.
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
        hint_body = "カ" * nf + HINT_A * (nf - 1) + HINT_S[1] * n1 + HINT_S[2] * n2 + HINT_S[3] * n3
        hint_name = expect_tone(f"hint nf={nf} n1={n1} n2={n2} n3={n3}", hint_body + "˨˩", rf"^tone_21_w{w}$")
        if marker_name and hint_name and marker_name != hint_name:
            fails.append(f"nf={nf} n1={n1} n2={n2} n3={n3}: marker path picked {marker_name}, hint path picked {hint_name}")
        if marker_name:
            assert_matches_expected(f"marker nf={nf} n1={n1} n2={n2} n3={n3}", marker_name, levels, x0, x1)
    print(f"  ({len(tested_widths)} distinct widths exercised via both paths)")

    # 5. The C1 regression test (independent of contour_glyph/w_of; see check_stem_independent's docstring): the
    #    stem of a stretched glyph must sit at that glyph's own x0-60, not wherever a fixed constant would put it.
    for nf, n1, n2, n3 in [(2, 0, 0, 0), (4, 1, 1, 0), (1, 0, 2, 0)]:
        w = bk.w_of(nf, n1, n2, n3)
        half = min(w - 2 * bk.SPAN_MARGIN, bk.SPAN_MAX) / 2
        x0 = round(-w / 2 - half)
        body = "カ" * nf + letter[1] * n1 + letter[2] * n2
        name = expect_tone(f"stem nf={nf} n1={n1} n2={n2}", MARKER + body + "˨˩", rf"^tone_21_w{w}$")
        if name: check_stem_independent(f"stem nf={nf} n1={n1} n2={n2}", name, x0)

    # 6. The R1 regression test (independent of SCLASS_WIDTH/w_of; see check_centring_independent's docstring):
    #    for every width class, the narrowest and the widest member (not just one arbitrary representative),
    #    because R1 was specifically a bias that grew with how far a superscript sits from its class's average.
    class_members = {1: [], 2: [], 3: []}
    for cp, _drawn_from in bk.SUPERSCRIPTS.items():
        letter_ = chr(cp)                          # the actual superscript codepoint, not the Latin letter it's drawn from
        adv = shape(letter_)[0][2]
        class_members.setdefault(bk.sclass_of(adv), []).append((letter_, adv))
    for k, members in class_members.items():
        members.sort(key=lambda t: t[1])
        for letter_, adv in {members[0], members[-1]}:
            check_centring_independent(f"class{k} {letter_} (adv={adv})", MARKER + "カ" + letter_ + "˦˥", tol=45)
    check_centring_independent("2 superscripts (キʲᵊ)", MARKER + "キʲᵊ˦˥", tol=60)

    # 7. Mark filtering (the M1 fix): a dot-below/creaky/handakuten between two kana must not knock the marker
    #    path back to the default (unstretched) position.
    for label, text in [
        ("dot-below mid-syllable", MARKER + "タ̣ラ˧˩"),
        ("creaky mid-syllable", MARKER + "カ̰タ˧˩"),
        ("handakuten mid-syllable", MARKER + "カ゚タ˧˩"),
    ]:
        expect_tone(label, text, r"^tone_31_w2000$")

    # 8. Consecutive syllables: syllable 1's own stretched tone glyph must not become invisible to syllable 2's
    #    matching (the regression the first UseMarkFilteringSet attempt introduced, and this script would have
    #    caught immediately).
    seq = shape(MARKER + "カタ" + HINT_A + "˨˩ラ˧")
    tones = [n for n, _, _ in seq if n.startswith("tone_")]
    if tones != ["tone_21_w2000", "tone_3"]:
        fails.append(f"consecutive syllables: expected ['tone_21_w2000', 'tone_3'], got {tones}")

    # 9. ccmp/rclt are not discretionary: disabling liga/calt/clig (which no longer host anything) must not
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
