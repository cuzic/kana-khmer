import { describe, expect, it } from "vitest";
import { buildBundle } from "../src/build";
import { jaHangulNotation, getNotation } from "../src/notation";
import type { PhraseInput, SceneInput } from "../src/schema";

const scenes: SceneInput[] = [{ id: "s", title: "S", order: 1 }];
const phrase = (id: string, pron: string, over: Partial<PhraseInput> = {}): PhraseInput => ({
  id, scene: "s", gloss: id, usage: "",
  variants: [{ speaker: "any", register: "polite", text: "x", pron, audio: `${id}.m4a` }],
  words: [], review: { pron: false, audio: false, usage: false }, audioSource: "tts", ...over,
});
const build = (ps: PhraseInput[]) => buildBundle(ps, scenes, { profile: "preview", notation: jaHangulNotation });

describe("ja-hangul コース", () => {
  it("レジストリから引ける", () => expect(getNotation("ja-hangul")).toBe(jaHangulNotation));
  it("未登録の表記ライブラリは例外", () => expect(() => getNotation("nope")).toThrow(/未登録/));
  it("詳細/ライトの読みを生成する", () => {
    const r = build([phrase("a", "ジョーズ")]);
    expect(r.errors).toEqual([]);
    const v = r.bundle.phrases[0]!.variants[0]!;
    expect(v.readingFull).toBe("죠ʲᵒ̄즈");
    expect(v.readingLite).toBe("죠ᵒ̄즈");
    expect(v.syllables).toBeUndefined();
  });
  it("変換できない発音をフレーズ id つきで報告する", () => {
    const r = build([phrase("bad", "ファ")]);
    expect(r.errors[0]).toContain("phrase bad");
    expect(r.errors[0]).toContain("unsupported-kana");
  });
  it("parts は語境界をスペースで分かち書きする", () => {
    const parts = [
      { text: "こんにちは", pron: "コンニチワ", gloss: "안녕하세요", pos: "interj" as const },
      { text: "です", pron: "デス", gloss: "입니다", pos: "particle" as const },
    ];
    const r = build([phrase("p", "コンニチワデス", { variants: [{ speaker: "any", register: "polite", text: "こんにちはです", pron: "コンニチワデス", audio: "p.m4a", parts }] })]);
    expect(r.errors).toEqual([]);
    expect(r.bundle.phrases[0]!.variants[0]!.readingLite).toBe("콘니치와 데스");
  });
});
