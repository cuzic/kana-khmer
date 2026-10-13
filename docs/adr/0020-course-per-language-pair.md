---
status: accepted
date: 2026-09-29
deciders: user (言語の組み合わせ from→to を表現できる構成にする、ホスティングは Cloudflare Pages、フレーズは日本側の場面から作り直す、発音はかなを手で書く) 、ko-ja のフレーズは丁寧語のみ・1フレーズ=1カード、accepted の承認) + agent
---

# ADR-0020: 学習コースを言語の組み合わせ(from→to)を単位にし、`courses/<from>-<to>/` と Cloudflare Pages に分ける

## コンテキスト
これまでの構成は、クメール語(to)を日本語話者(from)が学ぶ1組に固定されている
(`packages/content` のフィールド名 `khmer`・`ipa`・`ja`、ビルドが `khmer-kana` を直接呼ぶこと、
`apps/web` の `lang="km"`・localStorage のキー `kana-khmer:settings`)。
今回、韓国語話者向けの日本語あいさつ(ko→ja)を同じ形で作ることにした(40 フレーズ)。
ユーザーは今後も「いろんな from・to の組み合わせ」を作る予定で、それを表現できる構成を求めている。

多言語展開の当初の合意(2026-09-26)は「共通化はクメール語のネイティブ確認と表記見直しの後。先に
汎用化しない」だった。今回、ユーザーの明示的な指示でこれを覆す(組み合わせが増える前提のため)。

用語:
- **コース**: 言語の組み合わせ1つ(from=学習者の言語、to=学ぶ言語)。id は `<from>-<to>`(例: `ja-km`、`ko-ja`)。
- **表記ライブラリ**: to の言語の発音を、from の話者が読める文字にする実装。名前は `<to>-<script>`
  (既存の `khmer-kana` = クメール語→カナ、新規の `ja-hangul` = 日本語→ハングル)。

## 決定
1. **コースを単位にする。データは `courses/<from>-<to>/` に置く**(`course.yaml`・`scenes.yaml`・`phrases.yaml`・`audio/`・`images/`)。
   `course.yaml` が言語・表記ライブラリ・フォント・デプロイ先を持つ。詳細は `courses/README.md`。
2. **表記ライブラリは `packages/<to>-<script>` に1つずつ置き、共通のインターフェースで `content` に差し込む。**
   共通インターフェース(段階1で確定): 入力は `pron`(コースの `notation.input` で形式を宣言。クメール語は IPA、
   日本語はカナ)、出力は詳細/ライトの文字列(必要なら音節分割)。`content` のビルドは表記ライブラリの
   レジストリ(`id` → アダプタ)を引き、`khmer-kana` を直接 import しない。
3. **フレーズのフィールド名を言語に依存しない名前にする**(段階1で確定・移行): `text`(to の文字)・
   `pron`(発音)・`gloss`(from の言語の訳)。`khmer`→`text`、`ipa`→`pron`、`ja`→`gloss` に対応する。
4. **`apps/web` は1つで、コースはビルド時に選ぶ**(`COURSE=ko-ja` など)。1つのバンドルに複数コースを
   入れない。UI の文言は from の言語ごとに持つ。localStorage・IndexedDB のキーはコースで名前空間を分ける。
5. **デプロイはコースごとに Cloudflare Pages のプロジェクト1つ**(`kana-<course>`)。GitHub Actions の
   `.github/workflows/deploy.yml`(手動実行)から `wrangler pages deploy` の直接アップロードで公開する。
   `main` が本番、それ以外のブランチ名はプレビュー。音声・画像はしばらくリポジトリに置き、容量が問題に
   なったら R2 に移す(別 ADR)。古い Android WebView を対象にする制約(ADR-0016、`build.target`)はそのまま。
6. **フレーズの発音は、データに「発音を確定した」カナで手書きする**(ko-ja)。ハングルは `ja-hangul` が生成し、
   手で書かない。形態素解析は使わない。フレーズは日本側の場面(訪日韓国人が使う場面)から作り直し、
   既存の `ja-km` の場面・id は引き継がない。
7. **移行は段階的に行い、`ja-km`(既存)の挙動とテストを保つ。**
   - **段階0(本コミット)**: `courses/` の骨格、`packages/ja-hangul`(移植済み・26 テスト)、`deploy.yml`、本 ADR。
     既存コードは変えない。
   - **段階1**: `content` を言語非依存にする(スキーマ・レジストリ・`--course`)。既存データを
     `courses/ja-km/` に移し、`ja-km` のバンドルが変わらないことをテストで固定する。
   - **段階2**: `apps/web` をコース対応にする(ビルド時の選択、UI 文言、フォント、キーの名前空間)。
     `deploy.yml` の `ja-km` 限定の制限を外す。
   - **段階3**: `ko-ja` のフレーズ 40 件、音声、ネイティブ確認。

## 検討した代替案
- **組み合わせごとにアプリをコピーする(`apps/web-ko` など)**: 最初は速いが、SRS・画面・不具合修正が
  コースの数だけ分岐する。組み合わせが増える前提なので却下。
- **1つのバンドルで実行時にコースを切り替える**: 全コースのデータ・フォント・音声を読むので、古い
  Android WebView(ADR-0016)と容量に不利。コースごとに使うフォントも違う(kana-c/kana-support と
  kana-hangul)。却下。
- **コースごとに別リポジトリ**: フォント・glyph-check・ADR の知見を共有しにくく、二重管理になる。却下。
- **GitHub Pages**: 設定は簡単だが、PWA に要るヘッダ(Service Worker の場所、MIME、キャッシュ)の制御が
  弱く、プレビューデプロイもない。ユーザーは Cloudflare Pages を選んだ。
- **先に `ko-ja` だけ既存構成のコピーで作り、後で一般化する**: 二度手間になる。ユーザーが最初から
  コースを単位にすることを選んだ。

## 結果(影響)
- コースの追加は、`courses/<id>/` と表記ライブラリ(必要なら)と Pages プロジェクトを足す作業になる。
- **一般化を、クメール語のネイティブ確認前に行う**。表記が変わったときの影響は `khmer-kana` に閉じるが、
  `content` のスキーマ移行はデータ全件に及ぶ。段階1で `ja-km` の出力を固定するテストを先に置いて守る。
- 段階0〜1 の間、`apps/web` は `ja-km` 専用のまま。`deploy.yml` は `ja-km` 以外を拒否する。
- ko-ja のフレーズは丁寧語のみ、1フレーズ=1カード(性別・呼びかけの差は使わない。ユーザー判断 2026-09-29)。スキーマの `variants`(1件)・`addressee` は ja-km のために残す。
- 未決: UI 文言の
  持ち方、Pages のカスタムドメイン、ブランチごとのプレビューの運用、SRS のデータをコース間で共有するか。
- デプロイには repo の Secrets(`CLOUDFLARE_API_TOKEN`・`CLOUDFLARE_ACCOUNT_ID`)と、Pages プロジェクトの
  初回作成が要る。ユーザーの作業になる。

## 参照
- [`courses/README.md`](../../courses/README.md)、[`courses/ko-ja/course.yaml`](../../courses/ko-ja/course.yaml)
- `packages/ja-hangul/`(表記ライブラリ。[ADR-0018](0018-ja-hangul-n-boundary-marker.md)・[ADR-0019](0019-ja-hangul-lite-detail-boundary.md))
- `.github/workflows/deploy.yml`
- [ADR-0001](0001-monorepo-package-split.md)(モノレポとパッケージ分割)、[ADR-0012](0012-ipa-source-of-truth.md)(IPA を正とする。クメール語コース)、[ADR-0016](0016-old-android-webview-constraints.md)(古い Android WebView)
- `docs/design.md` §4(フレーズのデータモデル)
