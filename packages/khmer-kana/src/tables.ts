// Conversion tables (data only). Source: khmer kana notation v0.2 + docs/khmer-kana-spec.md §5.
import { HANDAKUTEN, NASAL_MOD, NONSYL } from "./symbols";
import type { Coda, SpanKind, Vowel } from "./types";

export type BaseConsonant =
  | "p" | "t" | "c" | "k" | "ʔ" | "m" | "n" | "ɲ" | "ŋ" | "j" | "r" | "l" | "ʋ" | "s" | "h"
  | "ɓ" | "ɗ" | "g" | "f" | "ʃ" | "z";

export const ASPIRABLE = new Set<string>(["p", "t", "c", "k"]);
export const BASE_CONSONANTS = new Set<string>([
  "p", "t", "c", "k", "ʔ", "m", "n", "ɲ", "ŋ", "j", "r", "l", "ʋ", "s", "h", "ɓ", "ɗ", "g", "f", "ʃ", "z",
]);
export const VOWELS = new Set<string>(["i", "e", "ɛ", "ɨ", "ə", "a", "ɑ", "u", "o", "ɔ"]);
export const CODAS = new Set<string>(["p", "t", "k", "c", "ʔ", "m", "n", "ŋ", "ɲ", "j", "w", "l", "h"]);

export type Row = readonly [string, string, string, string, string]; // [ア, イ, ウ, エ, オ]

/** Onset consonant × vowel row. Aspiration is not part of the kana (added as a modifier). */
export const ONSET_ROWS: Record<BaseConsonant, Row> = {
  p: ["パ", "ピ", "プ", "ペ", "ポ"],
  ɓ: ["バ", "ビ", "ブ", "ベ", "ボ"],
  t: ["タ", "ティ", "トゥ", "テ", "ト"],
  ɗ: ["ダ", "ディ", "ドゥ", "デ", "ド"],
  c: ["チャ", "チ", "チュ", "チェ", "チョ"],
  k: ["カ", "キ", "ク", "ケ", "コ"],
  ʔ: ["ア", "イ", "ウ", "エ", "オ"],
  m: ["マ", "ミ", "ム", "メ", "モ"],
  n: ["ナ", "ニ", "ヌ", "ネ", "ノ"],
  ɲ: ["ニャ", "ニ", "ニュ", "ニェ", "ニョ"],
  j: ["ヤ", "イ", "ユ", "イェ", "ヨ"],
  r: ["ラ", "リ", "ル", "レ", "ロ"],
  l: ["ラ", "リ", "ル", "レ", "ロ"],
  ʋ: ["ヴァ", "ヴィ", "ヴ", "ヴェ", "ヴォ"],
  s: ["サ", "スィ", "ス", "セ", "ソ"],
  h: ["ハ", "ヒ", "フ", "ヘ", "ホ"],
  ŋ: ["ガ", "ギ", "グ", "ゲ", "ゴ"], // same row text as loanword g; CONS_MOD_OF adds ᵑ to mark it as ŋ (lite drops ᵑ, giving plain ガ行)
  // loanwords only
  g: ["ガ", "ギ", "グ", "ゲ", "ゴ"],
  f: ["ファ", "フィ", "フ", "フェ", "フォ"],
  ʃ: ["シャ", "シ", "シュ", "シェ", "ショ"],
  z: ["ザ", "ジ", "ズ", "ゼ", "ゾ"],
};

/**
 * Exceptions to ONSET_ROWS[consonant][vowel row], keyed by consonant + vowel: { full, lite } kana.
 * `tɨ`: トゥ+ᶤ puts a small ゥ next to the modifier (トゥᶤ) and is hard to read, so the detailed notation
 * is ト+ᶤ. Lite drops ᶤ and would read as `to`, so it keeps トゥ (the row's own kana). Accepted as a special case.
 */
export const ONSET_EXCEPTIONS: Partial<Record<string, { full: string; lite: string }>> = {
  "tɨ": { full: "ト", lite: "トゥ" },
};

/** Consonant modifiers that always accompany the kana (l, r and word-initial ŋ are never written bare). */
export const CONS_MOD_OF: Partial<Record<BaseConsonant, string>> = { r: "ʳ", l: "ˡ", ŋ: NASAL_MOD };

export const VOWEL: Record<Vowel, { row: 0 | 1 | 2 | 3 | 4; mod: string }> = {
  i: { row: 1, mod: "" },
  e: { row: 3, mod: "" },
  ɛ: { row: 3, mod: "ᵋ" },
  ɨ: { row: 2, mod: "ᶤ" },
  ə: { row: 0, mod: "ᵊ" },
  a: { row: 0, mod: "" },
  ɑ: { row: 4, mod: "ᵅ" },
  u: { row: 2, mod: "" },
  o: { row: 4, mod: "" },
  ɔ: { row: 4, mod: "ᵓ" },
};

export interface Part {
  kind: SpanKind;
  text: string;
}
const kana = (text: string): Part => ({ kind: "kana", text });
const modC = (text: string): Part => ({ kind: "cons-mod", text });

/** Vowelless form of a consonant that precedes the main onset (aspiration is not written here). */
export const PREFIX: Partial<Record<BaseConsonant, readonly Part[]>> = {
  k: [kana("ㇰ")],
  t: [kana("ㇳ")],
  p: [kana("ㇷ" + HANDAKUTEN)],
  s: [kana("ㇲ")],
  m: [kana("ㇺ")],
  l: [kana("ㇽ"), modC("ˡ")],
  c: [{ kind: "kana-nonsyl", text: "チ" + NONSYL }],
};

export const CODA_KANA: Record<Coda, readonly Part[]> = {
  p: [kana("ㇷ" + HANDAKUTEN)],
  t: [kana("ㇳ")],
  k: [kana("ㇰ")],
  c: [kana("ィ"), { kind: "kana-nonsyl", text: "チ" + NONSYL }], // the preceding vowel leans toward イ
  ʔ: [kana("ッ")],
  m: [kana("ㇺ")],
  n: [kana("ン")],
  ŋ: [kana("ン"), modC(NASAL_MOD)],
  ɲ: [kana("ィ"), kana("ン")],
  j: [kana("ィ")],
  w: [kana("ゥ")],
  l: [kana("ㇽ"), modC("ˡ")],
  h: [kana("ㇹ")],
};

/** Second element of a diphthong. Only ə has a short (breve) form. */
export const SECOND: Record<string, { long: string; short?: string; mod?: string }> = {
  ə: { long: "ア", short: "ァ", mod: "ᵊ" },
  e: { long: "エ" },
  o: { long: "オ" },
  i: { long: "イ" },
  u: { long: "ウ" },
};

/** (v1, v2) pairs that form a diphthong. */
export const DIPHTHONG = new Set<string>(["iə", "ɨə", "uə", "eə", "oə", "ɔə", "aə", "ae", "ao", "ei", "ou"]);
/** Breve diphthongs. */
export const SHORT_DIPHTHONG = new Set<string>(["iə", "uə", "eə", "oə"]);
