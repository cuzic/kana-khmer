import { splitPhone } from "./kana";

/** 語 → ARPABET 音素列(ストレス数字つき。CMUdict の第1発音)。 */
export type Dict = Map<string, string[]>;

/** 1行1語。`word PH PH ...` の形式。 */
export function parseDict(text: string): Dict {
  const d: Dict = new Map();
  for (const line of text.split("\n")) {
    const parts = line.trim().split(/\s+/);
    if (parts.length < 2 || !parts[0]) continue;
    d.set(parts[0], parts.slice(1));
  }
  return d;
}

/** pron.py の lookup。 */
export function lookup(dict: Dict, n: string): string[] | null {
  const stripped = n.replace(/^'+|'+$/g, "");
  for (const cand of [n, stripped]) {
    const p = dict.get(cand);
    if (p) return [...p];
  }
  if (n.endsWith("'s")) {
    const base = dict.get(n.slice(0, -2));
    if (base) {
      const p = [...base];
      const last = splitPhone(p[p.length - 1]!)[0];
      const add = ["S", "Z", "SH", "ZH", "CH", "JH"].includes(last) ? ["IH0", "Z"] : ["P", "T", "K", "F", "TH"].includes(last) ? ["S"] : ["Z"];
      return [...p, ...add];
    }
  }
  return null;
}
