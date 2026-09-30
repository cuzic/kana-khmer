# yt-prosody-ext(PoC)

YouTube の英語字幕に、意味のまとまり・強勢・弱形・実際の音(カナ+右肩の IPA)・ビートを重ねて表示する Chrome 拡張(MV3)。
**規則による推定だけ**(音声認識は使わない)。分析は `packages/en-prosody`(ブラウザ内で動く。字幕を外部に送らない)。

## 仕組み
- YouTube の字幕(CC)の DOM(`.caption-window` … `.ytp-caption-segment`)を読み、同じ文字列を分析して、プレーヤーの上に重ねて表示する。元の字幕は DOM に残して見えなくするだけ(ここから読むため)。
- 見せる層は、ポップアップのプリセット(入門・標準・詳細・リズム)と層ごとのチェックで選ぶ。`chrome.storage.sync` に保存。
- 辞書は CMUdict(米国英語の第1発音)。字幕が英語であることを前提にする(言語の判定はしていない)。

## 使い方(開発)
```
pnpm --filter en-prosody gen:dict     # 辞書の生成(uv が要る。packages/en-prosody/data/cmudict.txt)
pnpm --filter yt-prosody-ext build    # → apps/yt-prosody-ext/dist
```
Chrome の `chrome://extensions` で「デベロッパーモード」をオンにし、「パッケージ化されていない拡張機能を読み込む」で `dist/` を選ぶ。
YouTube の動画で字幕(CC)をオンにする。字幕が英語のもの(手動字幕がある動画が望ましい。自動字幕は句読点が無く、まとまりの区切りが弱い)。

## 動作確認(本物の YouTube に入れない環境向け)
`test/fixture.html` は YouTube の字幕の DOM を模した疑似ページ。`pnpm --filter yt-prosody-ext build:test` で localhost でも動く拡張を作り、
ローカルのサーバで疑似ページを開いて、ヘッドレスの Chrome/Chromium に読み込ませて確かめる(**未実施。次のセッションで行う**)。

## 状態
土台のみ。`pnpm typecheck` は通るが、**ビルドしたものをブラウザで動かしたことはまだない**(本物の YouTube にも、疑似ページにも)。

## 既知の制約(PoC)
- YouTube の DOM の変更で動かなくなる可能性がある(`.caption-window` などのクラス名に依存)。
- 自動字幕は、ローリング表示で文字列が頻繁に変わる。句読点が無いため、区切りは弱い。
- 発音を引けない語(数字・固有名詞・ハイフン語)は、カナが空欄になる。
- 右肩の IPA は端末のフォントに依存する。実機での確認は `tools/glyph-check` の en-prosody ページ。
