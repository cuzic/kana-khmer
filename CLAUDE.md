# kana-khmer

クメール語の挨拶・日常会話を学ぶ日本人旅行者向けアプリ(PWA)と、その発音カナ表記ライブラリ。
設計は `docs/design.md`。表記の元になる設計書(v0.2)は Claude Docs 上にある。

## ルール
- パッケージマネージャーは **pnpm のみ**(`npm` 禁止)。Python は **uv**。
- 表記の文字列に NFKC/NFKD を絶対に適用しない(修飾文字が通常の文字に置き換わる)。
- 表記の見た目(修飾文字・`◌̯`)は端末のフォントに依存する。`tools/glyph-check` で実機相当の環境を目視確認する。自動判定は補助。

## 構成
- `packages/khmer-kana`  表記ライブラリ(IPA → 音節構造 → カナ詳細/ライト)
- `packages/content`      フレーズデータ(未作成)
- `apps/web`              PWA(未作成)
- `tools/glyph-check`     iOS/Android での描画検証とフォント生成
