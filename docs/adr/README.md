# ADR (Architecture Decision Record)

このディレクトリには、2026-09-26〜09-28 の実装で確定した設計判断を、後から経緯が追えるように
ADR として記録する。**各設計の詳細・変換表・テスト計画そのもの**は引き続き
[`docs/design.md`](../design.md)・[`docs/khmer-kana-spec.md`](../khmer-kana-spec.md)・
[`docs/tone-notation.md`](../tone-notation.md) が正であり、ADR はそこに至った「なぜこの案にしたか・
何を却下したか」を短くまとめたもの。

0001〜0009・0011〜0016 は 2026-09-28 にまとめて**遡って**記録した(実装は09-26〜28に進んでいた)。
本文には記録時点までに分かった知識(後日のレビューでの修正等)が混ざっていることがある。日付
(frontmatter の `date`)は Git のコミット author date(`-0500`)を基準にしている。

決定が覆った場合は、旧 ADR の本文は書き換えず、新しい ADR を追加したうえで、旧 ADR の frontmatter の
`status` を `superseded by ADR-000N` に変える(詳細は [`.claude/rules/adr.md`](../../.claude/rules/adr.md))。
ある ADR の一部だけを別の ADR が改定する(全体は supersede しない)場合は、旧 ADR の本文に
改定箇所への言及を残し、frontmatter の `note` にその旨を書く(例: [ADR-0002](0002-two-level-notation-via-spans.md)
は [ADR-0005](0005-ng-shared-modifier.md)・[ADR-0006](0006-lite-drop-by-functional-load.md) に
一部を改定されている)。

| # | タイトル | 状態 | 日付 |
|---|---|---|---|
| [0001](0001-monorepo-package-split.md) | モノレポ構成とパッケージ分割 | accepted | 2026-09-26 |
| [0002](0002-two-level-notation-via-spans.md) | 詳細/ライトの2階層表記を span 方式で導出、NFKC/NFKD 禁止 | accepted | 2026-09-26 |
| [0003](0003-composite-combining-glyph-font.md) | 結合文字を含む表記専用の合成フォントを同梱する | accepted | 2026-09-26 |
| [0004](0004-visual-review-is-authoritative.md) | グリフ検証は目視を正とし、自動判定は補助に留める | accepted | 2026-09-26 |
| [0005](0005-ng-shared-modifier.md) | ŋ の表記を多言語共通の右肩 modifier `ᵑ` に統一する | accepted | 2026-09-27 |
| [0006](0006-lite-drop-by-functional-load.md) | ライトで残す修飾文字を機能負担量の実測で個別選定する | accepted | 2026-09-28 |
| [0007](0007-tone-as-chao-bars-separate-layer.md) | 声調の符号化は Chao 声調文字(U+02E5–E9)を音節末尾に並べる | accepted | 2026-09-26 |
| [0008](0008-tone-line-syllable-width-stretch.md) | 声調線は音節全体の幅に GSUB で伸縮、iOS/Android 二重符号化 | accepted | 2026-09-26 |
| [0009](0009-independent-geometry-verification.md) | フォント自動検証は生成関数を再利用せず幾何を独立に再計算する | accepted | 2026-09-28 |
| [0010](0010-japanese-to-khmer-script-reverse-notation.md) | クメール語話者向けに、日本語→クメール文字の逆方向表記をこの repo 内に別ディレクトリで設計する | accepted | 2026-09-29 |
| [0011](0011-glottal-stop-prefix-modifier.md) | 子音連続先頭の `ʔ` は専用 modifier `ˀ` を次のカナ直前に置く | accepted | 2026-09-28 |
| [0012](0012-ipa-source-of-truth.md) | 発音は IPA を正としカナはビルド時に生成、カナ→IPA の逆変換は保証しない | accepted | 2026-09-26 |
| [0013](0013-vowelless-consonant-mark.md) | `◌̯` で母音なしの子音を表し、ライトでも残す | accepted | 2026-09-26 |
| [0014](0014-three-font-split.md) | 表示用フォントは kana-c/kana-support/kana-multi の3系統に分けて管理する | accepted | 2026-09-28 |
| [0015](0015-custom-aspiration-glyph.md) | 有気音マーカー `ʰ` の字形をカスタム字形に変更する | accepted | 2026-09-28 |
| [0016](0016-old-android-webview-constraints.md) | 古い Android WebView を実行対象とし、実装全体に制約を課す | accepted | 2026-09-26 |
| [0017](0017-ja-khmer-subtitle-direction-and-right-shoulder-measurement.md) | 字幕表示は日本語→クメール文字の方向に絞り、右肩 IPA の要否を語彙の衝突率で測る | accepted | 2026-09-28 |
| [0018](0018-ja-hangul-n-boundary-marker.md) | 日本語→ハングル表記で、ん・っ の直後が母音・ら行のとき区切り記号を入れる | accepted | 2026-09-29 |
| [0019](0019-ja-hangul-lite-detail-boundary.md) | 日本語→ハングル表記の記号を右肩ローマ字にそろえ、長音・促音・区切りをライト、じゃ/じょ の ʲ を詳細だけにする | accepted | 2026-09-29 |
| [0020](0020-course-per-language-pair.md) | 学習コースを言語の組み合わせ(from→to)を単位にし、`courses/<from>-<to>/` と Cloudflare Pages に分ける | accepted | 2026-09-29 |
| [0021](0021-ja-khmer-pitch-accent-overline.md) | ja-khmer の日本語ピッチアクセントは、拍単位の上線(H のみ)を DOM/CSS で描く | proposed | 2026-09-29 |
| [0022](0022-ko-ja-display-elements-and-web-course-details.md) | ko-ja の表示要素(漢字・ふりがな・ローマ字・ハングル)と、apps/web のコース対応の細部 | accepted | 2026-09-29 |

この表は各ファイル冒頭の frontmatter(`status`・`date`・`deciders`、任意で `note`)を手で転記したもの
(`deciders` はこの表には出していない。各 ADR 本文を見る)。**状態・日付の正は frontmatter 側**とし、
ADR を追加・変更したらまずファイルの frontmatter を更新してからこの表を合わせる(ずれを検出する
自動チェックは無い。手動での目視合わせに頼っている。[ADR-0004](0004-visual-review-is-authoritative.md)
の「自動判定より目視」という方針と一貫させている)。

[ADR-0004](0004-visual-review-is-authoritative.md) と [ADR-0009](0009-independent-geometry-verification.md)
は役割が近い(どちらも glyph-check/`kana-multi` の検証方針)。0004 = 何をもって合格とするか(目視が権威、
自動判定は補助)、0009 = その自動判定側の検証コード自体の設計原則(生成関数を再利用しない)、と分担している。

## 書式(MADR の frontmatter + Nygard 形式の本文)

frontmatter は [MADR](https://adr.github.io/madr/) に倣う。本文の見出しは MADR の Considered
Options/Decision Drivers/Consequences(Good/Bad)/Confirmation までは採用せず、Nygard 形式に近い
`コンテキスト` / `決定` / `検討した代替案` / `結果(影響)` / `参照` に単純化している
(「MADR 準拠」と言い切れるのは frontmatter だけ)。

```yaml
---
status: accepted   # proposed | accepted | rejected | deprecated | superseded by ADR-000N
date: YYYY-MM-DD    # 決定(accepted)日。一度書いたら変えない
deciders: user | agent (opus-reviewed) | ...   # 最終判断者。エージェントの実装判断か、ユーザーの明示判断かを区別する
note: ...           # 省略可。統合日などの補足のみ。決定内容の変更や改定の詳細は本文に書く
---
```

- **番号は frontmatter に持たせず、ファイル名(`000N-slug.md`)と本文見出し(`# ADR-000N: …`)だけを正とする**
  (frontmatter に `id` を重複させると、リネーム時にズレて気づきにくい)。次の番号は
  `ls docs/adr | grep -E '^[0-9]{4}-'` の最大値+1とし、**採番したらすぐコミットする**
  (このリポジトリは複数セッションが同じ working tree に並行してコミットすることがあるため、
  番号の衝突を避ける)。
- 決定が覆った場合は、旧 ADR を書き換えずに新しい ADR を追加し、旧 ADR の `status` を
  `superseded by ADR-000N` に変える(遷移を1つのフィールドに集約する)。新しい ADR 側の「参照」にも
  `Supersedes ADR-000M` と書き、双方向にたどれるようにする。
- `decision-makers`/`consulted`/`informed` という MADR のフル3分類は使わず、`deciders` 1つに
  簡略化している。Opus レビューのような「相談した相手」は本文の「参照」に書く。
