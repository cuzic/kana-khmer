// accent-ja-pron.json の形式検証(拍数と型の整合、下がり目の位置が範囲内か、H/L 列の形、未確認フラグ)。
//   pnpm validate [ファイル]   失敗があれば終了コード 1
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { countMorae, typeOf, pitchPattern, afterPitch } from './lib.mjs';

const file = process.argv[2] || path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../packages/ja-khmer/data/accent-ja-pron.json');
const d = JSON.parse(fs.readFileSync(file, 'utf8'));
const errs = [];
const seen = new Set();
for (const e of d.entries) {
  const id = `${e.word}/${e.kana}`;
  const bad = (m) => errs.push(`${id}: ${m}`);
  if (seen.has(id)) bad('重複'); seen.add(id);
  if (!/^[ぁ-ゖー]+$/.test(e.kana)) bad('kana がひらがな(と ー)でない');
  if (e.moraCount !== countMorae(e.kana)) bad(`moraCount ${e.moraCount} != ${countMorae(e.kana)}`);
  if (!e.source || !/^https:\/\/en\.wiktionary\.org\/wiki\/.+\?oldid=\d+$/.test(e.source.url) || !/^\d{4}-\d\d-\d\d$/.test(e.source.retrievedAt) || !Number.isInteger(e.source.revid)) bad('source が不正');
  if (!Array.isArray(e.accents) || !e.accents.length) { bad('accents が空'); continue; }
  const nuc = new Set();
  for (const a of e.accents) {
    if (!Number.isInteger(a.nucleus) || a.nucleus < 0 || a.nucleus > e.moraCount) bad(`nucleus ${a.nucleus} が範囲外(0..${e.moraCount})`);
    if (nuc.has(a.nucleus)) bad(`nucleus ${a.nucleus} が重複`); nuc.add(a.nucleus);
    if (a.type !== typeOf(a.nucleus, e.moraCount)) bad(`type ${a.type} が nucleus ${a.nucleus} と合わない`);
    if (a.pattern !== pitchPattern(a.nucleus, e.moraCount)) bad(`pattern ${a.pattern} が nucleus ${a.nucleus}/${e.moraCount}拍 と合わない`);
    if (a.afterPitch !== afterPitch(a.nucleus)) bad('afterPitch が合わない');
    if (a.verified !== false) bad('verified は当面 false のみ(確認者が決まってから true を許す)');
  }
}
console.log(`${d.entries.length} entries, ${errs.length} errors`);
for (const m of errs) console.error(m);
process.exit(errs.length ? 1 : 0);
