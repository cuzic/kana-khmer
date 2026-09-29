// 設計書 docs/ja-khmer-spec.md §5 の対応表(基本46音・濁音・半濁音・拗音)を読む。
// 表を二重に持たないため、spec-table.generated.ts は scripts/gen-table.ts がこの関数で作る。
// ん の行は表の綴りでなく規則(§6.1)なので読まない。fs に触らない(テキストを受け取る)。

export interface SpecRow {
  /** 子音部(下付き含む) */
  c: string;
  /** 短い拍の母音記号 */
  v: string;
  /** 右肩(ˢʰ。無ければ "") */
  sh: string;
  /** 表の「詳細」列そのまま(c + v + sh) */
  detail: string;
}

const VOWEL_SIGNS = "ាិីឹឺុូេោែៃ";
/** 右肩の上付きローマ字(D8)と結合マクロン: U+02B0–02FF、U+1D2C–1DBF、U+2071、U+207F、U+0304 */
const isShoulder = (ch: string): boolean => {
  const c = ch.codePointAt(0)!;
  return (c >= 0x2b0 && c <= 0x2ff) || (c >= 0x1d2c && c <= 0x1dbf) || c === 0x2071 || c === 0x207f || c === 0x304;
};

/** ひらがな → 行 */
export function parseSpecTable(text: string): Record<string, SpecRow> {
  const start = text.indexOf("### 5.2");
  const end = text.indexOf("\n## 6.");
  if (start < 0 || end < 0) throw new Error("設計書に §5.2〜§6 の区切りが見つからない");
  const table: Record<string, SpecRow> = {};
  for (const line of text.slice(start, end).split("\n")) {
    if (!line.startsWith("| ")) continue;
    const cells = line.split("|").map((x) => x.trim());
    const kana = cells[1], detail = cells[2];
    if (!kana || !/^[ぁ-ゖ]{1,2}$/.test(kana) || kana === "ん" || kana === "かな" || !detail) continue;
    const chars = [...detail];
    let sh = "";
    while (chars.length && isShoulder(chars[chars.length - 1]!)) sh = chars.pop()! + sh;
    const v = chars.pop();
    if (v === undefined || !VOWEL_SIGNS.includes(v)) throw new Error(`母音記号でない: ${kana} ${detail}`);
    if (table[kana]) throw new Error(`行が重複: ${kana}`);
    table[kana] = { c: chars.join(""), v, sh, detail };
  }
  return table;
}
