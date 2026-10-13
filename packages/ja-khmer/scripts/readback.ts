// 独立の読み戻し: Wiktionary の Module:km-pron(クメール文字 → IPA)を TypeScript に移植したもの。
// 生成側(src/)は参照しない。子音表・母音表は Lua ソースから機械抽出する。Lua はリポジトリに入れない(scripts/verify-readback.ts が取得する)。
// ライセンス: Wiktionary の Module:km-pron(CC BY-SA 4.0、参照文献 UNESCO『Khmer pronouncing dictionary』)を移植した派生物。
//   検証にだけ使う。配布物に取り込む場合は帰属表示と継承条件を確認すること(ADR-0010 決定2 と同じ論点)。
// 移植は syllabify / syl_analysis / sylRedist / initClus / rime / convert(ipa モード)のみ。元は tools/ja-khmer-spike/src/readback.mjs。
import { readFileSync } from "node:fs";

const j = "្";
const c = "កខគឃងចឆជឈញដឋឌឍណតថទធនបផពភមយរលវឝឞសហឡអ";
const cMod = "៉៊";
const vDiac = "ាិីឹឺុូួើឿៀេែៃោៅំះៈ័៏";
const vPost = "់";
const recessive = /[ŋɲñnmjyrlʋv]/u;

const cU = `[${c}][${cMod}]?`;
const clus = [1, 2, 3, 4].map((n) => `(${cU}${(j + cU).repeat(n - 1)})`);
const postInit = `([${vDiac}]*)([${c}]?[${cMod}]?)(${vPost}?)('?)`;
const anRe = clus.map((cl) => new RegExp(`^${cl}${postInit}$`, "u")).reverse();

interface Entry { class: number | undefined; ipa: [string, string] }
export interface Tables { consonants: Record<string, Entry>; vowels: Record<string, Entry>; glottify: Set<string> }

export function loadTables(luaPath: string): Tables {
  const src = readFileSync(luaPath, "utf8");
  const block = (name: string): string => { const i = src.indexOf(`local ${name} = {`); return src.slice(i, src.indexOf("\n}", i)); };
  const parse = (txt: string): Record<string, Entry> => {
    const out: Record<string, Entry> = {};
    const re = /\["([^"]*)"\]\s*=\s*\{\s*(?:class\s*=\s*(\d),\s*)?\["ipa"\]\s*=\s*\{\s*"([^"]*)",\s*"([^"]*)"\s*\}/gu;
    for (const m of txt.matchAll(re)) out[m[1]!] = { class: m[2] ? +m[2] : undefined, ipa: [m[3]!, m[4]!] };
    return out;
  };
  const gl = /local glottify = \{([^}]*)\}/u.exec(src);
  if (!gl) throw new Error("km-pron.lua に glottify が見つからない");
  return {
    consonants: parse(block("consonants")),
    vowels: parse(block("vowels")),
    glottify: new Set([...gl[1]!.matchAll(/\["([^"]+)"\]/gu)].map((m) => m[1]!)),
  };
}

function syllabify(text: string): string {
  text = text.replace(/(['់])([^,\- ])/gu, "$1-$2");
  const seq1 = new RegExp(`([${c}${cMod}${vDiac}])([${c}][${cMod}]?)([${vDiac}${j}])`, "gu");
  const probe = new RegExp(seq1.source, "u");
  while (probe.test(text)) text = text.replace(seq1, "$1-$2$3");
  return text;
}
function analyse(syl: string): string[] | null {
  for (const re of anRe) { const m = re.exec(syl); if (m) return m.slice(1, 6); }
  return null;
}
function sylRedist(text: string, block: boolean): string | null {
  const syls = text.split("-");
  const all: (string[] | null)[] = [];
  for (let i = 0; i < syls.length; i++) {
    if (syls[i] === "") { all.push(null); continue; }
    const set = analyse(syls[i]!);
    if (!set) return null;
    all.push(set);
    const prev = all[i - 1];
    if (i > 0 && prev && prev[2] === "" && set[0]!.includes(j) && !block) {
      const k = set[0]!.indexOf(j);
      prev[2] = set[0]!.slice(0, k);
      set[0] = set[0]!.slice(k + 1);
    }
    const first = all[0];
    if (syls.length === 2 && i === 1 && first && first[1]! + first[3]! === "") first[3] = vPost;
  }
  return all.map((s) => (s ? s.join("") : "")).join("-");
}

const AS: [RegExp, string, RegExp, string][] = [
  [/p([knŋcɲdtnjls])/gu, "pʰ$1", /pʰ([^knŋcɲdtnjls])/gu, "p$1"],
  [/t([kŋnmjlʋ])/gu, "tʰ$1", /tʰ([^kŋnmjlʋ])/gu, "t$1"],
  [/k([ctnbmlʋs])/gu, "kʰ$1", /kʰ([^ctnbmlʋs])/gu, "k$1"],
  [/c([kŋnmlʋʔ])/gu, "cʰ$1", /cʰ([^kŋnmlʋʔ])/gu, "c$1"],
];

function initClus(T: Tables, c1: string): [string, number | string] {
  c1 = c1.split(j).join("");
  let fittest: number | string = "";
  const whole = T.consonants[c1];
  if (whole) { fittest = whole.class ?? ""; c1 = whole.ipa[0]; }
  else {
    const chars = [...c1];
    const set: string[] = [];
    for (let i = 0; i < chars.length;) {
      let hit = false;
      for (let n = 3; n >= 1; n--) {
        const key = chars.slice(i, i + n).join("");
        if (T.consonants[key]) { set.push(key); i += n; hit = true; break; }
      }
      if (!hit) throw new Error(`Error handling initial ${c1}`);
    }
    const init: string[] = [];
    set.forEach((ch, seq) => {
      const d = T.consonants[ch]!;
      const first = d.ipa[0];
      fittest = ((!recessive.test(first) && !first.includes("ng")) || (fittest === "" && seq === set.length - 1)) ? (d.class ?? "") : fittest;
      init.push(first);
    });
    c1 = init.join("");
  }
  c1 = c1.replace(/[ɓb](.)/gu, "p$1");
  for (const [a, b, c2, d] of AS) c1 = c1.replace(a, b).replace(c2, d);
  return [c1, fittest];
}

function rime(T: Tables, v1: string, c2: string, fittest: number | string, red: string): string | null {
  const cls = Number(fittest) - 1;
  if (red === "'") v1 = red;
  const direct = T.vowels[v1 + c2];
  if (direct) return direct.ipa[cls] ?? null;
  const cd = T.consonants[c2];
  if (!cd) return null;
  c2 = cd.ipa[1];
  if (((v1 === "័" || v1 === "ា់") && (/[kŋ]/u.test(c2) || c2 === "ng")) || (v1 === "េ" && /[cɲ]/u.test(c2)) || (v1 === "់" && /[mp]/u.test(c2)) || ((v1 === "ិ" || v1 === "ុ") && c2 !== "")) v1 += "2";
  const vd = T.vowels[v1];
  v1 = vd ? (vd.ipa[cls] ?? v1) : v1;
  if (T.glottify.has(v1) && c2 === "k") c2 = "ʡ";
  return v1 + c2;
}

/** クメール文字の語 → IPA(音節を . で区切る)。読めなければ null */
export function readKhmer(T: Tables, text: string): string | null {
  try {
    const block = text.includes("-");
    const t = sylRedist(syllabify(text), block);
    if (t === null) return null;
    const out: string[] = [];
    for (const syl of t.split("-")) {
      if (!syl) continue;
      const a = analyse(syl);
      if (!a) return null;
      const [c1, fittest] = initClus(T, a[0]!);
      const r = rime(T, a[1]! + a[3]!, a[2]!, fittest, a[4]!);
      if (r === null) return null;
      out.push(c1 + r);
    }
    return out.join(".").replace(/ʔ([ptkhlɲŋmnjw])/gu, "$1").replace(/ŭə\./gu, "ɔ.").replace(/([eiou])[ʔʼ]\./gu, "$1.").replace(/ʡ\.s/gu, "k.s").replace(/ʡ/gu, "ʔ");
  } catch {
    return null;
  }
}
