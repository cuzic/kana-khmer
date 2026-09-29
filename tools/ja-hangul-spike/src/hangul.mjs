// かな発音(toPron の出力: カタカナ + ー ッ ン)→ ハングル、と韓国語の読み規則を通した「実際の発音」。
// 表は暫定(ネイティブ確認前)。う は ㅜ、ただし す/ず/つ は 스/즈/츠(주・추 は じゅ・ちゅ と衝突するため)。
const BASE = {
  ア: '아', イ: '이', ウ: '우', エ: '에', オ: '오',
  カ: '카', キ: '키', ク: '쿠', ケ: '케', コ: '코',
  ガ: '가', ギ: '기', グ: '구', ゲ: '게', ゴ: '고',
  サ: '사', シ: '시', ス: '스', セ: '세', ソ: '소',
  ザ: '자', ジ: '지', ズ: '즈', ゼ: '제', ゾ: '조',
  タ: '타', チ: '치', ツ: '츠', テ: '테', ト: '토',
  ダ: '다', デ: '데', ド: '도',
  ナ: '나', ニ: '니', ヌ: '누', ネ: '네', ノ: '노',
  ハ: '하', ヒ: '히', フ: '후', ヘ: '헤', ホ: '호',
  バ: '바', ビ: '비', ブ: '부', ベ: '베', ボ: '보',
  パ: '파', ピ: '피', プ: '푸', ペ: '페', ポ: '포',
  マ: '마', ミ: '미', ム: '무', メ: '메', モ: '모',
  ヤ: '야', ユ: '유', ヨ: '요',
  ラ: '라', リ: '리', ル: '루', レ: '레', ロ: '로',
  ワ: '와',
};
const YOON_ROW = 'キギシジチニヒビピミリ';
const YV = { ャ: 2, ュ: 17, ョ: 12 };           // ㅑ ㅠ ㅛ
const PLAIN_V = { 2: 0, 12: 8, 17: 13 };         // ㅑ→ㅏ ㅛ→ㅗ ㅠ→ㅜ(硬口蓋化した ㅈㅊ の読み)
const dec = (s) => { const c = s.codePointAt(0) - 0xac00; return { L: Math.floor(c / 588), V: Math.floor((c % 588) / 28), T: c % 28 }; };
const enc = ({ L, V, T }) => String.fromCodePoint(0xac00 + (L * 21 + V) * 28 + T);

export const MARKS = ['len', 'sok', 'nsep', 'zj'];
export const NSEP = '·';   // ん・っ の直後が母音始まりのとき、連音化を止める区切り(暫定)
export const ZJ = 'ʲ'; // じゃ・じょ に付ける右肩ローマ字 j(ja-khmer-spec D8 と同じ方針。ざ・ぞ 側に付けても測定値は同じ)
const SUP = { a: 'ᵃ', i: 'ⁱ', u: 'ᵘ', e: 'ᵉ', o: 'ᵒ' };
const VOWEL = { 0: 'a', 2: 'a', 9: 'a', 20: 'i', 13: 'u', 17: 'u', 18: 'u', 5: 'e', 8: 'o', 12: 'o' }; // 母音記号 → ローマ字の母音

const T_N = 4, T_K = 1, T_P = 17, T_S = 19;
const codaFor = (nextSyl) => { // ッ の同位置パッチム
  const L = dec(nextSyl).L;
  if ([0, 1, 15].includes(L)) return T_K;   // ㄱ ㄲ ㅋ
  if ([7, 17].includes(L)) return T_P;      // ㅂ ㅍ
  return T_S;
};

export function kanaToHangul(pron, marks = new Set(MARKS)) {
  // 1) モーラ列(音節)にする。ッ ン は 'X' 'N' の印として残す
  const moras = [];
  const chars = [...pron];
  for (let i = 0; i < chars.length; i++) {
    const c = chars[i];
    if (c === 'ッ' || c === 'ン' || c === 'ー') { moras.push(c); continue; }
    if (!BASE[c]) return null;
    let syl = BASE[c], zj = false;
    const nx = chars[i + 1];
    if (nx && YV[nx]) {
      if (!YOON_ROW.includes(c)) return null;
      const d = dec(syl); syl = enc({ L: d.L, V: YV[nx], T: 0 });
      if (c === 'ジ' && (nx === 'ャ' || nx === 'ョ')) zj = true; // ざ/じゃ、ぞ/じょ の衝突側
      i++;
    } else if (YV[nx] === undefined && /[ァィゥェォヮ]/.test(nx || '')) return null;
    moras.push({ syl, zj });
  }
  // 2) 並べる
  const out = []; // {syl} | mark 文字列
  for (let i = 0; i < moras.length; i++) {
    const m = moras[i];
    const last = () => { for (let j = out.length - 1; j >= 0; j--) if (typeof out[j] !== 'string') return out[j]; return null; };
    if (m === 'ー') {
      if (!marks.has('len')) continue;
      const p = last(); if (!p) return null;
      const v = VOWEL[dec(p.syl).V]; if (!v) return null;
      out.push(SUP[v] + SUP[v]); continue; // 直前の音節の右肩に、母音の上付きローマ字を重ねる(暫定の字形 (c))
    }
    if (m === 'ン' || m === 'ッ') {
      if (m === 'ッ' && !marks.has('sok')) continue;
      const p = last(); if (!p) return null;
      const nextM = moras.slice(i + 1).find((x) => x !== 'ー');
      const d = dec(p.syl);
      if (d.T) { continue; } // ンッ 連続などは畳む
      if (m === 'ン') d.T = T_N;
      else { if (!nextM || typeof nextM === 'string') return null; d.T = codaFor(nextM.syl); }
      p.syl = enc(d);
      const nxt = nextM && typeof nextM !== 'string' ? dec(nextM.syl) : null;
      if (marks.has('nsep') && nxt && (nxt.L === 11 || (m === 'ン' && nxt.L === 5))) out.push(NSEP); // 母音始まり(連音化)と ン+ら行(流音化)を止める
      continue;
    }
    out.push({ syl: m.syl });
    if (m.zj && marks.has('zj')) out.push(ZJ);
  }
  return out.map((x) => (typeof x === 'string' ? x : x.syl)).join('');
}

/** 韓国語話者が綴りを読んだときの音(近似): 硬口蓋化・連音化・ㄴ+ㄹ の流音化 */
export function pronounce(h) {
  const a = [...h].map((c) => (/[가-힣]/.test(c) ? dec(c) : c));
  for (let i = 0; i < a.length - 1; i++) {
    const p = a[i], n = a[i + 1];
    if (typeof p === 'string' || typeof n === 'string') continue;
    if (p.T && n.L === 11) { // 連音化
      const toL = { 1: 0, 4: 2, 17: 7, 19: 9 }[p.T];
      if (toL !== undefined) { n.L = toL; p.T = 0; }
    } else if (p.T === T_N && n.L === 5) p.T = 8; // 유음화
  }
  return a.map((d) => {
    if (typeof d === 'string') return d;
    if ([12, 13, 14].includes(d.L) && PLAIN_V[d.V] !== undefined) d = { ...d, V: PLAIN_V[d.V] }; // ㅈㅊ+ㅑㅛㅠ は硬口蓋化済みで区別されない
    return enc(d);
  }).join('');
}
