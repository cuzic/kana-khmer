// G-6 / G-7: examples fixed from the v0.2 design doc (conversion table, sentence, code-point test cases).
// Light notation differs from v0.2 in two places: ◌̯ is kept (cʰkae → チ̯カエ), and since 2026-09-28 the
// high-functional-load modifiers ʰ ˡ ʳ ᵑ ᵅ ᵊ also survive into lite (khmer-kana-spec.md §7).
import { describe, expect, it } from "vitest";
import { parseIpa, renderFull, renderLite } from "../src";

const H = "゚"; // ゚
const N = "̯"; // ◌̯
const cps = (s: string) => [...s].map((c) => c.codePointAt(0)!.toString(16).toUpperCase().padStart(4, "0")).join(" ");

// [ipa, full, lite]
const CONVERSIONS: [string, string, string][] = [
  ["ʔɑː.kun", "オᵅークン", "オᵅークン"],
  ["kʰɲom", "ㇰニョㇺ", "ㇰニョㇺ"],
  ["tʰlaj", "ㇳラˡィ", "ㇳラˡィ"],
  ["ɲam", "ニャㇺ", "ニャㇺ"],
  ["sʔaːt", "ㇲアーㇳ", "ㇲアーㇳ"],
  ["ɗaə", "ダアᵊ", "ダアᵊ"],
  ["tɨw", "トᶤゥ", "トゥゥ"],
  ["pʰsaː", `ㇷ${H}サー`, `ㇷ${H}サー`],
  ["tʰom", "トʰㇺ", "トʰㇺ"],
  ["cʰap", `チャʰㇷ${H}`, `チャʰㇷ${H}`],
  ["cʰkae", `チ${N}カエ`, `チ${N}カエ`],
  ["srəj", "ㇲラʳᵊィ", "ㇲラʳᵊィ"],
  ["miən", "ミアᵊン", "ミアᵊン"],
  ["ciəŋ", "チアᵊンᵑ", "チアᵊンᵑ"],
  ["loːk", "ロˡーㇰ", "ロˡーㇰ"],
  ["ɓaːt", "バーㇳ", "バーㇳ"],
  ["kʰɑːŋ", "コʰᵅーンᵑ", "コʰᵅーンᵑ"],
  ["mɗaːj", "ㇺダーィ", "ㇺダーィ"],
  ["lʔɑː", "ㇽˡオᵅー", "ㇽˡオᵅー"],
];

// [ipa, full code points, lite code points]
const CODEPOINTS: [string, string, string][] = [
  ["ʔɑː.kun", "30AA 1D45 30FC 30AF 30F3", "30AA 1D45 30FC 30AF 30F3"],
  ["tʰlaj", "31F3 30E9 02E1 30A3", "31F3 30E9 02E1 30A3"],
  ["srəj", "31F2 30E9 02B3 1D4A 30A3", "31F2 30E9 02B3 1D4A 30A3"],
  ["cʰkae", "30C1 032F 30AB 30A8", "30C1 032F 30AB 30A8"], // v0.2 lite dropped 032F; ◌̯ is the one mark kept unconditionally
  ["ciəŋ", "30C1 30A2 1D4A 30F3 1D51", "30C1 30A2 1D4A 30F3 1D51"],
  ["tʰom", "30C8 02B0 31FA", "30C8 02B0 31FA"],
  ["tɨw", "30C8 1DA4 30A5", "30C8 30A5 30A5"],
  ["cʰap", "30C1 30E3 02B0 31F7 309A", "30C1 30E3 02B0 31F7 309A"], // ㇷ゚ keeps its handakuten in lite
  ["loːk", "30ED 02E1 30FC 31F0", "30ED 02E1 30FC 31F0"],
];

describe("v0.2 conversion examples", () => {
  for (const [ipa, full, lite] of CONVERSIONS) {
    it(ipa, () => {
      const u = parseIpa(ipa);
      expect(renderFull(u).text).toBe(full);
      expect(renderLite(u).text).toBe(lite);
    });
  }

  it("sentence: 要りません", () => {
    const u = parseIpa("kʰɲom mɨn cɑŋ baːn teː");
    expect(renderFull(u).text).toBe("ㇰニョㇺ ムᶤン チョᵅンᵑ バーン テー");
    expect(renderLite(u).text).toBe("ㇰニョㇺ ムン チョᵅンᵑ バーン テー");
  });

  it("two words: ʔɑː kun keeps the word space", () => {
    expect(cps(renderFull(parseIpa("ʔɑː kun")).text)).toBe("30AA 1D45 30FC 0020 30AF 30F3");
  });
});

describe("v0.2 code-point cases", () => {
  for (const [ipa, full, lite] of CODEPOINTS) {
    it(ipa, () => {
      const u = parseIpa(ipa);
      expect(cps(renderFull(u).text)).toBe(full);
      expect(cps(renderLite(u).text)).toBe(lite);
    });
  }
});
