import { describe, expect, it } from "vitest";
import { buildBundle } from "../src/build";
import { getNotation, jaThaiNotation } from "../src/notation";
import { type PhraseInput, type SceneInput } from "../src/schema";

const scenes: SceneInput[] = [{ id: "s", title: "S", order: 1 }];
const phrase = (id: string, pron: string, over: Partial<PhraseInput> = {}): PhraseInput => ({
  id, scene: "s", gloss: id, usage: "",
  variants: [{ speaker: "any", register: "polite", text: "x", pron, audio: `${id}.m4a` }],
  words: [], review: { pron: false, audio: false, usage: false }, audioSource: "tts", ...over,
});
const build = (ps: PhraseInput[]) => buildBundle(ps, scenes, { profile: "preview", notation: jaThaiNotation });

describe("ja-thai コース", () => {
  it("レジストリから引ける", () => expect(getNotation("ja-thai")).toBe(jaThaiNotation));
  it("タイ文字の読みを生成し、詳細とライトは同じ", () => {
    const r = build([phrase("a", "オカーサン")]);
    expect(r.errors).toEqual([]);
    const v = r.bundle.phrases[0]!.variants[0]!;
    expect(v.readingFull).toBe("โอกาอาซัง");
    expect(v.readingLite).toBe(v.readingFull);
    expect(v.latin).toBe("okāsan");
    expect(v.syllables).toBeUndefined();
  });
  it("変換できない発音をフレーズ id つきで報告する", () => {
    const r = build([phrase("bad", "ファ")]);
    expect(r.errors[0]).toContain("phrase bad");
    expect(r.errors[0]).toContain("unsupported-kana");
  });
  it("parts は語ごとに、語頭の判定をやり直して分かち書きする", () => {
    const parts = [
      { text: "か", pron: "カ", gloss: "x", pos: "noun" as const },
      { text: "か", pron: "カ", gloss: "x", pos: "noun" as const },
    ];
    const r = build([phrase("p", "カカ", { variants: [{ speaker: "any", register: "polite", text: "かか", pron: "カカ", audio: "p.m4a", parts }] })]);
    expect(r.errors).toEqual([]);
    expect(r.bundle.phrases[0]!.variants[0]!.readingFull).toBe("คา คา"); // 連結すると อากา ではなく、語ごとに語頭 ค
  });
});
