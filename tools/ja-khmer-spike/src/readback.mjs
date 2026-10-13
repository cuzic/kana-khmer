// 独立の読み戻し: Wiktionary の Module:km-pron(クメール文字 → IPA)を JS に移植したもの。
// 生成側の table.mjs / convert.mjs は参照しない。子音表・母音表は Lua ソースから機械抽出する。
// ライセンス: Wiktionary の Module:km-pron(CC BY-SA 4.0、参照文献 UNESCO『Khmer pronouncing dictionary』)を JS に移植した派生物。
//   スパイク内で検証にだけ使う。配布物に取り込む場合は帰属表示と継承条件を確認すること(ADR-0010 決定2 と同じ論点)。
// 移植は syllabify / syl_analysis / sylRedist / initClus / rime / convert(ipa モード)のみ。
import fs from 'node:fs';

const j = '្';
const c = 'កខគឃងចឆជឈញដឋឌឍណតថទធនបផពភមយរលវឝឞសហឡអ';
const cMod = '៉៊';
const vDiac = 'ាិីឹឺុូួើឿៀេែៃោៅំះៈ័៏';
const vPost = '់';
const recessive = /[ŋɲñnmjyrlʋv]/u;

const cU = `[${c}][${cMod}]?`;
const clus = [1, 2, 3, 4].map((n) => `(${cU}${(j + cU).repeat(n - 1)})`);
const postInit = `([${vDiac}]*)([${c}]?[${cMod}]?)(${vPost}?)('?)`;
const anRe = clus.map((cl) => new RegExp(`^${cl}${postInit}$`, 'u')).reverse();

export function loadTables(luaPath) {
  const src = fs.readFileSync(luaPath, 'utf8');
  const block = (name) => { const i = src.indexOf(`local ${name} = {`); return src.slice(i, src.indexOf('\n}', i)); };
  const parse = (txt, withClass) => {
    const out = {};
    const re = /\["([^"]*)"\]\s*=\s*\{\s*(?:class\s*=\s*(\d),\s*)?\["ipa"\]\s*=\s*\{\s*"([^"]*)",\s*"([^"]*)"\s*\}/gu;
    for (const m of txt.matchAll(re)) out[m[1]] = { class: m[2] ? +m[2] : undefined, ipa: [m[3], m[4]] };
    return out;
  };
  const consonants = parse(block('consonants'));
  const vowels = parse(block('vowels'));
  const gl = /local glottify = \{([^}]*)\}/u.exec(src)[1];
  const glottify = new Set([...gl.matchAll(/\["([^"]+)"\]/gu)].map((m) => m[1]));
  return { consonants, vowels, glottify };
}

function syllabify(text) {
  text = text.replace(/(['់])([^,\- ])/gu, '$1-$2');
  const seq1 = new RegExp(`([${c}${cMod}${vDiac}])([${c}][${cMod}]?)([${vDiac}${j}])`, 'gu');
  const probe = new RegExp(seq1.source, 'u');
  while (probe.test(text)) text = text.replace(seq1, '$1-$2$3');
  return text;
}
function analyse(syl) {
  for (const re of anRe) { const m = re.exec(syl); if (m) return m.slice(1, 6); }
  return null;
}
function sylRedist(text, block) {
  const syls = text.split('-');
  const all = [];
  for (let i = 0; i < syls.length; i++) {
    if (syls[i] === '') { all.push(null); continue; }
    const set = analyse(syls[i]);
    if (!set) return null;
    all.push(set);
    if (i > 0 && all[i - 1] && all[i - 1][2] === '' && set[0].includes(j) && !block) {
      const k = set[0].indexOf(j);
      all[i - 1][2] = set[0].slice(0, k);
      set[0] = set[0].slice(k + 1);
    }
    if (syls.length === 2 && i === 1 && all[0] && all[0][1] + all[0][3] === '') all[0][3] = vPost;
  }
  return all.map((s) => (s ? s.join('') : '')).join('-');
}

const AS = { p: [/p([knŋcɲdtnjls])/gu, 'pʰ$1', /pʰ([^knŋcɲdtnjls])/gu, 'p$1'], t: [/t([kŋnmjlʋ])/gu, 'tʰ$1', /tʰ([^kŋnmjlʋ])/gu, 't$1'], k: [/k([ctnbmlʋs])/gu, 'kʰ$1', /kʰ([^ctnbmlʋs])/gu, 'k$1'], c: [/c([kŋnmlʋʔ])/gu, 'cʰ$1', /cʰ([^kŋnmlʋʔ])/gu, 'c$1'] };

function initClus(T, c1) {
  c1 = c1.split(j).join('');
  let fittest = '';
  if (T.consonants[c1]) { fittest = T.consonants[c1].class; c1 = T.consonants[c1].ipa[0]; }
  else {
    const chars = [...c1];
    const set = [];
    for (let i = 0; i < chars.length;) {
      let hit = false;
      for (let n = 3; n >= 1; n--) {
        const key = chars.slice(i, i + n).join('');
        if (T.consonants[key]) { set.push(key); i += n; hit = true; break; }
      }
      if (!hit) throw new Error(`Error handling initial ${c1}`);
    }
    const init = [];
    set.forEach((ch, seq) => {
      const d = T.consonants[ch];
      const first = d.ipa[0];
      fittest = ((!recessive.test(first) && !first.includes('ng')) || (fittest === '' && seq === set.length - 1)) ? d.class : fittest;
      init.push(first);
    });
    c1 = init.join('');
  }
  c1 = c1.replace(/[ɓb](.)/gu, 'p$1');
  for (const [a, b, c2, d] of Object.values(AS)) c1 = c1.replace(a, b).replace(c2, d);
  return [c1, fittest];
}

function rime(T, v1, c2, fittest, red) {
  if (red === "'") v1 = red;
  if (T.vowels[v1 + c2]) return T.vowels[v1 + c2].ipa[fittest - 1];
  const cd = T.consonants[c2];
  if (!cd) return null;
  c2 = cd.ipa[1];
  if (((v1 === '័' || v1 === 'ា់') && (/[kŋ]/u.test(c2) || c2 === 'ng')) || (v1 === 'េ' && /[cɲ]/u.test(c2)) || (v1 === '់' && /[mp]/u.test(c2)) || ((v1 === 'ិ' || v1 === 'ុ') && c2 !== '')) v1 += '2';
  v1 = T.vowels[v1] ? T.vowels[v1].ipa[fittest - 1] : v1;
  if (T.glottify.has(v1) && c2 === 'k') c2 = 'ʡ';
  return v1 + c2;
}

/** クメール文字の語 → IPA(音節を . で区切る)。読めなければ null */
export function readKhmer(T, text) {
  try {
    const block = text.includes('-');
    const t = sylRedist(syllabify(text), block);
    if (t === null) return null;
    const out = [];
    for (const syl of t.split('-')) {
      if (!syl) continue;
      const a = analyse(syl);
      if (!a) return null;
      const [c1, fittest] = initClus(T, a[0]);
      const r = rime(T, a[1] + a[3], a[2], fittest, a[4]);
      if (r === null || r === undefined) return null;
      out.push(c1 + r);
    }
    let s = out.join('.');
    s = s.replace(/ʔ([ptkhlɲŋmnjw])/gu, '$1').replace(/ŭə\./gu, 'ɔ.').replace(/([eiou])[ʔʼ]\./gu, '$1.').replace(/ʡ\.s/gu, 'k.s').replace(/ʡ/gu, 'ʔ');
    return s;
  } catch (e) { return null; }
}
