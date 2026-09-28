// P (light derivation, spans), NO_VOWELLESS_FORM
import { describe, expect, it } from "vitest";
import { KhmerKanaError, parseIpa, renderFull, renderLite, toIpa, type Rendered } from "../src";
import golden from "./golden.json";

const H = "゚";
const N = "̯";

/**
 * The rule as a string operation: drop 4 low-functional-load modifier letters (ˀ ᵋ ᵓ ᶤ, khmer-kana-spec.md §7).
 * ʰ ˡ ʳ ᵑ ᵅ ᵊ and ◌̯ survive into lite (2026-09-28: corpus functional load showed they're worth keeping).
 */
function liteByString(full: string): string {
  return full.replace(/ト(ʰ?)ᶤ/g, "トゥ$1").replace(/[ˀᵋᵓᶤ]/g, ""); // tɨ exception: full ト+ᶤ, lite トゥ
}

describe("lite derivation property", () => {
  // The string rule above is only correct because ㇷ゚ (ㇷ + ゚) is not in [カキクケコン].
  for (const g of golden) {
    it(`token-level equals string-level: ${g.ipa}`, () => {
      const u = parseIpa(g.ipa);
      expect(renderLite(u).text).toBe(liteByString(renderFull(u).text));
    });
  }

  it("ㇷ゚ keeps its handakuten in lite (p coda and p prefix)", () => {
    expect(renderLite(parseIpa("kap")).text).toBe(`カㇷ${H}`);
    expect(renderLite(parseIpa("pʰsaː")).text).toBe(`ㇷ${H}サー`);
  });

  it("naive stripping of ゚ would be wrong", () => {
    expect(renderFull(parseIpa("kap")).text.replaceAll(H, "")).toBe("カㇷ");
    expect(renderLite(parseIpa("kap")).text).not.toBe("カㇷ");
  });

  it("keeps ◌̯ in lite (v0.3)", () => {
    expect(renderLite(parseIpa("cʰkae")).text).toBe(`チ${N}カエ`);
    expect(renderLite(parseIpa("kac")).text).toBe(`カィチ${N}`);
  });

  it("lite never contains the dropped modifier letters (ˀ ᵋ ᵓ ᶤ)", () => {
    for (const g of golden) expect(renderLite(parseIpa(g.ipa)).text).not.toMatch(/[ˀᵋᵓᶤ]/);
  });

  it("lite keeps high-functional-load modifiers (ʰ ˡ ʳ ᵑ ᵅ ᵊ), drops the rest", () => {
    // kʰɑːŋ uses only kept modifiers (ʰ, ᵅ, ᵑ): full and lite are identical
    expect(renderLite(parseIpa("kʰɑːŋ")).text).toBe(renderFull(parseIpa("kʰɑːŋ")).text);
    expect(renderLite(parseIpa("kʰɑːŋ")).text).toBe("コʰᵅーンᵑ");
    // kʰɛ mixes a kept modifier (ʰ) with a dropped one (ᵋ, ɛ's vowel-mod)
    expect(renderFull(parseIpa("kʰɛ")).text).toBe("ケʰᵋ");
    expect(renderLite(parseIpa("kʰɛ")).text).toBe("ケʰ");
  });
});

describe("spans", () => {
  const join = (r: Rendered) => r.spans.map((s) => s.text).join("");

  it("text is the concatenation of spans", () => {
    for (const g of golden) {
      const f = renderFull(parseIpa(g.ipa));
      expect(join(f)).toBe(f.text);
    }
  });

  it("kinds: コʰᵅーンᵑ", () => {
    const r = renderFull(parseIpa("kʰɑːŋ"));
    expect(r.spans.map((s) => s.kind)).toEqual(["kana", "cons-mod", "vowel-mod", "long", "kana", "cons-mod"]);
    expect(r.spans.map((s) => s.text)).toEqual(["コ", "ʰ", "ᵅ", "ー", "ン", "ᵑ"]);
  });

  it("base kana and its combining mark share one span", () => {
    const r = renderFull(parseIpa("cʰkae"));
    expect(r.spans[0]).toMatchObject({ kind: "kana-nonsyl", text: `チ${N}` });
  });

  it("ŋ is a plain kana plus a cons-mod, like r and l (never a bare row)", () => {
    const r = renderFull(parseIpa("ŋa"));
    expect(r.spans).toMatchObject([{ kind: "kana", text: "ガ" }, { kind: "cons-mod", text: "ᵑ" }]);
  });

  it("word boundary is a space span", () => {
    const r = renderFull(parseIpa("mɨn teː"));
    expect(r.spans.filter((s) => s.kind === "space")).toHaveLength(1);
  });

  it("carries the IPA of each span for explanations", () => {
    const r = renderFull(parseIpa("tɨw"));
    expect(r.spans.find((s) => s.kind === "vowel-mod")).toMatchObject({ text: "ᶤ", ipa: "ɨ" });
  });
});

describe("tɨ exception", () => {
  it("t+ɨ is ト+ᶤ in full and トゥ in lite; other consonants keep their row", () => {
    expect(renderFull(parseIpa("tɨ")).text).toBe("トᶤ");
    expect(renderLite(parseIpa("tɨ")).text).toBe("トゥ");
    expect(renderLite(parseIpa("tɨ")).spans.every((x) => x.lite === undefined)).toBe(true);
    expect(renderLite(parseIpa("tʰɨ")).text).toBe("トゥʰ"); // ɨ's ᶤ is dropped, but the kept ʰ survives
    expect(renderFull(parseIpa("tʰɨ")).text).toBe("トʰᶤ");
    expect(renderFull(parseIpa("tu")).text).toBe("トゥ");
    expect(renderFull(parseIpa("kɨ")).text).toBe("クᶤ");
  });
});

describe("undefined vowelless forms", () => {
  it.each(["ɓ", "ɗ", "n", "ɲ", "ŋ", "h", "r", "j", "ʋ"])("%s before another onset consonant", (c) => {
    try {
      renderFull(parseIpa(`${c}kaː`));
      throw new Error("expected NO_VOWELLESS_FORM");
    } catch (e) {
      expect(e).toBeInstanceOf(KhmerKanaError);
      expect((e as KhmerKanaError).code).toBe("NO_VOWELLESS_FORM");
    }
  });
});

describe("ʔ prefix modifier", () => {
  it("ʔ before another onset consonant is the ˀ modifier, placed before the following kana (khmer-kana-spec.md §5.4/§11-1)", () => {
    expect(renderFull(parseIpa("ʔʋəj")).text).toBe("ˀヴァᵊィ");
    expect(renderLite(parseIpa("ʔʋəj")).text).toBe("ヴァᵊィ"); // ˀ (ʔ) is dropped in lite, but ə's kept ᵊ survives
  });
});

describe("cluster with an aspirated main consonant", () => {
  // Until 2026-09-28 every cluster+aspiration golden case had the aspirated consonant in PREFIX position
  // (kʰraː etc.), where §5.4 drops aspiration, so ʰ never actually showed up in a cluster's rendering.
  // Real, common Khmer words put the aspiration on the cluster's MAIN (last) consonant instead, e.g.
  // ស្ថាន stʰaːn "place", ល្ខោន lkʰaon "theater", ម្ភៃ mpʰɨj "twenty" (G-4 golden.json).
  it("prefix consonant + aspirated main consonant: ʰ shows (it's not dropped there)", () => {
    expect(renderFull(parseIpa("stʰaːn")).text).toBe("ㇲタʰーン");
    expect(renderLite(parseIpa("stʰaːn")).text).toBe("ㇲタʰーン"); // ʰ is kept in lite too (LITE_DROP, §7)
  });
});

describe("ʰ on a digraph onset (2026-09-28)", () => {
  // c and t are the only aspirable consonants (p t c k) with a two-character ONSET_ROWS cell (base kana +
  // small glide kana: ティ トゥ チャ チュ チェ チョ). ʰ goes between the base and the glide, the same place
  // dakuten attaches on a digraph like ぎゃ -- not after the whole cell (which is where it used to land).
  it.each([
    ["cʰa", "チʰャ"], ["cʰu", "チʰュ"], ["cʰo", "チʰョ"], ["cʰe", "チʰェ"],
    ["tʰi", "テʰィ"], ["tʰu", "トʰゥ"],
  ])("%s -> %s", (ipa, expected) => {
    expect(renderFull(parseIpa(ipa)).text).toBe(expected);
    expect(renderLite(parseIpa(ipa)).text).toBe(expected); // ʰ survives lite (LITE_DROP, §7)
  });

  it("a vowel-mod still lands at the very end, after the glide", () => {
    // cʰɛ: ʰ (consonant) goes before the glide ェ, ᵋ (vowel quality) goes after it.
    expect(renderFull(parseIpa("cʰɛ")).text).toBe("チʰェᵋ");
    expect(renderLite(parseIpa("cʰɛ")).text).toBe("チʰェ"); // ᵋ is in LITE_DROP
  });

  it("single-character onsets are unaffected (no glide to split before)", () => {
    expect(renderFull(parseIpa("cʰi")).text).toBe("チʰ");
    expect(renderFull(parseIpa("tʰa")).text).toBe("タʰ");
    expect(renderFull(parseIpa("kʰa")).text).toBe("カʰ");
    expect(renderFull(parseIpa("pʰa")).text).toBe("パʰ");
  });

  it("round-trips through toIpa (span splitting doesn't affect the underlying syllable)", () => {
    for (const ipa of ["cʰa", "cʰu", "cʰo", "cʰe", "cʰɛ", "tʰi", "tʰu"]) {
      expect(toIpa(parseIpa(ipa))).toBe(ipa);
    }
  });
});
