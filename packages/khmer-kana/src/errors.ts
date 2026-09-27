export type ErrorCode =
  | "EMPTY"
  | "UNKNOWN_SYMBOL"
  | "BAD_ONSET"
  | "NO_VOWEL"
  | "BAD_NUCLEUS"
  | "BAD_CODA"
  | "TRAILING"
  | "NO_VOWELLESS_FORM" // no vowelless kana is defined for this cluster-initial consonant
  | "NO_TABLE_ENTRY"; // combination missing from a table

export class KhmerKanaError extends Error {
  readonly code: ErrorCode;
  /** The chunk (syllable / word) that failed. */
  readonly input: string;
  /** Index inside `input` (NFD-normalized) where the problem was found, when known. */
  readonly index?: number;

  constructor(code: ErrorCode, message: string, input: string, index?: number) {
    super(`${code}: ${message} (in "${input}"${index === undefined ? "" : ` at ${index}`})`);
    this.name = "KhmerKanaError";
    this.code = code;
    this.input = input;
    if (index !== undefined) this.index = index;
  }
}
