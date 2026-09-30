# en-kana 表記仕様 (v0.1 叩き台)

> **状態**: 叩き台。実機(デスクトップの Chrome の Windows・macOS)での描画確認は未実施。未決の点は §5。決定の経緯は [ADR-0031](adr/0031-en-kana-with-shoulder-ipa.md)。
> 実装の正は `tools/en-prosody-spike/src/kana.py`(Python)で、`packages/en-prosody/src/kana.ts`(TS 版)が同じ出力を返す。

日本語話者が英語の**推定の発音**を読むための、英語→カナ表記。入力は ARPABET(CMUdict の第 1 発音、ストレス数字つき。米国英語)で、
出力は「基本のカナ + 右肩の IPA 小文字」。表記の文字列に NFKC/NFKD を適用しない(修飾文字が通常の文字に置き換わる)。

## 1. 方針
- 基本のカナは、日本語話者が読める最も近い音にする。
- 日本語にない区別は、IPA の小文字(Unicode の修飾文字)を右肩に添えて示す。
- 「詳細」は右肩を含む。「ライト」は右肩を除く(暫定。§5 の未決)。
- 母音の前以外の子音は、母音を足さない小書きカナ(ㇰ ㇳ ㇷ゚ ㇲ ㇱ ㇺ ㇽ)で書く(ko-kana の考え方と同じ)。有声の子音には `ᵈ` `ᵍ` `ᵇ` `ᶻ` を添える。

## 2. 変換表
「由来」は、その表記を誰が決めたか。**user** = ユーザーが画面を見て指示した、または質問への回答として選んだ。**agent** = エージェントの判断。未決の点は §5。

| 音 | 表記 | 例 | 由来 |
|---|---|---|---|
| r / l | ラ行 + `ʳ` / `ˡ` | right = ラʳイㇳ、light = ラˡイㇳ | 書き分けは user、字の選び方は agent |
| θ / ð | サ行・ザ行 + `ᶿ` / `ᶞ`(i の前は シᶿ / ジᶞ) | think = シᶿᶦンᵑㇰ、this = ジᶞᶦㇲ | i の前は user、他は agent |
| v | ヴ行 | very = ヴェリʳー | user(慣用) |
| æ | ア + `ᵆ`(**turned ae の代用**。§5) | cat = カᵆㇳ | 書き分けは user、字は agent |
| ʌ / ɪ / ʊ / ɔ | ア + `ᶺ` / イ + `ᶦ` / ウ + `ᶷ` / オ + `ᵓ` | cup = カᶺㇷ゚、ship = シᶦㇷ゚ | 書き分けは user、字は agent |
| ə(弱い母音) | 子音の小書きカナ + `ᵊ` | about = ァᵊバウㇳ | user が現状維持を選択 |
| ɚ(弱い r 色の母音) | 子音の ア 段 + `ʳ` | never = ネヴァʳ、dinner = ディᶦナʳ | never=ネヴァ は user。`ʳ` だけにしたのは agent(未確認) |
| ɝ(強い r 色の母音) | ア 段 + `ʳ`(ɑ+r と同じ表記になる。§5) | bird = バʳㇳᵈ | agent |
| 弾き音(母音にはさまれた t/d) | ラ行 + 元の音の字(`ᵗ` `ᵈ`) | what I = ワᶺ ラᵗイ | ラ行にするのは user、`ᵗ` `ᵈ` は agent |
| ts / dz | ツ / ヅ(語末でも母音の前でも) | it's = イᶦツ、kids = キᶦヅ | user |
| dʒ | ヂ行(語末は ヂ) | strange = ㇲㇳレʳインヂ | user |
| ʒ | ジ行 + `ᶾ` | measure の ʒ | agent |
| tʃ | チ行(語末は チ) | watch = ワチ | agent |
| 子音 + y + 母音 | 子音の i 段 + 小書き ャュョ | future = フューチャʳ、music = ミューズィᶦㇰ | フュー は user、他は agent |
| ʃ・tʃ・dʒ・ʒ + 弱い母音 | 語末は シャ・チャ・ヂャ・ジャᶾ(ɚ は + `ʳ`)。音節を成す n の前は シᵊン・チᵊン・ヂᵊン。語末でない dʒ は デュ | nation = ネイシᵊン、education = エデュケイシᵊン | user の例(フューチャ、ネデュケイシᵊン)からの一般化は agent |
| 母音の前以外の子音(語頭の子音連続を含む) | 小書きカナ | strange の `ㇲㇳ` | user が小書きのままを選択 |
| ŋ | ン + `ᵑ` | think の `ンᵑ` | agent([ADR-0005](adr/0005-ng-shared-modifier.md) に揃えた) |
| 語間の連結 | 語末の子音が次の母音で始まる語に移る(`‿` で示す)。語末の ŋ は移さない | what I = ワᶺ / ラᵗイ | 移すことは user(ワライ)、規則の細部は agent |

## 3. 使う右肩の字と Unicode の事実(`unicodedata` の名前で確認)
- `ʳ`(U+02B3)`ˡ`(U+02E1)`ʰ`(U+02B0)`ᶿ`(U+1DBF)`ᶞ`(U+1D9E)`ᶺ`(U+1DBA)`ᶦ`(U+1DA6)`ᶷ`(U+1DB7)`ᵓ`(U+1D53)`ᵊ`(U+1D4A)`ᵑ`(U+1D51)
  `ᵈ`(U+1D48)`ᵇ`(U+1D47)`ᵍ`(U+1D4D)`ᶻ`(U+1DBB)`ᶾ`(U+1DBE)`ᵛ`(U+1D5B)`ᵗ`(U+1D57)は、対応する IPA の字の右肩形。
- **`ᵆ`(U+1D46)は「MODIFIER LETTER SMALL TURNED AE」で、æ の右肩形ではない。** æ の右肩形は U+10783(Latin Extended-F、Unicode 14)で、対応するフォントが少ない。
- ɾ の右肩形は U+107A9、ɜ は `ᶟ`(U+1D9F)、r 音色は `˞`(U+02DE、RHOTIC HOOK)がある。ɾ と æ の U+107xx は対応フォントが少ない。
- フォントの対応(fontTools の cmap で確認。Linux): Noto Sans JP は上の 19 の字をすべて欠く。DejaVu Sans・Noto Sans(latin-ext)は持つ。小書きカナは Noto Sans JP が持ち、DejaVu 系は欠く。

## 4. ko-kana との関係
同じ字を別の意味で使う: ko-kana の `ᵓ`(ㅓ ≈ [ʌ])と本記法の `ᵓ`(ɔ)。ko-kana の `ᵓ` が表す音は、本記法では `ᶺ` で書く。[ADR-0005](adr/0005-ng-shared-modifier.md) が
「多言語共通」を理由に `ᵑ` を選んだ方向とは逆になる。ko-kana は設計中で未コミット(`docs/ko-kana-spec.md`・ADR-0024)。

## 5. 未決
1. **æ の右肩の字**: `ᵆ`(turned ae)の代用のままか、U+10783(フォントの同梱が要る)か。
2. **ɝ(強い r 色の母音)の書き分け**: いまは bird = bard、hurt = heart、burn = barn、firm = farm が詳細でも同じ表記になる。`ᶟʳ`・`ᵊʳ`・`ᶟ˞` などの案。
3. **ライトで何を残すか**: いまは右肩の字を一律に消す。the → `ㇲ`、to → `ㇳ`、a → `ァ`、rice/lice = `ライㇲ`、road/load = `ロウㇳ`、thin/shin = `シン`、cup/cop = `カㇷ゚` になり、
   入門・標準プリセットの既定がこのライトになる。[ADR-0006](adr/0006-lite-drop-by-functional-load.md) の方式(機能負担量の実測)で決めるのが筋。少なくとも `ʳ` `ˡ` `ᶿ` `ᶞ` は残す候補。弱形の `ᵊ` を残すか全角にするかも。
4. **ɚ を `ʳ` だけにしてよいか**(幅を減らすという方針からのエージェントの推論。ユーザーに未確認)。
5. **半母音 + ə**: you(弱形)→ `イᵊ`、was → `ウᵊㇲᶻ`、would → `ウᵊㇳᵈ`、you're → `ヤʳ`。同じ /j/ の書き方が揃っていない。`ヤᵊ`・`ワᵊ` など。
6. **右肩の文字が 2 つ重なる語**(`シᶿᶦンᵑㇰ`)が読めるか。
7. **描画の確認**: 拡張が動くのはデスクトップの Chrome なので、Windows・macOS での目視確認が要る。拡張の font-family(`"Noto Sans JP", "Hiragino Sans", "Yu Gothic", system-ui, "Noto Sans", "DejaVu Sans"`)は
   glyph-check の `sys`/`noto` のどちらとも違う。確認は、拡張の font-family そのものを使うか、拡張の実画面のスクリーンショットを単位にする。

## 6. 検証
- `packages/en-prosody/test/parity.test.ts`: Python 版との一致(自作の例文 60 文)。表記が正しいことは保証しない。
- `packages/en-prosody/test/decided.test.ts`: ユーザーの指示(§2 の由来が user の点)と、現状の表記(agent。未決を含む)を、別に検査する。
