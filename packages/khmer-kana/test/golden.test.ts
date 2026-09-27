// G-1..G-5: table coverage (rows, vowels, diphthongs, clusters, codas). Expected values in golden.json were reviewed
// by hand against the v0.2 tables.
import { describe, expect, it } from "vitest";
import golden from "./golden.json";
import { parseIpa, renderFull, renderLite } from "../src";

describe("golden (table coverage)", () => {
  for (const g of golden) {
    it(`${g.group} ${g.ipa}`, () => {
      const u = parseIpa(g.ipa);
      expect(renderFull(u).text).toBe(g.full);
      expect(renderLite(u).text).toBe(g.lite);
    });
  }
});
