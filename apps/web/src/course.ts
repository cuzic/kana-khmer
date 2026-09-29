// 選んだコース(COURSE=<from>-<to>。pnpm gen が src/generated/ に出す)の情報。ADR-0020・ADR-0022。
import raw from "./generated/course.json";
import { data } from "./data";

export interface CourseInfo {
  id: string;
  /** 学習者の言語(UI・訳) */
  from: string;
  /** 学ぶ言語(text の言語) */
  to: string;
  title: Record<string, string>;
  notation: { package: string; input: "ipa" | "kana"; levels: ("full" | "lite")[] };
  fonts: string[];
}
export const course = raw as unknown as CourseInfo;

/** 性別で形が変わるフレーズがあるコースだけ、性別の設定を出す(ja-km。ko-ja は丁寧語のみ) */
export const hasGender = data.phrases.some((p) => p.variants.some((v) => v.speaker !== "any"));
/** IPA を見せるコース(発音の正が IPA。ja-km)。ko-ja の pron はカナで、ローマ字・ハングルの元になるだけ */
export const showsIpa = course.notation.input === "ipa";
