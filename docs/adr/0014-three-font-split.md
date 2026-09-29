---
status: accepted
date: 2026-09-28
deciders: agent (opus-reviewed)
note: kana-multi.woff2 を apps/web に採用するかどうかは未決
---

# ADR-0014: 表示用フォントは kana-c / kana-support / kana-multi の3系統に分けて管理する

## コンテキスト
[ADR-0003](0003-composite-combining-glyph-font.md)(結合文字は基底と同じフォントに同梱する)を
起点に、必要なフォントが段階的に増えた: 結合文字(`◌̯`)対応の `kana-c.woff2`、独立した spacing
modifier letter(`ʰ ˡ ʳ ᵑ ˀ` 等。カスタム字形を含む。[ADR-0015](0015-custom-aspiration-glyph.md))
対応の `kana-support.woff2`、そして多言語・声調の検証用に作った `kana-multi.woff2`
([ADR-0007](0007-tone-as-chao-bars-separate-layer.md)、[ADR-0008](0008-tone-line-syllable-width-stretch.md))。
このうち `apps/web` が実際に読み込んでいるのは `kana-c.woff2` と `kana-support.woff2` の2つ
(`apps/web/public/fonts/`、`apps/web/src/style.css`)で、`kana-multi.woff2` は `tools/glyph-check`
専用のまま、アプリには組み込まれていない。

## 決定
現時点では3系統を統合せず、用途ごとに分けたまま運用する。

- `kana-c.woff2`: 結合文字(`◌̯`)+ その基底。Android の「基底と結合文字が別フォントだと欠字になる」
  制約への対応([ADR-0003](0003-composite-combining-glyph-font.md))。
- `kana-support.woff2`: 独立した spacing modifier letter(結合文字ではないため、この制約の対象外)。
  Noto Sans のサブセット+カスタム字形(`ʰ` 等)。
- `kana-multi.woff2`: 多言語・声調表記の検証用。クメール語単体には不要な全155通りの声調グリフ等を
  含み、サイズが大きい(83,864 バイト)。`tools/glyph-check` の実機検証ページでのみ使用。

`kana-multi.woff2` を `apps/web` に採用する(`kana-c`/`kana-support` を置き換える、または併用する)かは
**未決**。クメール語には声調が無く、多言語展開もまだクメール語のネイティブ確認待ちのため
([ADR-0001](0001-monorepo-package-split.md))、統合を急ぐ理由が今のところない。

## 検討した代替案
- **最初から1つのフォントに統合する**: クメール語専用の初期実装時点では多言語対応が未着手で、
  統合の要否を判断する材料が無かったため見送った(結果的に段階的分割になった)。

## 結果(影響)
フォントファイルが3つ並存し、それぞれのビルドスクリプト(`build-kana-font.py` /
`build-kana-support-font.py` / `build-kana-multi-font.py`)を個別にメンテナンスするコストがある。
将来 `kana-multi` をアプリに採用する場合、`kana-c`/`kana-support` の役割をどちらに寄せるか
(3つのまま増やす/2つに統合する)を別途決める必要がある。

## 参照
- `apps/web/public/fonts/`, `apps/web/src/style.css`
- `tools/glyph-check/scripts/build-kana-font.py`, `build-kana-support-font.py`, `build-kana-multi-font.py`
- `docs/design.md` §3, §8 #8
