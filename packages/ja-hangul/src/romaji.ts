// 日本語の発音(かな)→ ローマ字(修正ヘボン式)。ko-ja の表示要素の1つ(ADR-0021)。
// 入力は renderHangul と同じ「発音を確定したカタカナ」。長音 ー は母音の上にマクロン(ā ū ē ō)。ただし い段の ー は ii。
// ん の後ろが母音・や行のときは n'(hon'ya)。っ は次の子音を重ねる(ch の前は t: tchi)。
import { JaHangulError } from "./errors";

const BASE: Record<string, string> = {
  ア: "a", イ: "i", ウ: "u", エ: "e", オ: "o",
  カ: "ka", キ: "ki", ク: "ku", ケ: "ke", コ: "ko",
  ガ: "ga", ギ: "gi", グ: "gu", ゲ: "ge", ゴ: "go",
  サ: "sa", シ: "shi", ス: "su", セ: "se", ソ: "so",
  ザ: "za", ジ: "ji", ズ: "zu", ゼ: "ze", ゾ: "zo",
  タ: "ta", チ: "chi", ツ: "tsu", テ: "te", ト: "to",
  ダ: "da", デ: "de", ド: "do",
  ナ: "na", ニ: "ni", ヌ: "nu", ネ: "ne", ノ: "no",
  ハ: "ha", ヒ: "hi", フ: "fu", ヘ: "he", ホ: "ho",
  バ: "ba", ビ: "bi", ブ: "bu", ベ: "be", ボ: "bo",
  パ: "pa", ピ: "pi", プ: "pu", ペ: "pe", ポ: "po",
  マ: "ma", ミ: "mi", ム: "mu", メ: "me", モ: "mo",
  ヤ: "ya", ユ: "yu", ヨ: "yo",
  ラ: "ra", リ: "ri", ル: "ru", レ: "re", ロ: "ro",
  ワ: "wa",
};
/** 拗音の子音部(イ段の子音)。ジ・シ・チ は ja/sha/cha 系 */
const YOON: Record<string, string> = {
  キ: "ky", ギ: "gy", シ: "sh", ジ: "j", チ: "ch", ニ: "ny", ヒ: "hy", ビ: "by", ピ: "py", ミ: "my", リ: "ry",
};
const YOON_VOWEL: Record<string, string> = { ャ: "a", ュ: "u", ョ: "o" };
const MACRON: Record<string, string> = { a: "ā", u: "ū", e: "ē", o: "ō" };
const VOWELS = "aiueo";

export function renderRomaji(pron: string): string {
  const chars = [...pron];
  let out = "";
  let geminate = false;
  for (let i = 0; i < chars.length; i++) {
    const c = chars[i]!;
    if (c === "ー") {
      const last = out.slice(-1);
      if (last === "" || !VOWELS.includes(last)) throw new JaHangulError("bad-structure", "語頭または子音の後の長音");
      out = last === "i" ? out + "i" : out.slice(0, -1) + MACRON[last]!;
      continue;
    }
    if (c === "ッ") { geminate = true; continue; }
    if (c === "ン") {
      const next = chars[i + 1];
      const nextRomaji = next === undefined ? "" : (BASE[next] ?? "");
      // ん + 母音・や行 は n'(hon'ya)。ha 行の h などは付けない
      out += /^[aiueoy]/.test(nextRomaji) ? "n'" : "n";
      continue;
    }
    let romaji: string | undefined;
    const next = chars[i + 1];
    const yv = next === undefined ? undefined : YOON_VOWEL[next];
    if (yv !== undefined) {
      const cons = YOON[c];
      if (cons === undefined) throw new JaHangulError("bad-structure", `拗音にできない: "${c}${next}"`);
      romaji = cons + yv; // YOON の子音部は sh・ch・j(シャ→sha、ジャ→ja、チャ→cha)も含めてそのまま連結する
      i++;
    } else {
      romaji = BASE[c];
    }
    if (romaji === undefined) throw new JaHangulError("unsupported-kana", `変換できない文字: "${c}"`);
    if (geminate) {
      romaji = (romaji.startsWith("ch") ? "t" : romaji[0]!) + romaji;
      geminate = false;
    }
    out += romaji;
  }
  if (geminate) throw new JaHangulError("bad-structure", "語末の ッ");
  return out;
}
