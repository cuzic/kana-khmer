---
status: accepted
date: 2026-09-26
deciders: agent (opus-reviewed)
note: この ADR は「結合文字は基底と同じフォントに同梱する」という規則についてのみ。同じ規則を理由に
  同梱フォントが増えていった経緯(現状 kana-c / kana-support / kana-multi の3系統)は
  [ADR-0014](0014-three-font-split.md) を参照
---

# ADR-0003: 結合文字を含む表記専用の合成フォントを同梱する

## コンテキスト
実機検証(glyph-check)で、`◌̯`(U+032F、母音なしの子音を表す結合文字)が Android の Chrome では
欠字になることが判明した。システムフォントでも、fontsource の Noto Sans 同梱版でも同様で、原因は
「基底文字と結合文字を1つのフォントで持たないと Chrome/Android が欠字にする」ことだった
(Noto Sans は U+032F 自体を含まず、サブセットへの追加もできなかった)。iOS では問題なかった。

## 決定
基底文字+結合文字(`チ` + `◌̯` など)を1つのカスタムフォント(`kana-c.woff2`)に同梱し、GSUB 合字
(`ccmp`)で専用グリフに置き換える。`◌̯` が付く基底が増えるたびに、このフォントにその基底を追加する
運用にする。表示側では、基底のカナと結合文字を **必ず同じ DOM 要素(同じ span)** に入れる(別要素に
分けると結合が崩れるおそれがあり、未検証のリスクを避けるため)。

**この決定の対象は Unicode の結合文字(combining mark)に限る**。`ʰ ˡ ʳ ᵑ ˀ` のような独立した
spacing modifier letter(上付き文字。カテゴリ Sk、単体で描画される)は、基底と同一フォントである
必要がない別の種類の文字なので、この決定の対象ではない(実際に `kana-support.woff2` という別ファイルに
入っている。[ADR-0014](0014-three-font-split.md))。

## 検討した代替案
- **システムフォント(Noto Sans/Noto Sans JP)のみに頼る**: Android で欠字になることを実機相当環境で
  確認済みのため却下。
- **DOM 上で基底と結合文字を別要素に分ける**: 結合が崩れる懸念があり、確かめる手段(glyph-check への
  項目追加)が用意されるまでは同じ span に入れる方を安全側として採用。

## 結果(影響)
新しく `◌̯` が付く基底文字を追加するたびに、`kana-c.woff2` を再生成して同梱するコストが発生する
(現状は c(チ)のみ)。フォント生成スクリプト(`tools/glyph-check/scripts/build-kana-font.py`)が
唯一のソースで、手作業でのグリフ追加は行わない。OFL でライセンス表記を同梱する。

## 参照
- `docs/design.md` §0, §3
- `docs/khmer-kana-spec.md` §6.3, §11-1
- `apps/web/public/fonts/kana-c.woff2`, `apps/web/src/style.css`
