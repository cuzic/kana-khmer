---
paths:
  - "docs/adr/**/*.md"
---

# ADR は MADR の frontmatter + Nygard 形式の本文(`docs/adr/`)

`docs/adr/` の ADR は [MADR](https://adr.github.io/madr/) の frontmatter に、Nygard 形式に近い本文を
組み合わせる(MADR の Considered Options/Decision Drivers/Consequences Good-Bad/Confirmation までは
採用していない。「MADR 準拠」と言えるのは frontmatter だけ)。詳細は `docs/adr/README.md` の
「書式」節を参照。ここは Claude 向けの要点だけをまとめる。**新しい ADR を書く前に、まず
`docs/adr/README.md` を読むこと**(索引・命名規則・直近の番号を確認するため)。

## いつ ADR を書くか

次のいずれかに当てはまる決定は ADR にする(全部を ADR 化しない。無いと後から経緯が分からなくなる
決定だけを対象にする):

- 却下した代替案がある(選ばなかった理由に価値がある)
- 複数のパッケージ・プラットフォームにまたがる、または横断的な制約になる
- 覆すと表記・データ・フォントの互換性が壊れる、やり直しコストが高い

## ファイル

- 1 ADR = 1 ファイル。`docs/adr/000N-slug.md`(4桁ゼロ詰め連番)。番号は使い切り・再利用しない。
- 次の番号は `docs/adr/` にある既存ファイルの最大値+1。**採番したらすぐコミットする**
  (このリポジトリは複数セッションが同じ working tree に並行してコミットすることがあるため、
  番号の衝突を避ける)。
- ファイル名の番号 + 本文見出し `# ADR-000N: <タイトル>` が番号の唯一の正。frontmatter に `id` を
  重複させない(リネーム時にズレて気づきにくくなるため)。

## Frontmatter(最小限)

```yaml
---
status: accepted   # proposed | accepted | rejected | deprecated | superseded by ADR-000N
date: YYYY-MM-DD    # 決定(accepted)日。一度書いたら変えない(「最終更新日」ではない)
deciders: user | agent (opus-reviewed) | ...   # 最終判断者
note: ...            # 省略可。統合日などの補足のみ。決定内容の変更・改定の詳細は本文に書く
---
```

- 状態遷移(supersede)は `status` の値自体に書く(`superseded by ADR-0012` のように)。
  別フィールド(`superseded_by:` 等)を新設しない。新しい ADR 側の「参照」には
  `Supersedes ADR-000M` と書き、双方向にたどれるようにする。
- `decision-makers`/`consulted`/`informed` という MADR のフル3分類は使わず、`deciders` 1つに
  簡略化する。「ユーザーが明示的に判断したか、エージェントが実装しながら判断したか」を区別できれば
  よい。Opus レビューのような「相談した相手」は `deciders` ではなく本文の「参照」に書く。
- **エージェントが単独で起こす ADR は `status: proposed` から始める**。`accepted` への遷移は、
  ユーザーが明示的に承認してから行う(会話上の承認でよいが、`deciders` にその旨を残す)。
  このルールは**これから新規に起こす ADR にのみ適用する**。`0001`〜`0016` は、すでに実装が完了して
  ユーザーのリポジトリにマージ済みの決定を遡って記録したものなので、`status: accepted` のまま
  変えない(実装自体がユーザー所有のリポジトリに反映されている事実を、ADR の status が追認している。
  2026-09-29、ユーザー確認済み)。

## 本文の見出し(固定順・日本語)

`## コンテキスト` → `## 決定` → `## 検討した代替案` → `## 結果(影響)` → `## 参照`。

## 参照できる情報源

「参照」節はリポジトリ内で辿れるもの(ファイルパス、コミットハッシュ、他の ADR への相対リンク
`[ADR-000N](000N-slug.md)`、PR/Issue の URL)に限る。Claude のローカルメモリ(`[[...]]` 形式)や
`/tmp` 配下のファイルなど、リポジトリの読者が辿れない場所は参照先にしない。裏付けが要る事実は、
本文に直接書き下す(引用元へのリンクではなく事実そのものを残す)。

## 運用

- **ADR は accepted になったら不変**。ただし次は「不変」の例外として許す: 誤字修正、リンク切れの修正
  (ファイル移動時)、`status` の遷移(supersede)、そして「本文末尾に改定へのリンクを1文足すだけ」の
  追記(決定の中身を書き換えるのではなく、「一部を ADR-000N が改定した」という事実を足すだけ。
  例: [ADR-0002](../../docs/adr/0002-two-level-notation-via-spans.md) の `note`)。決定の中身自体を
  書き換えたくなったら、追記ではなく新しい ADR を起こして `status` を supersede する。
- ADR は「なぜこの案にしたか・何を却下したか」の記録。変換表・型・テスト計画などの詳細設計そのものは
  `docs/design.md` / `docs/khmer-kana-spec.md` / `docs/tone-notation.md` 側を正とし、ADR の「参照」から
  該当節にリンクする。
- `docs/adr/README.md` の索引表は各ファイルの frontmatter を手で転記したもの。ADR の frontmatter を
  変更したら、索引表もそれに合わせて更新する(索引表が正ではない。ずれを検出する自動チェックは無く、
  目視で合わせる運用 —— `docs/adr/0004-visual-review-is-authoritative.md` の方針と一貫させている)。
