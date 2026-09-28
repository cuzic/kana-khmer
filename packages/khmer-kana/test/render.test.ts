// P (light derivation, spans), NO_VOWELLESS_FORM
import { describe, expect, it } from "vitest";
import { KhmerKanaError, parseIpa, renderFull, renderLite, type Rendered } from "../src";
import golden from "./golden.json";

const H = "゚";
const N = "̯";

/** The rule as a string operation: drop 9 modifier letters (ᵑ marks ŋ; dropping it alone yields plain ガ行/ン, no lookup table needed). Kept ◌̯. */
function liteByString(full: string): string {
  return full.replace(/ト(ʰ?)ᶤ/g, "トゥ$1").replace(/[ʰˡʳᵋᵓᵅᵊᶤᵑ]/g, ""); // tɨ exception: full ト+ᶤ, lite トゥ
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

  it("lite never contains modifier letters", () => {
    for (const g of golden) expect(renderLite(parseIpa(g.ipa)).text).not.toMatch(/[ʰˡʳᵋᵓᵅᵊᶤᵑ]/);
  });

  it("lite is derived from full's spans only (idempotent shape)", () => {
    const u = parseIpa("kʰɑːŋ");
    const kinds = renderLite(u).spans.map((s) => s.kind);
    expect(kinds).not.toContain("cons-mod");
    expect(kinds).not.toContain("vowel-mod");
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
    expect(renderLite(parseIpa("tʰɨ")).text).toBe("トゥ");
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
    expect(renderLite(parseIpa("ʔʋəj")).text).toBe("ヴァィ");
  });
});
