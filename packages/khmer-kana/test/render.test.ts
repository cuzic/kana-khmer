// P (light derivation, spans), NO_VOWELLESS_FORM
import { describe, expect, it } from "vitest";
import { KhmerKanaError, parseIpa, renderFull, renderLite, type Rendered } from "../src";
import golden from "./golden.json";

const H = "゚";
const N = "̯";

/** The v0.2 rule as a string operation: drop 8 modifier letters, replace the 6 nasal patterns. Kept ◌̯. */
function liteByString(full: string): string {
  const stripped = full.replace(/[ʰˡʳᵋᵓᵅᵊᶤ]/g, "");
  return stripped.replace(/([カキクケコン])゚/g, (_m, k: string) => ({ カ: "ガ", キ: "ギ", ク: "グ", ケ: "ゲ", コ: "ゴ", ン: "ン" })[k]!);
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
    for (const g of golden) expect(renderLite(parseIpa(g.ipa)).text).not.toMatch(/[ʰˡʳᵋᵓᵅᵊᶤ]/);
  });

  it("lite is derived from full's spans only (idempotent shape)", () => {
    const u = parseIpa("kʰɑːŋ");
    const kinds = renderLite(u).spans.map((s) => s.kind);
    expect(kinds).not.toContain("cons-mod");
    expect(kinds).not.toContain("vowel-mod");
    expect(kinds).not.toContain("kana-nasal");
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

  it("kinds: コʰᵅーン゚", () => {
    const r = renderFull(parseIpa("kʰɑːŋ"));
    expect(r.spans.map((s) => s.kind)).toEqual(["kana", "cons-mod", "vowel-mod", "long", "kana-nasal"]);
    expect(r.spans.map((s) => s.text)).toEqual(["コ", "ʰ", "ᵅ", "ー", `ン${H}`]);
  });

  it("base kana and its combining mark share one span", () => {
    const r = renderFull(parseIpa("cʰkae"));
    expect(r.spans[0]).toMatchObject({ kind: "kana-nonsyl", text: `チ${N}` });
    const nasal = renderFull(parseIpa("ŋa")).spans[0];
    expect(nasal).toMatchObject({ kind: "kana-nasal", text: `カ${H}` });
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

describe("undefined vowelless forms", () => {
  it.each(["ɓ", "ɗ", "ʔ", "n", "ɲ", "ŋ", "h", "r", "j", "ʋ"])("%s before another onset consonant", (c) => {
    try {
      renderFull(parseIpa(`${c}kaː`));
      throw new Error("expected NO_VOWELLESS_FORM");
    } catch (e) {
      expect(e).toBeInstanceOf(KhmerKanaError);
      expect((e as KhmerKanaError).code).toBe("NO_VOWELLESS_FORM");
    }
  });
});
