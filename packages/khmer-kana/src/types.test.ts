import { describe, expect, it } from "vitest";
import type { Utterance } from "./types";

describe("types", () => {
  it("can express ʔɑː.kun (ありがとう)", () => {
    const thanks: Utterance = [
      [
        { onset: ["ʔ"], nucleus: { v1: "ɑ", long: true } },
        { onset: ["k"], nucleus: { v1: "u", long: false }, coda: "n" },
      ],
    ];
    expect(thanks[0]).toHaveLength(2);
  });
});
