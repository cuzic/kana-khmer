import { describe, expect, it } from "vitest";
import type { Phrase, Variant } from "../src/data";
import { pickVariants } from "../src/variants";

const v = (speaker: Variant["speaker"], register: Variant["register"] = "polite"): Variant =>
  ({ speaker, register, text: "", pron: "", syllables: [], readingFull: "", readingLite: "", audio: "" });
const phrase = (variants: Variant[]) => ({ variants }) as Phrase;

describe("pickVariants", () => {
  const p = phrase([v("male"), v("female"), v("any", "casual")]);
  it("性別未設定なら丁寧形をすべて主表示にする", () => {
    const r = pickVariants(p, "unset");
    expect(r.main.map((x) => x.speaker)).toEqual(["male", "female"]);
    expect(r.other).toEqual([]);
    expect(r.casual).toHaveLength(1);
  });
  it("性別を設定すると合う1件が主表示、他方は補足", () => {
    const r = pickVariants(p, "female");
    expect(r.main.map((x) => x.speaker)).toEqual(["female"]);
    expect(r.other.map((x) => x.speaker)).toEqual(["male"]);
  });
  it("any は性別に関わらず主表示", () => {
    expect(pickVariants(phrase([v("any")]), "male").main).toHaveLength(1);
  });
});
