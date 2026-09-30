// 日本語(発音カタカナ)→ タイ文字 の仮変換。ラフな試作(使い捨て)。
// 骨格は王立学士院 2018 年版の音写基準(docs/research/2026-09-29-ja-loanwords-in-thai-orthography.md 第3節)。
// 基準にない部分(です等の無声化、外来語音)は範囲外。

const ROWS = {
  '': 'アイウエオ', k: 'カキクケコ', g: 'ガギグゲゴ', s: 'サシスセソ', z: 'ザジズゼゾ', t: 'タチツテト',
  d: 'ダヂヅデド', n: 'ナニヌネノ', h: 'ハヒフヘホ', b: 'バビブベボ', p: 'パピプペポ', m: 'マミムメモ', r: 'ラリルレロ',
};
const VOW = 'aiueo';
const KANA = {};
for (const [c, kana] of Object.entries(ROWS)) [...kana].forEach((k, i) => (KANA[k] = { c, v: VOW[i] }));
Object.assign(KANA, { ヤ: { c: 'y', v: 'a' }, ユ: { c: 'y', v: 'u' }, ヨ: { c: 'y', v: 'o' }, ワ: { c: 'w', v: 'a' }, ヲ: { c: '', v: 'o' } });
Object.assign(KANA, { シ: { c: 'sh', v: 'i' }, チ: { c: 'ch', v: 'i' }, ツ: { c: 'ts', v: 'u' }, フ: { c: 'f', v: 'u' }, ジ: { c: 'j', v: 'i' }, ヂ: { c: 'j', v: 'i' }, ヅ: { c: 'z', v: 'u' } });
const SMALL = { ャ: 'a', ュ: 'u', ョ: 'o' };
const PLAIN_YOON = new Set(['sh', 'ch', 'j']); // しゃ ちゃ じゃ は 子音+a/u/o の普通の音節(公式表 sh・ch・j の行)

export function parseMoras(word) {
  const out = [];
  const chars = [...word];
  for (let i = 0; i < chars.length; i++) {
    const ch = chars[i];
    if (ch === 'ッ') out.push({ kind: 'Q' });
    else if (ch === 'ン') out.push({ kind: 'N' });
    else if (ch === 'ー') {
      const p = out[out.length - 1];
      if (!p || p.kind !== 'm') throw new Error(`ー の位置が不正: ${word}`);
      p.long = true;
    } else if (KANA[ch]) {
      const m = { kind: 'm', ...KANA[ch], long: false, y: false };
      if (SMALL[chars[i + 1]]) {
        const v = SMALL[chars[++i]];
        if (m.v !== 'i') throw new Error(`拗音の位置が不正: ${word}`);
        m.v = v;
        if (!PLAIN_YOON.has(m.c)) m.y = true;
      }
      out.push(m);
    } else throw new Error(`範囲外の文字 ${ch} in ${word}`);
  }
  return out;
}

const CODA_N = { '': 'น', ch: 'น', d: 'น', j: 'น', n: 'น', r: 'น', s: 'น', sh: 'น', t: 'น', ts: 'น', z: 'น', g: 'ง', h: 'ง', f: 'ง', k: 'ง', w: 'ง', y: 'ง', b: 'ม', m: 'ม', p: 'ม' };
const CODA_Q = { k: 'ก', g: 'ก', s: 'ซ', sh: 'ช', z: 'ซ', j: 'ต', t: 'ต', ch: 'ต', ts: 'ต', d: 'ด', p: 'ป', f: 'ป', h: 'ป', b: 'บ' };

/** opts.asp: 'official'(語頭の k t p ch を有気字 ค ท พ ช)| 'plain'(常に ก ต ป จ)
 *  opts.openShort: 'long'(語末以外の開音節の短母音を長母音で。公式 4.1)| 'short'(短形 ะ ุ เ-ะ โ-ะ)
 *  opts.gMed: 'ng'(語中の が行 = ง。公式 9)| 'k'(常に ก)
 *  opts.nFinal: 'ng' | 'n'(語末の ん) */
export const POLICIES = {
  A: { asp: 'official', openShort: 'long', gMed: 'ng', nFinal: 'ng' },
  B: { asp: 'official', openShort: 'short', gMed: 'ng', nFinal: 'ng' },
  C: { asp: 'plain', openShort: 'long', gMed: 'ng', nFinal: 'ng' },
  D: { asp: 'official', openShort: 'long', gMed: 'k', nFinal: 'ng' },
  // E: 開音節の母音を i・語末も含めてすべて長母音で書く(声調をほぼ中に固定する代わりに、綴りは長さを区別しない)
  E: { asp: 'official', openShort: 'long', gMed: 'ng', nFinal: 'ng', allLong: true },
  // F: E の語末だけ短形(ะ ิ ุ เ-ะ โ-ะ)。G: E + 長音は母音を重ねる(ユーザー判断 2026-09-29)。H: F + 長音は母音を重ねる
  F: { asp: 'official', openShort: 'long', gMed: 'ng', nFinal: 'ng', allLong: true, finalShort: true },
  G: { asp: 'official', openShort: 'long', gMed: 'ng', nFinal: 'ng', allLong: true, doubleLong: true },
  H: { asp: 'official', openShort: 'long', gMed: 'ng', nFinal: 'ng', allLong: true, finalShort: true, doubleLong: true },
};

function onset(s, initial, o) {
  const asp = initial && o.asp === 'official';
  switch (s.c) {
    case '': return 'อ';
    case 'k': return asp ? 'ค' : 'ก';
    case 'g': return initial ? 'ก' : o.gMed === 'ng' ? 'ง' : 'ก';
    case 's': case 'z': return 'ซ';
    case 'sh': return 'ช';
    case 'j': return 'จ';
    case 't': return asp ? 'ท' : 'ต';
    case 'ch': return asp ? 'ช' : 'จ';
    case 'ts': return 'ส';
    case 'd': return 'ด';
    case 'n': return 'น';
    case 'h': return 'ฮ';
    case 'f': return 'ฟ';
    case 'b': return 'บ';
    case 'p': return asp ? 'พ' : 'ป';
    case 'm': return 'ม';
    case 'y': return 'ย';
    case 'r': return 'ร';
    case 'w': return 'ว';
    default: throw new Error('onset ' + s.c);
  }
}

function thaiLongOf(s, closed, last, o) {
  if (s.long) return true;
  if (s.c === 'ts') return false;
  if (o.allLong) return !closed;
  if (s.v === 'i') return false;
  return !closed && !last && o.openShort === 'long';
}

/** 発音カタカナ1語 → { thai, sylls[{t, long}] }。sylls は th-pron のハイフン区切りに使う */
export function convertWord(word, policy = 'A') {
  const o = POLICIES[policy];
  const moras = parseMoras(word);
  const S = []; // 音節
  for (let i = 0; i < moras.length; i++) {
    const m = moras[i];
    if (m.kind === 'm') S.push({ ...m, coda: null });
    else if (S.length === 0) throw new Error(`語頭の ${m.kind === 'Q' ? 'ッ' : 'ン'}: ${word}`);
    else if (S[S.length - 1].coda) throw new Error(`特殊拍の連続: ${word}`);
    else S[S.length - 1].coda = { kind: m.kind };
  }
  // あい → ไ
  for (let i = 0; i + 1 < S.length; i++) {
    const a = S[i], b = S[i + 1];
    if (a.v === 'a' && !a.long && !a.coda && !a.y && b.c === '' && b.v === 'i' && !b.long && !b.y) { a.ai = true; a.coda = b.coda; S.splice(i + 1, 1); }
  }
  // 末子音の決定
  for (let i = 0; i < S.length; i++) {
    const s = S[i], nx = S[i + 1];
    if (s.coda?.kind === 'N') s.coda.letter = nx ? CODA_N[nx.y ? nx.c : nx.c] ?? 'น' : o.nFinal === 'ng' ? 'ง' : 'น';
    else if (s.coda?.kind === 'Q') {
      if (!nx) throw new Error(`語末の ッ: ${word}`);
      s.coda.letter = CODA_Q[nx.c] ?? 'ต';
    } else if (nx && nx.c === 'ts' && !s.coda) s.coda = { kind: 'T', letter: 'ต' }; // 母音の後の つ は ตสึ
  }
  const out = [];
  const render = (s, K, initial, last) => {
    const closed = K !== '';
    const long = s.long;
    let thai;
    if (s.c === 'ts') thai = long ? 'ซือ' + K : 'สึ' + K;
    else {
      const C = onset(s, initial, o);
      const openShortAsLong = !long && !closed && !s.y && ((o.allLong && !(o.finalShort && last)) || (!last && o.openShort === 'long' && s.v !== 'i'));
      const L = long || openShortAsLong;
      if (s.y) {
        if (s.v === 'a') thai = 'เ' + C + 'ีย' + K;
        else if (s.v === 'o') thai = 'เ' + C + 'ียว';
        else thai = C + (long ? 'ีว' : 'ิว');
      } else if (s.ai) thai = 'ไ' + C + K;
      else switch (s.v) {
        case 'a': thai = closed ? C + (L ? 'า' : 'ั') + K : C + (L ? 'า' : 'ะ'); break;
        case 'i': thai = C + (L ? 'ี' : 'ิ') + K; break;
        case 'u': thai = C + (L ? 'ู' : 'ุ') + K; break;
        case 'e': thai = closed ? 'เ' + C + (L ? '' : '็') + K : 'เ' + C + (L ? '' : 'ะ'); break;
        case 'o': thai = closed ? (L ? 'โ' + C + K : C + K) : 'โ' + C + (L ? '' : 'ะ'); break;
      }
    }
    return thai;
  };
  S.forEach((s, i) => {
    const initial = i === 0, last = i === S.length - 1;
    const K = s.coda?.letter ?? '';
    // jaLong: 日本語で長い(ー)。thaiLong: 綴りが長母音になる(ai・拗音は対象外にして null)
    const meta = { jaLong: !!s.long, thaiLong: s.ai || s.y ? null : thaiLongOf(s, K !== '', last, o) };
    if (o.doubleLong && s.long) {
      // 長音は母音を重ねる: 基本音節(開音節の長母音)+ 母音だけの音節(末子音はこちらに付く)
      out.push({ t: render(s.y || s.c === 'ts' ? { ...s, long: false } : s, '', initial, false), ...meta, thaiLong: null });
      out.push({ t: render({ c: '', v: s.v, long: true, y: false, coda: s.coda }, K, false, last), ...meta, thaiLong: null });
    } else out.push({ t: render(s, K, initial, last), ...meta });
  });
  return { thai: out.map((x) => x.t).join(''), sylls: out };
}
