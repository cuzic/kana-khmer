// Wiktionary の th-pron(Module:th-pron)で、ハイフン区切りのタイ文字から IPA・声調・母音長を読み戻す。
// 結果は out/thpron-cache.json にキャッシュする。
import fs from 'node:fs';
const CACHE = new URL('../out/thpron-cache.json', import.meta.url);
let cache = fs.existsSync(CACHE) ? JSON.parse(fs.readFileSync(CACHE, 'utf8')) : {};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** 未取得のものをまとめて取得(1リクエストに複数テンプレート)。失敗はキャッシュしない。429 は待って再試行 */
export async function prefetch(list, batch = 25) {
  const todo = [...new Set(list)].filter((h) => cache[h] === undefined);
  for (let i = 0; i < todo.length; i += batch) {
    const chunk = todo.slice(i, i + batch);
    const body = new URLSearchParams({ action: 'expandtemplates', format: 'json', prop: 'wikitext', text: chunk.map((h) => `{{th-pron|${h}}}`).join('@@@') });
    for (let tries = 0; tries < 8; tries++) {
      const r = await fetch('https://en.wiktionary.org/w/api.php', { method: 'POST', body, headers: { 'User-Agent': 'kana-khmer-research/0.1 (ja-thai spike)' } });
      const txt = await r.text();
      let wt = null;
      try { wt = JSON.parse(txt).expandtemplates?.wikitext; } catch {}
      const parts = wt?.split('@@@');
      if (parts && parts.length === chunk.length) {
        parts.forEach((p, k) => { const m = p.match(/<span class="IPA">(.*?)<\/span>/); cache[chunk[k]] = m ? m[1].replace(/<[^>]+>/g, '').replace(/^\/|\/$/g, '') : ''; });
        break;
      }
      await sleep(15000 * (tries + 1));
    }
    fs.writeFileSync(CACHE, JSON.stringify(cache));
    await sleep(1500);
  }
}
export const thPron = (h) => cache[h] ?? '';

const TONES = { '˧': 'mid', '˨˩': 'low', '˦˥': 'high', '˥˩': 'fall', '˩˩˦': 'rise' };
/** IPA → [{ tone, long, glottal }](音節ごと) */
export function parseIpa(ipa) {
  return ipa.split('.').map((s) => {
    const tm = s.match(/[˥˦˧˨˩]+$/);
    return { tone: tm ? TONES[tm[0]] ?? tm[0] : '?', long: s.includes('ː'), glottal: s.includes('ʔ') };
  });
}
