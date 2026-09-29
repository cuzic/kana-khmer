// 設計書 docs/ja-khmer-spec.md §5 の対応表(基本46音・濁音・半濁音・拗音)を読み込む。
// 表を手で二重に持たず、設計書の表から機械的に作る。ん の行は表の綴りでなく規則(§6.1)なので読まない。
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
export const SPEC_PATH = path.resolve(here, '../../../docs/ja-khmer-spec.md');
const VOWEL_SIGNS = 'ាិីឹឺុូេោែៃ';
const isShoulder = (ch) => { const c = ch.codePointAt(0); return c >= 0x1d2c && c <= 0x1dbf; }; // 上付き文字(Phonetic Extensions 系)

/** { ひらがな: { c: 子音部(下付き含む), v: 母音記号, sh: 右肩('' 可) } } */
export function loadSpecTable(file = SPEC_PATH) {
  const text = fs.readFileSync(file, 'utf8');
  const sec = text.slice(text.indexOf('### 5.2'), text.indexOf('\n## 6.'));
  const table = {};
  for (const line of sec.split('\n')) {
    if (!line.startsWith('| ')) continue;
    const cells = line.split('|').map((x) => x.trim());
    const kana = cells[1], detail = cells[2];
    if (!kana || !/^[ぁ-ゖ]{1,2}$/.test(kana) || kana === 'ん' || kana === 'かな' || !detail) continue;
    const chars = [...detail];
    let sh = '';
    while (chars.length && isShoulder(chars[chars.length - 1])) sh = chars.pop() + sh;
    const v = chars.pop();
    if (!VOWEL_SIGNS.includes(v)) throw new Error(`母音記号でない: ${kana} ${detail}`);
    table[kana] = { c: chars.join(''), v, sh };
  }
  return table;
}
