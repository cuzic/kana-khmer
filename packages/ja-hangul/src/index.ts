// 日本語の発音(かな)→ ハングル。ADR-0018(ん・っ の区切り)・ADR-0019(右肩ローマ字、詳細/ライト)。
// 入力は「発音を確定したカタカナ」(長音は ー、促音は ッ、撥音は ン。ヲ・ヂ・ヅ・ァィゥェォ は使わない)。
// 表は韓国語ネイティブ確認前の暫定。す/ず/つ は 스/즈/츠(수・주・추 は しゅ・じゅ・ちゅ と同じ音になるため)。

import { JaHangulError, type JaHangulErrorCode } from "./errors";
export { JaHangulError, type JaHangulErrorCode };
export { renderRomaji } from "./romaji";

export type NotationLevel = "full" | "lite";

type Mark = "len" | "sok" | "nsep" | "zj";
/** 詳細は全記号。ライトは じゃ・じょ の右肩 ʲ だけ落とす(ADR-0019)。 */
const MARKS: Record<NotationLevel, ReadonlySet<Mark>> = {
  full: new Set<Mark>(["len", "sok", "nsep", "zj"]),
  lite: new Set<Mark>(["len", "sok", "nsep"]),
};

/** ん・っ の直後が母音始まり・ら行のとき、連音化・流音化を止める区切り(ADR-0018) */
export const SEPARATOR = "·";
/** じゃ・じょ の右肩 j(ADR-0019) */
export const J_MARK = "ʲ";
/** 長音は 直前の母音の上付き文字 + 結合マクロン。フォントは kana-hangul.woff2(ADR-0019) */
const SUP: Record<string, string> = { a: "ᵃ", i: "ⁱ", u: "ᵘ", e: "ᵉ", o: "ᵒ" };
const MACRON = "̄";

const BASE: Record<string, string> = {
  ア: "아", イ: "이", ウ: "우", エ: "에", オ: "오",
  カ: "카", キ: "키", ク: "쿠", ケ: "케", コ: "코",
  ガ: "가", ギ: "기", グ: "구", ゲ: "게", ゴ: "고",
  サ: "사", シ: "시", ス: "스", セ: "세", ソ: "소",
  ザ: "자", ジ: "지", ズ: "즈", ゼ: "제", ゾ: "조",
  タ: "타", チ: "치", ツ: "츠", テ: "테", ト: "토",
  ダ: "다", デ: "데", ド: "도",
  ナ: "나", ニ: "니", ヌ: "누", ネ: "네", ノ: "노",
  ハ: "하", ヒ: "히", フ: "후", ヘ: "헤", ホ: "호",
  バ: "바", ビ: "비", ブ: "부", ベ: "베", ボ: "보",
  パ: "파", ピ: "피", プ: "푸", ペ: "페", ポ: "포",
  マ: "마", ミ: "미", ム: "무", メ: "메", モ: "모",
  ヤ: "야", ユ: "유", ヨ: "요",
  ラ: "라", リ: "리", ル: "루", レ: "레", ロ: "로",
  ワ: "와",
};
const YOON_ROW = "キギシジチニヒビピミリ";
const YOON_VOWEL: Record<string, number> = { ャ: 2, ュ: 17, ョ: 12 }; // ㅑ ㅠ ㅛ
/** 硬口蓋化した ㅈㅊ の読み: ㅑ→ㅏ ㅛ→ㅗ ㅠ→ㅜ */
const PLAIN_VOWEL: Record<number, number> = { 2: 0, 12: 8, 17: 13 };
/** 母音記号(中声のインデックス)→ ローマ字の母音 */
const VOWEL_LETTER: Record<number, string> = { 0: "a", 2: "a", 9: "a", 20: "i", 13: "u", 17: "u", 18: "u", 5: "e", 8: "o", 12: "o" };

interface Jamo { L: number; V: number; T: number }
const HANGUL = /[가-힣]/;
const decompose = (s: string): Jamo => {
  const c = s.codePointAt(0)! - 0xac00;
  return { L: Math.floor(c / 588), V: Math.floor((c % 588) / 28), T: c % 28 };
};
const compose = ({ L, V, T }: Jamo): string => String.fromCodePoint(0xac00 + (L * 21 + V) * 28 + T);

const T_N = 4, T_K = 1, T_P = 17, T_S = 19; // 終声 ㄴ ㄱ ㅂ ㅅ
const L_IEUNG = 11, L_RIEUL = 5;            // 初声 ㅇ ㄹ

/** っ の同位置パッチム: か行系 ㄱ、ぱ行系 ㅂ、それ以外 ㅅ */
function geminateCoda(next: string): number {
  const L = decompose(next).L;
  if (L === 0 || L === 1 || L === 15) return T_K;
  if (L === 7 || L === 17) return T_P;
  return T_S;
}

interface Syl { syl: string; zj: boolean }
type Item = Syl | string;
const isSyl = (x: Item | undefined): x is Syl => typeof x === "object";

export function renderHangul(pron: string, level: NotationLevel = "full"): string {
  const marks = MARKS[level];
  // 1) モーラ列にする。ッ ン ー は文字のまま残す
  const moras: (Syl | "ッ" | "ン" | "ー")[] = [];
  const chars = [...pron];
  for (let i = 0; i < chars.length; i++) {
    const c = chars[i]!;
    if (c === "ッ" || c === "ン" || c === "ー") { moras.push(c); continue; }
    const base = BASE[c];
    if (base === undefined) throw new JaHangulError("unsupported-kana", `変換できない文字: "${c}" (発音を確定したカタカナで書く。ヲ・ヂ・ヅ・ァィゥェォ は不可)`);
    let syl = base, zj = false;
    const next = chars[i + 1];
    const yv = next === undefined ? undefined : YOON_VOWEL[next];
    if (yv !== undefined) {
      if (!YOON_ROW.includes(c)) throw new JaHangulError("bad-structure", `拗音にできない: "${c}${next}"`);
      syl = compose({ ...decompose(base), V: yv, T: 0 });
      if (c === "ジ" && (next === "ャ" || next === "ョ")) zj = true; // ざ/じゃ、ぞ/じょ の衝突側
      i++;
    }
    moras.push({ syl, zj });
  }
  // 2) 並べる。右肩の記号・区切りは文字列として挟む
  const out: Item[] = [];
  const lastSyl = (): Syl | undefined => {
    for (let j = out.length - 1; j >= 0; j--) { const x = out[j]; if (isSyl(x)) return x; }
    return undefined;
  };
  for (let i = 0; i < moras.length; i++) {
    const m = moras[i]!;
    if (m === "ー") {
      const p = lastSyl();
      if (!p) throw new JaHangulError("bad-structure", "語頭の長音");
      const v = VOWEL_LETTER[decompose(p.syl).V];
      if (v === undefined) throw new JaHangulError("bad-structure", "長音の母音を決められない");
      if (marks.has("len")) out.push(SUP[v]! + MACRON);
      continue;
    }
    if (m === "ン" || m === "ッ") {
      const p = lastSyl();
      if (!p) throw new JaHangulError("bad-structure", `語頭の "${m}"`);
      const nextMora = moras.slice(i + 1).find((x) => x !== "ー");
      const d = decompose(p.syl);
      if (d.T) continue; // ンッ の連続などは畳む
      if (m === "ッ" && !marks.has("sok")) continue;
      if (m === "ン") d.T = T_N;
      else {
        if (!isSyl(nextMora)) throw new JaHangulError("bad-structure", "語末の ッ");
        d.T = geminateCoda(nextMora.syl);
      }
      p.syl = compose(d);
      const nxt = isSyl(nextMora) ? decompose(nextMora.syl) : undefined;
      // 母音始まり(連音化)と ン+ら行(流音化)を止める
      if (marks.has("nsep") && nxt && (nxt.L === L_IEUNG || (m === "ン" && nxt.L === L_RIEUL))) out.push(SEPARATOR);
      continue;
    }
    out.push(m);
    if (m.zj && marks.has("zj")) out.push(J_MARK);
  }
  return out.map((x) => (isSyl(x) ? x.syl : x)).join("");
}

/**
 * 韓国語話者が綴りを読んだときの音の近似。衝突率の測定と、表記の検証に使う(表示には使わない)。
 * 硬口蓋化(ㅈㅊ+ㅑㅛㅠ)・連音化・ㄴ+ㄹ の流音化。区切り・右肩の記号は読まれず、隣接を切る。
 */
export function koreanReading(hangul: string): string {
  const a: (Jamo | string)[] = [...hangul].map((c) => (HANGUL.test(c) ? decompose(c) : c));
  for (let i = 0; i < a.length - 1; i++) {
    const p = a[i], n = a[i + 1];
    if (p === undefined || n === undefined || typeof p === "string" || typeof n === "string") continue;
    if (p.T && n.L === L_IEUNG) { // 連音化
      const toL = ({ 1: 0, 4: 2, 17: 7, 19: 9 } as Record<number, number>)[p.T];
      if (toL !== undefined) { n.L = toL; p.T = 0; }
    } else if (p.T === T_N && n.L === L_RIEUL) p.T = 8; // 流音化
  }
  return a.map((d) => {
    if (typeof d === "string") return d;
    if ((d.L === 12 || d.L === 13 || d.L === 14) && PLAIN_VOWEL[d.V] !== undefined) d = { ...d, V: PLAIN_VOWEL[d.V]! };
    return compose(d);
  }).join("");
}
