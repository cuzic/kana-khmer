# kana-khmer

クメール語の挨拶・日常会話を学ぶ日本人旅行者向けアプリ(PWA)と、その発音カナ表記ライブラリ。
設計は `docs/design.md`。表記の元になる設計書(v0.2)は Claude Docs 上にある。
主要な設計判断の経緯(なぜこの案にしたか・何を却下したか)は `docs/adr/` に ADR として残す。
`docs/design.md` §8・`khmer-kana-spec.md` 冒頭の追記・`tone-notation.md` §8 のいずれかの決定を
追加・変更するときは、`docs/adr/` に対応する ADR があるか確認し、無ければ起こす・覆るなら新しい ADR で
supersede する(`docs/adr/README.md` と `.claude/rules/adr.md` を参照)。

## ルール
- パッケージマネージャーは **pnpm のみ**(`npm` 禁止)。Python は **uv**。
- 表記の文字列に NFKC/NFKD を絶対に適用しない(修飾文字が通常の文字に置き換わる)。
- 表記の見た目(修飾文字・`◌̯`)は端末のフォントに依存する。`tools/glyph-check` で実機相当の環境を目視確認する。自動判定は補助。

## 構成
- `packages/khmer-kana`  表記ライブラリ(IPA → 音節構造 → カナ詳細/ライト)
- `packages/content`      フレーズデータ(phrases.yaml → phrases.json、prod/preview)
- `apps/web`              PWA(土台のみ: シーン一覧とフレーズカード。学習機能は未着手)
- `tools/glyph-check`     iOS/Android での描画検証とフォント生成
