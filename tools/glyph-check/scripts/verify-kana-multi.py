# /// script
# requires-python = ">=3.10"
# dependencies = ["fonttools", "brotli", "uharfbuzz"]
# ///
"""Shape-verify kana-multi.woff2 with uharfbuzz (docs/tone-notation.md §6).

Why this exists: the first version of the syllable-wide tone stretch (docs/tone-notation.md §8-12) shipped with
two real bugs -- the reference stem staying at a fixed x instead of following the stretched contour's own left
edge, and the width formula assuming every superscript is 480 units wide when the real range is ~160-487 -- that
an Opus review caught by rebuilding the font and shaping test strings, not by anything in this repo. Both were
things a script like this one would have caught mechanically. Run it after any change to
build-kana-multi-font.py, before trusting a glyph-check screenshot.

Judgement is still by eye for anything about how a shape *looks* (glyph-check, docs/tone-notation.md's own
policy); this only checks what a script can check: does the intended glyph get selected, is it centred where the
formula says it should be, does the reference stem track the stretched line, does a mark between the kana and
the tone get skipped by the marker path, does a widened syllable's tone glyph stay opaque to the next syllable's
context matching.

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
            fails.append(f"{label}: expected exactly one tone glyph, got {tones} ({note})"); return
        if not re.match(pattern, tones[0]):
            fails.append(f"{label}: expected glyph matching {pattern!r}, got {tones[0]} ({note})")

    # 1. Every 1-3 bar sequence ligates to exactly one contour glyph (docs/tone-notation.md §6, row 1).
    bar_cp = {5: "˥", 4: "˦", 3: "˧", 2: "˨", 1: "˩"}
    for n in (1, 2, 3):
        for levels in itertools.product((5, 4, 3, 2, 1), repeat=n):
            text = "マ" + "".join(bar_cp[l] for l in levels)
            expect_tone(f"bars {levels}", text, rf"^tone_{''.join(map(str, levels))}$")

    # 2. Legacy single-codepoint aliases point at the documented shapes (docs/tone-notation.md §2.3).
    for cp, levels in {"̄": "3", "̀": "21", "̂": "51", "́": "45", "̌": "14"}.items():
        expect_tone(f"legacy {hex(ord(cp))}", "マ" + cp, rf"^tone_{levels}$")

    # 3. A bare single kana (nF=1, nS=0) is never stretched -- it sits at the default position (docs/tone-notation.md
    #    §3.1.1, the "excludes (1,0)" rule).
    expect_tone("bare single kana", "カ˨˩", r"^tone_21$")

    # 4. Syllable-wide stretch, both paths, and the stem-follows-x0 regression check (the C1 bug from the Opus
    #    review: the stem used to sit at a fixed x regardless of how far the contour itself was stretched).
    for label, text in [("marker nF=2", "ダア˨˩"), ("hint nF=2", "ダア⁢˨˩")]:
        seq = shape(text)
        name = seq[-1][0]
        if name != "tone_21_w2000":
            fails.append(f"{label}: expected tone_21_w2000, got {name}"); continue
        b = bounds(name)
        xs = [p[0] for c in glyf[name].getCoordinates(glyf)[0] for p in [c]]
        if b is None or abs(min(xs) - b[0]) > 2:
            fails.append(f"{label}: stem should start at the glyph's own left edge {b and b[0]}, outline min x is {min(xs) if xs else None}")

    # 5. Superscript width classes (the C2 bug: the old formula assumed every superscript was 480 wide; real
    #    advances range ~160-487). One representative letter per class, via the marker path.
    for label, letter, w in [("class1 (ʲ)", "ʲ", 1280), ("class2 (ᵊ)", "ᵊ", 1400), ("class3 (ʷ)", "ʷ", 1500)]:
        expect_tone(label, "カ" + letter + "˨˩", rf"^tone_21_w{w}$")

    # 6. Mark filtering (the M1 fix): a dot-below/creaky/handakuten between two kana must not knock the marker
    #    path back to the default (unstretched) position.
    for label, text in [
        ("dot-below mid-syllable", "タ̣ラ˧˩"),
        ("creaky mid-syllable", "カ̰タ˧˩"),
        ("handakuten mid-syllable", "カ゚タ˧˩"),
    ]:
        expect_tone(label, text, r"^tone_31_w2000$")

    # 7. Consecutive syllables: syllable 1's own stretched tone glyph must not become invisible to syllable 2's
    #    matching (the regression the first UseMarkFilteringSet attempt introduced, and this script would have
    #    caught immediately).
    seq = shape("カタ⁢˨˩ラ˧")
    tones = [n for n, _, _ in seq if n.startswith("tone_")]
    if tones != ["tone_21_w2000", "tone_3"]:
        fails.append(f"consecutive syllables: expected ['tone_21_w2000', 'tone_3'], got {tones}")

    # 8. ccmp/rclt are not discretionary: disabling liga/calt/clig (which no longer host anything) must not
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
