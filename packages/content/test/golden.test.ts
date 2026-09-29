// ADR-0020 段階1: 一般化(フィールド名の変更、表記ライブラリのレジストリ化、データの courses/ への移行)の前後で、
// ja-km の出力が変わらないことを固定する。fixtures/ja-km.golden.json は一般化の前のバンドルから作った。
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { buildBundle } from "../src/build";
import { loadCourse } from "../src/load";
import { getNotation } from "../src/notation";

const golden = JSON.parse(readFileSync(new URL("./fixtures/ja-km.golden.json", import.meta.url), "utf8"));
const { course, phrases, scenes } = loadCourse(new URL("../../../courses/ja-km", import.meta.url).pathname);
const { bundle, errors } = buildBundle(phrases, scenes, { profile: "preview", notation: getNotation(course.notation.package) });

describe("ja-km のバンドルが一般化の前と同じ", () => {
  it("エラーなし", () => expect(errors).toEqual([]));
  it("場面", () => {
    expect(bundle.scenes.map((s) => ({ id: s.id, title: s.title, order: s.order, phraseIds: s.phraseIds }))).toEqual(golden.scenes);
  });
  it("フレーズ(text・pron・読み・音声・parts・words)", () => {
    const got = bundle.phrases.map((p) => ({
      id: p.id, scene: p.scene,
      variants: p.variants.map((v) => ({
        speaker: v.speaker, register: v.register, text: v.text, pron: v.pron,
        full: v.readingFull, lite: v.readingLite, audio: v.audio,
        ...(v.parts ? { parts: v.parts.map((x) => ({ text: x.text, pron: x.pron, full: x.readingFull, lite: x.readingLite })) } : {}),
      })),
      words: p.words.map((w) => ({ text: w.text, pron: w.pron })),
    }));
    expect(got).toEqual(golden.phrases);
  });
});
