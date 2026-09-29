import { CONS, effSeries, SERIES_OF_VOWEL, YOON_COENG, VOWEL, VOWEL_U_MID, LONG_MARK, KANA, SMALL_V, SMALL_Y, PALATAL } from './table.mjs';

const COENG = '្';
export const ALL_MARKS = ['sh', 'j', 'len', 'sok'];
const isKana = (ch) => KANA[ch] || SMALL_V[ch] || SMALL_Y[ch] || 'ッンー'.includes(ch);

/** カタカナ発音文字列 → モーラ列。失敗した文字は {raw} で返す */
export function toMoras(kata, tok = 0, out = []) {
  for (const ch of kata) {
    const last = out[out.length - 1];
    const n = out.length;
    if (ch === 'ー') { if (last && !last.raw) last.long = true; else out.push({ raw: ch }); }
    else if (ch === 'ッ') out.push({ sokuon: true });
    else if (ch === 'ン') out.push({ moraic: true });
    else if (SMALL_V[ch] && last && last.c !== undefined && !last.yoon && !last.smallV && last.c === '' && last.v === 'u') { last.c = 'w'; last.v = SMALL_V[ch]; last.smallV = true; } // ウィ ウェ ウォ ウァ = w+母音
    else if (SMALL_V[ch] && last && last.c !== undefined && !last.yoon && !last.smallV && SMALL_V[ch] === last.v) last.long = true; // ナァ、アァ = 長音
    else if (SMALL_V[ch] && last && last.c !== undefined && !last.yoon) { last.v = SMALL_V[ch]; last.smallV = true; }
    else if (SMALL_Y[ch] && last && last.c !== undefined && !last.yoon) { last.v = SMALL_Y[ch]; last.yoon = !PALATAL.has(last.c); last.smallY = true; }
    else if (KANA[ch]) out.push({ c: KANA[ch][0], v: KANA[ch][1], src: ch });
    else out.push({ raw: ch });
    if (out.length > n) out[out.length - 1].tok = tok;
  }
  return out;
}

/** モーラ列 → 音節列(促音・撥音は直前音節の末子音にする) */
function toSyllables(moras, marks) {
  const syl = [];
  for (let i = 0; i < moras.length; i++) {
    const m = moras[i];
    if (m.raw) syl.push(m);
    else if (m.moraic) {
      const prev = syl[syl.length - 1];
      if (prev && !prev.raw && !prev.coda) prev.coda = { type: 'N', next: nextCons(moras, i + 1) };
      else syl.push({ standaloneN: true, tok: m.tok, next: nextCons(moras, i + 1) });
    } else if (m.sokuon) {
      if (!marks.has('sok')) continue;
      const prev = syl[syl.length - 1];
      const next = nextCons(moras, i + 1);
      if (prev && !prev.raw && !prev.coda) prev.coda = { type: 'Q', next };
    } else syl.push({ ...m });
  }
  return syl;
}
function nextCons(moras, i) { const m = moras[i]; return m && m.c !== undefined ? m.c : null; }

const N_CODA = (next) => (['p', 'b', 'm'].includes(next) ? 'ម' : ['k', 'g'].includes(next) ? 'ង' : 'ន');
const Q_CODA = (next) => (['p'].includes(next) ? 'ប' : ['k', 'g'].includes(next) ? 'ក' : 'ត');

/** 1音節 → { text, flags } */
function render(s, opts) {
  const marks = opts.marks;
  if (!marks.has('len')) s = { ...s, long: false };
  const flags = [];
  const want = SERIES_OF_VOWEL[s.v];
  const cell = CONS[s.c][want === 'a' ? 0 : 1];
  const eff = effSeries(cell);
  const tag = `${s.src ?? s.c + s.v}${s.smallV || s.smallY ? '(拗/小)' : ''}`;
  if (eff !== want) flags.push({ kind: 'SERIES_MISMATCH', at: tag, note: `${s.c}+${s.v}: 欲しい系列 ${want} だが字 ${cell.base}${cell.shifter ?? ''} は実効 ${eff}系` });
  if (s.c === 'g' || s.c === 'z' || s.c === 'ts' || s.c === 'f') flags.push({ kind: 'CONVENTION', at: tag, note: `${s.c}: 借用語の慣習的綴りで、音価・系列の確認が要る` });
  let t = cell.base + (cell.coeng ? COENG + cell.coeng : '') + (s.yoon ? YOON_COENG : '') + (cell.shifter ?? '');
  let vsign;
  const tbl = s.v === 'u' && opts.uMid ? VOWEL_U_MID : VOWEL[s.v];
  const short = tbl[0], long = tbl[1];
  const lenMark = s.long && (s.v === 'e' || s.v === 'o') ? LONG_MARK : '';
  if (s.coda) {
    vsign = s.long ? long : (s.v === 'a' ? '' : short); // a系 a は固有母音+末子音、ៈ は付けない
    if (!s.long && (s.v === 'i' || s.v === 'u')) flags.push({ kind: 'SHORT_BEFORE_FINAL', at: tag, note: `${s.v} の短母音記号は末子音の前で母音が変わる(◌ិ→[ə]/[ɨ]、◌ុ→[o]/[u])` });
    const ch = s.coda.type === 'N' ? N_CODA(s.coda.next) : Q_CODA(s.coda.next);
    if (s.coda.type === 'Q') flags.push({ kind: 'SOKUON', at: tag, note: '促音を末子音の破裂音で近似(長母音後の ក は声門閉鎖になりうる)' });
    t += vsign + lenMark + ch;
  } else {
    vsign = s.long ? long : short;
    t += vsign + lenMark;
  }
  if (s.c === '' && s.v === 'a' && !s.long && !s.coda) t = 'អ' + VOWEL.a[0]; // あ
  if (marks.has('sh') && s.c === 'sh') t += 'ᶴ'; // 右肩 ʃ
  if (marks.has('j') && s.c === 'j') t += 'ᶾ'; // 右肩 ʒ(有声)
  return { text: t, flags };
}

/** 発音の配列(トークンごと)→ { khmer(トークンをスペースで区切る), flags, unknown }。ン・ッ はトークンをまたいで前の音節に付く */
export function kanaToKhmer(katas, opts = {}) {
  opts = { ...opts, marks: new Set(opts.marks ?? ALL_MARKS) };
  const list = Array.isArray(katas) ? katas : [katas];
  const moras = [];
  list.forEach((k, i) => toMoras(k, i, moras));
  const syl = toSyllables(moras, opts.marks);
  let khmer = '';
  let curTok = null;
  const flags = [];
  const unknown = [];
  for (const s of syl) {
    if (curTok !== null && s.tok !== curTok && !s.standaloneN) khmer += ' ';
    if (s.tok !== undefined) curTok = s.tok;
    if (s.raw) { khmer += s.raw; if (!/[、。?!？！\s「」・]/.test(s.raw)) unknown.push(s.raw); continue; }
    if (s.standaloneN) { khmer += N_CODA(s.next); flags.push({ kind: 'STANDALONE_N', at: 'ン', note: '単独のン' }); continue; }
    const r = render(s, opts);
    khmer += r.text;
    flags.push(...r.flags);
  }
  return { khmer, flags, unknown };
}
