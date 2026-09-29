import kuromoji from 'kuromoji';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { kanaToKhmer } from './convert.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const dicPath = path.join(here, '../node_modules/kuromoji/dict');
const SAMPLES = fs.readFileSync(path.join(here, 'samples.txt'), 'utf8').split('\n').map((s) => s.trim()).filter(Boolean);
const uMid = process.argv.includes('--u-mid');

kuromoji.builder({ dicPath }).build((err, tokenizer) => {
  if (err) throw err;
  const flagCount = new Map();
  const lines = [];
  for (const text of SAMPLES) {
    const toks = tokenizer.tokenize(text);
    const prons = toks.map((t) => (t.pronunciation && t.pronunciation !== '*' ? t.pronunciation : t.surface_form));
    const r = kanaToKhmer(prons, { uMid });
    for (const f of r.flags) { const k = `${f.kind}\t${f.note}`; flagCount.set(k, (flagCount.get(k) ?? 0) + 1); }
    lines.push(`- ${text}\n  - 発音: ${prons.join(' ')}\n  - クメール文字: ${r.khmer}` +
      (r.unknown.length ? `\n  - 変換不能: ${r.unknown.join('')}` : ''));
  }
  const gaps = [...flagCount].sort((a, b) => b[1] - a[1]).map(([k, n]) => `- ${n}回 ${k.replace('\t', ' — ')}`);
  const md = `# ja→khmer スパイク出力(仮の対応表・未確認)\n\n設定: u=${uMid ? 'ឹ/ឺ(ɯ寄り)' : 'ុ/ូ'}\n\n## 変換結果\n\n${lines.join('\n')}\n\n## 対応表の穴(フラグ集計)\n\n${gaps.join('\n')}\n`;
  fs.mkdirSync(path.join(here, '../out'), { recursive: true });
  fs.writeFileSync(path.join(here, `../out/samples${uMid ? '-umid' : ''}.md`), md);
  console.log(md);
});
