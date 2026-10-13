// 仮の対応表(ADR-0010 の机上メモに基づく。ネイティブ確認前。系列の読みは未検証)。
// 各セルは { base, coeng?, shifter?, series } で、series はその字が実際に持つ系列('a'|'o')。
const COENG = '្';
const c = (base, series, extra = {}) => ({ base, series, ...extra });

// 子音行 → [a系の綴り, o系の綴り]
export const CONS = {
  '':  [c('អ', 'a'), c('អ', 'a', { shifter: '៊' })], // អ+៊ は a→o 系(ស ហ ប អ のみ可)
  k:  [c('ក', 'a'), c('គ', 'o')],
  g:  [c('ហ', 'a', { coeng: 'ក' }), c('ហ', 'o', { coeng: 'គ' })], // Module:km-pron: ហ្ក=a系、ហ្គ=o系
  s:  [c('ស', 'a'), c('ស', 'a', { shifter: '៊' })],
  sh: [c('ស', 'a'), c('ស', 'a', { shifter: '៊' })],
  z:  [c('ហ', 'a', { coeng: 'ស' }), c('ហ', 'a', { coeng: 'ស', shifter: '\u17CA' })], // ហ្ស៊=o系
  j:  [c('ច', 'a'), c('ជ', 'o')], // ច ជ はどちらも /c/。有声は右肩 ᶾ で書き分ける
  ch: [c('ច', 'a'), c('ជ', 'o')],
  t:  [c('ត', 'a'), c('ទ', 'o')],
  d:  [c('ដ', 'a'), c('ឌ', 'o')],
  ts: [c('ត', 'a', { coeng: 'ស' }), c('ត', 'a', { coeng: 'ស', shifter: '៊' })],
  ny: [c('ញ', 'o', { shifter: '\u17C9' }), c('ញ', 'o')], // ニャ行 [ɲ]。◌៉ で a系
  n:  [c('ណ', 'a'), c('ន', 'o')], // ណ は a系(Module:km-pron の class 1)
  h:  [c('ហ', 'a'), c('ហ', 'a', { shifter: '៊' })],
  f:  [c('ហ', 'a', { coeng: 'វ' }), c('ហ', 'a', { coeng: 'វ', shifter: '\u17CA' })],
  b:  [c('ប', 'a'), c('ប', 'a', { shifter: '៊' })],
  p:  [c('ផ', 'a'), c('ព', 'o')],
  m:  [c('ម', 'o', { shifter: '៉' }), c('ម', 'o')],
  y:  [c('យ', 'o', { shifter: '៉' }), c('យ', 'o')],
  r:  [c('រ', 'o', { shifter: '៉' }), c('រ', 'o')],
  w:  [c('វ', 'o', { shifter: '៉' }), c('វ', 'o')],
};
// ◌៉ を付けた o系字は a系の読みになる(shifter 付きなら実効系列は a)
export const effSeries = (cell) => (cell.shifter === '៉' ? 'a' : cell.shifter === '៊' ? 'o' : cell.series);

export const SERIES_OF_VOWEL = { a: 'a', e: 'a', i: 'o', u: 'o', o: 'o' };
export const YOON_COENG = COENG + 'យ';

// 母音記号 [短, 長]。短い開音節は ៈ(a系 a のみ)。e/o は短母音が無いので長さは右肩 ː で足す
export const VOWEL = {
  a: ['ៈ', 'ា'], // ៈ / ា
  i: ['ិ', 'ី'], // ិ / ី
  u: ['ុ', 'ូ'], // ុ / ូ
  e: ['េ', 'េ'], // េ
  o: ['ោ', 'ោ'], // ោ
};
export const VOWEL_U_MID = ['ឹ', 'ឺ']; // ឹ / ឺ (ɯ に近い側)
export const LONG_MARK = 'ː';

// カタカナ → [子音行, 母音]
const ROWS = {
  '': 'アイウエオ', k: 'カキクケコ', g: 'ガギグゲゴ', s: 'サシスセソ', z: 'ザジズゼゾ',
  t: 'タチツテト', d: 'ダヂヅデド', n: 'ナニヌネノ', h: 'ハヒフヘホ', b: 'バビブベボ',
  p: 'パピプペポ', m: 'マミムメモ', r: 'ラリルレロ',
};
export const KANA = {};
for (const [cons, kana] of Object.entries(ROWS)) [...kana].forEach((k, i) => (KANA[k] = [cons, 'aiueo'[i]]));
Object.assign(KANA, { ヤ: ['y', 'a'], ユ: ['y', 'u'], ヨ: ['y', 'o'], ワ: ['w', 'a'], ヲ: ['', 'o'], ヴ: ['b', 'u'] });
// 子音行の特例(し ち つ じ ふ)
KANA['シ'][0] = 'sh'; KANA['チ'][0] = 'ch'; KANA['ツ'][0] = 'ts'; KANA['ジ'][0] = 'j'; KANA['フ'][0] = 'f'; KANA['ヂ'][0] = 'j'; KANA['ズ'][0] = 'z'; KANA['ヅ'][0] = 'z';
export const SMALL_V = { ァ: 'a', ィ: 'i', ゥ: 'u', ェ: 'e', ォ: 'o' };
export const SMALL_Y = { ャ: 'a', ュ: 'u', ョ: 'o' };
export const PALATAL = new Set(['sh', 'ch', 'j']); // 拗音で coeng+យ を足さない子音
