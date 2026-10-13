// 規則による分析。tools/en-prosody-spike/src/analyze.py(audio=None・観測なしの経路)と ir.py の移植。Python が正。
import { type Dict, lookup } from "./dict";
import { isVowel, phonesToKana, splitPhone } from "./kana";

export interface IRWord {
  text: string;
  norm: string;
  kind: "speech" | "note";
  /** 0 弱形 / 1 機能語 / 2 内容語 / 3 核 */
  prominence: 0 | 1 | 2 | 3;
  /** 0 · / 1 強い語 / 2 核を兼ねる強い語 */
  beat: 0 | 1 | 2;
  /** 0 なし / 1 小さな切れ / 2 大きな切れ */
  break_after: 0 | 1 | 2;
  linked_next: boolean;
  phones: string[] | null;
  kana: string;
  kana_lite: string;
}

export const MODS = new Set([..."ʳˡᶿᶞᵛᵆᶺᶦᶷᵓᵊᵑᵈᵇᵍᶻᶾᵗʰᶟ"]);

export function lite(kana: string): string {
  return Array.from(kana).filter((c) => !MODS.has(c)).join("");
}

/** align.py の norm()。 */
export function norm(w: string): string {
  return w.toLowerCase().replaceAll("’", "'").replace(/[^a-z0-9']/g, "");
}

const FUNCTION = new Set(
  `a an the this that these those my your his her its our their me him us them i you he she it we they
am is are was were be been being do does did have has had will would shall should can could may might must
to of in on at by for with from into onto about as than and or but nor so if because while though although
not no there here what which who whom whose when where why how some any just then very too also`.split(/\s+/),
);

const WEAK: Record<string, string> = {
  the: "DH AH0", a: "AH0", an: "AH0 N", to: "T AH0", of: "AH0 V", and: "AH0 N D",
  for: "F ER0", can: "K AH0 N", you: "Y AH0", your: "Y ER0", he: "IY0", him: "IH0 M",
  her: "ER0", them: "DH AH0 M", was: "W AH0 Z", were: "W ER0", at: "AH0 T", that: "DH AH0 T",
  have: "AH0 V", has: "AH0 Z", had: "AH0 D", do: "D AH0", does: "D AH0 Z", would: "W AH0 D",
  could: "K AH0 D", should: "SH AH0 D", are: "ER0", been: "B IH0 N", from: "F R AH0 M",
  than: "DH AH0 N", or: "ER0", there: "DH ER0", some: "S AH0 M", as: "AH0 Z", but: "B AH0 T",
  just: "JH AH0 S T", if: "IH0 F",
  "it's": "IH0 T S", "he's": "IY0 Z", "she's": "SH IY0 Z", "there's": "DH ER0 Z",
  "you're": "Y ER0", "we're": "W ER0", "they're": "DH ER0",
};

const CLITIC = /^(.+?)('s|'re|'ve|'ll|'d|'m)$/;
const NOTE = /^[(\[]/;

function isFunction(n: string): boolean {
  if (FUNCTION.has(n)) return true;
  const m = CLITIC.exec(n);
  return !!m && (FUNCTION.has(m[1]!) || m[1] === "let");
}

interface W {
  text: string;
  norm: string;
  phones: string[] | null;
  content: boolean;
  weak: boolean;
  nucleus: boolean;
  break_after: 0 | 1 | 2;
  flapAt: Set<number>;
  kana: string;
  linked_next: boolean;
  carryOut: string | null;
  carryIn: string | null;
  flapCarry: boolean;
}

function weakVowel(ph: string): boolean {
  const [b, st] = splitPhone(ph);
  return (b === "AH" || b === "IH" || b === "ER") && st === 0;
}

function afterVowel(p: string[], i: number): boolean {
  return i > 0 && (isVowel(p[i - 1]!) || (p[i - 1] === "R" && i > 1 && isVowel(p[i - 2]!)));
}

function flapAndKana(grp: W[]): void {
  grp.forEach((w, gi) => {
    if (!w.phones || !w.phones.length) return;
    const p = w.phones;
    const cand = gi + 1 < grp.length && w.break_after === 0 ? grp[gi + 1]! : null;
    const nxt = cand && cand.phones && cand.phones.length ? cand : null;
    for (let i = 0; i < p.length - 1; i++) {
      const b = splitPhone(p[i]!)[0];
      if ((b === "T" || b === "D") && afterVowel(p, i) && isVowel(p[i + 1]!) && weakVowel(p[i + 1]!)) w.flapAt.add(i);
    }
    if (nxt && !isVowel(p[p.length - 1]!) && isVowel(nxt.phones![0]!)) {
      w.linked_next = true;
      const last = p[p.length - 1]!;
      if (last !== "NG" && p.length >= 2 && p.slice(0, -1).some(isVowel)) {
        w.carryOut = last;
        nxt.carryIn = last;
        if ((last === "T" || last === "D") && afterVowel(p, p.length - 1)) nxt.flapCarry = true;
      }
    }
  });
  for (const w of grp) {
    if (!w.phones || !w.phones.length) continue;
    let p = [...w.phones];
    let flaps = new Set(w.flapAt);
    if (w.carryOut) p = p.slice(0, -1);
    if (w.carryIn) {
      p = [w.carryIn, ...p];
      flaps = new Set([...flaps].map((i) => i + 1));
      if (w.flapCarry) flaps.add(0);
    }
    w.kana = phonesToKana(p, flaps, w.carryIn ? new Set([0]) : new Set()); // 連結で移った子音は有気音にしない
  }
}

/** Python の analyze(words, None) + build_ir 相当。text は空白区切りの 1 列。 */
export function analyzeLine(text: string, dict: Dict): IRWord[] {
  const ws: W[] = [];
  for (const raw of text.split(/\s+/)) {
    const n = norm(raw);
    if (!raw || !n) continue;
    const note = NOTE.test(raw);
    const phones = note ? null : lookup(dict, n);
    const content = (!isFunction(n) && phones !== null) || (phones === null && !note);
    let ba: 0 | 1 | 2 = 0;
    if (/[.?!]+["”')\]]*$/.test(raw)) ba = 2;
    else if (/[,;:—–…]+["”')\]]*$/.test(raw)) ba = 1;
    ws.push({ text: raw, norm: n, phones, content, weak: false, nucleus: false, break_after: ba, flapAt: new Set(), kana: "", linked_next: false, carryOut: null, carryIn: null, flapCarry: false });
  }
  if (ws.length) ws[ws.length - 1]!.break_after = 2;
  let start = 0;
  ws.forEach((w, i) => {
    if (w.break_after === 0 && i !== ws.length - 1) return;
    const grp = ws.slice(start, i + 1);
    const cw = grp.filter((g) => g.content);
    (cw.length ? cw[cw.length - 1]! : grp[grp.length - 1]!).nucleus = true;
    for (const g of grp) {
      if (g.content || !Object.hasOwn(WEAK, g.norm) || !g.phones || !g.phones.length) continue;
      if (g !== grp[grp.length - 1]) {
        g.weak = true;
        g.phones = WEAK[g.norm]!.split(" ");
      }
    }
    flapAndKana(grp);
    start = i + 1;
  });
  return ws.map((w) => {
    const note = NOTE.test(w.text);
    const prom: 0 | 1 | 2 | 3 = w.nucleus ? 3 : w.content ? 2 : w.weak ? 0 : 1;
    return {
      text: w.text,
      norm: w.norm,
      kind: note ? "note" : "speech",
      prominence: note ? 2 : prom,
      beat: note ? 0 : prom === 3 ? 2 : prom === 2 ? 1 : 0,
      break_after: w.break_after,
      linked_next: w.linked_next,
      phones: w.phones,
      kana: w.kana,
      kana_lite: lite(w.kana),
    };
  });
}
