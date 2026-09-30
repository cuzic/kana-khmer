import fs from 'node:fs';
import { convertWord, POLICIES } from './convert.mjs';
import { thPron, prefetch, parseIpa } from './readback.mjs';
import { OFFICIAL } from './official.mjs';

const md = [];
const log = (s = '') => md.push(s);

// 1. 官報の例との一致(方針 A = 官報どおりのはず。B・C・D は差分の参考)
log('# ja-thai spike 結果(自動生成)\n');
log('## 1. 官報の例との一致(独立な検査)\n');
for (const p of ['A']) {
  let ok = 0; const ng = [];
  for (const { k, alts } of OFFICIAL) {
    const g = convertWord(k, p).thai;
    if (alts.includes(g)) ok++; else ng.push(`${k}: 生成 ${g} / 官報 ${alts.join('|')}`);
  }
  log(`方針 ${p}: ${ok}/${OFFICIAL.length} 一致\n`);
  for (const l of ng) log(`- ${l}`);
  log();
}

// 2. ko-ja フレーズの発音カタカナ(語単位)を集める
const src = fs.readFileSync(new URL('../../../courses/ko-ja/phrases.yaml', import.meta.url), 'utf8');
const prons = [...new Set([...src.matchAll(/pron:\s*"?([ァ-ヺー]+)"?/g)].map((m) => m[1]))];
const words = [...new Set([...prons, ...OFFICIAL.map((o) => o.k)])];
log(`## 2. th-pron 読み戻し(ko-ja の pron ${prons.length} 語 + 官報例 ${OFFICIAL.length} 語)\n`);

// 先に全部まとめて取得(429 対策)
const need = [];
for (const w of words) for (const p of Object.keys(POLICIES)) { try { need.push(convertWord(w, p).sylls.map((s) => s.t).join('-')); } catch {} }
await prefetch(need);
const stat = {};
const detail = {};
for (const p of Object.keys(POLICIES)) {
  stat[p] = { syll: 0, mid: 0, low: 0, high: 0, other: 0, lenBad: 0, glottal: 0, failed: 0 };
  detail[p] = [];
}
for (const w of words) {
  for (const p of Object.keys(POLICIES)) {
    let r;
    try { r = convertWord(w, p); } catch (e) { stat[p].failed++; if (p === 'A') log(`- 変換不可: ${w} (${e.message})`); continue; }
    const ipa = thPron(r.sylls.map((s) => s.t).join('-'));
    const st = stat[p];
    if (!ipa) { st.failed++; continue; }
    const rb = parseIpa(ipa);
    if (rb.length !== r.sylls.length) { st.failed++; continue; }
    const bad = [];
    rb.forEach((x, i) => {
      st.syll++;
      if (x.tone === 'mid') st.mid++; else if (x.tone === 'low') st.low++; else if (x.tone === 'high') st.high++; else st.other++;
      if (x.glottal) st.glottal++;
      const s = r.sylls[i];
      const wantLong = s.thaiLong;
      if (wantLong !== null && x.long !== wantLong) st.lenBad++;
      if (x.tone !== 'mid') bad.push(`${s.t}=${x.tone}`);
    });
    detail[p].push({ w, thai: r.thai, ipa, bad });
  }
}
log('| 方針 | 音節数 | 中声調 | 低 | 高 | 下降・上昇 | 声門閉鎖(ʔ) | 長短の食い違い | 失敗語 |');
log('|---|---|---|---|---|---|---|---|---|');
for (const [p, s] of Object.entries(stat)) log(`| ${p} ${JSON.stringify(POLICIES[p])} | ${s.syll} | ${s.mid} (${((100 * s.mid) / s.syll).toFixed(1)}%) | ${s.low} | ${s.high} | ${s.other} | ${s.glottal} | ${s.lenBad} | ${s.failed} |`);
log('\n## 3. 方針 A で中声調にならない音節を含む語(上位)\n');
for (const d of detail.A.filter((d) => d.bad.length).slice(0, 60)) log(`- ${d.w} → ${d.thai}  ${d.ipa}  ← ${d.bad.join(' ')}`);
log('\n## 4. 方針 B(短形)の同じ語\n');
for (const d of detail.B.filter((d) => d.bad.length).slice(0, 40)) log(`- ${d.w} → ${d.thai}  ${d.ipa}  ← ${d.bad.join(' ')}`);
fs.writeFileSync(new URL('../out/report.md', import.meta.url), md.join('\n'));
console.log(md.slice(0, 40).join('\n'));
