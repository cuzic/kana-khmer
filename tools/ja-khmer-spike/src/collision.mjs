// ADR-0006 と同じ測り方: 1つの対立を潰したとき、新たに同綴りになる語の割合(同音の語は先に除く)
import { kanaToKhmer, ALL_MARKS } from './convert.mjs';
import { loadWords } from './vocab.mjs';

const files = process.argv.slice(2);
if (!files.length) throw new Error('usage: node collision.mjs <jmdict-json>...');
const LABEL = { sh: 'ʃ(サ/シャ、ス/シュ、ソ/ショ)', j: '有声の破擦音(チ/ジ)', len: '長短(ー)', sok: '促音(ッ)' };

// 基準 = 全対立を保った綴り。基準の時点で同綴りの語(対応表の未実装による)は、新たな衝突に数えない
const groups = (words, marks) => {
  const m = new Map();
  for (const w of words) {
    const lite = kanaToKhmer(w, { marks }).khmer;
    const full = kanaToKhmer(w).khmer;
    if (!m.has(lite)) m.set(lite, new Map());
    const g = m.get(lite);
    if (!g.has(full)) g.set(full, []);
    g.get(full).push(w);
  }
  return m;
};
const rate = (words, marks) => {
  const g = groups(words, marks);
  let hit = 0;
  const ex = [];
  for (const fulls of g.values()) {
    if (fulls.size < 2) continue;
    const ws = [...fulls.values()].map((v) => v[0]); // 綴りごとの代表
    hit += [...fulls.values()].reduce((n, v) => n + v.length, 0);
    if (ex.length < 12) ex.push(ws.slice(0, 3).join('/'));
  }
  return { hit, pct: (100 * hit) / words.length, ex };
};

for (const file of files) {
  const { words, skipped } = loadWords(file);
  console.log(`\n## ${file.split('/').pop()}: ${words.length} 語(発音の重複を除く、変換不能で除外 ${skipped})`);
  const all = rate(words, ALL_MARKS);
  const base = groups(words, ALL_MARKS);
  let dup = 0; const dupEx = [];
  for (const fulls of base.values()) for (const v of fulls.values()) if (v.length > 1) { dup += v.length; if (dupEx.length < 6) dupEx.push(v.slice(0, 3).join('/')); }
  console.log(`基準(全対立を保つ)で既に同綴りの語: ${dup} 語 (${(100 * dup / words.length).toFixed(2)}%、表の未実装。除外して測る) ${dupEx.join(' , ')}`);
  for (const a of ALL_MARKS) {
    const r = rate(words, ALL_MARKS.filter((x) => x !== a));
    console.log(`- ${a} を潰す: ${r.pct.toFixed(2)}% (${r.hit}語) ${LABEL[a]}  例: ${r.ex.slice(0, 3).join(' , ')}`);
  }
  const none = rate(words, []);
  console.log(`右肩なし(基底の文字だけ): ${none.pct.toFixed(2)}% (${none.hit}語)`);
  const shj = rate(words, ['len', 'sok']);
  console.log(`  参考: sh+j だけ潰す ${shj.pct.toFixed(2)}%`);
}
