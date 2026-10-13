// アクセント線の単位の根拠を測る(ADR-0021、docs/research/2026-09-29-ja-accent-line-design.md §2.2)。
// 拍(モーラ)を書記音節にまとめる規則は convert-spec.mjs と同じ(長音 ー・撥音 ン・促音 ッ は直前の書記音節に入る。あい は ៃ 1つ。
// 直前に書記音節が無い ン・ッ は単独)。拍の添字を保持するため、ここで畳み込みを書き直している。convert-spec.mjs の規則を変えたらここも合わせる。
//   node src/accent-cluster.mjs jmdict-eng-common-3.6.2.json
// 出力:
//  (a) 語頭が重い音節(2拍目が特殊拍で、1拍目と同じ書記音節に入る)の語の割合。
//      注意: 東京式で「1拍目と2拍目の高さは必ず違う」は、2拍目が特殊拍のとき成り立たないことが多い(ADR-0021 の M1)。この割合は
//      「語頭の上昇が書記音節の内側に落ちる語」ではなく、「語頭が重い音節の語」の割合として読む(語頭の1拍目を H で描くかはユーザー判断)。
//  (b) 下がり目(核)が書記音節の内側に落ちうる位置の割合。核は特殊拍(ー ン ッ、あい の い)に来にくいので、核の候補は
//      「特殊拍でない拍 n(n<N)」に限り、n と n+1 が同じ書記音節に入る候補の割合を数える(型の分布は使わない。JMdict にアクセントは無い)。
//  (c) Wiktionary の型(2026-09-29 に API で取得した実データ。下の WIKT)で、核が書記音節の内側に落ちる語の数。
import fs from 'node:fs';
import { toPron } from './vocab.mjs';

const A_ROW = 'あかがさざただなはばぱまやらわ'; // convert-spec.mjs の ROW_V.a と同じ(15b8bc6 で だ を追加)
const K2H = (s) => s.replace(/[ァ-ヶ]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0x60));
const OUT_OF_SCOPE = /[ァィゥェォヴヮヵヶ]/;

/** カタカナ発音 → { n: 拍数, clusters: [拍の添字の配列], special: 特殊拍か(添字ごと) }。範囲外は null */
export function analyse(kata) {
  if (OUT_OF_SCOPE.test(kata)) return null;
  const syl = [], special = [];
  let n = 0, prev = '';
  for (const ch of kata) {
    const p = syl[syl.length - 1];
    const afterSpecial = prev === 'ッ' || prev === 'ン'; // convert-spec.mjs は ッ・ン の直後の ー・ャュョ を範囲外(null)にする
    prev = ch;
    if (ch === 'ー') {
      if (!p || !p.k || afterSpecial) return null;
      p.long = true; p.idx.push(n++); special.push(true);
    } else if (ch === 'ッ' || ch === 'ン') {
      // 直前が書記音節で末子音が未使用ならそこへ。そうでなければ単独(ン)/直前へ吸収(ッ)
      if (p && p.k && !p.coda) { p.coda = true; p.idx.push(n++); }
      else if (ch === 'ン') syl.push({ idx: [n++] });
      else if (p) p.idx.push(n++);
      else return null;
      special.push(true);
    } else if ('ャュョ'.includes(ch)) {
      if (!p || !p.k || afterSpecial || p.k.length > 1 || p.long) return null;
      p.k += K2H(ch); // 直前と合わせて1拍(添字は増えない)
    } else {
      const k = K2H(ch);
      if (ch === 'イ' && p && p.k && !p.long && !p.coda && !p.ai && A_ROW.includes(p.k[0])) { p.ai = true; p.idx.push(n++); special.push(true); continue; }
      syl.push({ k, idx: [n++], long: false, coda: false, ai: false }); special.push(false);
    }
  }
  return { n, clusters: syl.map((s) => s.idx), special };
}

export function measure(words) {
  let words2 = 0, heavyStart = 0, cand = 0, candIntra = 0, wordsWithIntraCand = 0, wordsWithCand = 0, total = 0;
  for (const w of words) {
    const a = analyse(w); if (!a) continue;
    total++;
    const owner = []; a.clusters.forEach((c, k) => c.forEach((i) => { owner[i] = k; }));
    if (a.n >= 2) { words2++; if (owner[0] === owner[1]) heavyStart++; }
    let any = false, anyIntra = false;
    for (let m = 0; m < a.n - 1; m++) { // m 番目(0起点)の拍の後で下がる = 核が m+1 拍目
      if (a.special[m]) continue;
      cand++; any = true;
      if (owner[m] === owner[m + 1]) { candIntra++; anyIntra = true; }
    }
    if (any) wordsWithCand++;
    if (anyIntra) wordsWithIntraCand++;
  }
  const pct = (x, y) => (y ? (100 * x / y).toFixed(1) + '%' : '-');
  return {
    words: total,
    heavyStart: `${heavyStart} / ${words2} = ${pct(heavyStart, words2)}`,
    nucleusCandidatesIntra: `${candIntra} / ${cand} = ${pct(candIntra, cand)}`,
    wordsWithIntraCandidate: `${wordsWithIntraCand} / ${wordsWithCand} = ${pct(wordsWithIntraCand, wordsWithCand)}`,
  };
}

// Wiktionary {{ja-pron|acc=N}} の東京式の型(2026-09-29 取得。acc_loc なしの最初の値。出典コードは DJR/NHK 等で本スクリプトは照合しない)
const WIKT = [['ニホンジン', 4], ['アリガトー', 2], ['ゴメンナサイ', 5], ['スミマセン', 4], ['ダイジョーブ', 3], ['ゲンキ', 1], ['ユックリ', 3], ['オハヨー', 0], ['ナマエ', 0], ['トイレ', 1], ['ベンキョー', 0], ['リョコー', 0], ['サヨーナラ', 4], ['ハジメマシテ', 4], ['クダサイ', 3], ['オヤスミナサイ', 6], ['タスケル', 3], ['ワカル', 2], ['イクラ', 1], ['ヨーコソ', 1], ['イイエ', 3], ['ワタシ', 0], ['ハナス', 2]];

function wiktSample() {
  let acc = 0, intra = 0; const list = [];
  for (const [k, nuc] of WIKT) {
    if (nuc < 1 || nuc >= analyse(k).n) continue; // 頭高〜中高(尾高・平板は語内に下がり目が無い)
    const a = analyse(k), owner = []; a.clusters.forEach((c, i) => c.forEach((m) => { owner[m] = i; }));
    acc++;
    if (owner[nuc - 1] === owner[nuc]) { intra++; list.push(`${k}(${nuc})`); }
  }
  return { withInnerFall: acc, fallInsideCluster: intra, words: list.join(' ') };
}

if (process.argv[2]) {
  const d = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
  const set = new Set();
  for (const w of d.words) for (const kana of w.kana) { const p = toPron(kana.text); if (p && !p.startsWith('ッ') && !p.startsWith('ー')) set.add(p); }
  console.log(process.argv[2], measure([...set]));
  console.log('Wiktionary 実データ(23語のうち語内に下がり目がある語)', wiktSample());
}
