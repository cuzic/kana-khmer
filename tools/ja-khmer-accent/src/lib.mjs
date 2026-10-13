// ja-pron の acc 値の解釈と H/L 列の生成(ADR-0021 決定6。データ側は辞書の型どおり。語頭の簡略化は描画側で行うのでここには入れない)。

export const kataToHira = (s) => s.replace(/[ァ-ヶ]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0x60));

/** 拍数。ゃゅょ ゎ と小書きの母音(ぁぃぅぇぉ。ふぁ のような外来音)は直前と合わせて1拍。っ ん ー は1拍。 */
export function countMorae(kana) {
  let n = 0;
  for (const ch of kataToHira(kana)) if (!'ゃゅょゎぁぃぅぇぉ'.includes(ch)) n++;
  return n;
}

/** 核の位置 nucleus(0=平板、1=頭高、N=尾高、それ以外=中高)から型名 */
export function typeOf(nucleus, moraCount) {
  if (nucleus === 0) return 'heiban';
  if (nucleus === 1) return 'atamadaka';
  if (nucleus === moraCount) return 'odaka';
  return 'nakadaka';
}

/**
 * 辞書どおりの H/L 列。nucleus は「下がり目の直前の拍の番号(1 始まり)」で 0 は平板。
 * 平板: 1拍目 L、2拍目以降 H(1拍語は L)。頭高: H の後すべて L。中高・尾高: 1拍目 L、2拍目〜nucleus 拍目が H、以降 L。
 */
export function pitchPattern(nucleus, moraCount) {
  let s = '';
  for (let i = 1; i <= moraCount; i++) {
    if (nucleus === 0) s += i === 1 ? 'L' : 'H';
    else if (nucleus === 1) s += i === 1 ? 'H' : 'L';
    else s += i === 1 ? 'L' : (i <= nucleus ? 'H' : 'L');
  }
  return s;
}

/** 後ろに無核の助詞が付いたときの助詞の高さ。平板だけ H で続く(尾高・中高・頭高は L) */
export const afterPitch = (nucleus) => (nucleus === 0 ? 'H' : 'L');

/** acc の 1 要素(数字または h/a/o/n)を核の位置に。決められなければ null */
export function resolveAcc(tok, moraCount) {
  const t = tok.trim().toLowerCase();
  if (/^\d+$/.test(t)) return Number(t);
  if (t === 'h') return 0;
  if (t === 'a') return 1;
  if (t === 'o') return moraCount;
  if (t === 'n') return moraCount === 3 ? 2 : null; // 中高は 3 拍語なら 2 に決まる。それ以外は位置が分からない
  return null;
}
