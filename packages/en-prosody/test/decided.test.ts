// ユーザーが 1 語ずつ指示して決めた表記(ADR-0031)を守るテスト。期待値は手で書いたもの。
// parity.test.ts は Python 版との一致しか守らない(golden を作り直せば通ってしまう)ので、別に持つ。
import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { analyzeLine, parseDict } from "../src";

const dictPath = new URL("../data/cmudict.txt", import.meta.url);
if (!existsSync(dictPath)) {
  throw new Error("data/cmudict.txt がありません。先に `pnpm --filter en-prosody gen:dict` を実行してください。");
}
const dict = parseDict(readFileSync(dictPath, "utf8"));
const kana = (text: string) => analyzeLine(text, dict).map((w) => w.kana);

describe("ユーザーが決めた表記(1 語ずつ)", () => {
  const single: [string, string][] = [
    ["future", "フューチャʳ"], // 子音 + y + 母音は フュー、ch + ɚ は チャʳ
    ["never", "ネヴァʳ"], // v はヴ行、子音 + ɚ は ア段 + ʳ
    ["strange", "ㇲㇳレʳインヂ"], // dʒ は ヂ(ジ ではない)、語頭の子音連続は小書き
    ["education", "エデュケイシᵊン"], // 語末でない dʒ + 弱い母音は デュ、音節を成す n の前は シᵊン
    ["nation", "ネイシᵊン"],
    ["kids", "キᶦヅ"], // dz は ヅ
    ["cats", "カᵆツ"], // ts は ツ(ㇳㇲ ではない)
    ["it's", "イᶦツ"],
    ["very", "ヴェリʳー"],
    ["think", "シᶿᶦンᵑㇰ"],
  ];
  for (const [word, want] of single) {
    it(`${word} → ${want}`, () => expect(kana(word)).toEqual([want]));
  }
});

describe("ユーザーが決めた表記(語のつながり)", () => {
  it("what I → ワᶺ ラᵗイ(語末の t が次の母音に移り、弾き音になる)", () => {
    expect(kana("what I")).toEqual(["ワᶺ", "ラᵗイ"]);
  });
  it("in education → ネデュケイシᵊン(in の n が education に移る)", () => {
    expect(kana("in education")[1]).toBe("ネデュケイシᵊン");
  });
});

describe("縮約は機能語(強く読む語にしない)", () => {
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
