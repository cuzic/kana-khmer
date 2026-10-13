import { describe, expect, it } from "vitest";
import { buildBundle } from "../src/build";
import { jaHangulNotation, getNotation } from "../src/notation";
import { PhraseInput as PhraseSchema, type PhraseInput, type SceneInput } from "../src/schema";

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

describe("ja-hangul コース: ローマ字とふりがな", () => {
  const parts = [
    { text: "お会計", furigana: "おかいけい", pron: "オカイケー", gloss: "계산", pos: "noun" as const },
    { text: "お願いします", furigana: "おねがいします", pron: "オネガイシマス", gloss: "부탁합니다", pos: "verb" as const },
  ];
  const v = (over: object = {}) => ({ speaker: "any" as const, register: "polite" as const, text: "お会計お願いします", furigana: "おかいけいおねがいします", pron: "オカイケーオネガイシマス", audio: "x.m4a", parts, ...over });
  it("ローマ字を生成し、parts は語ごとにスペースで区切る", () => {
    const r = build([phrase("a", "オカイケーオネガイシマス", { variants: [v()] })]);
    expect(r.errors).toEqual([]);
    const out = r.bundle.phrases[0]!.variants[0]!;
    expect(out.latin).toBe("okaikē onegaishimasu");
    expect(out.parts!.map((x) => x.latin)).toEqual(["okaikē", "onegaishimasu"]);
    expect(out.furigana).toBe("おかいけいおねがいします");
  });
  it("parts なしのフレーズは1語としてローマ字にする", () => {
    const r = build([phrase("b", "コンニチワ")]);
    expect(r.bundle.phrases[0]!.variants[0]!.latin).toBe("konnichiwa");
  });
  it("furigana はひらがなだけ", () => {
    expect(() => phraseSchemaCheck("カタカナ")).toThrow();
  });
  it("parts の furigana を連結するとフレーズの furigana と一致すること", () => {
    const r = build([phrase("c", "オカイケーオネガイシマス", { variants: [v({ furigana: "おかいけいおねがいしま" })] })]);
    expect(r.errors.some((e) => e.includes("furigana"))).toBe(true);
  });
});

function phraseSchemaCheck(furigana: string) {
  return PhraseSchema.parse(phrase("z", "アイ", { variants: [{ speaker: "any", register: "polite", text: "x", pron: "アイ", furigana, audio: "z.m4a" }] }));
}
