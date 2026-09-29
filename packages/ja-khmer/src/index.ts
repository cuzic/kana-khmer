// 日本語の発音(カタカナ)→ クメール文字。docs/ja-khmer-spec.md(v0.12)・ADR-0010・ADR-0021・ADR-0023。
// 入力は「発音を確定したカタカナ」(長音は ー、促音は ッ、撥音は ン、助詞は発音どおり。ァィゥェォ ヴ は範囲外)。
// 対応表はネイティブ確認前(設計書 §5.1 の状態欄が正)。

export { JaKhmerError, type JaKhmerErrorCode } from "./errors";
export { renderKhmer, longMark } from "./render";
export type { LongStyle, Mora, Phrase, Rendered, RenderOptions, Slot, SlotKind, Syllable, Vowel } from "./render";
export { SPEC_TABLE } from "./spec-table.generated";
export type { SpecRow } from "./spec-parse";
