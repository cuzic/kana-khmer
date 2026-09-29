// vocab.tsv の語ごとに英語版 Wiktionary の {{ja-pron|…|acc=…}} を取り、../../packages/ja-khmer/data/accent-ja-pron.json を作る。
//   pnpm fetch            # 直列で 20 語ずつ、間に 2 秒空ける。生のウィキテキストはディスクに保存しない
// 取れなかった語・迷う語は out/misses.json に出す(docs/research/2026-09-29-ja-accent-data-import.md の材料)。
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { kataToHira, countMorae, typeOf, pitchPattern, afterPitch, resolveAcc } from './lib.mjs';
import { japaneseSection, jaPronTemplates, parseArgs } from './wikitext.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const outFile = path.resolve(root, '../../packages/ja-khmer/data/accent-ja-pron.json');
const API = 'https://en.wiktionary.org/w/api.php';
const UA = 'kana-khmer-accent-import/0.1 (https://github.com/cuzic/kana-khmer; tomoya.kaw@gmail.com)';
const BATCH = 20, DELAY_MS = 2000;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function readVocab() {
  const seen = new Set(), rows = [];
  for (const line of fs.readFileSync(path.join(root, 'vocab.tsv'), 'utf8').split('\n')) {
    if (!line.trim() || line.startsWith('#')) continue;
    const [title, kana, from] = line.split('\t');
    const key = `${title}\t${kana}`;
    if (seen.has(key)) continue;
    seen.add(key); rows.push({ title, kana: kataToHira(kana), from: from || '' });
  }
  return rows;
}

async function fetchPages(titles) {
  const u = new URL(API);
  u.search = new URLSearchParams({ action: 'query', titles: titles.join('|'), prop: 'revisions', rvprop: 'content|ids', rvslots: 'main', redirects: '1', format: 'json', formatversion: '2' });
  const res = await fetch(u, { headers: { 'User-Agent': UA } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const d = await res.json();
  const redirect = new Map((d.query.redirects || []).map((r) => [r.from, r.to]));
  const pages = new Map(d.query.pages.map((p) => [p.title, p]));
  return titles.map((t) => {
    const p = pages.get(redirect.get(t) || t);
    const rev = p && p.revisions && p.revisions[0];
    return { title: t, actual: p && p.title, revid: rev && rev.revid, text: rev ? rev.slots.main.content : null, missing: !p || p.missing };
  });
}

const ALL_KANA = /^[ぁ-ゖァ-ヶー]+$/;

/** ページ 1 枚から、読みごとの acc 一覧(東京式とそれ以外)を集める */
function collect(page) {
  const readings = new Map();
  let last = ALL_KANA.test(page.actual) ? kataToHira(page.actual) : null;
  const get = (r) => { if (!readings.has(r)) readings.set(r, { accs: [], nonTokyo: [] }); return readings.get(r); };
  for (const args of jaPronTemplates(japaneseSection(page.text))) {
    const { pos, named } = parseArgs(args);
    const rs = pos.filter(Boolean).map((r) => kataToHira(r.replace(/[\s.]/g, '')));
    if (!rs.length && last) rs.push(last);
    if (!rs.length) continue;
    last = rs[0];
    rs.forEach((r, i) => {
      const k = i === 0 ? 'acc' : `acc${i + 1}`;
      const v = named[k];
      const slot = get(r);
      if (v == null || v === '') return;
      // acc_ref は NHK,DJR のような略号のコンマ区切り。<ref>…</ref> の注記は略号でないので落とす
      const ref = (named[`${k}_ref`] || named.acc_ref || '').split(',').map((x) => x.trim()).filter((x) => /^[A-Za-z0-9]+$/.test(x));
      let loc = named[`${k}_loc`] || (i === 0 ? named.acc_loc : '') || '';
      if (/Tokyo/.test(loc) && !/Tokyo-|Kyoto|Osaka/.test(loc)) loc = ''; // acc_loc={{w|Tokyo dialect|Tokyo}} は東京式
      for (const tok of v.split(/[,;/~\s]+/).filter(Boolean)) {
        if (loc) slot.nonTokyo.push({ tok, loc }); else slot.accs.push({ tok, refs: ref });
      }
    });
  }
  return readings;
}

/** ja-see / ja-see-kango の移動先(ページ名)。Japanese 節に ja-pron が無いページで使う */
function seeTargets(text) {
  const sec = japaneseSection(text), out = [];
  for (const m of sec.matchAll(/\{\{ja-see(?:-kango)?\|([^}]*)\}\}/g)) for (const a of m[1].split('|')) if (a && !/^[a-z_]+=/.test(a)) out.push(a.replace(/[#<].*$/, ''));
  return out;
}

const vocab = readVocab();
const today = new Date().toISOString().slice(0, 10);
const entries = [], misses = [];
const pageCache = new Map(); // title -> page(このプロセス内のみ)

async function load(titles) {
  const need = [...new Set(titles)].filter((t) => !pageCache.has(t));
  for (let i = 0; i < need.length; i += BATCH) {
    for (const p of await fetchPages(need.slice(i, i + BATCH))) pageCache.set(p.title, p);
    process.stderr.write(`fetched ${Math.min(i + BATCH, need.length)}/${need.length}\n`);
    await sleep(DELAY_MS);
  }
}

/** 語 v をページ page で評価。結果は entries/misses に積む。ja-see で移動が要るときは移動先を返す */
function evaluate(v, page, via) {
  const miss = (reason, extra) => misses.push({ word: v.title, kana: v.kana, from: v.from, reason, ...(via ? { via } : {}), ...extra });
  if (!page || page.missing || page.text == null) { miss('no-page'); return []; }
  if (!japaneseSection(page.text)) { miss('no-japanese-section'); return []; }
  const readings = collect(page);
  // こんにちは・こんばんは は Wiktionary では読みが こんにちわ・こんばんわ
  const slot = readings.get(v.kana) || readings.get(v.kana.replace(/は$/, 'わ'));
  if (!slot) {
    const t = via ? [] : seeTargets(page.text);
    if (t.length) return t;
    miss('reading-not-found', { readingsOnPage: [...readings.keys()], ...(via ? {} : { note: readings.size ? '' : 'ja-pron なし' }) });
    return [];
  }
  const moraCount = countMorae(v.kana);
  const accents = [], unresolved = [];
  for (const a of slot.accs) {
    const nucleus = resolveAcc(a.tok, moraCount);
    if (nucleus == null) { unresolved.push(a.tok); continue; }
    if (nucleus > moraCount) { unresolved.push(`${a.tok}(>${moraCount})`); continue; }
    const dup = accents.find((x) => x.nucleus === nucleus);
    if (dup) { for (const r of a.refs) if (!dup.refs.includes(r)) dup.refs.push(r); continue; }
    accents.push({ nucleus, type: typeOf(nucleus, moraCount), pattern: pitchPattern(nucleus, moraCount), afterPitch: afterPitch(nucleus), refs: [...a.refs], verified: false });
  }
  if (unresolved.length) miss('unresolved-acc', { tokens: unresolved });
  if (!accents.length) { if (!unresolved.length) miss(slot.nonTokyo.length ? 'only-non-tokyo-acc' : 'no-acc', { nonTokyo: slot.nonTokyo }); return []; }
  entries.push({
    word: v.title, kana: v.kana, moraCount, accents,
    ...(via ? { via: `ja-see: ${via}` } : {}),
    ...(slot.nonTokyo.length ? { nonTokyoOmitted: slot.nonTokyo } : {}),
    source: { url: `https://en.wiktionary.org/wiki/${encodeURIComponent(page.actual)}?oldid=${page.revid}`, revid: page.revid, retrievedAt: today },
  });
  return [];
}

await load(vocab.map((v) => v.title));
const pending = [];
for (const v of vocab) {
  const t = evaluate(v, pageCache.get(v.title));
  if (t.length) pending.push({ v, targets: t });
}
await load(pending.flatMap((p) => p.targets));
for (const { v, targets } of pending) {
  const before = entries.length;
  for (const t of targets) { if (entries.length > before) break; evaluate(v, pageCache.get(t), t); }
  if (entries.length > before) {
    // 途中の移動先で失敗した分の miss は、成功した場合は消す
    for (let i = misses.length - 1; i >= 0; i--) if (misses[i].word === v.title && misses[i].kana === v.kana) misses.splice(i, 1);
  }
}

const data = {
  _license: 'CC BY-SA 4.0 (Wiktionary の内容の抽出物。LICENSE-CC-BY-SA.txt を参照)',
  _schema: {
    word: '見出し語(Wiktionary のページ名)', kana: '読み(ひらがな。ー は長音)', moraCount: '拍数(ゃゅょ・小書きの母音は直前と合わせて1拍。っ ん ー は1拍)',
    'accents[].nucleus': '下がり目の直前の拍の番号(1 始まり)。0=平板、1=頭高、moraCount=尾高、その間=中高',
    'accents[].pattern': '辞書どおりの H/L 列(拍ごと)。平板は1拍目 L、頭高は H の後 L。1拍語の平板は "L"。語頭が重い音節の簡略化(ADR-0021 決定2)は含まない',
    'accents[].afterPitch': '無核の1拍の助詞が続いたときの助詞の高さ(平板だけ H)',
    'accents[].refs': 'Wiktionary の acc_ref(NHK・DJR など。辞典本文は取り込まない)',
    'accents[].verified': '人の確認済みか。当面すべて false(確認者は未定)', source: '出典ページの版(oldid)と取得日',
    nonTokyoOmitted: 'acc_loc つき(東京以外)で取り込まなかった値',
  },
  retrievedAt: today,
  entries,
};
fs.mkdirSync(path.dirname(outFile), { recursive: true });
fs.writeFileSync(outFile, JSON.stringify(data, null, 1) + '\n');
fs.mkdirSync(path.join(root, 'out'), { recursive: true });
fs.writeFileSync(path.join(root, 'out/misses.json'), JSON.stringify(misses, null, 1) + '\n');
console.log(`entries=${entries.length} misses=${misses.length} -> ${outFile}`);
