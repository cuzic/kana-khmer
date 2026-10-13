// Write public/ja-khmer-accent-data.js: sample words split into per-mora slots for the accent-line prototype
// (ADR-0021 decisions 1, 2, 5, 9). The page (ja-khmer-accent.html) only draws; the H/L row and the slot split live here.
// The slot split re-implements convert-spec.mjs's folding with mora indices kept; the joined slot text is asserted equal to
// kanaToKhmerSpec() so drift from the spec converter fails loudly. Sample accents are for LAYOUT testing, not reviewed data.
import { writeFileSync } from "node:fs";
import { kanaToKhmerSpec, specTable as table, longMark } from "../../ja-khmer-spike/src/convert-spec.mjs";

const ROW_V = { a: "あかがさざただなはばぱまやらわ", i: "いきぎしじちぢにひびぴみり", u: "うくぐすずつづぬふぶぷむゆる", e: "えけげせぜてでねへべぺめれ", o: "おこごそぞとどのほぼぽもよろを" };
const LONG = { a: "ា", i: "ី", u: "ូ", e: "េ", o: "ូ" };
const SH = new Set(["しゃ", "しゅ", "しょ"]);
const CODA_K = "かきくけこがぎぐげご", CODA_P = "ぱぴぷぺぽばびぶべぼ";
const K2H = (s) => s.replace(/[ァ-ヶ]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0x60));
const vowelOf = (k) => (k.length === 2 ? { ゃ: "a", ゅ: "u", ょ: "o" }[k[1]] : Object.keys(ROW_V).find((v) => ROW_V[v].includes(k)));

// [kata, n (0 = flat), note, kind]  kind: "word" (with the reviewed-looking Wiktionary acc from ADR-0021) | "stress" (layout only)
const WORDS = [
  ["ニホンジン", 4, "内側: ジ|ン (ジン の書記音節の中で下がる)"],
  ["スミマセン", 4, "内側: セ|ン"],
  ["ゲンキ", 1, "頭高。ゲン の内側 (ゲ|ン) で下がる"],
  ["ダイジョーブ", 3, "内側: ジョー の中 (ジョ|ー)。長音マーカーは別スロット"],
  ["アリガトー", 4, "中高。トー の中 (ト|ー は別スロット) で下がる"],
  ["ゴメンナサイ", 5, "下がり目が ៃ の内側 (サ|イ)。半幅の線"],
  ["クダサイ", 3, "下がり目が ៃ の内側 (サ|イ)"],
  ["アイ", 1, "句頭の ៃ に頭高。半幅の線"],
  ["ベンキョー", 0, "平板。語頭の簡略化 (ベ|ン が同じ書記音節): 1拍目も H"],
  ["ユックリ", 3, "ユック の中で促音。語頭の簡略化"],
  ["ヨーコソ", 1, "頭高。ヨー は基底とマーカーの別スロット"],
  ["オヤスミナサイ", 6, "下がり目が ៃ の内側 (サ|イ)。語が長い"],
  ["ラーメン", 1, "頭高 (ラ|ー の別スロット、基底にだけ線)"],
  ["ハシガ", 2, "橋+が: 尾高 (が で下がる)"],
  ["ハシガ", 0, "端+が: 平板 (が まで線が続く)"],
  ["ハシガ", 1, "箸+が: 頭高"],
  ["カーン", 0, "layout: 基底→末子音→マーカー の順 (時間順は カ→ー→ン)"],
  ["カーン", 1, "layout: 頭高。核が ー の上 (ー と ン の高さが違う: ADR-0021 決定9 の例外)"],
  ["ショーガッコー", 0, "layout: 右肩 ˢʰ + 長音 + 促音"],
  ["ニッポン", 1, "layout: ッ→ポン。末子音の連続"],
];

/** kata -> { moras:[{text}], slots:[{text, kind, moras:[idx]}] } */
function split(kata) {
  const moras = []; // { kind: k|n|q|l|i, kana(hira base) , text }
  for (const ch of kata) {
    if (ch === "ー") moras.push({ kind: "l", text: "ー" });
    else if (ch === "ッ") moras.push({ kind: "q", text: "ッ" });
    else if (ch === "ン") moras.push({ kind: "n", text: "ン" });
    else if ("ャュョ".includes(ch)) { const l = moras[moras.length - 1]; l.text += ch; l.k += K2H(ch); }
    else moras.push({ kind: "k", text: ch, k: K2H(ch) });
  }
  const syl = []; // { k, base, long, coda, codaIdx, longIdx, ai, aiIdx } | { raw, idx }
  moras.forEach((m, i) => {
    if (m.kind === "k") {
      const p = syl[syl.length - 1];
      if (m.k === "い" && p && p.k && !p.long && !p.coda && !p.ai && vowelOf(p.k) === "a") { p.ai = true; p.aiIdx = i; return; }
      syl.push({ k: m.k, base: i, long: false, coda: "" });
    } else if (m.kind === "l") { const p = syl[syl.length - 1]; p.long = true; p.longIdx = i; }
    else if (m.kind === "n") {
      const p = syl[syl.length - 1];
      if (p && p.k && !p.coda) { p.coda = "ន"; p.codaIdx = i; } else syl.push({ raw: "ន", idx: i });
    } else {
      const nx = moras.slice(i + 1).find((x) => x.kind === "k"); const p = syl[syl.length - 1];
      if (!p || !p.k || p.coda) return; // dropped by the converter: no visible slot for this mora
      p.coda = nx && CODA_K.includes(nx.k[0]) ? "ក" : nx && CODA_P.includes(nx.k[0]) ? "ប" : "ត"; p.codaIdx = i;
    }
  });
  const slots = [];
  for (const [si, s] of syl.entries()) {
    if (s.raw) { slots.push({ text: s.raw, kind: "coda", moras: [s.idx], syl: si }); continue; }
    const t = table[s.k], v = vowelOf(s.k);
    slots.push({ text: t.c + (s.ai ? "ៃ" : s.long ? LONG[v] : t.v), kind: "base", moras: s.ai ? [s.base, s.aiIdx] : [s.base], syl: si });
    if (s.coda) slots.push({ text: s.coda, kind: "coda", moras: [s.codaIdx], syl: si });
    if (t.sh && SH.has(s.k)) slots.push({ text: t.sh, kind: "sh", moras: [], syl: si }); // diacritic of the base: takes the base's height
    if (s.long) slots.push({ text: longMark(v, "a"), kind: "long", moras: [s.longIdx], syl: si });
  }
  return { moras, slots };
}

/** ADR-0021 decision 2: H/L per mora. n = 1-based mora after which the pitch falls (0 = flat). */
function hl(n, count, slots) {
  const H = [];
  for (let i = 0; i < count; i++) H[i] = n === 0 ? i >= 1 : n === 1 ? i === 0 : i >= 1 && i <= n - 1;
  // Simplification (phrase-initial): moras 1 and 2 in one written syllable and n != 1 -> mora 1 is H too
  const owner = []; for (const s of slots) for (const m of s.moras) owner[m] = s.syl;
  if (n !== 1 && count >= 2 && owner[0] === owner[1]) H[0] = true;
  return H;
}

const out = WORDS.map(([kata, n, note]) => {
  const { moras, slots } = split(kata);
  const joined = slots.map((s) => s.text).join("");
  const ref = kanaToKhmerSpec(kata);
  if (joined !== ref) throw new Error(`slot join differs for ${kata}: ${joined} != ${ref}`);
  const covered = new Set(slots.flatMap((s) => s.moras));
  if (moras.some((_, i) => !covered.has(i))) throw new Error(`mora without a slot in ${kata}`);
  const H = hl(n, moras.length, slots);
  return { kata, n, note, moras: moras.map((m, i) => ({ text: m.text, H: H[i], drop: n > 0 && n <= moras.length && i === n - 1 && n < moras.length })), slots, khmer: joined };
});
writeFileSync(new URL("../public/ja-khmer-accent-data.js", import.meta.url),
  "// generated by scripts/gen-ja-khmer-accent.mjs; do not edit\nvar JA_ACCENT_WORDS = " + JSON.stringify(out) + ";\n");
console.log(out.length, "words");
for (const w of out) console.log(w.kata, w.n, w.moras.map((m) => (m.H ? "H" : "L") + (m.drop ? "\\" : "")).join(""), w.slots.map((s) => s.text + "[" + s.moras + "]").join(" "));
