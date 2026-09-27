import { describe, expect, it } from "vitest";
import { buildBundle } from "../src/build";
import { loadData } from "../src/load";
import type { PhraseInput, SceneInput } from "../src/schema";

const scenes: SceneInput[] = [{ id: "s", title: "S", order: 1 }];
const phrase = (id: string, over: Partial<PhraseInput> = {}): PhraseInput => ({
  id, scene: "s", ja: id, usage: "",
  variants: [{ speaker: "any", register: "polite", khmer: "ក", ipa: "ɓaːt", audio: `${id}.m4a` }],
  words: [{ khmer: "ក", ipa: "ɓaːt", ja: "x" }],
  review: { ipa: true, audio: true, usage: true }, audioSource: "native", ...over,
});

describe("data/", () => {
  const { phrases, scenes: sc } = loadData(new URL("../data", import.meta.url).pathname);
  it("preview ビルドがエラーなしで通り、カナが生成される", () => {
    const r = buildBundle(phrases, sc, { profile: "preview" });
    expect(r.errors).toEqual([]);
    const yes = r.bundle.phrases.find((p) => p.id === "yes")!;
    expect(yes.variants.map((v) => v.kanaLite)).toEqual(["バーㇳ", "チャーㇹ"]);
    expect(yes.unreviewed).toBe(true);
    expect(yes.variants[1]?.mnemonic?.word).toBe("ciao");
  });
  it("未確認の仮データは prod に出ない", () => {
    const r = buildBundle(phrases, sc, { profile: "prod" });
    expect(r.bundle.phrases).toEqual([]);
  });
});

describe("buildBundle", () => {
  it("IPA の誤りをフレーズ id つきで報告する", () => {
    const r = buildBundle([phrase("a", { variants: [{ speaker: "any", register: "polite", khmer: "ក", ipa: "xyz", audio: "a.m4a" }] })], scenes, { profile: "preview" });
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
