import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { generate, SPEC_PATH } from "../scripts/gen-table";
import { JaKhmerError, renderKhmer, SPEC_TABLE } from "../src";
import { parseSpecTable } from "../src/spec-parse";

const specText = readFileSync(SPEC_PATH, "utf8");
const specRows = parseSpecTable(specText);
const kata = (h: string) => h.replace(/[ぁ-ゖ]/g, (c) => String.fromCharCode(c.charCodeAt(0) + 0x60));
const LONG_SIGN: Record<string, string> = { a: "ា", i: "ី", u: "ូ", e: "េ", o: "ូ" };
const LONG_MARK: Record<string, string> = { a: "ᵃ̄", i: "ⁱ̄", u: "ᵘ̄", e: "ᵉ̄", o: "ᵒ̄" };

describe("設計書 §5 の表", () => {
  it("103 行(ん を除く)を読む", () => expect(Object.keys(specRows)).toHaveLength(103));
  it("生成物 spec-table.generated.ts が設計書と一致(ずれたら pnpm gen)", () => {
    expect(readFileSync(new URL("../src/spec-table.generated.ts", import.meta.url), "utf8")).toBe(generate(specText));
  });
  it("右肩(ˢʰ)が付くのは しゃ・しゅ・しょ だけ", () => {
    expect(Object.entries(SPEC_TABLE).filter(([, r]) => r.sh).map(([k]) => k).sort()).toEqual(["しゃ", "しゅ", "しょ"].sort());
    for (const k of ["しゃ", "しゅ", "しょ"]) expect(SPEC_TABLE[k]!.sh).toBe("ˢʰ");
  });
});

describe("表の全行: 短い拍は「詳細」列と同じ綴り、長い拍は 段の既定の長母音記号 + 右肩 + 長音マーカー", () => {
  const rows = Object.entries(specRows);
  it.each(rows)("%s", (h, r) => {
    const s = renderKhmer(kata(h));
    expect(s.text).toBe(r.detail);
    // 段の母音(拗音は ゃゅょ)
    const v = h.length === 2 ? { ゃ: "a", ゅ: "u", ょ: "o" }[h[1]!]! : rowVowel(h);
    const l = renderKhmer(kata(h) + "ー");
    expect(l.text).toBe(r.c + LONG_SIGN[v] + r.sh + LONG_MARK[v]);
    // 1音節、スロットの連結が音節の綴り
    expect(l.phrases[0]!.syllables).toHaveLength(1);
    expect(l.phrases[0]!.syllables[0]!.slots.map((x) => x.text).join("")).toBe(l.text);
  });
});

function rowVowel(h: string): string {
  const rows: Record<string, string> = {
    a: "あかがさざただなはばぱまやらわ", i: "いきぎしじちぢにひびぴみり", u: "うくぐすずつづぬふぶぷむゆる",
    e: "えけげせぜてでねへべぺめれ", o: "おこごそぞとどのほぼぽもよろを",
  };
  for (const [v, s] of Object.entries(rows)) if (s.includes(h)) return v;
  throw new Error(`段が分からない: ${h}`);
}

describe("範囲外・不正", () => {
  it.each(["ティ", "ファ", "ヴァ", "ウィ", "ヴ", "a", "あ"])("%s は unsupported-kana / bad-structure", (x) => {
    expect(() => renderKhmer(x)).toThrow(JaKhmerError);
  });
});
