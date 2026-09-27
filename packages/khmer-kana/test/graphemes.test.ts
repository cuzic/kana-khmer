import { describe, expect, it } from "vitest";
import { graphemes } from "../src";

const N = "̯";
const H = "゚";

describe("graphemes", () => {
  const s = `チ${N}カエ カ${H}ン${H}`;
  const expected = [`チ${N}`, "カ", "エ", " ", `カ${H}`, `ン${H}`];

  it("counts kana + combining mark as one (Intl.Segmenter)", () => {
    expect(graphemes(s)).toEqual(expected);
  });

  it("fallback (no Intl.Segmenter, e.g. Chrome 74) agrees", () => {
    expect(graphemes(s, { useSegmenter: false })).toEqual(expected);
  });

  it("modifier letters are separate characters in both", () => {
    expect(graphemes("カʰᵅ", { useSegmenter: false })).toEqual(["カ", "ʰ", "ᵅ"]);
    expect(graphemes("カʰᵅ")).toEqual(["カ", "ʰ", "ᵅ"]);
  });
});
