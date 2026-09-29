// 全かな(短・長)を変換し、同じクメール文字に潰れる衝突を数える
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { KANA, SMALL_Y, PALATAL } from './table.mjs';
import { kanaToKhmer } from './convert.mjs';

const uMid = process.argv.includes('--u-mid');
const inputs = [];
for (const k of Object.keys(KANA)) { inputs.push(k, k + 'ー'); }
for (const base of 'キシチニヒミリギジビピ') for (const y of Object.keys(SMALL_Y)) { inputs.push(base + y, base + y + 'ー'); }
for (const k of Object.keys(KANA)) inputs.push(k + 'ン', 'ッ' + k, k + 'ッカ');
const byOut = new Map();
const rows = [];
for (const k of new Set(inputs)) {
  const r = kanaToKhmer(k.startsWith('ッ') ? k.slice(1) : k, { uMid });
  rows.push(`| ${k} | ${r.khmer} | ${[...new Set(r.flags.map((f) => f.kind))].join(', ')} |`);
  if (!k.startsWith('ッ') && !k.endsWith('ッカ')) { if (!byOut.has(r.khmer)) byOut.set(r.khmer, []); byOut.get(r.khmer).push(k); }
}
const coll = [...byOut].filter(([, v]) => v.length > 1).map(([o, v]) => `- ${o} ← ${v.join(' / ')}`);
const md = `# 全かな対応と衝突(スパイク)\n\n衝突(異なる入力が同じクメール文字になる): ${coll.length} 組\n\n${coll.join('\n')}\n\n## 全表\n\n| かな | クメール文字 | フラグ |\n|---|---|---|\n${rows.join('\n')}\n`;
const out = path.join(path.dirname(fileURLToPath(import.meta.url)), `../out/table${uMid ? '-umid' : ''}.md`);
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, md);
console.log(md.split('\n## 全表')[0]);
