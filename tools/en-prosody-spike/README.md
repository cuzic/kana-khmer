# en-prosody-spike

英語字幕(YouTube)に、初学者向けの韻律情報を重ねて表示するスパイク(v0)。
入力は **手動字幕 + 自動字幕(語ごとの時刻)+ 音声**。出力は目視確認用の HTML と JSON。
**すべて規則による推定**で、正解データでの検証はしていない。経緯は `docs/research/2026-09-30-en-prosody-notation-catalog.md`。

## 表示する情報(初学者向けの 3 つ)
1. 意味のまとまり: 句読点 + 音声の無音(250ms 以上で `/`、600ms 以上で `//`)
2. 強く読む語: 機能語リスト以外が内容語(太字)。まとまりの最後の内容語を核(赤い下線)とする規則
3. 実際の音: CMUdict + 弱形表 + 弾き音(T/D が母音間で弱母音の前)+ 語間の連結(`‿`)。カナ + 右肩の IPA(`src/kana.py`)

## 構成: 分析 → 中間表現(IR, JSON)→ 各形式
```
MANUAL.json3 + AUTO.json3 + AUDIO.wav --build--> IR.json --convert--> .ass / .srt / .html
```
IR の形は `src/ir.py` の docstring。変換器(`to_ass.py` `to_srt.py` `to_html.py`)は IR だけを読む。
語ごとに `prominence`(0 弱形 / 1 機能語 / 2 内容語 / 3 核)・`break_after`・`pause_ms`・`phones`・`kana`(詳細)・`kana_lite` を持つ。
- **ASS**: 強勢・弱化を語ごとの `\fs`(倍率は `to_ass.PROFILE["size"]`)で表す。内容語は太字、核は色+下線。上の行=カナ、下の行=英語。
- **SRT**: フォントサイズの標準が無いので、内容語=`<b>`、核=`<u>`+色、弱形=灰色で近似。
- **HTML**: 目視確認用。ASS と同じ倍率で文字サイズを変える。

## 音声による形(音素認識)
`--phones PHONES.json` を渡すと、弱形・強形、弾き音・t、口蓋化を音声で決める(`observe.py`)。信頼度が低い語と観測できない語は規則に戻す。
IR の `kana` が音声による形、`kana_rule` が規則だけの形。`phonecheck.py` は規則と音声の一致を現象ごとに測る(`out/phonecheck.txt`)。
PHONES.json は wav2vec2 の espeak CTC(`facebook/wav2vec2-lv-60-espeak-cv-ft`、Apache-2.0、1.26GB)の貪欲デコード。CPU で実時間の約 0.8〜0.9 倍。
作り方: transformers の `Wav2Vec2ForCTC` に 16kHz の音声を 20 秒ずつ渡し、argmax の系列から `{"t": 秒, "p": 音素}` を出す(`src/phone_rec.py`。依存は別の仮想環境に入れる)。

## 使い方
```
# 取得(YouTube は bot 判定で弾かれるので、Tailscale 経由のプロキシを使った。手順は memory の project-en-prosody-subtitles)
yt-dlp --proxy ... --skip-download --write-subs --write-auto-subs --sub-langs "en,en-orig" --sub-format json3 -o "%(id)s.%(ext)s" URL
uv run --with "yt-dlp[default]" yt-dlp --proxy ... --js-runtimes node -f bestaudio -x --audio-format wav --postprocessor-args "ffmpeg:-ar 16000 -ac 1" -o "%(id)s.%(ext)s" URL
# IR を作る(--from/--to は秒)
uv run python src/cli.py build ID.en.json3 ID.en-orig.json3 ID.wav out/ted.ir.json --from 60 --to 150
# 変換(--lite で右肩の IPA を除く)。出力は IR と同じ場所
uv run python src/cli.py convert out/ted.ir.json --to ass   # → out/ted.ir.ass
# ASS の描画確認(libass)
ffmpeg -f lavfi -i color=c=0x202428:s=1920x1080:d=200 -vf "ass=out/ted.ir.ass" -ss 67.5 -frames:v 1 frame.png
```

## 既知の制約
- カナの右肩の IPA(ʳ ˡ ᶿ ᶞ ᵆ ᶺ ᶦ ᶷ ᵓ ᵊ ᵑ …)の描画は実機(iOS/Android)で未確認。`tools/glyph-check` で確認する。NFKC/NFKD は適用しない。
- 数字・ハイフン語・固有名詞は発音を引けない(TED 1 本で 26 語)。
- 核は「最後の内容語」という規則で、文脈(新情報・対比)は見ていない。ピッチは測っていない。
- ASS はカナ行と英語行を別々に折り返す(カナを語の真上に置く位置合わせはしていない)。必要なら語ごとの `\\pos` とフォント計測が要る。
