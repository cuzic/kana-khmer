---
status: proposed
date: 2026-09-30
deciders: user (Chrome 拡張・YouTube 限定・見せるものを選べる・PoC は精度より先に拡張・PoC に音声認識は含めない) + agent
---

# ADR-0030: 英語字幕の韻律表示は、語ごとの中間表現(IR)を核にし、見せる層を利用者が選べる Chrome 拡張(YouTube 限定)で出す

## コンテキスト
英語学習者(当面は日本語話者の初学者)向けに、英語字幕へ「意味のまとまり・強く読む語・弱形・実際の音・ビート」を重ねて表示する計画がある。
出発点は、ChatGPT による英語プロソディ表記の調査と、それを一次資料に当たって検証した既存記法のカタログ
([`docs/research/2026-09-30-en-prosody-notation-catalog.md`](../research/2026-09-30-en-prosody-notation-catalog.md))。カタログの要点:

- 研究用の記法(ToBI・IViE・INTSINT・Tilt など)は凡例を覚える必要があり、数秒で消える字幕の表示層には向かない。内部に tier 構造を持ち、
  表示は選べる複数の層にするのが現実的。
- ToBI の自動付与は精度が限られる(人間のラベラー間でも、アクセント型の一致は約 6 割、中間句境界は約 50% と報告されている)。

`tools/en-prosody-spike`(Python のスパイク)で、手動字幕・自動字幕の語時刻・音声の無音・CMUdict から、語ごとの情報を作って表示を試した
(2026-09-30)。ユーザーの手応えは「弱形が意識しやすくなった」「ビートも大事」「何を見せるか選べる方がよい」。
**学習者にとって有益かどうかの検証は、まだしていない。**

## 決定
1. **分析結果は語ごとの IR(JSON)にする。** 形は `tools/en-prosody-spike/src/ir.py` の docstring が定義する
   (語ごとに `prominence` 0〜3・`beat`・`break_after`・`linked_next`・`kana`・`kana_lite` など)。ASS・SRT・HTML は IR だけを読む変換器にする。
2. **見せる層を独立に選べるようにする。** 層は `size`(強勢を文字の大きさで)・`bold`・`nucleus`(核の色と下線)・`weak`(弱形を灰色)・`breaks`(`/` `//`)・
   `link`(`‿`)・`beat`(`·` `●` `◎`)・`kana`・`ipa`(カナの右肩の IPA)・`audio`(音声で決めた形)の 10 層。プリセットは 入門・標準・詳細・リズム。
   定義は `tools/en-prosody-spike/src/layers.py`。選択は保存して次回に引き継ぐ(拡張では `chrome.storage.sync`)。
3. **入門向けに優先する情報は、まとまりの区切り・強く読む語と核・弱形とつながり。** 音の高さの線(ピッチ)と ToBI の音調は出さない。
   ビートは語単位(音節単位ではない)で、`·`(弱い)・`●`(強い語)・`◎`(核を兼ねる強い語)。
4. **最初の実装は YouTube 限定の Chrome 拡張(MV3)。** YouTube の字幕(CC)の DOM を読み、同じ文字列を分析して、プレーヤーの上に重ねて表示する。
   元の字幕は DOM に残して見えなくするだけ(ここから読むため)。**分析はブラウザ内で完結させ、字幕を外部に送らない。**
5. **分析ロジックは TypeScript パッケージ `packages/en-prosody` に持つ**(辞書は CMUdict の第 1 発音)。Python 版(`tools/en-prosody-spike`)を挙動の正とし、
   自作の例文 60 文を Python で分析した結果(`packages/en-prosody/test/golden.json`)との突き合わせテストで、TS 版の一致を保つ(現状は全語・全項目が一致)。
6. **既定は規則による推定だけ。** 音声を使う形は任意の拡張([ADR-0032](0032-en-audio-informed-variants.md))とし、PoC の拡張には含めない。
7. **PoC では精度を追わない**(ユーザー判断)。

## 検討した代替案
- **一つの新しい統合記法を作る**(ChatGPT の提案): 層が多く、学習者が凡例を覚える必要がある。IR に全部を持ち、表示で選ぶ方式にした。
- **研究用記法(ToBI・IViE)を表示する**: 読めない。tier 構造の考え方だけを内部に借りた。
- **ASS を本命にする**: ASS は語単位の位置合わせ(カナ・ビートを語の真上に置く)ができない。カナの行と英語の行は別々に折り返される
  (フォントの幅を測って語ごとに位置を指定する方式は未実装)。DOM なら語ごとの列を作れるので、拡張は DOM で描く。ASS・SRT はオフライン用の出力として残し、
  ビートは語の直前の小さな `●` `◎` で出す(語に付くので位置がずれない)。
- **サーバーで変換する**: 字幕の文を送ることになる。[ADR-0029](0029-ko-subtitle-g2p-on-device-poc-python.md) と同じ理由で、字幕の分析は端末内にする。
- **YouTube の字幕をタイミング付きの字幕データとして取る**: 取得に署名や認証が要る可能性があり、未検証。PoC は画面に出ている字幕の DOM を読む方式を採った
  (語の時刻は得られないので、音声の無音によるまとまりの区切りは使えない)。

## 結果(影響)
- 実装状況: `packages/en-prosody`(規則分析の TS 版。突き合わせテスト 62 件が通る)と、`apps/yt-prosody-ext`(拡張の土台。ビルド・型検査は通るが、ブラウザでの動作は未確認)。
- 辞書(CMUdict)は約 3MB で、拡張に同梱する。辞書は生成物で `.gitignore` に入れる(`pnpm --filter en-prosody gen:dict`、uv が要る)。
- 自動字幕はローリング表示で文字列が頻繁に変わり、句読点が無い。まとまりの区切りは手動字幕より弱い。
- 発音を引けない語(数字・ハイフン語・固有名詞。TED 1 本で 26 語)は、カナが空欄になる。
- 未決: YouTube の DOM(`.caption-window` などのクラス名)の変更への耐性、字幕が英語であることの判定、TED など他人の字幕を公開リポジトリやテストに含めない運用の徹底
  (TED の字幕は CC BY-NC-ND。現状は private のアーティファクトでのみ使った)、拡張の配布方法、YouTube の規約上の扱い(未確認)。
- 未検証: この表示が学習者の聞き取りに役立つか。要素ごとの効果(弱形の強調、つながり、ビート、右肩の IPA)を、聞き取りテストなどで測る必要がある。

## 参照
[ADR-0029](0029-ko-subtitle-g2p-on-device-poc-python.md)(端末内で動かす前提)、[ADR-0031](0031-en-kana-with-shoulder-ipa.md)(表記)、[ADR-0032](0032-en-audio-informed-variants.md)(音声)、
[`docs/research/2026-09-30-en-prosody-notation-catalog.md`](../research/2026-09-30-en-prosody-notation-catalog.md)、`tools/en-prosody-spike/README.md`、
コミット 46c6aae・e8d276c(スパイクと層の選択)。
