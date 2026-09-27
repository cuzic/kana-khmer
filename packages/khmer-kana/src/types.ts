// Data model for the notation library. See docs/design.md §2.1.
// IPA is phonemic. Aspirated consonants are single tokens ("kʰ"). Implosives ɓ ɗ are canonical; b d are accepted as aliases.

export type Consonant =
  | "p" | "pʰ" | "ɓ" | "t" | "tʰ" | "ɗ" | "c" | "cʰ" | "k" | "kʰ" | "ʔ"
  | "m" | "n" | "ɲ" | "ŋ" | "j" | "r" | "l" | "ʋ" | "s" | "h"
  | "g" | "f" | "ʃ" | "z"; // loanwords only

export type Vowel = "i" | "e" | "ɛ" | "ɨ" | "ə" | "a" | "ɑ" | "u" | "o" | "ɔ";

/** Word-final r is not stored (not pronounced in the standard dialect). */
export type Coda = "p" | "t" | "k" | "c" | "ʔ" | "m" | "n" | "ŋ" | "ɲ" | "j" | "w" | "l" | "h";

export interface Nucleus {
  v1: Vowel;
  /** ː present. Diphthongs iə ɨə uə eə oə ɔə aə default to long=true. */
  long: boolean;
  /** Second element of a diphthong: ə, or e/o/i/u for ae ao ei ou. */
  v2?: Vowel;
  /** Breve diphthong (ĭə ŭə ĕə ŏə). Mutually exclusive with `long`. */
  short?: boolean;
}

export interface Syllable {
  /** 1..3 consonants. The last is the main onset; earlier ones are vowelless. Vowel-initial syllables carry an explicit "ʔ". */
  onset: Consonant[];
  nucleus: Nucleus;
  coda?: Coda;
}

/** A word is a sequence of syllables ("." separated in IPA). Stress is fixed on the last syllable, so it is not stored. */
export type Word = Syllable[];
/** An utterance is a sequence of words (space separated in IPA). */
export type Utterance = Word[];

export type NotationLevel = "full" | "lite";

/** Unit for coloring / tap explanations. A base kana and its combining mark always share one span. */
export type SpanKind =
  | "kana" // plain kana (including small kana and ㇷ゚)
  | "kana-nonsyl" // kana with ◌̯ (vowelless), e.g. チ̯
  | "cons-mod" // ʰ ˡ ʳ ᵑ (ŋ, word-initial and coda)
  | "vowel-mod" // ᵋ ᵓ ᵅ ᵊ ᶤ
  | "long" // ー
  | "space"; // word boundary

export interface Span {
  kind: SpanKind;
  text: string;
  /** IPA the span stands for (for explanations), when meaningful. */
  ipa?: string;
  /** Text to use in the lite notation instead of `text` (exceptions only; e.g. tɨ: full ト+ᶤ, lite トゥ). */
  lite?: string;
}

export interface Rendered {
  /** Concatenation of the spans' text. */
  text: string;
  spans: Span[];
}
