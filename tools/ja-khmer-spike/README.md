# ja-khmer-spike

日本語 → かな発音(kuromoji)→ クメール文字(**仮の対応表**)の使い捨てスパイク。
経緯と結論は [ADR-0017](../../docs/adr/0017-ja-khmer-subtitle-direction-and-right-shoulder-measurement.md)。
対応表はネイティブ確認前で、正書法の正しさは保証しない。

## 使い方

```sh
pnpm install
node src/run.mjs                                        # samples.txt を変換 → out/samples.md
node src/run.mjs --u-mid                                # 「う」を ឹ/ឺ にした変種
node src/table-dump.mjs                                 # 全かなの対応と衝突 → out/table.md
```

## 読み戻し検証(ADR-0010 決定7(a))

`Module:km-pron`(Wiktionary、CC BY-SA)の Lua をローカルに取り、JS 移植(`src/readback.mjs`)で
クメール文字 → IPA に読み戻す。生成側の表は参照しない。リポジトリには Lua を入れない。

```sh
curl -sL -A 'kana-khmer-spike' 'https://en.wiktionary.org/w/index.php?title=Module:km-pron&action=raw' -o km-pron.lua
KM_PRON_LUA=km-pron.lua node src/verify.mjs                     # モーラ単位(342 件)→ out/verify.md
KM_PRON_LUA=km-pron.lua node src/verify-words.mjs jmdict-eng-common-3.6.2.json   # 語単位(再分割のずれ)
```

結果と見つかった問題は [docs/research/2026-09-28-ja-khmer-readback-verification.md](../../docs/research/2026-09-28-ja-khmer-readback-verification.md)。

## 設計書 v0.7 の表(`spec-table.mjs`・`convert-spec.mjs`)

設計書 `docs/ja-khmer-spec.md` §5 の対応表(基本46音・濁音・半濁音・拗音)を**機械的に読み込む**(表を二重に持たない)。
規則は `convert-spec.mjs`: 長い拍の基底は段の既定+長音マーカー(直前の母音の上付きローマ字+結合マクロン U+0304。D9 で採用。`--long=a` ᵒ̄(既定)、`--long=c` 重ね書き ᵒᵒ(フォールバック)、`--long=colon` 旧案の ː)、`ˢʰ`(sh)は しゃ・しゅ・しょ、撥音=ន 固定、促音=次の子音に応じた末子音、あい=ៃ。
`table.mjs`・`convert.mjs` は ADR-0017 の仮表(v0)のまま残してある(`verify.mjs` などが使うため、旧表との比較にも使う)。

```sh
node src/spec-check.mjs      # 表の読み込み(103行)と、全かな(短・長)の同綴りの一覧
```

## 衝突率の再現(右肩 IPA の要否)

語彙は JMdict(jmdict-simplified の 3.6.2+20260928191014)。リポジトリには入れない。

```sh
B='https://github.com/scriptin/jmdict-simplified/releases/download/3.6.2%2B20260928191014'
curl -sLO "$B/jmdict-eng-common-3.6.2%2B20260928191014.json.tgz"
curl -sLO "$B/jmdict-eng-3.6.2%2B20260928191014.json.tgz"
tar xzf jmdict-eng-common-*.tgz && tar xzf jmdict-eng-3.6.2*.tgz
node src/collision.mjs jmdict-eng-common-3.6.2.json jmdict-eng-3.6.2.json                  # 設計書 v0.7 の表(範囲外の語を除く)
node src/collision.mjs --long=c jmdict-eng-common-3.6.2.json                               # 長音の字形 (c)(フォールバック)。値は (a) と同じ
node src/collision.mjs --table=v0 jmdict-eng-common-3.6.2.json jmdict-eng-3.6.2.json       # ADR-0017 の仮表(全語。ADR の値を再現)
node src/collision.mjs --table=v0 --scope-only jmdict-eng-common-3.6.2.json jmdict-eng-3.6.2.json   # 仮表を、同じ語(範囲内)で
```

全体(205,730 語)の実行は数分かかる。測り方は ADR-0006 と同じ(1つの対立を潰したとき新たに同綴りになる語の割合。同音の語は先に除く)。
「範囲外」は ァィゥェォ を含む外来語音の語(設計書の範囲外)。

### 結果(2026-09-29。設計書 v0.8(右肩をローマ字にした表)。共通語 22,508 語 / 全体 205,730 語のうち、範囲内 21,680 / 195,245 語)

| 測定 | 設計書 v0.7 の表(共通語 / 全体) | 仮表 v0(全語。ADR-0017 の値を再現) | 仮表 v0(範囲内) |
|---|---|---|---|
| 基準で既に同綴り | 0.23% / 0.19%(全体は長音マーカーが母音字を含み、`ː` 版の 380 語から 368 語) | 0.47% / 0.18% | 0.09% / 0.03% |
| (a) 長音マーカーを潰す | 11.01% / 6.72% | 14.36% / 8.51% | 13.52% / 7.93% |
| (b) ˢʰ を潰す(3対立の合計) | 2.06% / 1.17% | 2.51% / 1.37%(ʃ) | 2.53% / 1.40% |
| 個別: サ/シャ、ス/シュ、ショ/チョ | 0.54/0.53/1.03% / 0.30/0.38/0.50% | (ソ/ショ を含む) | |
| (g) 促音を書かない | 3.24% / 1.89% | 3.39% / 1.92% | 3.23% / 1.87% |
| (c1) 右肩・長音を全部なし | 12.81% / 7.57% | | |
| (c2) 右肩・長音・促音を全部なし | 16.58% / 9.49% | 21.95% / 12.29% | 21.11% / 11.72% |
| 有声の破擦音(チ/ジ)を潰す | (ち≠じ は基底で分かれる。じゃ/ちゃ 0.06% / 0.10%) | 2.11% / 1.18% | 2.18% / 1.24% |
| 許容: ず・づ/ぞ、じゃ/ちゃ、合計 | 0.07/0.06/0.14% / 0.06/0.10/0.16% | | |

「基準で既に同綴り」の内訳(v0.7): 許容した ず・づ/ぞ・じゃ/ちゃ 30 語(0.14%) / 298 語(0.15%)。`ː` 版では 310 語、語末の ッ・ー の重複(感動詞)17 / 48 語、その他 2 / 22 語。

`out/` は生成物(コミットしない)。
