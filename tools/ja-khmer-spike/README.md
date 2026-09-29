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
