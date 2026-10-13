# ADR-0010 コンテキスト: 音韻・正書法の机上確認結果

> **訂正(2026-09-28、設計書 v0.2 のレビューでの実測)**: 本レポートの「◌ិ ◌ុ は終子音の前で音が変わる」(要約 #3 と §3)は
> 過度な一般化だった。Wiktionary `km-IPA` の実測では、終子音の前で母音の音色が変わるのは ◌ិ だけで、◌ុ は終子音の有無に関わらず
> a系 [o]・o系 [u] のまま(落ちるのは開音節の声門閉鎖だけ)。設計書 `docs/ja-khmer-spec.md` §6.5 が正しい。


調査日 2026-09-28。対象: `docs/adr/0010-japanese-to-khmer-script-reverse-notation.md` のコンテキスト箇条書きと決定2・3・6の技術事実。
リポジトリのファイルは編集していない。作業用の取得物は scratchpad にある。

## 一次資料についての注意(先に読むこと)

- **Huffman "Cambodian System of Writing" と Headley 辞書の本文そのものには当たっていない**(書籍で Web から全文取得できなかった)。
  代わりに次の二次資料を使った。いずれも Huffman/Headley を典拠にしていると自称しているが、本文照合はしていない。
  - 英語版 Wikipedia "Khmer script"(母音表は Huffman 由来と脚注に明記)。raw wikitext を取得して読んだ。
    https://en.wikipedia.org/wiki/Khmer_script (旧 "Khmer alphabet" はここへリダイレクト)
  - 英語版 Wikipedia "Khmer language"(音節構造、プノンペン方言)。https://en.wikipedia.org/wiki/Khmer_language
  - 英語版 Wiktionary の `Module:km-pron`(Lua ソース。UNESCO の "Khmer pronouncing dictionary: standard Khmer and Phnom Penh dialect" を典拠と明記)。
    https://en.wiktionary.org/wiki/Module:km-pron 。**ソースを読んだだけでなく、`{{km-IPA|...}}` を MediaWiki API の expandtemplates で実行して個別の綴りの出力を取った**(下の表はこの実測)。
- 「Wikipedia の表」と「Wiktionary モジュールの出力」で**食い違う箇所がある**(該当箇所に明記)。ADR の表を作る際は、どちらを正とするかを決めて記録する必要がある。
- ネイティブ確認・実音声確認はしていない。ここでの「確認済み」は文献上の記述との一致であり、旅行者向けの実用性の保証ではない。

## 要約(ADR との食い違いを先に)

| # | 主張 | 判定 |
|---|------|------|
| 1 | 母音長・開音節 | **一部異なる**: 声門閉鎖を作るのは ◌ៈ。◌ះ は末尾 /h/。 |
| 2 | 濁音・ふ・系列変更 | 確認済み。ただし **ហ្គ の系列が Wikipedia と Wiktionary で逆**。◌៉/◌៊ の向きは ADR の書き方で正しいが、ADR は向きを書いていない。 |
| 3 | 促音・重ね書き | 確認済み(重ね書きは重子音にならない)。**◌ិ ◌ុ は終子音の前で音が変わる**点は ADR に無い追加事項。 |
| 4 | 拗音 coeng+យ | 確認済み。ただし **Wiktionary の出力は [pʰjiə](有気)**で、ADR の /pjiə/ と表記が違う。a系は ក្យា=[kjaː]。 |
| 5 | 撥音 | 確認済み(書ける)。 |
| 6 | ら行 | 確認済み。 |
| 7 | う・え・お | **一部異なる**: え(◌េ)は a系でも二重母音ではない(Wikipedia: 両系列 [eː])。二重母音になるのは お(◌ោ a系 [ao])と、Wiktionary では o系の ◌េ [ei]。 |
| 8 | 母音記号表 | 下に整理(あ〜お の候補つき)。 |
| 9 | Unicode | 確認済み。ただし **ç の上付きは無い**(ɾ は U+107A9 がある)。 |
| 10 | Wiktionary アクセント | 英語版は東京式の型番号あり(約 4.5 万ページ)。**日本語版は実質使えない**(京阪式が大半、東京式は1件)。ライセンスは CC BY-SA 4.0。 |

---

## 1. 母音長

**判定: 一部異なる(◌ះ の扱いが誤り。他は確認済み)**

- クメール文字は母音の長短を(母音記号の選択と終子音の有無で)区別する。確認済み。
  - Wikipedia "Khmer script" の母音表: ា [aː]/[iːə]、ិ [ə],[e]/[ɨ],[i]、ី、ឹ、ុ [o]/[u]、ូ [oː]/[uː] など、長短で別記号。
- 「短母音の開音節は声門閉鎖を伴う」: 確認済み。ただし記号が違う。
  - **◌ៈ (yŭkoălpĭntŭ) が「短母音+声門閉鎖」**: Wikipedia "written after a consonant to indicate that it is to be followed by a short vowel and a glottal stop"。Wiktionary の実測: កៈ → [kaʔ]、គៈ → [kĕəʔ]。
  - **◌ះ (reăhmŭkh) は声門閉鎖ではなく末尾の /h/**: Wikipedia "adds final aspiration /h/"。実測: កុះ → [koh]、Module の母音表 `["ះ"] = {"ah","ĕəh"}`。
  - ADR は「声門閉鎖を伴う ◌ះ/◌ៈ」と併記している。**◌ះ は /h/ なので、短母音の開音節の書き分けには使えない**(日本語の「か」に ◌ះ を付けると「かh」になる)。
  - 他に、◌ិ ◌ុ は終子音なしの強勢音節で自動的に声門閉鎖を伴う: Wikipedia "a glottal stop is then added if the syllable is stressed"、実測 កិ→[keʔ] កុ→[koʔ] គិ→[kiʔ] គុ→[kuʔ]。つまり短い開音節の**現実的な書き方は ◌ិ ◌ុ ◌ៈ の3系統**。
- 「在来語の開音節は基本的に長母音」: 文献上は「強勢音節で母音が短いなら終子音が必須」(Wikipedia "Khmer language" §Syllable structure: "If the syllable is stressed and the vowel is short, there must be a final consonant.")。
  ここでの終子音に声門閉鎖 /ʔ/ を含めるなら ADR の書き方と整合する。**「基本的に長母音」は表現として概ね正しいが、弱音節(minor syllable、語頭の非強勢音節)は短母音で終子音なしが普通**(同ページ "The vowels in such syllables are usually short")。
  ADR は「短い開音節を長い開音節で書けば長音と区別が潰れる」としているが、弱音節では短いので、一語の中の位置によって扱いが変わる点が抜けている(1音節ずつのフレーズ表記では影響が出る可能性がある)。

## 2. 濁音・ふ・系列を変える記号

**判定: 確認済み(ADR の慣習的綴りは正しい)。付記あり**

慣習的綴り(Wikipedia "Khmer script" §Supplementary consonants の表と、Wiktionary モジュールの子音表):

| 音 | 綴り | 出典の記述 |
|----|------|-----------|
| g | ហ្គ (a系扱い?→下記注) / ហ្គ៊ (o系) | Wikipedia: ហ្គាស [ɡaːh] 'gas'(← gaz), ហ្គ៊ារ [giə] 'gare' |
| z / ʒ | ហ្ស / ហ្ស៊ | Wikipedia: [zɑː],[ʒɑː] |
| f | ហ្វ / ហ្វ៊ | Wikipedia: [fɑː],[ʋɑː]。កាហ្វេ [kaːfeː] 'café'、ហ្វ៊ីល [fiːl] 'film' |
| p | ប៉ | ប + ◌៉。ប៉័ង [paŋ] 'pain'(← pain) |
| b | ប | Wiktionary 実測 ប៉→[p], ប→[ɓ](a系の有声内破音), ប៊ា→[ɓiə](o系) |
| d | ដ | 実測 ដា→[ɗaː](a系の内破音) |

- **◌៉ (musĕkâtônd) と ◌៊ (treisăpt) の向き**(Wikipedia "Khmer script" §Diacritics、原文):
  - ◌៉: "used to convert some **o-series** consonants (ង ញ ម យ រ វ) **to a-series**"。加えて ប を /p/ にする。
  - ◌៊: "used to convert some **a-series** consonants (ស ហ ប អ) **to o-series**"。
  - つまり ◌៉=o系→a系、◌៊=a系→o系。ADR は「系列を変える ◌៉・◌៊ もある」とだけ書いていて向きは書いていない(誤りではない)。
  - 制約: ◌៉ を付けられるのは o系の共鳴音 ង ញ ម យ រ វ(と ប)だけ。ក៉ などは不可(Wiktionary で ក៉ា は出力なし)。◌៊ は ស ហ ប អ(と、ហ្គ៊ ហ្វ៊ ហ្ស៊ のような ហ+coeng 合成子音)だけ。**任意の子音の系列を切り替えられるわけではない**。
- **食い違い(要注意): ហ្គ の系列**
  - Wikipedia の表: ហ្គ = "hâ + kô"(合成子音) のフル値 [ɡɑː](**a系**)、ហ្គ៊ = [ɡɔː](**o系**)。
  - Wiktionary の実測: ហ្គា → [ɡiə](**o系読み**)、ហ្គ៊ា → [ɡiə]、ហ្គេ → [ɡei]、ហ្គោ → [ɡoː]。モジュールは `ហគ` を class 2(o系)として扱っている。一方 ហ្សា → [zaː](a系)、ហ្វា → [faː](a系)、ហ្ស៊ា → [ziə]、ហ្វ៊ា → [fiə] は Wikipedia と整合。
  - つまり **g だけ二資料の系列が逆**。母音 ា と組む「が」を ហ្គា と書くと、Wikipedia 読みでは [ɡaː]、Wiktionary モジュール読みでは [ɡiə]。ADR 決定7(a) の「読み戻し表」を Wiktionary から作ると、この差がそのままテストに入る。**ガ行はどちらの読みが標準かを Headley 等で確認する必要がある(未確認)**。
- ហ្វ は [f] と [ʋ] の両方がある(Wikipedia)。実測でも ហ្វ の出力は f。「ふ」/ɸ/ に近づける根拠は慣習的綴りだけで、音価は f。
- 日本語 つ /ts/ に慣習が無い、という ADR の記述: 今回の資料には ts に当たる補助子音は無い(Wikipedia の補助子音表は ហ្គ ហ្ន ប៉ ហ្ម ហ្ល ហ្វ ហ្ស など)。**確認できた範囲では整合**。

## 3. 促音(閉音節の末子音/coeng の重ね書き)

**判定: 確認済み(ADR の主張は正しい)。付記あり**

- 終子音になれる音: Wikipedia "Khmer language": "All consonant sounds except /b/, /d/, /r/, /s/ and the aspirates can appear as the coda"(語末に出る子音は1つだけ)。促音の近似に使える終子音は p t k(ប ត ក 等)。実測: កាប [kaːp]、កាត [kaːt]、កុប [kop]、កុត [kot]、កុក [kok]。
  - **付記**: 長母音 ា の後の ក は声門閉鎖になる。実測 កាក → [kaːʔ]、Wikipedia "letters representing a [k] sound ... are pronounced as a glottal stop [ʔ]" after certain vowels。「っか」を ក で書くと k でなく ʔ になりうる。
- 重ね書き(coeng による同子音の重複)が重子音として読まれない: 確認済み(**間接証拠**)。
  - Wiktionary の見出し ចិត្ត の発音は `{{km-IPA|ចិត}}`(重ね書きを単一の ត に書き換えて入力)、ពុទ្ធ は `{{km-IPA|ពុទ|ពុទ្ធៈ-}}`(ពុទ に書き換え)。すなわち編集者は重ね書きの読みを単子音として扱っている。Wikipedia "Khmer script" も "subscript consonants at the end of words ... are not pronounced"(語末の下付き子音は発音されない)。
  - 語中でも、Wikipedia の説明では coeng は「後続の子音を下付き形で書く」記号にすぎず、重子音を表す機能は述べられていない。**「重子音として読まれない」を明示した記述そのものは見つけられなかった**。上の Wiktionary の表記慣行からの推論であり、Headley/Huffman での直接確認は未了。
- **ADR に無い追加事項: 短母音記号は終子音の前で音が変わる**(促音・撥音の設計に直接効く)。
  - Wikipedia: ◌ិ は終子音なしなら [e]/[i]、終子音があれば [ə]/[ɨ] になる。実測: កិត [kət]、កិប [kəp]、កិន [kən]、គិន [kɨn]、គិត [kɨt]。◌ុ は a系で o、o系で u(実測 កុន [kon]、កុប [kop]、គុប [kup]、គុត [kut])。
  - つまり **日本語の「きん」「きっ」「くん」を ◌ិ/◌ុ+終子音 で書くと、い→[ə]/[ɨ] に化ける**。い を保つには ◌ី(o系 [iː]、a系 [əj/ej])を使うことになり、長さが変わる。促音・撥音の対応表の設計で問題になる。
  - また ◌េ は口蓋音終子音の前で [ə]/[ɨ] になる(Wikipedia、Wiktionary の `េ2`)。ចេ… のようなつづりで注意。

## 4. 拗音(coeng+យ)

**判定: 確認済み(系列規則で母音が変わる)。表記に軽微な違い**

- 頭子音クラスタの系列は「破裂音・摩擦音が共鳴音より優先」で決まる(Wikipedia "Khmer script" §Dependent vowels: "stops and fricatives are dominant over sonorants")。Wiktionary モジュールもこの規則(`fittest` の決定)を実装。
- 実測(Wiktionary `km-IPA`):

  | 綴り | 出力 | 系列 |
  |------|------|------|
  | ក្យា | [kjaː] | a系(ក は a系) |
  | ខ្យា | [kjaː] | a系(有気は j の前で無気化) |
  | ស្យា | [sjaː] | a系 |
  | ហ្យា | [hjaː] | a系 |
  | ប្យា | [pʰjaː] | a系 |
  | ព្យា | [pʰjiə] | o系 |
  | គ្យា | [kjiə] | o系 |
  | ម្យា | [mjiə] | o系(ម は共鳴音だが単独では o系) |
  | ន្យា | [njiə] | o系 |
  | ក្យូ | [kjou] | a系(◌ូ a系 = ou) |
  | គ្យូ | [kjuː] | o系 |
  | តូ-ក្យូ (Tokyo) | [tou.ˈkjou] | Wiktionary に「តូក្យូ」の見出しあり(実在の綴り) |

- **ADR の /pjiə/ との差**: ព្យា は o系で iə になる点は確認済みだが、Wiktionary の出力は **[pʰjiə]**(p の後の j の前で有気化するモジュールの規則)。表記の違いであって母音の主張には影響しない。
- 「a系頭子音+coeng+យ(例 ក្យា)」の読みは [kjaː](上表)。日本語の「きゃ」に近づけるなら a系の ក្យា、ただし母音は長い(短くするには ◌ៈ 等が要る。ក្យៈ は実測していない)。
- **日本語の拗音側の注意**: 日本語 キャ・キュ・キョ の j は口蓋化した子音+母音で、クメール語の /kj/ とは近いが同じでない。これは本調査の範囲外(音声比較が要る)。

## 5. 撥音(末子音 ម ន ង)

**判定: 確認済み(書ける)**

- 終子音として ម ន ង ញ(と ណ)が使える(Wikipedia "Khmer language" の coda 一覧に鼻音は含まれる)。実測: កាម [kaːm]、កាន [kaːn]、កាង [kaːŋ]。すべて別の音として書き分けられる。
- したがって「ん」を後続音の環境で ម(p/b/m の前)、ន(t/d/n/ら行の前)、ង(k/g の前)と選び分けることは、正書法の面では可能。
- ただし **ADR に書かれていない制約**: 3. で述べたとおり ◌ិ ◌ុ の直後では母音が変わるため、「い・う」+ん は綴りの選択が要る。また Wiktionary は ◌ុំ を [om]/[um]、◌ំ を [ɑm]/[um] とする(Wikipedia の表と一致)ので、「ん」を ◌ំ(ニクヒット)で書く手もあるが、これは母音も変わる(◌ំ は音節全体の母音を [ɑm] にする)。ម の終子音でなく ◌ំ を選ぶのは別の設計判断になる。

## 6. ら行

**判定: 確認済み**

- Wikipedia "Khmer language" §Phnom Penh: "The 'r', trilled or flapped in other dialects, is either pronounced as a uvular trill or not pronounced at all."(頭子音または子音クラスタの2番目の r について)。例 ត្រី [trəj]→[tʰəj]、រៀន [riən]→[ʀiən]。低い上昇調が付随する。
- したがって ADR の「プノンペン口語では頭子音 រ が弱化する」は正しい。標準クメール語の រ は「巻き舌または弾き音」(同ページ)。
- 実測: រ → [rɔː]、រ៉ → [raː]、រូ → [ruː]、រ៉ូ → [rou](o系の រ と ◌៉ で a系にした រ៉)。ល → [lɔː]、ឡ → [laː](a系の ឡ は借用専用の文字で ល の a系版)。
- 日本語のラ行 [ɾ]/[ɺ] には、弾き音の រ が音声的には近い。プノンペン話者に対して **ល が確実に発音される代替になる**。判断材料は上記のとおり(どちらを既定にするかは設計側の決定)。

## 7. う・え・お

**判定: 一部異なる(え の主張が資料と合わない)**

該当する記号の読み(Wikipedia = Huffman 由来の表、Wiktionary = `km-IPA` 実測):

| 記号 | a系 (Wikipedia) | o系 (Wikipedia) | a系 (Wiktionary実測) | o系 (Wiktionary実測) |
|------|-----------------|-----------------|---------------------|---------------------|
| ◌ុ | [o] | [u] | កុ [koʔ] | គុ [kuʔ] |
| ◌ឹ | [ə] | [ɨ] | កឹ [kə] | គឹ [kɨ] |
| ◌េ | [eː] | [eː] | កេ [keː] | គេ [kei] |
| ◌ោ | [ao] | [oː] | កោ [kao] | គោ [koː] |
| ◌ូ | [oː] | [uː] | កូ [kou] | គូ [kuː] |

- **「う」**: ◌ុ か ◌ឹ か の二択、という整理は妥当。ただし a系で ◌ុ は [o]、◌ឹ は [ə] で、**う の音には近くない**。o系にすれば ◌ុ=[u]、◌ឹ=[ɨ]。
  日本語の う /ɯ/ は非円唇に近いので、音声的には ◌ឹ o系 [ɨ] の方が近い、◌ុ o系 [u] は円唇が強い、という比較になる。これは調音上の一般論であって、**文献で「どちらが正しい」と確認したものではない**(要 音声での聞き比べ)。
- **「え・お」の ADR 記述**(「a系だと二重母音(◌េ, ◌ោ)になり o系(または ៊)が要る」)は、**お については正しく、え については資料と合わない**。
  - お: a系 ◌ោ は [ao](二重母音、Wikipedia/Wiktionary 一致)。o系 ◌ោ は [oː](一致)。したがって「お」を単母音 [oː] で書くには o系が要る。ここは ADR どおり。
  - え: a系 ◌េ は [eː](**単母音**、Wikipedia も Wiktionary も一致)。**a系のまま使える**。◌េ が二重母音 [ei] になるのは、Wiktionary モジュールの **o系**(គេ→[kei]、ជេ→[cei])。Wikipedia(Huffman 由来)は o系でも [eː] としており、**o系の ◌េ の読みは二資料で食い違う**。
  - まとめると、正確には「お: a系だと二重母音になるので o系または ◌៊ で o系化」「え: a系で [eː] になり問題ない。o系は資料によって [eː] または [ei]」。ADR のこの一文は書き直しが要る。
- 追加の候補: a系の ◌ូ は Wikipedia では [oː]、Wiktionary では [ou](実測 កូ→[kou])。

## 8. 系列ごとの母音記号の読み(標準的な表)と、あ〜お の候補

Wikipedia の表(Huffman 由来)を基本に、Wiktionary の実測で補う(食い違いは併記)。

| 記号 | a系 | o系 | 備考 |
|------|-----|-----|------|
| (なし・固有母音) | [ɑː] | [ɔː] | |
| ◌ា | [aː] | [iːə] | Wiktionary も aː / iə |
| ◌ិ | [e(ʔ)] / 終子音付き [ə] | [i(ʔ)] / 終子音付き [ɨ] | 開音節では声門閉鎖 |
| ◌ី | [ej] (Wikt: əj) | [iː] | |
| ◌ឹ | [ə] | [ɨ] | |
| ◌ឺ | [əː] (Wikt: əɨ) | [ɨː] | |
| ◌ុ | [o(ʔ)] | [u(ʔ)] | 開音節では声門閉鎖 |
| ◌ូ | [oː] (Wikt: ou) | [uː] | |
| ◌ួ | [uə] | [uə] | 両系列同じ |
| ◌ើ | [aə] | [əː] | |
| ◌ឿ | [ɨə] | [ɨə] | |
| ◌ៀ | [iə] | [iə] | |
| ◌េ | [eː] | [eː] (Wikt: ei) | 資料間で食い違い |
| ◌ែ | [ae] | [ɛː] | |
| ◌ៃ | [ej] (Wikt: aj) | [aj] (Wikt: ɨj) | 資料間で食い違い |
| ◌ោ | [ao] | [oː] | |
| ◌ៅ | [aɨ] | [əɨ] | |

**日本語 あ・い・う・え・お に最も近い組み合わせの候補**(音価の近さで並べたもの。文献で決まる事項ではなく、対応表を作る際の候補)

| かな | a系子音(例 ក ស ហ ដ ប ត) | o系子音(例 គ ទ ម ន រ វ ជ) |
|------|--------------------------|---------------------------|
| あ | ◌ា [aː](長)、◌ៈ [aʔ](短)、◌័+終子音 [a] | ◌ា は [iːə] になるので不可。◌ៈ は [ĕəʔ] で不可。**o系子音で あ は作れない**(◌៉ で a系化した ម៉ា ល៉ា 等が必要) |
| い | ◌ិ [eʔ] は い に遠い。◌ី [əj/ej] も遠い。◌៊ で o系化した ស៊ី [siː] が候補 | ◌ី [iː](長)、◌ិ [iʔ](短)。終子音の前では ◌ិ が [ɨ] に化ける |
| う | ◌ុ [o]、◌ឹ [ə] はどちらも遠い。ស៊ុ [suʔ]、ស៊ឹ [sɨ] のように ◌៊ で o系化 | ◌ឹ [ɨ]、◌ុ [u(ʔ)]、◌ូ [uː](長) |
| え | ◌េ [eː](長)。**a系のままで問題ない** | ◌េ は [eː] または [ei](資料差)。◌ែ [ɛː] は え より開く |
| お | ◌ោ [ao] は二重母音で不可。◌ុ [o(ʔ)](短、あいまい)、◌ូ [oː]/[ou](資料差)。◌៊ で o系化した ស៊ោ [soː] | ◌ោ [oː](長) |

- あ行で **a系/o系のどちらかだけで5母音を揃えることはできない**(あ は a系、い う お は o系寄り、え は a系)。同じ「か行」でも か=ក+◌ា、き=គ+◌ី、く=គ+◌ឹ/◌ុ、け=ក+◌េ、こ=គ+◌ោ のように、**子音字が音ごとに ក/គ に分かれる**設計になる。
- 短母音の系統は ◌ៈ/◌ិ/◌ុ。長音(ー)と区別する場合は 1. のとおり。

## 9. Unicode 上の技術事実

**判定: 確認済み**(取得元 https://www.unicode.org/Public/UNIDATA/UnicodeData.txt と Scripts.txt(版 18.0.0、日付 2026-06-29))

- **上付き文字(modifier letter)は結合文字ではない**。
  - ʰ U+02B0、ʲ U+02B2、ʳ U+02B3、ʷ U+02B7、ˡ U+02E1 は General Category = **Lm**、Canonical Combining Class = **0**。上付き ᵑ = U+1D51 MODIFIER LETTER SMALL ENG (Lm, ccc 0)。ˀ = U+02C0 MODIFIER LETTER GLOTTAL STOP (Lm, ccc 0。互換分解なし)。ⁿ = U+207F SUPERSCRIPT LATIN SMALL LETTER N (Lm)。
  - Script プロパティは Latin(02B0–02B8, 02E0–02E4, 1D2C–1D5C, 1D9B–1DBE, 107xx)、ただし 1D5D–1D61(β γ δ φ χ)は Greek。
  - したがって **符号化の上では、クメール文字の任意の書記音節の後ろに置ける**(Unicode の結合文字ではない)。
  - **確認できず**: 実際の描画で書記音節にどう付くか。クメール文字のシェイピングは書記音節のクラスタ単位で行われ、Latin 文字はクラスタに含まれない。ADR の「クメール文字の行分割との相互作用」「HarfBuzz との干渉」は実機・実フォントの確認事項で、文献だけでは確認できなかった。
- **ç・ɾ に上付きの Unicode 文字があるか**(UnicodeData の `<super>` 互換分解を逆引き):

  | IPA | 上付き | 備考 |
  |-----|--------|------|
  | ç (U+00E7) | **無い** | "MODIFIER LETTER SMALL C WITH CEDILLA" 等は存在しない。近い形は U+1D9D ᶝ (ɕ の上付き、C WITH CURL) と U+1DFFA(C WITH HOOK)で、ç とは別の音 |
  | ɾ (U+027E) | **ある: U+107A9** MODIFIER LETTER SMALL R WITH FISHHOOK | Unicode 14 で追加(Latin Extended-F 系)。フォント対応は要確認(新しい文字なので古い環境で欠ける可能性が高い) |
  | ɸ (U+0278) | ある: U+1DB2 ᶲ | |
  | ɯ (U+026F) | ある: U+1D5A ᵚ (TURNED M) | |
  | ɲ (U+0272) | ある: U+1DAE ᶮ | |
  | ŋ (U+014B) | ある: U+1D51 ᵑ | |
  | ʔ (U+0294) | 互換分解付きは無し。ただし U+02C0 ˀ (GLOTTAL STOP) は存在 | ˀ は音声学では声門化の記号としても使う |
  | ɡ (U+0261) | ある: U+1DA2 ᶢ | |
  | ɕ (U+0255) | ある: U+1D9D ᶝ | |
  | ʑ (U+0291) | ある: U+1DBD ᶽ | |
  | ʃ (U+0283) | ある: U+1DB4 ᶴ | |
  | ʒ (U+0292) | ある: U+1DBE ᶾ | |
  | β (U+03B2) | ある: U+1D5D ᵝ | |
  | ɓ ɗ | ある: U+10785, U+1078C | |
  | z | ある: U+1DBB ᶻ | |

  ADR の「ç・ɾ は未確認」への答え: **ç は無い、ɾ は U+107A9 がある**。ç が無いので、ひ /ç/ の右肩表記は代替(例 ʰ や ɕ の上付き ᶝ)を設計書で決める必要がある。
- **声調文字 U+02E5–U+02E9**: 名称 MODIFIER LETTER EXTRA-HIGH / HIGH / MID / LOW / EXTRA-LOW TONE BAR。**General Category = Sk**(Lm ではない)、Canonical Combining Class = 0、Bidi = ON、Script = **Common**。結合文字ではなく独立した文字で、任意の文字列の後ろに置ける。ADR 決定6の記述(独立した文字、どの文字列の後にも置ける)と一致。Script が Common なので、クメール文字の直後に置いてもスクリプトの区切りにはならない(フォールバックは前後のフォント選択に依存)。
- 参考: クメール文字側は U+17D2 COENG が Mn、ccc = **9**(ヴィラーマ)、U+17C9 MUUSIKATOAN と U+17CA TRIISAP は Mn、ccc 0。これらは結合文字。

## 10. Wiktionary のアクセントとライセンス

**判定: 英語版は確認済み(東京式の型番号あり)。日本語版は「使えない」ことを確認**

- **英語版 `ja-pron`**:
  - `{{ja-pron|さくら|acc=0|acc_ref=DJR}}`(桜)、`{{ja-pron|ねこ|acc=1|acc_ref=...,DJR,NHK}}`(猫)、`{{ja-pron|みず|acc=0|acc_ref=DJR}}`(水)、`{{ja-pron|only_show_acc=true|acc=2|acc_ref=DJR}}`(ありがとう)のように、**`acc=` に東京式の型番号(0=平板、1=頭高、n=第n拍の後で下がる)**を書く。
  - Module:ja-pron のカテゴリ生成は「Heiban / Atamadaka / Nakadaka / Odaka / complex pitch accent (Tōkyō)」で、東京式と明記。出典コード(`acc_ref`)は DJR(大辞林)、DJS(大辞泉)、NHK(NHK日本語発音アクセント)、KDJ(国語大辞典)、SMK(新明解)、ZAJ(全国アクセント辞典)、JAC(JAccent)などに対応。複数アクセント(`acc`, `acc2`)、地域(`acc_loc`)、注記(`acc_note`)の指定もある。
  - **coverage**(API で取得したカテゴリ件数): "Japanese lemmas" 127,289、"Japanese terms with IPA pronunciation" 59,710、うちアクセントあり 44,896、**アクセント欠落 15,854**。`insource:"ja-pron" insource:"acc="` の全文検索でも約 44,004 ページ。つまり **IPA 発音ページの約 75% にアクセントがある一方、全見出し語の約 35% 程度**(旅行フレーズの語彙に限れば高い可能性があるが、未測定)。
  - ありがとう のように `{{ja-pron}}`(アクセント無し)の行と `{{ja-pron|only_show_acc=true|acc=2}}` を別の行に書いていて、**同じページ内でも構造が揃っていない**。ダンプから機械抽出するには `acc` の位置・複数値・`only_show_acc` を扱う必要がある。
  - **語単位である**(句の合成規則は無い)。ADR の記述(Wiktionary は語単位)と一致。助詞付きの形は出ない(型番号から導く)。
- **日本語版 Wiktionary**:
  - 使えない。`{{ja-accent-common|...}}` が使われるが、**`region=京阪` が 7,234 件、`region=東京` が 1 件**(全 7,276 件中)。東京式のデータ源にならない。実例: さくら は `{{ja-accent-common|region=京阪|h||さくら}}`(京阪式の平板)。桜 のページにはアクセントの記載なし。
  - ADR の「日本語版は未確認。どちらの版を使うかは特定する」への答え: **英語版**。
- **ライセンス**(公表されている規約の事実。法的助言ではない):
  - 英語版・日本語版とも、サイトの権利表示は "Creative Commons Attribution-Share Alike 4.0"(MediaWiki API `siprop=rightsinfo` の返答)。
  - Wiktionary:Copyrights: "The original texts of Wiktionary entries are dual-licensed ... under both the Creative Commons Attribution-ShareAlike 4.0 International License (CC-BY-SA) and the GNU Free Documentation License (GFDL)"(同ページ冒頭に「2002年のもので古い」との注意書きあり)。https://en.wiktionary.org/wiki/Wiktionary:Copyrights
  - Wikimedia Terms of Use §7(https://foundation.wikimedia.org/wiki/Policy:Terms_of_Use): 帰属表示は次のいずれか — (1) 記事へのハイパーリンクまたは URL、(2) ライセンスに適合する別の安定した公開コピーへのリンク、(3) 著者一覧。share-alike については "license the modified or added content under CC BY-SA 4.0 or later"。
  - 同 Terms of Use の記述: 寄稿者はデータベース権を放棄し、"facts you contribute to the projects may be reused freely without attribution"(CC BY-SA 4.0 のデータベース権に関する扱い)。**事実そのもの(この語の型番号は 0)と、編集された文章・表現の区別が、取り込み方の判断に関わる**(この区別をどう適用するかは法的判断であり、本調査では判断しない)。
  - 取り込みの実務上の論点として挙げられるもの(規約の条文からの整理): (a) 出典として引く Wiktionary の各見出し語 URL の表示(または著者一覧)を配布物に含める、(b) 取り込んだデータを改変・追加した派生物を CC BY-SA 4.0 以降で提供する、(c) `acc_ref` に挙がる辞書(大辞林・NHK 等)の著作権は Wiktionary のライセンスとは別(引用・参照の形を取っているだけで、それらの本文は再配布されていない)。(c) は規約に明記された文言ではなく、Wiktionary:Copyrights の "external sources with different copyright terms" の節の趣旨からの推測。

## ADR-0010 に反映すべき点(食い違いの一覧)

1. コンテキスト「母音長」: 「◌ះ/◌ៈ」のうち ◌ះ は声門閉鎖ではなく末尾 /h/。短い開音節の記号は ◌ៈ と、◌ិ ◌ុ(終子音なしで自動的に声門閉鎖)。
2. コンテキスト「う・え・お」: え(◌េ)は a系でも [eː] で二重母音ではない(o系で [ei] になるとするのは Wiktionary のみ)。二重母音になるのは お(a系 ◌ោ [ao])と、a系の ◌ូ [ou]。
3. コンテキスト「濁音・ふ」: ◌៉ は o系→a系、◌៊ は a系→o系。ហ្គ の系列は Wikipedia(a系)と Wiktionary モジュール(o系読み)で食い違うので、ガ行は標準読みの確認が要る。
4. コンテキスト「拗音」: ព្យា は [pʰjiə]。a系 ក្យា は [kjaː](長母音)。
5. 決定3「ç・ɾ は未確認」: ç は上付き文字が無い、ɾ は U+107A9 がある(Unicode 14 の新しい文字)。
6. 決定2: 日本語版 Wiktionary は京阪式が大半で東京式は 1 件のみ。英語版 `ja-pron` の `acc=` を使う。アクセントのカバレッジは IPA 発音ページの約 75%(全見出しでは約 35%)。
7. 追加(ADR に無い): ◌ិ/◌ុ は終子音の前で [ə]/[ɨ]/[o] に化けるため、「きん・くん・きっ」の対応表に影響する。
8. 追加(ADR に無い): 弱音節(語頭の非強勢音節)では短母音が普通で、開音節の長短の扱いが位置で変わる。

## 確認できなかった事項

- Huffman・Headley 本文との直接照合(二次資料経由のみ)。
- ហ្គ の標準的な系列読み(Wikipedia と Wiktionary で逆)。
- o系の ◌េ の標準読み([eː] か [ei] か)。
- 「重ね書きが重子音として読まれない」の明示的な記述(表記慣行からの推論)。
- Latin の上付き文字がクメール文字の書記音節の直後で描画・改行・シェイピングにどう影響するか(実機の `glyph-check` 事項)。
- 日本語 う /ɯ/ に ◌ុ と ◌ឹ のどちらが近いかの音声的判断(音声聞き比べが必要)。
- 旅行フレーズ語彙での Wiktionary アクセントのカバレッジ(未測定)。
