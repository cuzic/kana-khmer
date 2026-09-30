// 発音(カタカナ)を変換できないときの例外。
export type JaThaiErrorCode = "unsupported-kana" | "bad-structure";

export class JaThaiError extends Error {
  constructor(readonly code: JaThaiErrorCode, message: string) {
    super(message);
    this.name = "JaThaiError";
  }
}
