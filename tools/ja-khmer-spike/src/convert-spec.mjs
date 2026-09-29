// 設計書 v0.7 の規則で、カタカナ発音 → クメール文字(詳細)を作る。表は設計書から読む(spec-table.mjs)。
// marks で右肩・長音・促音を個別に落として、衝突率(collision.mjs)を測る。
// 長音マーカー(span 種別 long)の字形は未決(D8): 'a' 上付き母音+結合マクロン(ᵒ̄。D9 で採用。ADR-0003 の合成グリフ)、'c' 上付き母音の重ね書き(ᵒᵒ。フォールバック)、'colon' 旧案の ː(比較用)。既定 'a'。
import { loadSpecTable } from './spec-table.mjs';

export const SPEC_MARKS = ['len', 'sok', 'sha', 'shu', 'sho'];
export const LONG_STYLES = ['c', 'a', 'colon'];
const SUP = { a: 'ᵃ', i: 'ⁱ', u: 'ᵘ', e: 'ᵉ', o: 'ᵒ' };
export const longMark = (v, style = 'a') => (style === 'colon' ? 'ː' : style === 'a' ? SUP[v] + '\u0304' : SUP[v] + SUP[v]);
const SH_MARK = { しゃ: 'sha', しゅ: 'shu', しょ: 'sho' };
const LONG = { a: 'ា', i: 'ី', u: 'ូ', e: 'េ', o: 'ូ' }; // 長い拍の基底は段の既定(§4.3 案A、規則3)
const ROW_V = { a: 'あかがさざたなはばぱまやらわ', i: 'いきぎしじちぢにひびぴみり', u: 'うくぐすずつづぬふぶぷむゆる', e: 'えけげせぜてでねへべぺめれ', o: 'おこごそぞとどのほぼぽもよろを' };
const VOWEL_OF = {};
for (const [v, s] of Object.entries(ROW_V)) for (const ch of s) VOWEL_OF[ch] = v;
const K2H = (s) => s.replace(/[ァ-ヶ]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0x60));
const SMALL_Y = 'ャュョ', OUT_OF_SCOPE = 'ァィゥェォヴヮヵヶ';
const CODA_K = 'かきくけこがぎぐげご', CODA_P = 'ぱぴぷぺぽばびぶべぼ';
const table = loadSpecTable();
export const specTable = table;
const vowelOfKana = (k) => (k.length === 2 ? { ゃ: 'a', ゅ: 'u', ょ: 'o' }[k[1]] : VOWEL_OF[k]);

/** カタカナ発音 → クメール文字。範囲外の文字を含むと null */
export function kanaToKhmerSpec(kata, marks = new Set(SPEC_MARKS), longStyle = 'a') {
  const moras = [];
  for (const ch of kata) {
    if (OUT_OF_SCOPE.includes(ch)) return null;
    if (ch === 'ー') { const l = moras[moras.length - 1]; if (!l || !l.k) return null; l.long = true; }
    else if (ch === 'ッ') moras.push({ q: true });
    else if (ch === 'ン') moras.push({ n: true });
    else if (SMALL_Y.includes(ch)) { const l = moras[moras.length - 1]; if (!l || !l.k || l.k.length > 1 || l.long) return null; l.k += K2H(ch); if (!table[l.k]) return null; }
    else { const h = K2H(ch); if (!table[h]) return null; moras.push({ k: h, long: false }); }
  }
  const syl = [];
  for (let i = 0; i < moras.length; i++) {
    const m = moras[i];
    if (m.k) {
      const p = syl[syl.length - 1];
      if (m.k === 'い' && !m.long && p && p.k && !p.long && !p.coda && !p.ai && vowelOfKana(p.k) === 'a') { p.ai = true; continue; } // あい は ៃ(§6.4)
      syl.push({ k: m.k, long: m.long, coda: '', ai: false });
    } else if (m.n) {
      const p = syl[syl.length - 1];
      if (p && p.k && !p.coda) p.coda = 'ន'; else syl.push({ raw: 'ន' });
    } else {
      const nx = moras.slice(i + 1).find((x) => x.k); const p = syl[syl.length - 1];
      if (!marks.has('sok') || !p || !p.k || p.coda) continue;
      p.coda = nx && CODA_K.includes(nx.k[0]) ? 'ក' : nx && CODA_P.includes(nx.k[0]) ? 'ប' : 'ត';
    }
  }
  return syl.map((s) => {
    if (s.raw) return s.raw;
    const t = table[s.k];
    const v = vowelOfKana(s.k);
    let out = t.c + (s.ai ? 'ៃ' : s.long ? LONG[v] : t.v) + s.coda;
    if (t.sh && marks.has(SH_MARK[s.k])) out += t.sh;
    if (s.long && marks.has('len')) out += longMark(v, longStyle);
    return out;
  }).join('');
}
