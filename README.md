# kana-khmer

日本人旅行者向けのクメール語 挨拶・日常会話アプリ。発音はカナ(詳細/ライト)で示し、音声で覚え、間隔反復で定着させる。

- 設計: [docs/design.md](docs/design.md)
- 表記ライブラリ: `packages/khmer-kana`
- 描画検証: `tools/glyph-check`(GitHub Actions で iOS/Android シミュレータを使う)

```sh
pnpm install
pnpm test
```
