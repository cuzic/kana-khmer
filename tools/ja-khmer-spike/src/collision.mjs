// ADR-0006 と同じ測り方: 1つの対立を潰したとき、新たに同綴りになる語の割合(同音の語は先に除く)。
// 既定は設計書 v0.7 の表(spec)。--table=v0 で ADR-0017 の仮表(table.mjs・convert.mjs)。
// usage: node collision.mjs [--table=spec|v0] [--scope-only] [--long=c|a|colon] <jmdict-json>...
import { kanaToKhmer, ALL_MARKS } from './convert.mjs';
import { kanaToKhmerSpec, SPEC_MARKS } from './convert-spec.mjs';
import { loadWords } from './vocab.mjs';

const args = process.argv.slice(2);
const files = args.filter((a) => !a.startsWith('--'));
const useV0 = args.includes('--table=v0');
const scopeOnly = args.includes('--scope-only') || !useV0;
const longStyle = (args.find((a) => a.startsWith('--long=')) ?? '--long=c').slice(7); // c | a | colon(旧案の ː)
if (!files.length) throw new Error('usage: node collision.mjs [--table=spec|v0] [--scope-only] <jmdict-json>...');

const ALL = useV0 ? ALL_MARKS : SPEC_MARKS;
const render = useV0
  ? (w, marks) => kanaToKhmer(w, { marks }).khmer
  : (w, marks) => kanaToKhmerSpec(w, new Set(marks), longStyle);

// marks を制限した綴りが同じで、全対立を保った綴りが違う語の割合
const rate = (words, marks) => {
  const m = new Map();
  for (const w of words) {
    const lite = render(w, marks), full = render(w, ALL);
    if (lite === null) continue;
    if (!m.has(lite)) m.set(lite, new Map());
    const g = m.get(lite);
    if (!g.has(full)) g.set(full, []);
    g.get(full).push(w);
  }
  let hit = 0; const ex = [];
  for (const fulls of m.values()) {
    if (fulls.size < 2) continue;
    hit += [...fulls.values()].reduce((n, v) => n + v.length, 0);
    if (ex.length < 3) ex.push([...fulls.values()].map((v) => v[0]).slice(0, 2).join('/'));
  }
  return { hit, pct: (100 * hit) / words.length, ex };
};
const line = (label, r) => `- ${label}: ${r.pct.toFixed(2)}% (${r.hit}語) 例: ${r.ex.join(' , ')}`;

// 基準(全対立を保つ)で既に同綴りの語。表の許容・未実装による(新たな衝突には数えない)
const baseline = (words) => {
  const g = new Map();
  for (const w of words) { const k = render(w, ALL); if (k === null) continue; if (!g.has(k)) g.set(k, []); g.get(k).push(w); }
  let dup = 0; const ex = [];
  for (const v of g.values()) if (v.length > 1) { dup += v.length; if (ex.length < 6) ex.push(v.slice(0, 3).join('/')); }
  return { dup, ex, groups: g };
};

// 許容した同綴りの組を、かなの置換で個別に測る(表を通さない。同じ形になる語の割合)
const PAIRS = {
  'ず・づ/ぞ(ズ→ゾ)': (w) => w.replace(/ズ/g, 'ゾ'),
  'じゃ/ちゃ(チャ→ジャ)': (w) => w.replace(/チャ/g, 'ジャ'),
  'ず・づ/ぞ + じゃ/ちゃ': (w) => w.replace(/ズ/g, 'ゾ').replace(/チャ/g, 'ジャ'),
};
const pairRate = (words, fn) => {
  const g = new Map();
  for (const w of words) { const c = fn(w); if (!g.has(c)) g.set(c, []); g.get(c).push(w); }
  let hit = 0; const ex = [];
  for (const v of g.values()) if (v.length > 1) { hit += v.length; if (ex.length < 3) ex.push(v.slice(0, 2).join('/')); }
  return { hit, pct: (100 * hit) / words.length, ex };
};

for (const file of files) {
  const { words: all, skipped } = loadWords(file, { scopeOnly });
  const words = useV0 ? all : all.filter((w) => render(w, ALL) !== null);
  console.log(`\n## ${file.split('/').pop()} [${useV0 ? 'v0 仮表(ADR-0017)' : '設計書 v0.7 の表'}${scopeOnly ? '、範囲外の語を除く' : ''}]: ${words.length} 語(発音の重複を除く。除外・変換不能 ${skipped + all.length - words.length})`);
  const b = baseline(words);
  console.log(`基準(全対立を保つ)で既に同綴りの語: ${b.dup} 語 (${(100 * b.dup / words.length).toFixed(2)}%。新たな衝突に数えない) ${b.ex.join(' , ')}`);
  if (useV0) {
    const LABEL = { sh: 'ʃ(サ/シャ、ス/シュ、ソ/ショ)', j: '有声の破擦音(チ/ジ)', len: '長短(ー)', sok: '促音(ッ)' };
    for (const a of ALL) console.log(line(`${a} を潰す ${LABEL[a]}`, rate(words, ALL.filter((x) => x !== a))));
    console.log(line('右肩なし(基底の文字だけ)', rate(words, [])));
    console.log(line('  参考: sh+j だけ潰す', rate(words, ['len', 'sok'])));
    continue;
  }
  const without = (...xs) => SPEC_MARKS.filter((m) => !xs.includes(m));
  console.log('### 個別の記号を潰す');
  console.log(line('(a) 長音マーカーを潰す', rate(words, without('len'))));
  console.log(line('(b) ˢʰ を潰す(サ/シャ・ス/シュ・ショ/チョ の合計)', rate(words, without('sha', 'shu', 'sho'))));
  console.log(line('    個別: サ/シャ(しゃ の ˢʰ だけ)', rate(words, without('sha'))));
  console.log(line('    個別: ス/シュ(しゅ の ˢʰ だけ)', rate(words, without('shu'))));
  console.log(line('    個別: ショ/チョ(しょ の ˢʰ だけ)', rate(words, without('sho'))));
  console.log(line('(g) 促音(ッ)を書かない(参考。旧表の 3.4%/1.9% と比べる)', rate(words, without('sok'))));
  console.log('### ライト相当');
  console.log(line('(c1) 右肩・長音(長音マーカー ˢʰ)を全部なし(促音は残す)', rate(words, ['sok'])));
  console.log(line('(c2) 右肩・長音・促音を全部なし(旧表の「右肩を全部なし」と同じ定義)', rate(words, [])));
  console.log('### 許容した同綴りの組(表を通さず、かなの置換で測る)');
  for (const [k, fn] of Object.entries(PAIRS)) console.log(line(k, pairRate(words, fn)));
  console.log('### (e) 新表で残っている同綴り(基準時点)の原因別');
  const canonPair = (w) => w.replace(/ズ/g, 'ゾ').replace(/チャ/g, 'ジャ');
  const canonInterj = (w) => w.replace(/ー+/g, 'ー').replace(/ッ+$/, '');
  const tally = { pair: [], interj: [], other: [] };
  for (const ws of b.groups.values()) {
    if (ws.length < 2) continue;
    const cause = new Set(ws.map(canonPair)).size === 1 ? 'pair' : new Set(ws.map(canonInterj)).size === 1 ? 'interj' : 'other';
    tally[cause].push(ws);
  }
  const n = (a) => a.reduce((x, ws) => x + ws.length, 0);
  const exs = (a) => a.slice(0, 6).map((ws) => ws.slice(0, 3).join('/')).join(' , ');
  console.log(`- 許容した ず・づ/ぞ・じゃ/ちゃ: ${n(tally.pair)} 語 (${(100 * n(tally.pair) / words.length).toFixed(2)}%) 例: ${exs(tally.pair)}`);
  console.log(`- 語末の ッ・ー の重複(感動詞。設計書 §6.2 の語末 ッ は要決定、ー の重複は規則なし): ${n(tally.interj)} 語 (${(100 * n(tally.interj) / words.length).toFixed(2)}%) 例: ${exs(tally.interj)}`);
  console.log(`- その他: ${n(tally.other)} 語 例: ${exs(tally.other)}`);
}
