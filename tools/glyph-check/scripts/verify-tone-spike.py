# /// script
# requires-python = ">=3.10"
# dependencies = ["fonttools", "brotli", "uharfbuzz"]
# ///
"""Shape the tone-spike fonts with HarfBuzz and check that the tone contour is centred on the whole syllable.

usage: uv run scripts/verify-tone-spike.py [public/kana-font]
"""
import io, re, sys
import uharfbuzz as hb
from fontTools.ttLib import TTFont

DIR = sys.argv[1] if len(sys.argv) > 1 else "public/kana-font"
MARKERS = {"WJ": "\u2060", "ZWSP": "\u200b", "PUA": "\ue000", "HINT": None}
SUP = set("ʰʱʲʷⁿˣˠʶˀˤʳˡᵓᵊᵋᵅᶤ")
CASES = [
    "カ˨˩", "カ˧", "カ˥", "カʰ˦˥", "カㇰ˧˥˧", "キァᵊ˥˩", "コʰᵅーン˨˦˩", "ㇲㇳラʳᵊィ˨˩", "ㇲㇳラʳᵊィㇰ˦˥", "カˀ˥˩",
    "カ˨˩ キァᵊ˥˩ ㇲㇳラʳᵊィ˦˥ カʰ˧",   # several syllables: the shift must not leak into the next one
]


def with_width(syllable, marker):
    if marker is not None:
        return marker + syllable
    body = "".join(c for c in syllable if not ("\u02e5" <= c <= "\u02e9"))
    tones = syllable[len(body):]
    ns = sum(c in SUP for c in body)
    return body + "\u2062" * (len(body) - ns - 1) + "\u2063" * ns + tones


def shape(path, text):
    tt = TTFont(path); tt.flavor = None   # HarfBuzz cannot read woff2
    buf_ = io.BytesIO(); tt.save(buf_)
    font = hb.Font(hb.Face(hb.Blob(buf_.getvalue())))
    buf = hb.Buffer(); buf.add_str(text); buf.guess_segment_properties()
    hb.shape(font, buf)
    names = [font.glyph_to_string(i.codepoint) for i in buf.glyph_infos]
    return names, buf.glyph_positions, [i.cluster for i in buf.glyph_infos]


def main():
    fails = total = 0
    for mode in ("gpos", "gsub"):
        path = f"{DIR}/tone-spike-{mode}.woff2"
        for mname, m in MARKERS.items():
            for case in CASES:
                total += 1
                sylls = case.split(" ")
                text = "".join(with_width(sy, m) for sy in sylls)
                names, pos, _ = shape(path, text)
                problems = []
                groups, cur = {}, 0
                for n, p in zip(names, pos):   # every syllable ends with exactly one tone glyph
                    groups.setdefault(cur, []).append((n, p))
                    if n.startswith("c_"): cur += 1
                if cur != len(sylls): problems.append(f"{cur} tone glyphs for {len(sylls)} syllables: {names}")
                pen = 0
                for gid in sorted(groups):
                    start, w, tones = pen, 0, []
                    for n, p in groups[gid]:
                        if n.startswith("c_"):
                            m_ = re.search(r"_w(\d+)$", n)   # gsub variants have the shift baked into the outline
                            shift = -(int(m_.group(1)) - 1000) / 2 if m_ else 0
                            tones.append(pen + p.x_offset + shift - 500)   # the outline is centred on x=-500
                        elif n != "sylB":
                            w += p.x_advance
                        pen += p.x_advance
                    if len(tones) != 1: problems.append(f"syllable {gid}: tone glyphs {[n for n, _ in groups[gid]]}")
                    elif abs(tones[0] - (start + w / 2)) > 2: problems.append(f"syllable {gid}: centre {tones[0]} want {start + w / 2} (W={w})")
                print(("FAIL" if problems else "ok  "), mode, mname, case, " | ".join(problems))
                fails += bool(problems)
    print(f"{total - fails}/{total} ok")
    sys.exit(1 if fails else 0)


main()
