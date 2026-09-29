# courses/

学習コース = **言語の組み合わせ(from → to)** 1つ。ディレクトリ名は `<from>-<to>`(ISO 639-1)。
`from` は学習者の言語(UI・訳・用法の言語)、`to` は学ぶ言語(音声・表記の対象)。
設計は [ADR-0020](../docs/adr/0020-course-per-language-pair.md)。

| コース | from → to | 表記ライブラリ | 状態 |
|---|---|---|---|
| `ko-ja` | 韓国語 → 日本語(韓国語話者向けの日本語あいさつ) | `packages/ja-hangul` | 骨格のみ(フレーズ未作成) |
| `ja-km`(予定) | 日本語 → クメール語 | `packages/khmer-kana` | 現状は `packages/content/data/` と `apps/web`。ADR-0020 の段階1で移す |

## 1コースのファイル

```
courses/<from>-<to>/
  course.yaml    コースのメタ情報(言語・表記ライブラリ・フォント・デプロイ先)
  scenes.yaml    場面(id・タイトル・順序。タイトルは from の言語)
  phrases.yaml   フレーズ(初期は 40 件)
  audio/         音声(to の言語の話者)
  images/        場面・フレーズの絵(任意)
```

コースを足すときは、ディレクトリを作り、`pnpm --filter content check --course <id>`(段階1で実装)が通ること、
`.github/workflows/deploy.yml` の入力に `<id>` を足すこと。
