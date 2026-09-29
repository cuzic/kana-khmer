# ja-khmer-accent

ADR-0021 決定6・8: 旅行語彙の東京式ピッチアクセントを、英語版 Wiktionary の `{{ja-pron|…|acc=…}}` から取り込む。

    pnpm --filter @kana-khmer/ja-khmer-accent fetch      # vocab.tsv の語を取得 → packages/ja-khmer/data/accent-ja-pron.json、out/misses.json
    pnpm --filter @kana-khmer/ja-khmer-accent validate   # 形式検証(拍数と型の整合、下がり目の位置、H/L 列、verified)

- 語彙: `vocab.tsv`(見出し語・ひらがなの読み・出所)。語を足したら fetch を再実行する。
- API は直列・20 語ずつ・間に 2 秒、User-Agent 明示。生のウィキテキストは保存しない(依存パッケージ無し、Node の fetch のみ)。
- 出力の形式は `accent-ja-pron.json` の `_schema`、ライセンスは `packages/ja-khmer/data/LICENSE-CC-BY-SA.txt`(このディレクトリのコピーは置かない)。
- `ja-see` で別ページに移る語(例: こんにちは → 今日は)は 1 段だけ辿る。複数の型は全部残す。東京以外(`acc_loc`)は `nonTokyoOmitted` に退避して取り込まない。
- 取れなかった語は `out/misses.json`(git 管理外)。まとめは docs/research/2026-09-29-ja-accent-data-import.md。
