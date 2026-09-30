// Python 版(tools/en-prosody-spike の規則による分析)との突き合わせ。golden.json は golden.py が sentences.txt から作る。
import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { analyzeLine, lite, parseDict, parseLayers, PRESETS, type IRWord } from "../src";
import golden from "./golden.json";

const dictPath = new URL("../data/cmudict.txt", import.meta.url);
if (!existsSync(dictPath)) {
  throw new Error("data/cmudict.txt がありません。先に `pnpm --filter en-prosody gen:dict` を実行してください(uv で cmudict から生成します)。");
}
const dict = parseDict(readFileSync(dictPath, "utf8"));
const FIELDS = ["text", "norm", "kind", "prominence", "beat", "break_after", "linked_next", "phones", "kana", "kana_lite"] as const;

describe("parity with Python (rule-based analysis)", () => {
  for (const g of golden) {
    it(g.sentence, () => {
      const got = analyzeLine(g.sentence, dict);
      expect(got.length).toBe(g.words.length);
      got.forEach((w, i) => {
        const want = g.words[i]!;
        for (const f of FIELDS) expect(w[f as keyof IRWord], `${i}:${w.text}.${f}`).toEqual(want[f]);
      });
    });
  }
});

describe("layers / lite", () => {
  it("lite strips modifier letters only", () => {
    expect(lite("ネヴァʳ")).toBe("ネヴァ");
    expect(lite("ㇷ゚ᵇ")).toBe("ㇷ゚");
  });
  it("parseLayers", () => {
    expect(Object.entries(parseLayers("詳細,-ipa")).filter(([, v]) => !v).map(([k]) => k)).toEqual(["ipa"]);
    expect(Object.entries(parseLayers("リズム")).filter(([, v]) => v).map(([k]) => k)).toEqual([...PRESETS["リズム"]!]);
    expect(Object.values(parseLayers(null)).every(Boolean)).toBe(true);
    expect(() => parseLayers("nope")).toThrow();
  });
});
