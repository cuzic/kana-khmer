// 発音(カタカナ)を変換できないときの例外。
export type JaHangulErrorCode = "unsupported-kana" | "bad-structure";

export class JaHangulError extends Error {
  constructor(readonly code: JaHangulErrorCode, message: string) {
    super(message);
    this.name = "JaHangulError";
  }
}
