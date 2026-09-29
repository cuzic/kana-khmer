import fs from 'node:fs';
const H2K = (s) => s.replace(/[ぁ-ゖ]/g, (c) => String.fromCharCode(c.charCodeAt(0) + 0x60));
const A = 'アカサタナハマヤラワガザダバパァャ', I = 'イキシチニヒミリギジヂビピィ', U = 'ウクスツヌフムユルグズヅブプゥュ', E = 'エケセテネヘメレゲゼデベペェ', O = 'オコソトノホモヨロヲゴゾドボポォョ';
const NORM = { ヲ: 'オ', ヂ: 'ジ', ヅ: 'ズ' };

/** JMdict の仮名表記 → 発音風カタカナ(長音を ー に、ヲ ヂ ヅ を同音に寄せる)。使えない文字を含む語は null */
export function toPron(reading) {
  let k = H2K(reading).replace(/[ヲヂヅ]/g, (c) => NORM[c]);
  if (/[^\u30A1-\u30FA\u30FC]/.test(k) || /ヴ|ヮ|ヵ|ヶ|・/.test(k)) return null;
  let out = '';
  for (const ch of k) {
    const prev = out[out.length - 1];
    if (prev && prev !== 'ー' && prev !== 'ッ' && prev !== 'ン') {
      // 同じ母音の繰り返し(おかあさん)と お段+う・え段+い(とうきょう、えいが)は長音
      const same = (ch === 'ア' && A.includes(prev)) || (ch === 'イ' && (I.includes(prev) || E.includes(prev))) || (ch === 'ウ' && (U.includes(prev) || O.includes(prev))) || (ch === 'エ' && E.includes(prev)) || (ch === 'オ' && O.includes(prev));
      if (same) { out += 'ー'; continue; }
    }
    out += ch;
  }
  return out;
}

export function loadWords(file) {
  const d = JSON.parse(fs.readFileSync(file, 'utf8'));
  const set = new Set();
  let skipped = 0;
  for (const w of d.words) for (const kana of w.kana) {
    const p = toPron(kana.text);
    if (p && !p.startsWith('ッ') && !p.startsWith('ー')) set.add(p); else skipped++;
  }
  return { words: [...set], skipped };
}
