// 日本語の発音(カタカナ)→ タイ文字。設計は docs/ja-thai-spec.md、決定は ADR-0028。
// 入力は「発音を確定したカタカナ」(長音は ー、促音は ッ、撥音は ン。ヲ・ヂ・ヅ・ァィゥェォ は使わない)。空白は語の区切り。
// 骨格は王立学士院 2018 年版の音写基準。ただし声調を中に揃えるため、開音節の母音はすべて長母音で書き、
// 長音(ー)は母音だけの音節を足して重ねる(方式 G。tools/ja-thai-spike の測定で中声調 94.4%)。
// 表はタイ語ネイティブ確認前の暫定。

import { JaThaiError, type JaThaiErrorCode } from "./errors";
export { JaThaiError, type JaThaiErrorCode };

type V = "a" | "i" | "u" | "e" | "o";
type C = "" | "k" | "g" | "s" | "sh" | "z" | "j" | "t" | "ch" | "ts" | "d" | "n" | "h" | "f" | "b" | "p" | "m" | "y" | "r" | "w";

const ROWS: Record<string, string> = {
  "": "アイウエオ", k: "カキクケコ", g: "ガギグゲゴ", s: "サシスセソ", z: "ザジズゼゾ", t: "タチツテト",
  d: "ダヂヅデド", n: "ナニヌネノ", h: "ハヒフヘホ", b: "バビブベボ", p: "パピプペポ", m: "マミムメモ", r: "ラリルレロ",
};
const VOWELS: readonly V[] = ["a", "i", "u", "e", "o"];
const KANA: Record<string, { c: C; v: V }> = {};
for (const [c, kana] of Object.entries(ROWS)) [...kana].forEach((k, i) => (KANA[k] = { c: c as C, v: VOWELS[i]! }));
Object.assign(KANA, {
  ヤ: { c: "y", v: "a" }, ユ: { c: "y", v: "u" }, ヨ: { c: "y", v: "o" }, ワ: { c: "w", v: "a" },
  シ: { c: "sh", v: "i" }, チ: { c: "ch", v: "i" }, ツ: { c: "ts", v: "u" }, フ: { c: "f", v: "u" }, ジ: { c: "j", v: "i" },
});
// ヲ ヂ ヅ は入力では使わない(オ ジ ズ に寄せてから渡す)。ヂ ヅ はテーブルに無いので unsupported になる
delete KANA["ヂ"]; delete KANA["ヅ"];
const SMALL: Record<string, V> = { ャ: "a", ュ: "u", ョ: "o" };
/** しゃ ちゃ じゃ は 子音 + a/u/o の普通の音節(官報の sh・ch・j の行) */
const PLAIN_YOON = new Set<C>(["sh", "ch", "j"]);

interface Mora { c: C; v: V; long: boolean; y: boolean }
type Token = ({ kind: "m" } & Mora) | { kind: "Q" } | { kind: "N" };

const bad = (msg: string) => new JaThaiError("bad-structure", msg);

function parseMoras(word: string): Token[] {
  const out: Token[] = [];
  const chars = [...word];
  for (let i = 0; i < chars.length; i++) {
    const ch = chars[i]!;
    if (ch === "ッ") out.push({ kind: "Q" });
    else if (ch === "ン") out.push({ kind: "N" });
    else if (ch === "ー") {
      const p = out[out.length - 1];
      if (!p || p.kind !== "m") throw bad(`長音の位置が不正: "${word}"`);
      if (p.long) throw bad(`長音の連続: "${word}"`);
      p.long = true;
    } else if (KANA[ch] !== undefined) {
      const base = KANA[ch]!;
      const m: Mora = { ...base, long: false, y: false };
      const sm = SMALL[chars[i + 1] ?? ""];
      if (sm !== undefined) {
        if (base.v !== "i") throw bad(`拗音にできない: "${ch}${chars[i + 1]}"`);
        m.v = sm;
        if (!PLAIN_YOON.has(m.c)) m.y = true;
        i++;
      }
      out.push({ kind: "m", ...m });
    } else throw new JaThaiError("unsupported-kana", `変換できない文字: "${ch}" (発音を確定したカタカナで書く。ヲ・ヂ・ヅ・ァィゥェォ は不可)`);
  }
  return out;
}

// ん の末子音: 後続音で決まる(官報の規則 11)。語末は ง
const CODA_N: Partial<Record<C, string>> = {
  "": "น", ch: "น", d: "น", j: "น", n: "น", r: "น", s: "น", sh: "น", t: "น", ts: "น", z: "น",
  g: "ง", h: "ง", f: "ง", k: "ง", w: "ง", y: "ง", b: "ม", m: "ม", p: "ม",
};
// っ の末子音: 後続音のほうの無気閉鎖音(官報の例: คิตเตะ マッチャ มัตจะ、ザッシ ซัชชิ は s・sh を重ねる)
const CODA_Q: Partial<Record<C, string>> = { k: "ก", g: "ก", s: "ซ", sh: "ช", z: "ซ", j: "ต", t: "ต", ch: "ต", ts: "ต", d: "ด", p: "ป", f: "ป", h: "ป", b: "บ" };

interface Syl extends Mora {
  ai: boolean;
  coda: { kind: "N" | "Q" | "T"; letter: string } | null;
}

/** 語頭は官報の規則 7 で有気字(ค ท พ ช)、語中は無気字(ก ต ป จ)。が行は語頭 ก・語中 ง(規則 9) */
function onset(s: Mora, initial: boolean): string {
  switch (s.c) {
    case "": return "อ";
    case "k": return initial ? "ค" : "ก";
    case "g": return initial ? "ก" : "ง";
    case "s": case "z": return "ซ";
    case "sh": return "ช";
    case "j": return "จ";
    case "t": return initial ? "ท" : "ต";
    case "ch": return initial ? "ช" : "จ";
    case "ts": return "ส";
    case "d": return "ด";
    case "n": return "น";
    case "h": return "ฮ";
    case "f": return "ฟ";
    case "b": return "บ";
    case "p": return initial ? "พ" : "ป";
    case "m": return "ม";
    case "y": return "ย";
    case "r": return "ร";
    case "w": return "ว";
  }
}

/**
 * 1音節を書く。
 * 開音節の母音はすべて長母音で書く(声調を中にそろえるため。i・語末も)。閉音節(末子音あり)は短母音 ั เ-็ ิ ุ、
 * o は母音記号なし。ai は ไ、拗音は เ-ีย / -ิว / เ-ียว(官報)、つ は สึ、つー は ซือ。
 */
function writeSyl(s: Mora & { ai?: boolean }, K: string, initial: boolean, longForm: boolean): string {
  const closed = K !== "";
  if (s.c === "ts") return "สึ" + K; // つー は สึ + อู(長音は重ねる)
  const C = onset(s, initial);
  if (s.y) {
    if (s.v === "a") return "เ" + C + "ีย" + K;
    if (s.v === "o") return "เ" + C + "ียว";
    return C + "ิว"; // ゆう の長音は重ねる(呼び出し側)
  }
  if (s.ai) return "ไ" + C + K;
  switch (s.v) {
    case "a": return closed && !longForm ? C + "ั" + K : C + "า" + K;
    case "i": return closed && !longForm ? C + "ิ" + K : C + "ี" + K;
    case "u": return closed && !longForm ? C + "ุ" + K : C + "ู" + K;
    case "e": return closed && !longForm ? "เ" + C + "็" + K : "เ" + C + K;
    case "o": return closed && !longForm ? C + K : "โ" + C + K;
  }
}

export interface ThaiWord {
  text: string;
  /** 音節ごとの綴り(Wiktionary の th-pron にハイフン区切りで渡せる) */
  syllables: string[];
}

/** 1語(空白なし)を変換する */
export function thaiWord(word: string): ThaiWord {
  const tokens = parseMoras(word);
  const S: Syl[] = [];
  for (const t of tokens) {
    if (t.kind === "m") S.push({ c: t.c, v: t.v, long: t.long, y: t.y, ai: false, coda: null });
    else {
      const prev = S[S.length - 1];
      if (!prev) throw bad(`語頭の${t.kind === "Q" ? "ッ" : "ン"}: "${word}"`);
      if (prev.coda) throw bad(`特殊拍の連続: "${word}"`);
      prev.coda = { kind: t.kind, letter: "" };
    }
  }
  // あい → ไ(長音でない ア + 長音でない イ)
  for (let i = 0; i + 1 < S.length; i++) {
    const a = S[i]!, b = S[i + 1]!;
    if (a.v === "a" && !a.long && !a.coda && !a.y && b.c === "" && b.v === "i" && !b.long && !b.y) {
      a.ai = true; a.coda = b.coda; S.splice(i + 1, 1);
    }
  }
  // 末子音の決定。母音の後の つ は ตสึ(前の音節に ต を付ける)
  for (let i = 0; i < S.length; i++) {
    const s = S[i]!, nx = S[i + 1];
    if (s.coda?.kind === "N") s.coda.letter = nx ? CODA_N[nx.c] ?? "น" : "ง";
    else if (s.coda?.kind === "Q") {
      if (!nx) throw bad(`語末の ッ: "${word}"`);
      s.coda.letter = CODA_Q[nx.c] ?? "ต";
    } else if (nx && nx.c === "ts" && !s.coda) s.coda = { kind: "T", letter: "ต" };
  }
  const out: string[] = [];
  S.forEach((s, i) => {
    const initial = i === 0;
    const K = s.coda?.letter ?? "";
    if (s.long) {
      // 長音は母音を重ねる: 基本音節(末子音なしの長母音)+ 母音だけの音節(末子音はこちらに付く)
      out.push(writeSyl(s, "", initial, true));
      out.push(writeSyl({ c: "", v: s.v, long: true, y: false }, K, false, true));
    } else out.push(writeSyl(s, K, initial, !K));
  });
  return { text: out.join(""), syllables: out };
}

/** 発音カタカナ(空白区切りで複数語)→ タイ文字。空白はそのまま残す */
export function renderThai(pron: string): string {
  return pron.split(/(\s+)/).map((w) => (/^\s*$/.test(w) ? w : thaiWord(w).text)).join("");
}
