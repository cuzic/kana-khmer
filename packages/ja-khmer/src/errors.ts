// 発音(カタカナ)を変換できないときの例外。
export type JaKhmerErrorCode = "unsupported-kana" | "bad-structure";

export class JaKhmerError extends Error {
  constructor(readonly code: JaKhmerErrorCode, message: string) {
    super(message);
    this.name = "JaKhmerError";
  }
}
