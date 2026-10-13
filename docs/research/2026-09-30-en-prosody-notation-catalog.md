# 英語プロソディ表記法カタログ(字幕重ね表示のための材料集め)

調査日: 2026-09-30 / 目的: 英語字幕(YouTube)に語強勢・核・ピッチの動き・句境界・リズム・弱形/連結を重ねて表示する Chrome 拡張の「表示記法」を新設計するために、既存の記法を洗い出して比較する。
出発点: `chatgpt-english-intonation.txt`(ChatGPT の調査結果。未検証)。本書はその主張を引用元に当たって検証し、誤りは訂正する。

## 0. 読み方

### 0.1 確認の強さの凡例

| タグ | 意味 |
|---|---|
| (確認済み) | 実際にそのURLを取得し、本文を読んで確認した。URL を併記する。 |
| (二次) | 検索結果の要約、Wikipedia、他者の解説など。一次資料そのものは読んでいない。 |
| (一般知識・未確認) | 筆者の一般知識。今回は確認できていない。 |
| (筆者の適用例) | 公式文献の例ではなく、筆者が各記法の規則を当てはめて書いたもの。録音にもとづかない。記法の読者が別の読みをしても不思議はない。 |
| (筆者評価) | 表示用途への適性など、筆者の判断。事実ではない。 |

### 0.2 取得できなかったもの(誤読を避けるため明記)

- Columbia の ToBI 規約 PDF (`https://www.cs.columbia.edu/~jjv/pubs/tobi_convent.pdf`): 取得はできたが、スキャン画像で文字が抽出できなかった。内容は未確認。ChatGPT が引いた箇所(tier 構成、トーンラベル)は、代わりに別の一次寄り資料(MIT OCW の ToBI チュートリアル、Breen et al. の論文)で確認した。
- Macquarie 大学の ToBI 教材、Roach の教科書本文、Wells の本(Cambridge 抜粋)、Kingdon の書評ページ、ResearchGate、Brazil / Bolinger / Crystal / O'Connor & Arnold / Cauldwell の原著: 取得失敗(403、SSL エラー、PDF の抽出不能など)。これらについては検索結果の要約だけを根拠にした箇所を (二次) と書く。
- IPA 公式サイトのページは記号の一覧を含んでいなかった。IPA 記号は、Wikimedia Commons にある 2020 改訂版のチャート PDF から確認した。
- 商用アプリ(ELSA 等)の画面表示の詳細は確認できていない。

## 1. ChatGPT の記述の検証結果

| # | ChatGPT の記述 | 検証結果 | 根拠 |
|---|---|---|---|
| 1 | ToBI の Break Index 2 は「やや強い切れ」 | 誤り(または不正確)。2 は二重の定義を持つ。「句アクセント/境界トーンが無いのに延長や大きな断絶がある」場合と、「句アクセント/境界トーンがあるのに延長が無い」場合の両方に使う。単調な強さの目盛りではなく、通称 "garbage pail category"。 | 確認済み: Breen et al. `https://tedlab.mit.edu/tedlab_website/researchpapers/Breen_et_al_InPress_CLLT.pdf`(§1.1.2 と脚注3) |
| 2 | Break 0 は「強く結合」 | 大筋は合うが、定義は「ほぼ消えた境界」。did you → didja のような縮約・接語化の例が挙げられている。MIT OCW は「境界が消えたように見える/判定不能」としている。 | 確認済み: 上記 Breen et al.、および `https://ocw.mit.edu/courses/6-911-transcribing-prosodic-structure-of-spoken-utterances-with-tobi-january-iap-2006/77b02caef3fe12c5bc44c3901d3eade6_chap2_0and2_1.pdf` |
| 3 | Break 3 = intermediate phrase、4 = intonation phrase | 概ね正しい。ただし「3 は句アクセントを付ければ必ず付ける」「4 は句アクセント+境界トーンの組があれば必ず付ける」という規則があり、知覚上の切れの強さとずれることがある。 | 確認済み: Breen et al.(§1.1.2) |
| 4 | ToBI の tier は「orthographic / tone / break-index / miscellaneous」 | 正しい。 | 確認済み: Breen et al.、および `https://en.wikipedia.org/wiki/ToBI`(二次) |
| 5 | ToBI には核を書く専用記号が無く、句内の最後の pitch accent が核(nuclear accent)になる | 方向は正しい。ただし今回、「ToBI の規約自体に核の定義がある」ことは確認できていない。Macquarie の教材(検索結果の要約のみ、ページは 403)が「句内の最後のアクセントのある語が nuclear accented」と述べている、というところまで。 | (二次) 検索結果の要約。Macquarie ページ本文は未取得 |
| 6 | ToBI は「機械処理 ◎」で、内部データモデルとして最重要 | 過大評価。人間のラベラー間でも、pitch accent の有無は約 91%、型の分類は約 61%、intermediate phrase の検出は約 50% の一致にとどまる。AuToBI の他コーパスへの適用では accent 検出 73.5%、型分類 69.8%、intermediate phrase 境界は F1 0.181 と低い。wav2vec 2.0 の微調整で accent の有無(単語単位)は 89.5% (BURNC)。「有無」はある程度取れるが、型と中間句境界は不安定。自動化しやすさは記法の選び方に強く依存する(節 4 参照)。 | 確認済み: Rosenberg (Interspeech 2010) `https://www.isca-archive.org/interspeech_2010/rosenberg10_interspeech.pdf`、Yuan et al. `https://arxiv.org/pdf/2108.01122` |
| 7 | 英語のリズムは ToBI で表せず、別記法が必要 | 半分正しい。ToBI にリズム(beat)の tier は無い。しかし RaP は「リズム tier」(強/弱 beat と句境界)を持つ。ChatGPT の調査には RaP が入っていなかった。 | 確認済み: Breen et al.(Table 1, §1.2) |
| 8 | 「Pronunciation Pyramid」(ユーザー指示の名称) | 文献上の名称は Gilbert の Prosody Pyramid。底辺=thought group、その中の focus word、その中の主強勢音節(peak / nucleus とも呼ぶ)という 4 段の概念図。記号体系ではなく、何を教えるかの階層。 | 確認済み: `https://faculty.pencol.edu/esl/wp-content/uploads/sites/5/2014/Teacher%20Resources/teaching-pronunciation-using-the-prosody-pyramid.pdf` |
| 9 | thought group: `/` = 境界、`//` = より強い境界 | `//` の意味は流儀によって違う。Halliday 系・Brazil 系では `//` は tone group / tone unit の境界そのもの。今回確認した教育教材(Baruch)は単一の `/` のみ。「`//` が強い境界」は普遍の慣習ではない。 | 確認済み: Brazil 章 `https://www.press.umich.edu/pdf/9780472030187-chp2.pdf`、Tench `https://www.paultenchdocs.co.uk/wp-content/uploads/2013/08/A-Systemicfunctional.pdf`、`https://tfcs.baruch.cuny.edu/thought-groups/` |
| 10 | Brazil 方式は「矢印+大文字+任意の音高レベル」 | 大文字(prominent 音節)と `//`(tone unit 境界)は確認できた。矢印は確認できていない。Brazil の tone は p / p+ / r / o の文字で書かれる、と Tench が述べている(p=fall、p+=rise-fall、r=fall-rise、o=oblique)。矢印は IPA や Tench の `↑` の記述であって、Brazil のものとは限らない。 | 確認済み: Brazil 章、Tench(上記)。矢印については未確認 |
| 11 | 「比較研究で Brazil 方式の視覚的分かりやすさが評価された」 | 引用元(ChatGPT の index 10)が不明で、該当する研究を特定できなかった。 | 未確認 |
| 12 | Kansas の教材の `[why would you go to SCHOOL]` 形式 | 検索しても該当教材を特定できなかった。 | 未確認 |
| 13 | IViE は「prominence の位置 / 周囲の pitch pattern / intonational phonology」の 3 層 | 正しい。ただし第 1 層は「聞こえのまま」ではなく「リズム上強い音節(P)の位置」で、アクセントが付くかどうかとは別に決める。第 2 層は音節ベースの音声的ターゲット(大文字 H/M/L は強い音節、小文字 h/m/l は弱い音節)、第 3 層は音韻ラベル(`H*L`、`L*H`、`!H*L`、境界の `H%`/`L%`/`%`)。 | 確認済み: `https://www.phon.ox.ac.uk/files/apps/old_IViE/guide.html`、`https://www.phon.ox.ac.uk/files/apps/IViE/snap.html` |
| 14 | IPA: ˈ ˌ | ‖ ↗ ↘ | 正しい。IPA チャート(2020)の該当欄: ˈ primary stress / ˌ secondary stress / `\|` minor (foot) group / `‖` major (intonation) group / `.` syllable break / `‿` linking (absence of a break) / ꜛ upstep / ꜜ downstep / ↗ global rise / ↘ global fall。加えて tone letters(˥˦˧˨˩)と contour 用の組み合わせがある。 | 確認済み: `https://upload.wikimedia.org/wikipedia/commons/a/a8/IPA_chart_2020.pdf` |
| 15 | British School の系譜は Palmer → Kingdon → O'Connor & Arnold → Halliday → Roach | 単純化しすぎ。Palmer (1922)、Kingdon (1939 の Tonetic Stress Marks、1958 の Groundwork) は確認できた。Halliday (1967) は systemic-functional の系統で、記法も別(`//`+tone 番号 1〜5)。Crystal (1969) は別の体系。一直線の継承ではない。 | (二次) 検索結果の要約、Wikipedia(`https://en.wikipedia.org/wiki/Intonation_(linguistics)`)。Halliday の記法は Tench で確認済み |
| 16 | British School の構造は Pre-head → Head → Nucleus → Tail | 正しい。 | 確認済み: Tench(pretonic=head+pre-head、tonic segment=tonic+tail)、Wikipedia |

ChatGPT の整理で特に効いている点は、(a) 表示層と内部データを分けるべきだ、(b) 複数記法の良い部分を集める、という方針。これは今回の調査でも支持される(節 5)。一方、ChatGPT の評価表(◎○△)は根拠が示されておらず、そのまま採用しない。

## 2. 比較に使う例文

録音はない。以下は「標準的な米国英語で、読み上げ調の自然な発話」を筆者が仮定した一つの読み。別の読みも成り立つ(特に S2、S3 の句境界と核の位置)。

| ID | 文 | 含まれる現象 |
|---|---|---|
| S1 | Did you want to go to the store? | Yes/No 疑問(文末上昇)。did you → didja、want to → wanna、to the → 弱形 |
| S2 | We need eggs, milk, and a loaf of bread. | 列挙(非最終項は上昇/継続、最終項は下降)。a loaf of → 連結と弱形 |
| S3 | I asked for the blue one, not the green one. | 対比強調(blue と green に核)。one は後核で脱アクセント。asked for → 連結 |
| S4 | I'd have told him if I'd known. | 平叙(下降)。I'd have → I'd've、told him → h 脱落、弱形 |

仮定した読み:

- S1: 単一の intonation phrase。prominent は WANT(弱)、GO、STORE。核は STORE。全体に上昇調で終わる。
- S2: 列挙。eggs と milk で上昇(継続)、bread で下降。核は各項目(EGGS / MILK / BREAD)。
- S3: 2 つの句。BLUE で核(上昇または下降上昇で継続)、GREEN で核(下降)。
- S4: 単一の句で核は KNOWN、TOLD は先行する強い音節。

## 3. 記法ごとのカタログ

各記法について「何か」「表記例」「評価(表せる/表せない/訓練/自動化/Unicode)」をまとめる。例文の表記はすべて (筆者の適用例)。公式文献の例は、確認できたものだけ「公式例」と明記して別に示す。

### 3.1 British School(tone-unit / 核音調の伝統)

概要 (確認済み: Wikipedia `https://en.wikipedia.org/wiki/Intonation_(linguistics)`、Tench):

- 構造: pre-head → head → nucleus(tonic)→ tail。Halliday は tonality(区切り)・tonicity(核の位置)・tone(核音調の選択)の「3 つの T」で整理。
- 核音調は fall / rise / fall-rise / rise-fall など少数。Halliday は 5 つの基本音調(Tone 1=fall、2=rise、3=low rise、4=fall-rise、5=rise-fall)を立てる。Tone 1 は「極性既知」で平叙の無標形、Tone 2 は「極性未知」で Yes/No 疑問の無標形 (二次: 検索結果の要約)。
- 系譜(二次): Palmer 1922 "English Intonation (with systematic exercises)"、Kingdon 1939 "Tonetic Stress Marks for English" と 1958 "Groundwork of English Intonation"(tonetic stress marks は、主強勢と核音調の開始点を同時に示す記号)、O'Connor & Arnold の 10 種の tone group、Crystal 1969、Roach、Wells 2006。
- 公式例として確認できたもの:
  - Wikipedia の例: `We ˌlooked at the ↗sky | and ˈsaw the ↘clouds`(ˌ ˈ ↗ ↘ `|`)。
  - Coleman の例(Kingdon/O'Connor/Arnold の tonetic stress marks を使用): `Here's a word you can lûp` / `Bond had instructions to léàve` / `Have you seen any Mârtians, who have green nôses?`(音節の母音上に傾き記号を付け、核音調の種類と位置を同時に示す。出典: `https://www.phon.ox.ac.uk/jcoleman/intonation.htm`)。
  - Tench の例(Halliday 系): `| Spain won the World \Cup |`(`\`=fall、`/`=rise、`\/`=fall-rise、`/\`=rise-fall、核音節の直前に置く。`|`=unit 境界)、`| Spain won the World ↑/Cup |`(`↑`=raised rise)、低い・高い pretonic は記号の下線・上線で示す。
- Roach の記法: 核音調の記号(fall / rise / fall-rise / rise-fall / level)や頭部の記号を持つとされるが、字形は取得できず未確認。Wells も「ダイアクリティクスで強勢位置とピッチの動きを示し、核から動きが始まる」という説明のみ(二次)。Brazil・O'Connor & Arnold のドット方式(「2 本の線の上に大きな点・小さな点」)は一般知識としては知っているが、今回は未確認。

例文(筆者の適用例)。3 つの流儀の代表形で書く。各行の字形は「確認できた公式例の字形を借りた」もの。Roach・Wells・O'Connor & Arnold そのままの字形ではない。

```
【IPA 記号+矢印型(Wikipedia の例と同じ記号)】
S1  | did you ˈwant to ˈgo to the ↗store |
S2  | we ˈneed ˈeggs ↗ | ˈmilk ↗ | and a ˈloaf of ↘bread |        (列挙は 3 単位に分けた読み)
S3  | I ˈasked for the ↘blue one | not the ↘green one |           (blue は継続を示す fall-rise にもなりうる)
S4  | I'd have ˈtold him if I'd ↘known |

【Halliday/Tench 型(tone 番号なし、`\` `/` を核の直前に)】
S1  | did you want to go to the /store |
S2  | we need /eggs | /milk | and a loaf of \bread |
S3  | I asked for the \/blue one | not the \green one |
S4  | I'd have told him if I'd \known |

【構造ラベル型(pre-head / head / nucleus / tail の区切り。記法というより分析)】
S3  [pre-head: I] [head: ASKED for the] [nucleus: BLUE] [tail: one] | [head: not the] [nucleus: GREEN] [tail: one]
```

評価 (筆者評価):

| 観点 | 評価 |
|---|---|
| 表せる | 語強勢、核の位置、核音調(fall/rise など少数のカテゴリ)、head/tail、tone unit 境界。核を最も直接的に示す。 |
| 表せない | 境界の強さの段階、ピッチレンジや key、リズムの拍、弱形や連結、ピッチの連続値。 |
| 訓練 | 小〜中。矢印型は直感的。tonetic stress mark(母音上の傾き記号)は凡例を覚える必要あり。Halliday の tone 番号は中。 |
| 自動化 | 難〜中。核の位置(=最後の prominent)と核音調(数カテゴリ)を推定する必要があり、ToBI 的ラベルからの写像で作れるが、型の推定は不安定(節 1 の #6)。 |
| Unicode | 矢印(↗ ↘ U+2197/2198)と ˈ ˌ(U+02C8/02CC)は標準の記号。`\` `/` は ASCII。母音上の傾き記号は合成文字で書けるが、フォント依存が出る(一般知識・未確認)。 |

### 3.2 Bolinger

- 概要 (二次: 検索結果の要約): 著書 "Intonation and Its Parts"(1985/86)、"Intonation and Its Uses"(1989)。profile A / B / C(A は「分離」、B は「一体」、C は「新しさ・対比」の意味)を最小の形態素的単位とする。例示は「語を上下にずらして書き、ピッチ曲線を描く」図(いわゆる "squiggly lines"、楽譜風)で行う。
- 例文: 原著の例が取得できなかったため、文字表記では再現しない。ASCII 風の擬似例は下の比較表で「楽譜風」の行にまとめる。
- 評価 (筆者評価): 表せるのは語ごとの上下と曲線の形、アクセント型の意味対比。読み手の訓練は小(見れば分かる)。自動化は「曲線の描画」だけなら易だが、「profile A/B/C に分類する」のは研究課題で難。表示には Unicode だけでは足りず、字幕の行の上下に語をずらす、またはSVG/Canvasの重ね描きが必要。

### 3.3 Brazil / Discourse Intonation

- 概要 (確認済み: Brazil 章 `https://www.press.umich.edu/pdf/9780472030187-chp2.pdf`(U. Michigan Press の書籍の第2章。著者名は取得テキストから読み取れず未確認)、Tench):
  - 単位は tone unit、境界は `//`。prominent 音節は大文字(語レベルの強勢音節を CAPS、発話レベルで選ばれたものを太字+CAPS)。例: `// What I wanna do toDAY // is give you an Overview of WOmen and WORK //`。最後の prominent 音節が tonic(核)。
  - 選択体系は prominence / tone / key / termination の 4 つ。key(onset 音節の高さ)と termination(tonic の高さ)はそれぞれ high / mid / low の 3 段階。
  - tone の文字表記(Tench の対応づけ): p(proclaiming)=fall、p+=rise-fall、r(referring)=fall-rise、o(oblique)=中位の level。p は Halliday の Tone 1、p+ は Tone 5、r は Tone 4 に対応。r+(上昇)は今回未確認。
  - 機能: tone の選択を「新情報/既知情報」「話し手と聞き手の関係」で解釈する(二次)。
- 例文(筆者の適用例。tone は確認できた p / r のみ使用):

```
S1  // did you WANna GO to the STORE //          (tone: 上昇。文字記号は未確認のため省略)
S2  // we need EGGS // MILK // and a loaf of BREAD //
S3  // I asked for the BLUE one (r) // not the GREEN one (p) //
S4  // I'd have TOLD him if I'd KNOWN (p) //
```

- 評価 (筆者評価): 表せるのは prominence(大文字)、tone unit、tone(少数の文字)、key/termination の高さ。表せないのはリズム、弱形、ピッチの連続値。訓練は小(大文字と `//` だけなら即座に読める)。自動化は中(prominence と tone unit は推定できる。key/termination は話者依存)。Unicode だけで足りる(ASCII の大文字と `//`)。字幕の「大文字」は可読性が下がるため、太字や色に置き換える余地がある。

### 3.4 ToBI(MAE_ToBI)

- 概要 (確認済み: Breen et al. `https://tedlab.mit.edu/tedlab_website/researchpapers/Breen_et_al_InPress_CLLT.pdf`、MIT OCW `https://ocw.mit.edu/courses/6-911-transcribing-prosodic-structure-of-spoken-utterances-with-tobi-january-iap-2006/77b02caef3fe12c5bc44c3901d3eade6_chap2_0and2_1.pdf`):
  - 4 つの tier: words / tones / break indices / miscellaneous。波形と F0 に時間整列する。
  - tones tier のラベル: pitch accent は H*、L*、L+H*、L*+H、H+!H*、!H*、L+!H*。句アクセントは H-、L-、!H-(intermediate phrase の終わり)。境界トーンは H%、L%。句末の組は L-L%、H-H%、L-H%、H-L%、!H-L%(`*`=アクセント付き音節に付くトーン、`-`=句アクセント、`%`=境界トーン)。
  - break index: 0(接語・縮約、didja)、1(通常の語境界)、2(二重定義、節 1 の #1)、3(intermediate phrase)、4(intonation phrase)。`-` を付けて「弱め/不確実」を示せる。
  - MAE_ToBI は H+L* を H+!H* に改め、!(ダウンステップ)版を追加した (二次: 検索結果の要約)。
  - 核は専用記号が無く、句内の最後の pitch accent が核(節 1 の #5)。
  - 公式例(OCW): `nominated` に `H*` と `L-L%`、break は語間 1・文末 4、did you → didja の語間に 0。
- 例文(筆者の適用例。1 つの読みに対する 1 つのラベル付け。ラベラー間の一致度は型で約 61% なので、別の付け方も普通に起こる):

```
S1  Words:  did  you  want  to   go   to   the  store
    Tone:                          H*                L* H-H%
    Break:   0    1    0     1    1    1    1    4
    (want to → wanna なので want と to の間を 0 とした。"go" に H*、核 "store" に L* H-H%)

S2  Words:  we  need  eggs        milk        and  a   loaf  of   bread
    Tone:              H* H-       H* H-                            H* L-L%
    Break:   1    1     3            3         1   0    1    1     4
    (列挙の非最終項を intermediate phrase で区切る読み。"a loaf of" は a の直後を 0 とした)

S3  Words:  I  asked  for  the  blue        one      not  the  green       one
    Tone:          H*                L+H*     L-H%                L+H*      L-L%
    Break:  1    1    1    1    1      4        1    1     1       4

S4  Words:  I'd  have  told        him  if   I'd  known
    Tone:                H*                           H*  L-L%
    Break:   0    1     0    1    1    1     4
```

- 評価 (筆者評価):

| 観点 | 評価 |
|---|---|
| 表せる | pitch accent の型、句の階層(2 段階)、境界の段階、接語化(0)。機械可読な tier 構造。 |
| 表せない | リズム(beat)、弱形・連結の実現形(break 0 が間接的に示すだけ)、ピッチの連続値、核の明示。 |
| 訓練 | 大。チュートリアルと規約があり、ラベル付けには訓練が要る。読み手(学習者)にはほぼ読めない。 |
| 自動化 | 中〜難。accent の有無は約 9 割に届くが、型と中間句の境界は弱い(節 1 の #6)。 |
| Unicode | ASCII のみ(H* L+H* L-L% など)。ただし学習者向け表示には向かない。内部表現として使う。 |

### 3.5 IViE

- 概要 (確認済み: `https://www.phon.ox.ac.uk/files/apps/old_IViE/guide.html`、`https://www.phon.ox.ac.uk/files/apps/IViE/snap.html`):
  - 3 つの tier: (1) 韻律的 prominence(リズム的に強い音節を P で示す。アクセントの有無とは独立)、(2) 音声的ターゲット(prominent 音節の周囲のピッチパターンを、音節ベースで記録。大文字 H/M/L は強い音節、小文字 h/m/l は弱い音節、`-` は補間、`#` は言いよどみ・誤り)、(3) 音韻(`H*L`、`L*H`、`!H*L` などと、境界の `H%`、`L%`、`%`)。
  - 「複数の英語方言を比較する」目的で作られた。方言によって音声的実現が違っても、音韻ラベルを共通に保てるよう、音声 tier と音韻 tier を分けた(二次: 検索結果、Grabe et al. ICSLP 1998)。
  - 公式例: "We arrived in a limo" で ar- と li- に P、周囲のピッチを `mH-l` のように音声的に記録し、音韻 tier で型に分類する(上記 guide の例)。
- 例文(筆者の適用例。音声 tier の細かいラベルは規則の細部を確認できていないので、構造を示す概念例にとどめる):

```
S3  語:         I  asked  for  the  blue  one  not  the  green  one
    Prominence:      P                P                  P
    Phonetic:        (l)  ...    (l H - l)          (l H - l)      ← 概念例。実際のラベル位置は規則に従う
    Phonological:                    H*L %                H*L L%  ← 型は筆者の仮定
```

- 評価 (筆者評価): 「聞こえ(音声的事実)」と「音韻解釈」を分ける発想が最も取り込む価値がある。ただし記法そのものは研究用で、読み手の訓練は大、自動化は難(音声 tier は人手前提)。Unicode は ASCII で足りる。

### 3.6 RaP (Rhythm and Pitch)

- 概要 (確認済み: Breen et al. `https://tedlab.mit.edu/tedlab_website/researchpapers/Breen_et_al_InPress_CLLT.pdf` Table 1、§1.2): ToBI の限界に対処するために Dilley & Brown (2005) が設計。
  - 4 つの tier: words(音節)/ rhythm / pitch / miscellaneous。
  - rhythm tier: 強い beat = `X`、弱い beat = `x`、不確実は `?` 付き。句境界も rhythm tier に置く: `)` = minor boundary(ToBI の 3 相当)、`))` = major boundary(ToBI の 4 相当)。ToBI の 0/1/2 に当たるものは無表示。
  - pitch tier: `H` `L` `E` は「直前に付けたトーンに対して高い/低い/等しい」という相対ラベル(INTSINT に似る)。beat のある音節に付く tone は `*` を付ける(`H*`)。そのため prominence の区別が 3 段(非 prominent / prominent だがピッチアクセント無し / prominent でピッチアクセントあり)になる。
  - 信頼性: ToBI と同程度のラベラー間一致度が得られたと報告(同論文の要旨)。
- 例文(筆者の適用例):

```
S1  Words:   did you want to go to the store
    Rhythm:            x        X        X ))
    Pitch:                      H*       L* H          (store で L* から最後に H へ上がる)

S3  Words:   I asked for the blue one  not the green one
    Rhythm:     x            X       )  x      X       ))
    Pitch:                   H*         (next)  L*?
```

- 評価 (筆者評価): 字幕用途で最も素直な内部表現の候補。beat(プロミネンス)を音高から切り離して持てるので、リズム表示と核表示にそのまま使える。強/弱 beat は「太字と通常」「大きい点と小さい点」に直結する。訓練は中(beat は直感的、pitch tier は相対ラベルなので分かりやすい)。自動化は中(prominence 検出は実績があるが、`x` と `X` の段階分けの精度は未確認)。ASCII のみ。

### 3.7 INTSINT / Momel

- 概要 (確認済み: `https://en.wikipedia.org/wiki/INTSINT`(二次)): Hirst が 1987 に提案した「韻律版の IPA」。8 個の記号: T(Top)・M(Mid)・B(Bottom)は話者のピッチレンジに対する絶対目標、H(Higher)・L(Lower)・S(Same)・U(Upstepped)・D(Downstepped)は直前の目標に対する相対目標。初期には ⇑ ⇓ ↑ → ↓ < > の図形記号だったが、後に英字が主流になった (二次: 検索結果の要約、Hirst & Di Cristo 1998 の記述)。Momel は F0 を二次スプライン的な目標点列に自動的に簡略化するアルゴリズムで、Praat プラグインとして INTSINT を自動生成できる。SPPAS も自動 INTSINT 注釈を行う。key と range を与えると目標点の Hz 値に戻せる(例: key=240 Hz、range=1 オクターブで `[M T L H L H D B]` → `[240 340 240 286 220 273 242 170]`)。
- 例文(筆者の適用例。INTSINT は「F0 の転換点」に付くので、単語には 1 対 1 で対応しない。ここは構造を示す概念例):

```
S1  [M  H  S  L  H]        did=M、want=H、go=S、sto-=L、-re=H(文末上昇)
S3  [M  H  L  ...  H  L  B]  blue に山(H→L)、green に山、文末で B まで下がる
```

- 評価 (筆者評価): 自動化しやすい(音声から直接出せる)が、英語の語や強勢に結びつけた読みは別処理。読み手が訓練なしに読める記法ではなく、内部のピッチ表現として、または曲線描画の元データとして使う。Unicode は ASCII。

### 3.8 Tilt

- 概要 (確認済み: Taylor `https://www.cstr.ed.ac.uk/downloads/publications/1998/Taylor_1998_e.pdf`): イベントの列として intonation を表す。イベントは pitch accent `a` と boundary tone `b` の 2 種。各イベントを連続値のパラメータで記述する: amplitude(F0 の振れ幅)、duration(秒)、tilt(立ち上がりと立ち下がりの相対的大きさ。+1=純粋な上昇、-1=純粋な下降、0=同じ大きさ)、F0 position、time position。HMM でイベントを自動検出してパラメータを付け、逆に F0 曲線を再合成できる。
  - 自動検出の精度(英語 3 コーパス): ラベラー間の一致は 81.6% correct / 60.4% accuracy。自動検出は、DCIEM で correct 72.7%・accuracy 47.7%、Switchboard で 60.7% / 35.1%。accent の検出はそれなりだが、自然発話では精度は高くない。
- 例文(筆者の適用例。数値は架空で、構造を示すだけ):

```
S3  a(blue):  amp=+38Hz  dur=0.22s  tilt=-0.2  (山型に近い)
    b(one,):  amp=+20Hz  dur=0.18s  tilt=+0.9  (継続の上昇)
    a(green): amp=+42Hz  dur=0.24s  tilt=-0.4
    b(one.):  amp=-30Hz  dur=0.20s  tilt=-1.0  (最終下降)
```

- 評価 (筆者評価): 「連続値」を持てる点が他と違う。核の明示、リズム、境界の段階は無い。人間には読めない(表示するなら曲線に戻す)。自動化は中。ラベルではなく数値なので、曲線の滑らかな重ね描きの元データに向く。

### 3.9 IPA の韻律記号

- 概要 (確認済み: IPA chart 2020 `https://upload.wikimedia.org/wikipedia/commons/a/a8/IPA_chart_2020.pdf`): 前項 #14 の記号群。加えて tone letters `˥ ˦ ˧ ˨ ˩` と、contour 用のダイアクリティクス(rising / falling / high rising など)。
- 例文(筆者の適用例。IPA のみ):

```
S1  |dɪdʒə ˈwɑnə ˈɡoʊ tə ðə ˈstɔɹ ↗|         (弱形・縮約を実現形で。末尾 ↗ = global rise)
S2  |wi ˈnid ˈɛɡz ‖ ˈmɪlk ‖ ən ə ˈloʊvəv ˈbɹɛd ↘|     (loaf of → loʊvəv に連結)
S3  |aɪ ˈæskt fɚ ðə ˈblu wʌn ‖ nɑt ðə ˈɡɹin wʌn ↘|
S4  |aɪdəv ˈtoʊldɪm ɪf aɪd ˈnoʊn ↘|
```

- 評価 (筆者評価): 弱形・連結・縮約を実際に書けるのは IPA だけ(表記全体が実現形)。強勢・群境界・linking の記号(ˈ ˌ | ‖ ‿)もある。しかし核の明示は無く、リズムも無い。訓練は大(IPA が読める学習者は少ない。日本人学習者向けではカナ・綴り字の弱形表示に変換するほうが現実的)。自動化は中(G2P は成熟しているが、連続音声の実現形を予測するのは別問題)。Unicode で書けるが、ꜛ ꜜ(U+A71B/A71C)などはフォントで欠落しうる(一般知識・未確認)。本リポジトリの原則どおり、端末の実フォントでの目視確認が要る(`tools/glyph-check`)。

### 3.10 英語教育教材の記法

#### thought group + focus word

- 確認済み: Baruch `https://tfcs.baruch.cuny.edu/thought-groups/`: thought group の境界を `/`、focus word(各 group の最後の内容語が多い)を太字で示す。例: `The first **item**/ on our **agenda**/ is to address **parking**.`
- 確認済み: Gilbert の Prosody Pyramid(上記 #8): 各 thought group に focus word が 1 つ、focus word の中の主強勢音節が peak(nucleus)。thought group は高いピッチで始まって下がる、境界には休止、ピッチの下降、最終強勢音節の延長が伴うという説明がある。
- 例文(筆者の適用例):

```
S1  Did you want to go / to the **store**?
S2  We need **eggs** / **milk** / and a loaf of **bread**.
S3  I asked for the **blue** one / not the **green** one.
S4  I'd have **told** him / if I'd **known**.
```

- 評価 (筆者評価): 学習者の読み手の負担が最小で、表示もテキスト+太字+スラッシュで済む。核は「太字」で暗黙に出る(最後の太字)。表せないのはピッチの動きの向き、弱形、リズム。自動化は、prominence の推定さえできれば易(ただし「正しい focus word」の判断は意味依存で、ルール(内容語・最後の内容語)だけで作ると S3 のような対比で外す)。Unicode 不要(太字+ASCII)。ただしYouTube の字幕 DOM に太字が効くか(WebVTT の `<b>` は仕様上あり、確認済み: 節 3.14)は別問題。

#### リズム(stress-timed)の図示

- 確認済み: British Council `https://www.teachingenglish.org.uk/professional-development/teachers/knowing-subject/rhythm`: 英語は強勢拍のリズムで、強音節は長く明瞭、弱音節は短く弱いという説明。記法としては、強勢語を太字にする程度の例しか確認できなかった(`It's the **worst thing** that you could **do.**`)。弱形・連結は音声記号で書く、転写上で強勢と弱形に印を付ける、という記述。
- ChatGPT が挙げた `●` を拍の上に置く図は、教材として一般的と書かれていたが、一次資料での確認は取れていない (未確認)。
- 例文(筆者の適用例。beat = 強勢のある音節):

```
Did you WANT to GO to the STORE?
        ●       ●         ●
We need EGGS, MILK, and a LOAF of BREAD.
        ●     ●           ●       ●
I ASKED for the BLUE one, not the GREEN one.
  ●             ●                 ●
I'd have TOLD him if I'd KNOWN.
         ●               ●
```

- 評価 (筆者評価): 「強勢間の弱音節が押し込まれる」感覚を見せるには有効。ただし S2 のように 2 つの beat が隣り合うと押し込みが見えない。表示には等幅の位置合わせ(字幕ではプロポーショナルフォントなので、語ごとの座標取得が要る)。Unicode の ● は標準(U+25CF)。

#### Cauldwell "Phonology for Listening"

- (二次: 検索結果の要約): 連続音声(自発発話)の「乱れ」を学習者に見せるために、正書法と記号の転写(「window on speech」)を使う。「word-crusher」(強勢語の間の語が押し潰される二重 prominence の tone unit)という用語を導入。`speechinaction.org` のページは別サイトへリダイレクトされ取得できず、記法の字形は未確認。

### 3.11 商用アプリの表示(ELSA など)

- 確認済み: ELSA の FAQ `https://elsaspeak.com/en/faqs/how-does-elsas-pronunciation-feedback-work`: 「sounds, stress, and intonation」を分析すると述べる。画面上でどう表示するかの記述は無い。
- (二次: 検索結果の要約): 単語内の誤った音(文字のハイライト)や強勢位置を示す。文・単語ごとのパーセント・スコア。ピッチ曲線を表示するかは確認できず。
- Speechling、BoldVoice、Yoodli: 検索結果の範囲ではピッチ曲線・イントネーション図の表示機能は確認できなかった (未確認)。
- 評価 (筆者評価): アプリの「表示」は音声を採点する用途が中心で、字幕に重ねて表示する用途の先行例は今回見つけられなかった。

### 3.12 ピッチ曲線・楽譜風の UI

- Praat (確認済み: `https://praat.org/manual/Pitch.html`): Pitch object(周期性の候補の時系列)を描画する。PitchTier に変換して補間もできる。TextGrid に ToBI などの tier を付ける(OCW の例は Praat の TextGrid で構成されている)。
- Prosogram (確認済み: `https://sites.google.com/site/prosogram/home`): 音節核ごとにピッチを「平坦・上昇・下降の直線区間」に簡略化して描く、人間の知覚に合わせた stylization。音節分割(自動/手動)が必要。出力は図と、音節ごとの数値表と、任意の "Polytonia" ラベル(音高レベルと動き)。
- Wavesurfer など(ユーザーが挙げた): 今回は確認できなかった (一般知識・未確認)。
- 評価 (筆者評価): 曲線は最も情報量が多く、訓練がほぼ要らない。一方で字幕の上に重ねると視覚的に重く、語との対応も取りにくい。Prosogram 型の「音節ごとの短い直線」は、字幕の語の上に小さく重ねる用途に向く(自動化は音節分割次第)。

### 3.13 Pierrehumbert 系の位置づけ

ToBI のもとになった autosegmental-metrical 理論(Pierrehumbert 1980)は、今回は原典を確認していない。Tilt の論文が Pierrehumbert (1980) のカテゴリを一部採用したと述べている (二次)。

### 3.14 字幕・歌詞の表示慣習と、表示に使える技術

- WebVTT (確認済み: `https://developer.mozilla.org/en-US/docs/Web/API/WebVTT_API/Web_Video_Text_Tracks_Format`): cue テキストに `<b>` `<i>` `<u>` `<c.class>` `<v>` `<ruby><rt>` `<lang>` が使える。時刻タグ `<00:17.500>` を語の間に置くと、カラオケ式に語ごとの色替えができる(`::cue(:past)` / `::cue(:future)`)。`::cue` は色やフォントは変えられるが、位置・レイアウトは cue 設定でしか制御できない。
- HTML ruby (確認済み: `https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/ruby`、`https://www.w3.org/TR/ruby/`): `<ruby>` `<rt>` `<rp>` で語の上に短い注記を置く。2015 年 7 月から主要ブラウザで対応。`ruby-position`、`ruby-align` で位置を調整。日本語のルビ(ふりがな)の慣習そのもので、語の上の小さな注記という表示形式が日本の読み手に馴染み深い。
- 注意: YouTube 自身の字幕描画が WebVTT の `<ruby>` などを使うのか、独自の DOM なのかは未確認(Chrome 拡張では自前のオーバーレイを描くほうが自由度が高いと筆者は考えるが、検証していない)。語単位のタイムスタンプが字幕データから取れるかも未確認。
- カラオケの慣習 (二次: 検索結果の要約): Enhanced LRC は語ごとにタイムスタンプを持ち(`[00:12.00]<00:12.00>I <00:12.30>see ...`)、語の塗りつぶし(wipe)、色、ハイライトの丸、歌い終わった行の減光などで「今ここ」を見せる。LRC・ASS・WebVTT のいずれも語ごとのタイムスタンプ機構を持つ。
- 評価 (筆者評価): 「いま発話中の語を強調する」カラオケ式と、「語の上に小さな注記を置く」ルビ式は、どちらもプロソディ表示の土台として使える。ピッチの動きは、ルビ位置に小さな矢印・線として置くのが自然。

## 4. 比較表(記法ごとの評価)

記号: ◎=得意 / ○=表せる / △=一部 / ×=不可。すべて (筆者評価)。ChatGPT の表とは別に、今回確認できた事実をもとに付け直した。

### 4.1 表せる情報

| 情報 | British | Halliday | Brazil | ToBI | IViE | RaP | INTSINT | Tilt | IPA | 教育(TG+太字) | ピッチ曲線 |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 語強勢(辞書の) | ◎(ˈ ˌ) | ○ | ○ | △ | ○ | △ | × | × | ◎ | △(太字は文内の強さ) | × |
| 文中の prominence | ○ | ○ | ◎(大文字) | ◎(accent) | ◎(P) | ◎(X/x) | × | △ | × | ◎(太字) | △ |
| 核(nucleus) | ◎ | ◎ | ◎ | ○(導出) | ○ | ○(導出) | × | × | × | ○(最後の太字) | △ |
| ピッチの動き(向き) | ◎ | ◎ | ○(tone 文字) | ◎(accent 型) | ◎ | ○ | ◎ | ◎(連続値) | △(↗↘) | × | ◎ |
| 句境界 | ○(縦線) | ○(`//`) | ○(`//`) | ◎ | ○ | ○ | △ | △ | ○(`\|` `‖`) | ○(`/`) | △ |
| 境界の強さ(段階) | △ | △ | △ | ○(0〜4。ただし 2 が曖昧) | ○ | ○(`)` `))`) | × | × | △(2 段) | △ | × |
| リズム(beat) | △ | △ | △ | × | ○(P) | ◎ | × | × | × | ○(図示) | × |
| 弱形・連結・縮約 | × | × | × | △(0) | × | × | × | × | ◎ | △ | × |
| 談話上の意味 | ○ | ◎(tone の文法的意味) | ◎ | △ | △ | × | × | × | × | △ | × |

### 4.2 運用面

| 記法 | 読み手に必要な訓練 | 機械的生成(自動化の難度) | Unicode のみで表示できるか |
|---|---|---|---|
| British(矢印型) | 小 | 中〜難: 核と核音調の推定が要る | 可(ˈ ˌ ↗ ↘ と縦線)。フォント次第で矢印が絵文字化(U+2197/2198 は一部環境で絵文字表示される可能性。一般知識・未確認) |
| British(tonetic stress marks) | 中 | 中〜難 | 合成文字で可能だが崩れやすい(一般知識・未確認)。専用フォントが望ましい |
| Halliday(tone 番号+`\` `/`) | 中 | 中〜難 | 可(ASCII) |
| Brazil | 小(大文字+`//`)〜中(tone 文字) | 中: prominence と tone unit は推定可、key/termination は話者依存 | 可(ASCII)。大文字は字幕では可読性低下 |
| ToBI | 大(学習者は読めない) | 中〜難: accent 有無は約 9 割、型は 6〜7 割 | 可(ASCII)。内部表現向き |
| IViE | 大 | 難: 音声 tier は人手前提 | 可(ASCII) |
| RaP | 中 | 中: prominence 検出は実績あり。X/x の段階は未確認 | 可(ASCII) |
| INTSINT | 大 | 易: Momel+Praat/SPPAS で音声から自動 | 可(ASCII) |
| Tilt | 大(数値)/曲線に戻せば小 | 中: 自然発話での検出精度は低め(correct 60〜73%) | 数値なので可。表示は曲線 |
| IPA 韻律記号 | 大 | 中: 連続音声の実現形は別問題 | 可。ꜛ ꜜ や tone letters はフォント欠落の恐れ |
| thought group+太字 | 最小 | 易〜中: focus word の選択が意味依存 | 不要(太字とスラッシュ) |
| リズム図(● beat) | 小 | 中: 強勢音節は辞書+品詞+prominence で推定可 | ● は標準。位置合わせに語座標が要る |
| ピッチ曲線(Praat/Prosogram) | 最小(見れば分かる) | 易〜中: F0 抽出は成熟。語との対応付けに強制アラインメントが要る | Unicode ではなく SVG/Canvas |
| ルビ/カラオケ(WebVTT, ruby) | 最小 | 易: 語のタイムスタンプがあれば | HTML/CSS/WebVTT で可(専用フォント不要) |

## 5. 字幕に重ねる用途への適性と、取り込むべき要素(以下は提案)

### 5.1 適性のまとめ (筆者評価)

- 学習者が 1 秒以内に読める(字幕は数秒で消える)ため、記号の凡例を覚えさせる記法(tonetic stress marks、ToBI、IViE、INTSINT、Tilt)は表示層には向かない。これらは内部表現として使う。
- 表示層に向くのは、(a) 太字/色による prominence、(b) `/` や短い縦線による thought group、(c) 核に付ける小さな矢印(↗ ↘ ↘↗ など)または短い曲線、(d) 語の上の小さなドット(beat)、(e) 語の上のルビ式注記(弱形・連結の実現形)。
- 学習者にとって「情報量が多い」より「誤読しない」ほうが重要。自動生成の精度が 6〜7 割の項目(ピッチアクセントの型、中間句境界)を断定的に表示すると、誤った学習につながる。
- 表示を選べるようにする(層をオン/オフする)設計が、ChatGPT の「統合した新体系」より現実的。

### 5.2 取り込むべき要素(提案)

1. 表示層と内部データの分離(提案)。ToBI 的な tier 構造を内部に持つ。字幕の語ごとに、各 tier の値を持たせる。
   - 語・音節 tier: 語、音節分割、辞書の語強勢(IPA の ˈ ˌ)。
   - 実現形 tier: 弱形、連結、縮約後の発音(IPA 表記)。citation form との差分を持つ。IPA が「実現形を書ける」唯一の記法なので、ここに取り込む。
   - prominence tier: RaP 型の 3 段(なし / x / X)。ここから「核」を導出する(句内の最後の prominent、ToBI・Brazil・Macquarie の教材に共通の考え方)。明示フラグでも持てる。
   - phrase tier: 境界の段階(RaP の `)` `))` か、ToBI の 3 / 4)。0 の接語化は実現形 tier に任せる。2 の曖昧さは採用しない。
   - pitch tier: IViE の発想で「音声的事実(Tilt 的な連続値、または INTSINT 的な少数の目標点)」と「音韻ラベル(ToBI の H* など。必須にしない)」を分ける。
   - 各ラベルに confidence(確信度)を付ける。低い確信度のラベルは表示しない。
2. 表示層は複数用意して切り替える(提案)。
   - 入門: thought group の `/` と、prominence の太字。核だけ下線または色。
   - 標準: 入門に、核の矢印(↗ ↘ ↘↗)を加える。
   - 詳細: beat のドット、弱形・連結のルビ注記、ピッチ曲線の細い重ね描き。
3. ToBI の 0〜4 の段階はそのまま使わず、RaP の 2 段(`)` `))`)に近い簡素な体系を基本にする(提案)。ToBI の 2 の二重定義と、ラベラー間一致の低さ(中間句 約 50%)を避けるため。
4. ピッチ表示は Prosogram 型の「音節ごとの短い直線」を候補にする(提案)。F0 曲線の生の描画は字幕の上では重い。
5. 語のタイミング表示は WebVTT の時刻タグ/カラオケの慣習を借りる(提案。YouTube 側で語のタイムスタンプが取れるかは未確認)。
6. 日本語話者向けの注記(ルビ)の慣習を利用する(提案)。弱形・連結は、IPA ではなくカナ寄りのルビで出す選択肢がある(このリポジトリの関心領域。ただし今回は検証していない)。
7. リズムは「beat のドット」で足りるか、強勢間の弱音節数も見せるべきかを決める必要がある(未決)。

### 5.3 未決・要検証(提案に含まれない事実の穴)

- 音声をどこから得るか: Chrome 拡張が YouTube の音声を処理できるか、字幕データに語のタイミングが含まれるか(未確認)。
- 自動生成の精度: 上記の数字は ToBI ラベル(Boston 系コーパス)での値で、YouTube の多様な音声での精度は不明。prominence だけなら 9 割近いが、核の位置と型は低い可能性がある。
- 商用アプリの実際の画面(ELSA 等)は未確認。競合調査として別途。
- 表示用の字形(矢印、ドット、結合記号)が iOS/Android/PC の各フォントで崩れないか: 本リポジトリの `tools/glyph-check` で確認する前提。表記文字列に NFKC/NFKD を適用しない原則も守る。

## 6. 取得して確認した URL(一覧)

確認済みと書いた箇所の根拠。取得できなかったものは載せない。

- `https://tedlab.mit.edu/tedlab_website/researchpapers/Breen_et_al_InPress_CLLT.pdf` (ToBI と RaP の比較)
- `https://ocw.mit.edu/courses/6-911-transcribing-prosodic-structure-of-spoken-utterances-with-tobi-january-iap-2006/77b02caef3fe12c5bc44c3901d3eade6_chap2_0and2_1.pdf` (ToBI チュートリアル)
- `https://www.ling.ohio-state.edu/research/phonetics/E_ToBI/` (MAE_ToBI のガイドライン。取得できたのは序文のみ)
- `https://www.phon.ox.ac.uk/files/apps/old_IViE/guide.html`、`https://www.phon.ox.ac.uk/files/apps/IViE/snap.html` (IViE)
- `https://www.cstr.ed.ac.uk/downloads/publications/1998/Taylor_1998_e.pdf` (Tilt)
- `https://en.wikipedia.org/wiki/INTSINT`、`https://en.wikipedia.org/wiki/ToBI`、`https://en.wikipedia.org/wiki/Intonation_(linguistics)` (二次)
- `https://www.paultenchdocs.co.uk/wp-content/uploads/2013/08/A-Systemicfunctional.pdf` (Halliday 系の記法と Brazil との対応)
- `https://www.phon.ox.ac.uk/jcoleman/intonation.htm` (tonetic stress marks の例)
- `https://www.press.umich.edu/pdf/9780472030187-chp2.pdf` (Brazil の Discourse Intonation の解説章)
- `https://upload.wikimedia.org/wikipedia/commons/a/a8/IPA_chart_2020.pdf` (IPA チャート 2020)
- `https://faculty.pencol.edu/esl/wp-content/uploads/sites/5/2014/Teacher%20Resources/teaching-pronunciation-using-the-prosody-pyramid.pdf` (Gilbert)
- `https://tfcs.baruch.cuny.edu/thought-groups/` (thought group の記法)
- `https://www.teachingenglish.org.uk/professional-development/teachers/knowing-subject/rhythm` (リズム)
- `https://praat.org/manual/Pitch.html` (Praat)
- `https://sites.google.com/site/prosogram/home` (Prosogram)
- `https://elsaspeak.com/en/faqs/how-does-elsas-pronunciation-feedback-work` (ELSA。表示方法の記述は無し)
- `https://developer.mozilla.org/en-US/docs/Web/API/WebVTT_API/Web_Video_Text_Tracks_Format`、`https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/ruby`、`https://www.w3.org/TR/ruby/` (WebVTT と ruby)
- `https://www.isca-archive.org/interspeech_2010/rosenberg10_interspeech.pdf` (AuToBI)、`https://arxiv.org/pdf/2108.01122` (wav2vec による suprasegmental 認識)

検索結果の要約だけを根拠にした文献(URL は載せない): Palmer 1922、Kingdon 1939/1958、O'Connor & Arnold、Crystal 1969、Wells 2006、Roach、Bolinger 1985/1989、Cauldwell 2013、Grabe et al. 1998、Hirst & Di Cristo 1998、Enhanced LRC の解説、商用アプリの解説記事。
