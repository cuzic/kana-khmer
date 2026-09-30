---
status: proposed
date: 2026-09-30
deciders: user (修飾文字で L/R と細かい母音を書き分ける・個々の語の表記の指示・dz=ヅ・弱い ə は小書き+ᵊ のまま・語頭の子音連続は小書きのまま) + agent (右肩の字の選び方・表の細部。未決の点は docs/en-kana-spec.md §5)
---

# ADR-0031: 英語の推定の発音は、日本語話者が読める基本のカナ + 右肩の IPA 小文字で表記する

## コンテキスト
英語字幕に「推定の発音」(CMUdict と規則による。音声で確かめたものではない)を重ねる際([ADR-0030](0030-en-subtitle-prosody-ir-and-selectable-layers.md))、カナだけでは日本語にない区別が消える
(L/R、th、`æ` と `ʌ` など)。IPA だけでは日本語話者の初学者に読めない。このリポジトリは、khmer-kana と ko-kana で「基本のカナ + 右肩の修飾文字(IPA の小文字)」を使っている
([ADR-0005](0005-ng-shared-modifier.md))。

**ユーザーの発言(原文)**:
- 「カタカナ化は、修飾文字を使うことで、 L/R や細かい母音の区別も分かるようにします。」
- 「修飾文字というのは右肩に IPA の発音記号を書くというものですね。」
- 個々の表記は、ユーザーが画面の表示を貼って 1 語ずつ指示した: 「what I が ワライ みたいにつながるのが表現できるともっといいね」「v　はヴァ にして。慣用的に受け入れられているから。」
  「スィθは、シθでいいよ。幅を減らしたい。」「トスではなくツであるべき。」「これもフューチャ とかであるべきじゃないかな」「これも ネデュケイシン みたいなかんじじゃないかなぁ」
  (のち「シン ではなく、シᵊン みたいであるべきですね。」)「ここ、ネヴァとかであるべきかなぁ」「ストレインヂ かなぁ。ジ ではなく ヂを掴んでほしい。」
- 質問への回答(選択): `dz` は `ヅ`、弱い `ə` は「今のまま(小書き+ᵊ)」、語頭の子音連続の小書きは「小書きのまま」。

## 決定
1. **基本のカナは日本語話者が読める最も近い音にし、日本語にない区別を IPA の小文字で右肩に添える。** 右肩の字は、IPA の字そのものの右肩形(Unicode の修飾文字)を使い、独自の記号は作らない。
2. **母音の前以外の子音は、母音を足さない小書きカナで書く**(ko-kana と同じ考え方)。破擦音 ts・dz・dʒ・tʃ は、小書きカナを重ねず、1 字(ツ・ヅ・ヂ・チ)で書く。
3. **表記の文字列に NFKC/NFKD を適用しない**(修飾文字が通常の文字に置き換わる)。
4. **ライトは、右肩の字を落とす方向とするが、何を落とすかは ADR-0006 の方式(機能負担量の実測)で決める。** 現状の実装は、右肩の字を一律に消す暫定であり、[ADR-0002](0002-two-level-notation-via-spans.md)
   (span 単位の 1 操作で導出し、文字列から消す方式を却下)とも、ADR-0006(一律に落とす方式を却下)とも違う。暫定のライトの問題は、`docs/en-kana-spec.md` §5 の未決 3 に書いた。
5. **変換表の本体は [`docs/en-kana-spec.md`](../en-kana-spec.md)(v0.1 叩き台)を正とする。** 実装の正は `tools/en-prosody-spike/src/kana.py`(Python)で、`packages/en-prosody/src/kana.ts` が同じ出力を返す。
   表の各行は、誰が決めたか(ユーザーの指示か、エージェントの判断か)を spec に書いてある。表の中心(æ・ɝ・ɚ・半母音・ライト)は未決なので、この ADR は方針だけを決める。
6. **各記法の右肩の字は、その記法の中で意味を持つ。** 同じ字を別の意味で使うことを許す(ko-kana の `ᵓ` と本記法の `ᵓ`。`docs/en-kana-spec.md` §4)。

## 検討した代替案
- **カナだけ**: L/R・th・母音の区別が消える(ko-kana の設計でも、記号を落とした素のルビは衝突が多かった)。
- **IPA だけ**: 日本語話者の初学者には読めない。
- **IPA にない独自の修飾記号を作る**: 読み取れる根拠がなく、フォントにも無い。
- **`ts` `dz` を小書きカナ 2 字(`ㇳㇲ` `ㇳᵈㇲᶻ`)で書く**: 読めない(ユーザーが「トスではなくツであるべき」と指摘した)。
- **`dʒ` をジ行で書く**: ʒ(ジ行 + `ᶾ`)と書き分けられない。ヂ行にした(ユーザー指示)。
- **弱い `ə` も全角のカナ(ハプン・セカンド)にする**: 読みやすいが幅が広がる。小書き + `ᵊ` のままにした(ユーザーが選択)。
- **子音が並ぶ語頭の小書きカナ(`ㇲㇳ`)を全角(ストレ)にする**: 幅を減らすため小書きのままにした(ユーザーが選択)。
- **æ・ɾ・ɜ・r 音色に本来の右肩形を使う**: 対応するフォントが少ない(`docs/en-kana-spec.md` §3)。æ は代用(`ᵆ`、turned ae)にしているが、本物(U+10783)にするか、フォントを同梱するかは未決。

## 結果(影響)
- **未決が多い**(`docs/en-kana-spec.md` §5): æ の字、ɝ と ɑ+r が同じ表記になること、ライトの落とし方、ɚ を `ʳ` だけにしてよいか、半母音 + ə、右肩の文字が 2 つ重なる語の可読性、描画の確認。
  ユーザーが語ごとに指示した表記は、期待値を手で書いたテスト(`packages/en-prosody/test/decided.test.ts`)で守る。ただしテストは、ユーザーの指示と、エージェントの判断(未決を含む)を分けて検査する。
  TS 版と Python 版の突き合わせテスト(`parity.test.ts`)は、両者の一致だけを守り、表記が正しいことは保証しない。
- **対象は、デスクトップの Chrome(Windows・macOS・Linux・ChromeOS)。** MV3 の拡張が動くのはここで、Android の Chrome は拡張を動かせない。iOS/Android(`tools/glyph-check` の CI)の確認は、将来 PWA で出す場合のもの。
  `tools/glyph-check/public/en-prosody.html` と CI の配線(`.github/workflows/glyph-check.yml`)は作ったが、CI は未実行(GitHub Actions の利用枠を使うため、push の判断をユーザーに仰いでいる)。
  **デスクトップの Chrome(Windows・macOS)での目視確認は未実施。** 拡張の font-family は glyph-check の `sys`/`noto` のどちらとも違うので、`en-prosody.html` での確認は、拡張での見え方の確認にならない。
  確認は、拡張の font-family そのものを使うか、拡張の実画面のスクリーンショットを単位にする。Noto Sans JP は右肩の字 19 種をすべて欠くので、1 字ずつ別のフォントに落ちる(Windows・macOS でどう落ちるかは未確認)。
  拡張はフォントを同梱していない。フォントを同梱するなら、Shadow DOM の中の `@font-face` は効かない(確度は中)ので、document 側で登録する必要がある。欠字が出れば [ADR-0003](0003-composite-combining-glyph-font.md)・
  [ADR-0014](0014-three-font-split.md) と同じ要領でフォントを同梱する必要が出る。手元の Linux の Chrome では、欠字・位置崩れは見えなかった。
- 表記の正しさの最終判断は、ユーザーが個々の語を画面で見て行う。

## 参照
[ADR-0002](0002-two-level-notation-via-spans.md)、[ADR-0003](0003-composite-combining-glyph-font.md)、[ADR-0005](0005-ng-shared-modifier.md)、[ADR-0006](0006-lite-drop-by-functional-load.md)、[ADR-0014](0014-three-font-split.md)、
[ADR-0030](0030-en-subtitle-prosody-ir-and-selectable-layers.md)、[`docs/en-kana-spec.md`](../en-kana-spec.md)、`tools/en-prosody-spike/src/kana.py`、`packages/en-prosody/src/kana.ts`、
`packages/en-prosody/test/decided.test.ts`、`tools/glyph-check/public/en-prosody.html`。
