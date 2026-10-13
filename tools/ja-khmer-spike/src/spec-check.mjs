// 設計書の表の読み込みの検査と、全かな(短・長)の同綴りの一覧
import { specTable, kanaToKhmerSpec } from './convert-spec.mjs';
const keys = Object.keys(specTable);
console.log('設計書の表から読んだ行数:', keys.length, '(期待 103。ん を除く)');
if (keys.length !== 103) process.exitCode = 1;
const groups = new Map();
for (const k of keys) for (const suffix of ['', 'ー']) {
  const kata = [...k].map((c) => (c >= 'ぁ' && c <= 'ゖ' ? String.fromCharCode(c.charCodeAt(0) + 0x60) : c)).join('') + suffix;
  const out = kanaToKhmerSpec(kata);
  if (!groups.has(out)) groups.set(out, []);
  groups.get(out).push(k + suffix);
}
for (const [out, ks] of groups) if (ks.length > 1) console.log('同綴り:', out, '←', ks.join(' '));
