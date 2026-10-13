// ja-khmer-spike/collision.mjs と同じ測り方。lite = 記号を減らした綴りを「韓国語話者の読み」に通した音、
// full = 全記号の綴り。lite が同じで full が違う語 = その記号を潰したときの新たな衝突。
import { kanaToHangul, pronounce, MARKS } from './hangul.mjs';
import { loadWords } from '../../ja-khmer-spike/src/vocab.mjs';
const files = process.argv.slice(2);
const spell = (w, marks) => kanaToHangul(w, new Set(marks));
const sound = (w, marks) => { const h = spell(w, marks); return h === null ? null : pronounce(h); };
const rate = (words, marks) => {
  const m = new Map();
  for (const w of words) {
    const lite = sound(w, marks), full = spell(w, MARKS);
    if (lite === null) continue;
    if (!m.has(lite)) m.set(lite, new Map());
    const g = m.get(lite); if (!g.has(full)) g.set(full, []); g.get(full).push(w);
  }
  let hit = 0; const ex = [];
  for (const fulls of m.values()) {
    if (fulls.size < 2) continue;
    hit += [...fulls.values()].reduce((n, v) => n + v.length, 0);
    if (ex.length < 4) ex.push([...fulls.values()].map((v) => v[0]).slice(0, 2).join('/'));
  }
  return { hit, pct: (100 * hit) / words.length, ex };
};
const line = (label, r) => `- ${label}: ${r.pct.toFixed(2)}% (${r.hit}語) 例: ${r.ex.join(' , ')}`;
for (const file of files) {
  const { words: all } = loadWords(file, { scopeOnly: true });
  const words = all.filter((w) => spell(w, MARKS) !== null);
  console.log(`\n## ${file.split('/').pop()}: ${words.length} 語(範囲外を除く)`);
  const w = (...xs) => MARKS.filter((m) => !xs.includes(m));
  console.log('### 個別の記号を潰す');
  console.log(line('長音(ー)を書かない', rate(words, w('len'))));
  console.log(line('ざ/じゃ・ぞ/じょ の印(zj)を書かない', rate(words, w('zj'))));
  console.log(line('ん・っ+母音 の区切り(nsep)を書かない', rate(words, w('nsep'))));
  console.log(line('促音(ッ)を書かない', rate(words, w('sok'))));
  console.log(line('全部なし(素のハングル)', rate(words, [])));
  console.log(line('  参考: 長音だけ残す', rate(words, ['len'])));
  console.log(line('  参考: 長音+促音だけ残す', rate(words, ['len', 'sok'])));
  const cnt = (re) => words.filter((x) => re.test(x)).length;
  console.log('### 頻度');
  console.log(`- ざ: ${cnt(/ザ/)}語 / じゃ: ${cnt(/ジャ/)}語 / ぞ: ${cnt(/ゾ/)}語 / じょ: ${cnt(/ジョ/)}語`);
  console.log(`- ンの直後が ア行・ヤ行・ワ: ${cnt(/ン[アイウエオヤユヨワ]/)}語`);
  console.log(`- ンの直後が ラ行(ㄴ+ㄹ の流音化): ${cnt(/ン[ラリルレロ]/)}語`);
  const bl = new Map(); for (const x of words) { const k = spell(x, MARKS); if (!bl.has(k)) bl.set(k, []); bl.get(k).push(x); }
  const dup = [...bl.values()].filter((v) => v.length > 1);
  console.log(`- 全記号で既に同綴り: ${dup.reduce((n, v) => n + v.length, 0)}語 例: ${dup.slice(0, 5).map((v) => v.slice(0, 3).join('/')).join(' , ')}`);
}
