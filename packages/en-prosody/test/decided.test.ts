// 表記の期待値を手で書いたテスト(ADR-0031、docs/en-kana-spec.md)。parity.test.ts は Python 版との一致しか守らず、
// golden を作り直せば通ってしまうので、別に持つ。2 つに分ける:
//   1. ユーザーが指示した部分だけを検査する(ユーザーが言った範囲。右肩の字の選び方などエージェントの判断は含めない)
//   2. 現状の表記(エージェントの判断。未決を含む)。未決をユーザーが変えると決めたら、ここを直す
import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { analyzeLine, lite, parseDict } from "../src";

const dictPath = new URL("../data/cmudict.txt", import.meta.url);
if (!existsSync(dictPath)) {
  throw new Error("data/cmudict.txt がありません。先に `pnpm --filter en-prosody gen:dict` を実行してください。");
}
const dict = parseDict(readFileSync(dictPath, "utf8"));
const kana = (text: string) => analyzeLine(text, dict).map((w) => w.kana);
const liteKana = (text: string) => kana(text).map(lite);

describe("ユーザーの指示(ユーザーが言った範囲だけ)", () => {
  it("what I → ワ ライ(語末の t が次の母音に移り、ラ行になる)", () => {
    expect(liteKana("what I")).toEqual(["ワ", "ライ"]);
  });
  it("it's の ts はツ(ㇳㇲ ではない)", () => {
    expect(liteKana("it's")).toEqual(["イツ"]);
  });
  it("kids の dz はヅ", () => {
    expect(kana("kids")[0]).toContain("ヅ");
  });
  it("strange の dʒ はヂ(ジ ではない)", () => {
    const [k] = kana("strange");
    expect(k).toContain("ヂ");
    expect(k).not.toContain("ジ");
  });
  it("future はフューチャ", () => {
    expect(liteKana("future")).toEqual(["フューチャ"]);
  });
  it("never はネヴァ(v はヴ行)", () => {
    expect(liteKana("never")).toEqual(["ネヴァ"]);
  });
  it("very の v はヴ行", () => {
    expect(kana("very")[0]).toContain("ヴ");
  });
  it("θ + i は シ(シᶿ。スィ ではない)", () => {
    expect(kana("think")[0]!.startsWith("シᶿ")).toBe(true);
  });
  it("in education → ネデュケイシᵊン(in の n が移り、語末は シᵊン)", () => {
    expect(kana("in education")[1]).toBe("ネデュケイシᵊン");
  });
});

describe("現状の表記(エージェントの判断。未決を含む)", () => {
  const single: [string, string][] = [
    ["future", "フューチャʳ"], // ɚ は ʳ だけ(ユーザーに未確認)
    ["never", "ネヴァʳ"],
    ["cats", "カᵆツ"], // æ は ᵆ(turned ae)で代用(未決)
    ["nation", "ネイシᵊン"],
    ["very", "ヴェリʳー"],
    ["think", "シᶿᶦンᵑㇰ"],
    ["strange", "ㇲㇳレʳインヂ"],
    ["kids", "キᶦヅ"],
    ["it's", "イᶦツ"],
    ["education", "エデュケイシᵊン"],
  ];
  for (const [word, want] of single) {
    it(`${word} → ${want}`, () => expect(kana(word)).toEqual([want]));
  }
  it("what I → ワᶺ ラᵗイ", () => {
    expect(kana("what I")).toEqual(["ワᶺ", "ラᵗイ"]);
  });
});

describe("縮約は機能語として扱う(エージェントの判断。ユーザーは it's の ● を指して間違いと言った)", () => {
  for (const w of ["it's", "she's", "you're", "they're", "I'm", "there's"]) {
    it(`${w} は内容語でない`, () => {
      const [first] = analyzeLine(`${w} fine`, dict);
      expect(first!.prominence).toBeLessThan(2);
      expect(first!.beat).toBe(0);
    });
  }
  it("否定の縮約(don't)は強く読む語のまま", () => {
    expect(analyzeLine("don't go", dict)[0]!.prominence).toBeGreaterThanOrEqual(2);
  });
});
