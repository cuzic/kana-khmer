// 語レベルの読み戻し: 音節区切りを明示した読み(意図)と、区切り無し(実際に読まれる)の一致を測る。
// クメール語の読みは、母音で終わる音節の直後に coeng の子音連続が来ると、前の音節の末子音に切り直される。
import { kanaToKhmer } from './convert.mjs';
import { loadTables, readKhmer } from './readback.mjs';
import { loadWords } from './vocab.mjs';

const luaPath = process.env.KM_PRON_LUA;
const file = process.argv.find((a) => a.endsWith('.json'));
if (!luaPath || !file) throw new Error('usage: KM_PRON_LUA=km-pron.lua node verify-words.mjs <jmdict.json>');
const T = loadTables(luaPath);
const strip = (s) => s.replace(/[ᶴᶾː]/gu, '');
const { words } = loadWords(file);

let n = 0, unreadable = 0, differ = 0;
const causes = new Map(); const ex = []; const uex = [];
for (const w of words) {
  const sep = strip(kanaToKhmer(w, { sep: '-' }).khmer);
  const nat = strip(kanaToKhmer(w).khmer);
  if (sep.includes(' ')) continue;
  n++;
  const a = readKhmer(T, sep), b = readKhmer(T, nat);
  if (a === null || b === null) { unreadable++; if (uex.length < 8) uex.push(`${w}: ${a === null ? sep : nat}`); continue; }
  if (a.replace(/\./g, '') !== b.replace(/\./g, '') || a.split('.').length !== b.split('.').length) {
    differ++;
    const cause = /្យ/u.test(nat) ? 'coeng+យ(拗音)' : /ហ្[កគសវ]/u.test(nat) ? 'ហ្ក ហ្គ ហ្ស ហ្វ(が・ざ・ふ行)' : /ត្ស/u.test(nat) ? 'ត្ស(つ)' : /្/u.test(nat) ? 'その他の coeng' : '末子音・その他';
    causes.set(cause, (causes.get(cause) ?? 0) + 1);
    if (ex.length < 12) ex.push(`${w}: ${sep} → ${a} / 実際 ${nat} → ${b}`);
  }
}
console.log(`${file.split('/').pop()}: ${n} 語のうち、読みが意図とずれる語 ${differ} (${(100 * differ / n).toFixed(1)}%)、読めない語 ${unreadable}`);
console.log([...causes].map(([k, v]) => `- ${k}: ${v}`).join('\n'));
console.log(ex.join('\n'));
console.log('読めない例:\n' + uex.join('\n'));
