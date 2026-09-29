// 日本語の発音(カタカナ)→ クメール文字。規則は docs/ja-khmer-spec.md(§2 入力、§3.4 詳細とライト、§4.3 長短、§6 撥音・促音・長音・あい)。
// 表は設計書 §5 から生成した spec-table.generated.ts。出力は文字列に加えて、書記音節・スロット(基底/末子音/右肩/長音マーカー)
// と拍の対応を持つ(ADR-0021 のアクセント線は拍単位のスロットを使う)。
// 詳細とライトは現時点で全行同じ文字列(§3.4)なので、レベルの引数は持たない。

import { JaKhmerError } from "./errors";
import { SPEC_TABLE } from "./spec-table.generated";

export type Vowel = "a" | "i" | "u" | "e" | "o";
/** 長音マーカーの字形。macron = 上付き母音+結合マクロン(D9。既定)、double = 上付き母音の重ね書き(フォールバック) */
export type LongStyle = "macron" | "double";
/**
 * 書記音節の中の可視スロット。text を順に連結すると音節の text になる。
 * 並びは base → coda → shoulder → long(§6.3。拍の時間順 基底 → ー → ン とは逆になる)。
 */
export type SlotKind = "base" | "coda" | "shoulder" | "long";

export interface Slot {
  kind: SlotKind;
  text: string;
  /** このスロットに入る拍(Phrase.moras の添字)。あい=ៃ の base は [あ, い] の2拍 */
  moras: number[];
}
export interface Syllable {
  text: string;
  slots: Slot[];
}
export interface Mora {
  /** 拍の表記(入力のカタカナ。拗音は "シャ" の2文字) */
  kana: string;
  /** 主に入るスロット。ッ が既に末子音のある音節に畳まれたときなど、見える文字が無い拍は null。あい の い は あ と同じ base */
  at: { syllable: number; slot: number } | null;
}
export interface Phrase {
  text: string;
  moras: Mora[];
  syllables: Syllable[];
}
export interface Rendered {
  /** 句を半角空白でつないだ全体 */
  text: string;
  phrases: Phrase[];
}
export interface RenderOptions {
  longStyle?: LongStyle;
}

const SUP: Record<Vowel, string> = { a: "ᵃ", i: "ⁱ", u: "ᵘ", e: "ᵉ", o: "ᵒ" };
const MACRON = "̄";
/** 長い拍の基底は段の既定の長母音記号(§4.3 案A、規則3) */
const LONG_SIGN: Record<Vowel, string> = { a: "ា", i: "ី", u: "ូ", e: "េ", o: "ូ" };
const ROW_V: Record<Vowel, string> = {
  a: "あかがさざただなはばぱまやらわ",
  i: "いきぎしじちぢにひびぴみり",
  u: "うくぐすずつづぬふぶぷむゆる",
  e: "えけげせぜてでねへべぺめれ",
  o: "おこごそぞとどのほぼぽもよろを",
};
const VOWEL_OF: Record<string, Vowel> = {};
for (const [v, s] of Object.entries(ROW_V)) for (const ch of s) VOWEL_OF[ch] = v as Vowel;
const SMALL_Y: Record<string, Vowel> = { ャ: "a", ュ: "u", ョ: "o" };
const CODA_K = "かきくけこがぎぐげご", CODA_P = "ぱぴぷぺぽばびぶべぼ";
const NASAL = "ន";
const AI_SIGN = "ៃ";

/** 長音マーカー(span 種別 long)。ADR-0003 の合成グリフ(macron)か、重ね書き(double) */
export const longMark = (v: Vowel, style: LongStyle = "macron"): string => (style === "macron" ? SUP[v] + MACRON : SUP[v] + SUP[v]);

const toHira = (c: string): string => (c >= "ァ" && c <= "ヶ" ? String.fromCharCode(c.charCodeAt(0) - 0x60) : c);
const vowelOf = (h: string): Vowel => (h.length === 2 ? SMALL_Y[String.fromCharCode(h.charCodeAt(1) + 0x60)]! : VOWEL_OF[h]!);

interface KanaUnit { kind: "kana"; idx: number; h: string; long: number | null }
interface CodaUnit { kind: "n" | "q"; idx: number }
type Unit = KanaUnit | CodaUnit;
interface Syl { unit: KanaUnit | null; nasalIdx: number; ai: number | null; coda: { text: string; idx: number } | null }

function renderPhrase(pron: string, style: LongStyle): Phrase {
  // 1) 拍にする。拗音は1拍、ー は独立した拍で直前の拍に付く
  const moras: Mora[] = [];
  const units: Unit[] = [];
  for (const ch of pron) {
    const last = units[units.length - 1];
    if (ch === "ー") {
      if (!last || last.kind !== "kana") throw new JaKhmerError("bad-structure", last ? `"${ch}" の前が長音にできない拍` : "語頭の長音");
      if (last.long !== null) throw new JaKhmerError("bad-structure", "長音の重複(ーー)");
      last.long = moras.length;
      moras.push({ kana: ch, at: null });
    } else if (ch === "ッ" || ch === "ン") {
      units.push({ kind: ch === "ン" ? "n" : "q", idx: moras.length });
      moras.push({ kana: ch, at: null });
    } else if (ch in SMALL_Y) {
      if (!last || last.kind !== "kana" || last.h.length > 1 || last.long !== null) throw new JaKhmerError("bad-structure", `拗音にできない: "${ch}"`);
      const h = last.h + toHira(ch);
      if (!SPEC_TABLE[h]) throw new JaKhmerError("bad-structure", `拗音にできない: "${moras[last.idx]!.kana}${ch}"`);
      last.h = h;
      moras[last.idx]!.kana += ch;
    } else {
      const h = toHira(ch);
      if (ch === h || !SPEC_TABLE[h]) throw new JaKhmerError("unsupported-kana", `変換できない文字: "${ch}" (発音を確定したカタカナで書く。ァィゥェォ ヴ は範囲外)`);
      units.push({ kind: "kana", idx: moras.length, h, long: null });
      moras.push({ kana: ch, at: null });
    }
  }

  // 2) 書記音節にまとめる。あい は ៃ、ん は ន の末子音(先行する音節が無い・末子音済みなら単独の ន)、っ は次の子音の系列の末子音
  const syls: Syl[] = [];
  for (let i = 0; i < units.length; i++) {
    const u = units[i]!;
    const p = syls[syls.length - 1];
    if (u.kind === "kana") {
      if (u.h === "い" && u.long === null && p && p.unit && p.unit.long === null && !p.coda && p.ai === null && vowelOf(p.unit.h) === "a") { p.ai = u.idx; continue; }
      syls.push({ unit: u, nasalIdx: -1, ai: null, coda: null });
    } else if (u.kind === "n") {
      if (p && p.unit && !p.coda) p.coda = { text: NASAL, idx: u.idx };
      else syls.push({ unit: null, nasalIdx: u.idx, ai: null, coda: null });
    } else {
      if (p && p.unit && p.coda) continue; // ンッ の連続などは畳む
      if (!p || !p.unit) throw new JaKhmerError("bad-structure", "語頭の ッ");
      // 句末の ッ は次の子音が分からないので ត(設計書 §6.2 の t 系。語末の ッ は要決定)
      const nx = units.slice(i + 1).find((x): x is KanaUnit => x.kind === "kana");
      const head = nx ? nx.h[0]! : "";
      p.coda = { text: head && CODA_K.includes(head) ? "ក" : head && CODA_P.includes(head) ? "ប" : "ត", idx: u.idx };
    }
  }

  // 3) スロットに分ける
  const syllables: Syllable[] = syls.map((s, si) => {
    const slots: Slot[] = [];
    if (!s.unit) slots.push({ kind: "coda", text: NASAL, moras: [s.nasalIdx] });
    else {
      const u = s.unit;
      const t = SPEC_TABLE[u.h]!;
      const v = vowelOf(u.h);
      slots.push({ kind: "base", text: t.c + (s.ai !== null ? AI_SIGN : u.long !== null ? LONG_SIGN[v] : t.v), moras: s.ai !== null ? [u.idx, s.ai] : [u.idx] });
      if (s.coda) slots.push({ kind: "coda", text: s.coda.text, moras: [s.coda.idx] });
      if (t.sh) slots.push({ kind: "shoulder", text: t.sh, moras: [u.idx] });
      if (u.long !== null) slots.push({ kind: "long", text: longMark(v, style), moras: [u.long] });
    }
    slots.forEach((slot, k) => {
      for (const m of slot.moras) if (!moras[m]!.at) moras[m]!.at = { syllable: si, slot: k };
    });
    return { text: slots.map((x) => x.text).join(""), slots };
  });
  return { text: syllables.map((x) => x.text).join(""), moras, syllables };
}

/**
 * 発音を確定したカタカナ(長音は ー、促音は ッ、撥音は ン。空白は句の区切り)→ クメール文字。
 * 表記の文字列に NFKC/NFKD を適用しないこと(上付き文字・結合マクロンが平文に潰れる)。
 */
export function renderKhmer(pron: string, options: RenderOptions = {}): Rendered {
  const style = options.longStyle || "macron";
  const phrases = pron.split(" ").filter((x) => x !== "").map((x) => renderPhrase(x, style));
  return { text: phrases.map((p) => p.text).join(" "), phrases };
}
