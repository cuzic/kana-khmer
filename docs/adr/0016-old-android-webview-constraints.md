---
status: accepted
date: 2026-09-26
deciders: agent (opus-reviewed)
---

# ADR-0016: 古い Android WebView を実行対象とし、ビルド・実装全体に制約を課す

## コンテキスト
実機相当環境での検証(glyph-check、Android API 29 のエミュレータ)で、古い Android の Chrome
(WebView)が現代的な JS 構文の一部をサポートしないことが分かった。`apps/web` は旅行先での利用を
想定しており、古い端末を切り捨てにくい。

## 決定
- `apps/web` の Vite ビルドターゲットを `["chrome70", "safari13"]` に下げる(`vite.config.ts`、
  `87da50c`。古い Android WebView で真っ白になる不具合への対策)。
- Nullish coalescing(`??`)・optional chaining(`?.`)を、`apps/web`・`tools/glyph-check` の両方の
  ランタイム JS(HTML に直接書くスクリプトを含む)で使わない。Android API 29 の Chrome では `??` が
  構文エラーになり、ページ全体が止まる不具合が実際に発生した(`de89682`。`note ?? ""` → `note || ""`
  に置換)。
- `Intl.Segmenter` が無い環境(Chrome 74系)向けに、`packages/khmer-kana` の `graphemes()` が
  代替実装(`\p{M}` を前の文字に結合する簡易分割)を持つ。

## 検討した代替案
- **古い端末を検証対象外にする**: 旅行先での利用という前提上、端末を選べないユーザーが一定数出ると
  判断し、切り捨てなかった。

## 結果(影響)
複数のパッケージ(`apps/web`、`tools/glyph-check`、`packages/khmer-kana`)にまたがる横断的な制約になった。
新しく JS を書く際は、ES2020 以降の構文(`??`、`?.` 等)を使わないことをレビューで確認する必要がある
(自動 lint 化はされていない)。`Intl.Segmenter` に依存するコードを書く際は、必ず代替実装のテストを
Segmenter あり/なし両方で通す。

## 参照
- `apps/web/vite.config.ts`
- `packages/khmer-kana/src/graphemes.ts`
- `docs/design.md` 付録(Android の Chrome 74系は `Intl.Segmenter` が無い)
- commits `87da50c`, `de89682`
