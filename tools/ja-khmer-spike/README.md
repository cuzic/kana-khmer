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

## 衝突率の再現(右肩 IPA の要否)

語彙は JMdict(jmdict-simplified の 3.6.2+20260928191014)。リポジトリには入れない。

```sh
B='https://github.com/scriptin/jmdict-simplified/releases/download/3.6.2%2B20260928191014'
curl -sLO "$B/jmdict-eng-common-3.6.2%2B20260928191014.json.tgz"
curl -sLO "$B/jmdict-eng-3.6.2%2B20260928191014.json.tgz"
tar xzf jmdict-eng-common-*.tgz && tar xzf jmdict-eng-3.6.2*.tgz
node src/collision.mjs jmdict-eng-common-3.6.2.json jmdict-eng-3.6.2.json
```

`out/` は生成物(コミットしない)。
