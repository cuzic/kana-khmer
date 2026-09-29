import { describe, expect, it } from "vitest";
import { buildBundle as build, type BuildOptions } from "../src/build";
import { loadCourse } from "../src/load";
import { khmerNotation } from "../src/notation";
import type { PhraseInput, SceneInput } from "../src/schema";

// このファイルの既存テストはクメール語コース(khmer-kana)で書かれている。ja-hangul のコースは build.ja-hangul.test.ts。
const buildBundle = (p: PhraseInput[], s: SceneInput[], o: Omit<BuildOptions, "notation">) => build(p, s, { ...o, notation: khmerNotation });

const scenes: SceneInput[] = [{ id: "s", title: "S", order: 1 }];
const phrase = (id: string, over: Partial<PhraseInput> = {}): PhraseInput => ({
  id, scene: "s", gloss: id, usage: "",
  variants: [{ speaker: "any", register: "polite", text: "ក", pron: "ɓaːt", audio: `${id}.m4a` }],
  words: [{ text: "ក", pron: "ɓaːt", gloss: "x" }],
  review: { pron: true, audio: true, usage: true }, audioSource: "native", ...over,
});

describe("courses/ja-km", () => {
  const { phrases, scenes: sc } = loadCourse(new URL("../../../courses/ja-km", import.meta.url).pathname);
  it("preview ビルドがエラーなしで通り、カナが生成される", () => {
    const r = buildBundle(phrases, sc, { profile: "preview" });
    expect(r.errors).toEqual([]);
    const yes = r.bundle.phrases.find((p) => p.id === "yes")!;
    expect(yes.variants.map((v) => v.readingLite)).toEqual(["バーㇳ", "チャーㇹ"]);
    expect(yes.unreviewed).toBe(true);
  });
  it("未確認の仮データは prod に出ない", () => {
    const r = buildBundle(phrases, sc, { profile: "prod" });
    expect(r.bundle.phrases).toEqual([]);
  });
});

describe("buildBundle", () => {
  it("IPA の誤りをフレーズ id つきで報告する", () => {
    const r = buildBundle([phrase("a", { variants: [{ speaker: "any", register: "polite", text: "ក", pron: "xyz", audio: "a.m4a" }] })], scenes, { profile: "preview" });
    expect(r.errors[0]).toContain("phrase a");
  });
  it("重複 id と未定義シーンを検出する", () => {
    const r = buildBundle([phrase("a"), phrase("a", { scene: "nope" })], scenes, { profile: "preview" });
    expect(r.errors.join("\n")).toMatch(/重複/);
    expect(r.errors.join("\n")).toMatch(/未定義のシーン/);
  });
  it("prod: 4件未満のシーンは非公開にして警告する", () => {
    const r = buildBundle([phrase("a"), phrase("b"), phrase("c")], scenes, { profile: "prod", audioExists: () => true });
    expect(r.bundle.scenes).toEqual([]);
    expect(r.bundle.phrases).toEqual([]);
    expect(r.warnings.join("\n")).toMatch(/非公開/);
  });
  it("prod: 4件そろえば公開され、音声がなければエラー", () => {
    const ps = ["a", "b", "c", "d"].map((i) => phrase(i));
    const ok = buildBundle(ps, scenes, { profile: "prod", audioExists: () => true });
    expect(ok.errors).toEqual([]);
    expect(ok.bundle.phrases).toHaveLength(4);
    const ng = buildBundle(ps, scenes, { profile: "prod", audioExists: (f) => f !== "d.m4a" });
    expect(ng.errors).toEqual(["phrase d: 音声ファイル d.m4a がありません"]);
  });
  it("prod: tts 音声のフレーズは除外する", () => {
    const ps = ["a", "b", "c", "d", "e"].map((i) => phrase(i, i === "e" ? { audioSource: "tts" } : {}));
    const r = buildBundle(ps, scenes, { profile: "prod", audioExists: () => true });
    expect(r.bundle.phrases.map((p) => p.id)).toEqual(["a", "b", "c", "d"]);
  });
});

describe("parts(分かち書き)", () => {
  const part = (text: string, pron: string) => ({ text, pron, gloss: "x", pos: "noun" as const });
  const withParts = (text: string, pron: string, parts: ReturnType<typeof part>[]) =>
    phrase("p", { variants: [{ speaker: "any", register: "polite", text, pron, audio: "p.m4a", parts }] });

  it("単語ごとのカナを生成する", () => {
    const r = buildBundle([withParts("កក", "ɓaːt.ɓaːt", [part("ក", "ɓaːt"), part("ក", "ɓaːt")])], scenes, { profile: "preview" });
    expect(r.errors).toEqual([]);
    const parts = r.bundle.phrases[0]!.variants[0]!.parts!;
    expect(parts.map((x) => x.readingLite)).toEqual(["バーㇳ", "バーㇳ"]);
  });
  it("本文のカナも parts の語境界で分かち書きする", () => {
    const r = buildBundle([withParts("កក", "ɓaːt.ɓaːt", [part("ក", "ɓaːt"), part("ក", "ɓaːt")])], scenes, { profile: "preview" });
    expect(r.errors).toEqual([]);
    const v = r.bundle.phrases[0]!.variants[0]!;
    expect(v.readingLite).toBe("バーㇳ バーㇳ");
    expect(v.readingFull).toBe("バーㇳ バーㇳ");
  });

  it("連結した text・pron がフレーズと違えばエラー", () => {
    const r = buildBundle([withParts("កក", "ɓaːt.ɓaːt", [part("ក", "ɓaːt"), part("ខ", "ɓaːt")])], scenes, { profile: "preview" });
    expect(r.errors.some((e) => e.includes("text"))).toBe(true);
    const r2 = buildBundle([withParts("កក", "ɓaːt.ɓaːt", [part("ក", "ɓaːt"), part("ក", "caːh")])], scenes, { profile: "preview" });
    expect(r2.errors.some((e) => e.includes("pron"))).toBe(true);
  });
});
