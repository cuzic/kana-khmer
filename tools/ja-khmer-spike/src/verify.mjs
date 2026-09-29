// 生成したクメール文字を、独立の読み戻し(Wiktionary Module:km-pron の移植)で IPA にして、意図した日本語音と照らす。
// 意図との一致は「許容集合」で判定する(音声の近さ。厳密な同一ではない)。
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { KANA, SMALL_Y, PALATAL } from './table.mjs';
import { toMoras } from './convert.mjs';
import { kanaToKhmer } from './convert.mjs';
import { loadTables, readKhmer } from './readback.mjs';

const luaPath = process.env.KM_PRON_LUA || process.argv.find((a) => a.endsWith('.lua'));
if (!luaPath) throw new Error('usage: KM_PRON_LUA=km-pron.lua node verify.mjs [--u-mid]');
const T = loadTables(luaPath);
const uMid = process.argv.includes('--u-mid');

const INIT = { '': ['ʔ', ''], k: ['k', 'kʰ'], g: ['ɡ'], ny: ['ɲ'], s: ['s'], sh: ['s'], z: ['z'], j: ['c'], ch: ['c', 'cʰ'], t: ['t', 'tʰ'], d: ['ɗ', 'd'], ts: ['ts', 's', 't'], n: ['n'], h: ['h'], f: ['f'], b: ['ɓ', 'b'], p: ['p', 'pʰ'], m: ['m'], y: ['j'], r: ['r', 'ɾ'], w: ['ʋ', 'w'] };
// 母音の許容(末尾の ʔ は短い開音節の声門閉鎖として許す)
const NUC = {
  a: { s: ['a', 'ɑ'], l: ['aː', 'ɑː'] },
  i: { s: ['i'], l: ['iː'] },
  u: { s: uMid ? ['ɨ', 'ə'] : ['u'], l: uMid ? ['ɨː'] : ['uː'] },
  e: { s: ['e', 'eː'], l: ['eː'] },
  o: { s: ['o', 'oː'], l: ['oː'] },
};
const esc = (x) => x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const CODA = { N: ['n', 'ŋ', 'm'], Q: ['k', 't', 'p', 'ʔ'] };

function expected(m, coda) {
  const init = INIT[m.c].map(esc).join('|');
  const nucs = (coda && m.v === 'i' ? ['i', 'iː'] : NUC[m.v][m.long ? 'l' : 's']).map(esc).join('|');
  const glide = m.yoon ? 'j' : '';
  const codaRe = coda ? `(${CODA[coda].map(esc).join('|')})` : 'ʔ?';
  return new RegExp(`^(${init})${glide}(${nucs})${codaRe}$`, 'u');
}
const strip = (s) => s.replace(/[ᶴᶾː]/gu, '');

const cases = [];
for (const [k, [c0, v]] of Object.entries(KANA)) {
  if (k === 'ヲ' || k === 'ヴ') continue;
  for (const long of [false, true]) cases.push({ kana: k + (long ? 'ー' : ''), m: { c: c0, v, long }, coda: null });
  cases.push({ kana: k + 'ン', m: { c: c0, v, long: false }, coda: 'N', input: k + 'ン' });
  cases.push({ kana: k + 'ッ', m: { c: c0, v, long: false }, coda: 'Q', input: k + 'ッカ' });
}
for (const base of 'キシチニヒミリギジビピ') for (const [y, v] of Object.entries(SMALL_Y)) {
  const c0 = KANA[base][0] === 'n' ? 'ny' : KANA[base][0];
  for (const long of [false, true]) cases.push({ kana: base + y + (long ? 'ー' : ''), m: { c: c0, v, long, yoon: !PALATAL.has(c0) && c0 !== 'ny' }, coda: null });
}
const rows = []; const bad = new Map();
for (const cs of cases) {
  const inp = cs.input ?? cs.kana;
  let khmer = strip(kanaToKhmer(inp, { uMid }).khmer);
  if (cs.coda === 'Q') khmer = khmer.slice(0, -'កៈ'.length); // 促音は後ろに「カ」を付けて作ったので、その音節を除く
  const reading = readKhmer(T, khmer);
  const ok = reading !== null && expected(cs.m, cs.coda).test(reading.replace(/[.ˈ]/g, ''));
  rows.push({ kana: cs.kana, khmer, reading, ok });
  if (!ok) { const key = `${cs.m.c}+${cs.m.v}${cs.m.long ? 'ː' : ''}${cs.m.yoon ? 'y' : ''}${cs.coda ? '+' + cs.coda : ''}`; bad.set(key, (bad.get(key) ?? 0) + 1); }
}
const okN = rows.filter((r) => r.ok).length;
const md = `# 読み戻し検証(独立実装: Module:km-pron の JS 移植)\n\n設定: u=${uMid ? 'ឹ/ឺ' : 'ុ/ូ'}\n\n一致 ${okN} / ${rows.length}\n\n## 不一致\n\n| かな | クメール文字 | 読み戻し IPA |\n|---|---|---|\n${rows.filter((r) => !r.ok).map((r) => `| ${r.kana} | ${r.khmer} | ${r.reading ?? '(読めない)'} |`).join('\n')}\n`;
fs.mkdirSync(path.join(path.dirname(fileURLToPath(import.meta.url)), '../out'), { recursive: true });
fs.writeFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), `../out/verify${uMid ? '-umid' : ''}.md`), md);
console.log(md.split('\n## 不一致')[0]);
console.log('不一致の型(子音+母音):', [...bad].map(([k, n]) => `${k}×${n}`).join(' '));
