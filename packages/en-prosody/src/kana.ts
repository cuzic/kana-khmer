// ARPABET の音素列 → 「カナ + 右肩の IPA 修飾文字」。tools/en-prosody-spike/src/kana.py の移植(Python が正)。
// 表記の文字列に NFKC/NFKD を適用しないこと(修飾文字が通常の文字に置き換わる)。

export const VOWELS = new Set(["AA", "AE", "AH", "AO", "AW", "AY", "EH", "ER", "EY", "IH", "IY", "OW", "OY", "UH", "UW"]);

const ROWS: Record<string, string[]> = {
  k: [..."カキクケコ"], g: [..."ガギグゲゴ"], s: ["サ", "スィ", "ス", "セ", "ソ"], z: ["ザ", "ズィ", "ズ", "ゼ", "ゾ"],
  th: ["サ", "シ", "ス", "セ", "ソ"], dh: ["ザ", "ジ", "ズ", "ゼ", "ゾ"],
  sh: ["シャ", "シ", "シュ", "シェ", "ショ"], ch: ["チャ", "チ", "チュ", "チェ", "チョ"],
  ts: ["ツァ", "ツィ", "ツ", "ツェ", "ツォ"],
  dz: ["ヅァ", "ヅィ", "ヅ", "ヅェ", "ヅォ"],
  j: ["ジャ", "ジ", "ジュ", "ジェ", "ジョ"], dj: ["ヂャ", "ヂ", "ヂュ", "ヂェ", "ヂョ"],
  t: ["タ", "ティ", "トゥ", "テ", "ト"], d: ["ダ", "ディ", "ドゥ", "デ", "ド"],
  n: [..."ナニヌネノ"], h: [..."ハヒフヘホ"], f: ["ファ", "フィ", "フ", "フェ", "フォ"],
  b: [..."バビブベボ"], p: [..."パピプペポ"], v: ["ヴァ", "ヴィ", "ヴ", "ヴェ", "ヴォ"], m: [..."マミムメモ"], r: [..."ラリルレロ"],
  w: ["ワ", "ウィ", "ウ", "ウェ", "ウォ"], y: ["ヤ", "イ", "ユ", "イェ", "ヨ"],
};

// 音素 → [行, 子音の右肩, 母音の前以外での小書き形]
type Cons = readonly [string, string, string];
const CONS: Record<string, Cons> = {
  P: ["p", "", "ㇷ゚"], B: ["b", "", "ㇷ\u3099"], T: ["t", "", "ㇳ"], D: ["d", "", "ㇳ\u3099"],
  K: ["k", "", "ㇰ"], G: ["g", "", "ㇰ\u3099"],
  F: ["f", "", "ㇷ"], V: ["v", "", "ゥ\u3099"],
  S: ["s", "", "ㇲ"], Z: ["z", "", "ㇲ\u3099"],
  SH: ["sh", "", "ㇱ"], ZH: ["j", "ᶾ", "ㇱ\u3099"],
  CH: ["ch", "", "チ"], TS: ["ts", "", "ツ"], DZ: ["dz", "", "ヅ"], JH: ["dj", "", "ヂ"],
  TH: ["th", "ᶿ", "ㇲᶿ"], DH: ["dh", "ᶞ", "ㇲᶞ"],
  M: ["m", "", "ㇺ"], N: ["n", "", "ン"], NG: ["n", "ᵑ", "ンᵑ"],
  L: ["r", "ˡ", "ㇽˡ"], R: ["r", "ʳ", "ㇽʳ"],
  HH: ["h", "", ""], W: ["w", "", "ウ"], Y: ["y", "", "イ"],
};

// 母音 → [母音の行 0-4、母音の右肩、後ろに足す音]
const VOW: Record<string, readonly [number, string, string]> = {
  IY: [1, "", "ー"], IH: [1, "ᶦ", ""], EH: [3, "", ""], EY: [3, "", "イ"], AE: [0, "ᵆ", ""],
  AA: [0, "", ""], AH: [0, "ᶺ", ""], AO: [4, "ᵓ", ""], OW: [4, "", "ウ"], UH: [2, "ᶷ", ""],
  UW: [2, "", "ー"], AY: [0, "", "イ"], AW: [0, "", "ウ"], OY: [4, "", "イ"], ER: [0, "ᶟʳ", ""],
};
const YBASE: Record<string, readonly [string, string]> = {
  K: ["キ", ""], G: ["ギ", ""], B: ["ビ", ""], P: ["ピ", ""], M: ["ミ", ""], F: ["フ", ""], V: ["ヴ", ""],
  HH: ["ヒ", ""], N: ["ニ", ""], T: ["テ", ""], D: ["デ", ""], S: ["シ", ""], Z: ["ジ", ""], L: ["リ", "ˡ"],
};
const YVOW: Record<string, readonly [string, string, string]> = {
  UW: ["ュ", "", "ー"], UH: ["ュ", "ᶷ", ""], AA: ["ャ", "", ""], AE: ["ャ", "ᵆ", ""], OW: ["ョ", "", "ウ"], AO: ["ョ", "ᵓ", ""],
};
const FLAP: Record<string, string> = { T: "ᵗ", D: "ᵈ" };

const own = <T>(o: Record<string, T>, k: string): T | undefined => (Object.hasOwn(o, k) ? o[k] : undefined);
function need<T>(o: Record<string, T>, k: string): T {
  const v = own(o, k);
  if (v === undefined) throw new Error(`table has no entry: ${k}`);
  return v;
}
const rowOf = (name: string): string[] => need(ROWS, name);

export function splitPhone(p: string): [string, number | null] {
  const last = p[p.length - 1] ?? "";
  if (/^[0-9]$/.test(last)) return [p.slice(0, -1), Number(last)];
  return [p, null];
}

export function isVowel(p: string): boolean {
  return VOWELS.has(splitPhone(p)[0]);
}

function nucleus(base: string, stress: number | null, onset: Cons | null, flap: string | null, nxt: string | null): string {
  const schwa = base === "AH" && stress === 0;
  const rColor = base === "ER";
  if (schwa || (rColor && stress === 0)) {
    const mark = rColor ? "ʳ" : "ᵊ";
    if (flap) return "ラ" + flap + mark;
    const pal = ["ch", "j", "dj", "sh"];
    if (rColor && onset && !pal.includes(onset[0])) return rowOf(onset[0])[0]! + onset[1] + "ʳ";
    if (rColor && !onset) return "アʳ";
    if (onset && onset[0] === "y" && !rColor) return rowOf("y")[0]! + "ᵊ"; // y + 弱い母音は ヤᵊ(you の弱形)。強い /ju:/ は ユー
    if (onset && pal.includes(onset[0])) {
      if (rColor) return rowOf(onset[0])[0]! + onset[1] + "ʳ";
      if (nxt === "N") return rowOf(onset[0])[1]! + onset[1] + "ᵊ";
      return rowOf(onset[0])[0]! + onset[1];
    }
    return (onset ? onset[2] : "ァ") + mark;
  }
  let [row, vmod, tail] = need(VOW, base);
  if (base === "IH" && stress === 0) vmod = "ᶦ";
  let head: string;
  let cmod: string;
  if (flap) {
    head = rowOf("r")[row]!;
    cmod = flap;
  } else if (onset) {
    head = rowOf(onset[0])[row]!;
    cmod = onset[1];
  } else {
    head = [..."アイウエオ"][row]!;
    cmod = "";
  }
  return head + cmod + vmod + tail;
}

/** 有気音にする P T K CH の index。強勢(1・2)のある母音の前(R L W Y をはさんでもよい)で、S の直後でないもの。連結で移った子音・融合した子音(noAsp)は対象外。 */
function aspirated(phones: string[], noAsp: Set<number>): Set<number> {
  const out = new Set<number>();
  phones.forEach((ph, i) => {
    const b = splitPhone(ph)[0];
    if (!["P", "T", "K", "CH"].includes(b) || noAsp.has(i)) return;
    if (i > 0 && splitPhone(phones[i - 1]!)[0] === "S") return;
    let j = i + 1;
    if (b !== "CH" && j < phones.length && ["R", "L", "W", "Y"].includes(splitPhone(phones[j]!)[0])) j += 1;
    if (j < phones.length && isVowel(phones[j]!) && [1, 2].includes(splitPhone(phones[j]!)[1] ?? -1)) out.add(i);
  });
  return out;
}

/** T+S は破擦音 TS(ツ)、D+Z は DZ(ヅ)にする。弾き音の T/D は対象外。index の集合も付け替える。 */
function mergeTs(phones: string[], flapAt: Set<number>, asp: Set<number>): [string[], Set<number>, Set<number>] {
  const pairs: Record<string, string> = { "T S": "TS", "D Z": "DZ" };
  const out: string[] = [];
  const flaps = new Set<number>();
  const asps = new Set<number>();
  let i = 0;
  while (i < phones.length) {
    if (!flapAt.has(i) && i + 1 < phones.length) {
      const merged = own(pairs, `${splitPhone(phones[i]!)[0]} ${splitPhone(phones[i + 1]!)[0]}`);
      if (merged) {
        out.push(merged);
        i += 2;
        continue;
      }
    }
    if (flapAt.has(i)) flaps.add(out.length);
    if (asp.has(i)) asps.add(out.length);
    out.push(phones[i]!);
    i += 1;
  }
  return [out, flaps, asps];
}

/** phones: ARPABET(ストレス数字つき)。flapAt: 弾き音にする T/D の index。noAsp: 有気音にしない index(連結で移った子音など)。 */
export function phonesToKana(phonesIn: string[], flapIn?: Set<number>, noAspIn?: Set<number>): string {
  const [phones, flapAt, asp] = mergeTs(phonesIn, flapIn ?? new Set(), aspirated(phonesIn, noAspIn ?? new Set()));
  const seq: [string, number | null, number][] = [];
  const n = phones.length;
  for (let i = 0; i < n; i++) {
    const [b, s] = splitPhone(phones[i]!);
    if (b === "R" && i > 0 && isVowel(phones[i - 1]!) && splitPhone(phones[i - 1]!)[0] !== "ER" && !(i + 1 < n && isVowel(phones[i + 1]!))) {
      seq.push(["<r>", null, i]);
    } else {
      seq.push([b, s, i]);
    }
  }
  const out: string[] = [];
  let pending: [string, number][] = [];
  for (let k = 0; k < seq.length; k++) {
    const [b, s] = seq[k]!;
    if (b === "<r>") {
      if (out.length) out[out.length - 1] += "ʳ";
      continue;
    }
    if (VOWELS.has(b)) {
      let onset: Cons | null = null;
      let flap: string | null = null;
      const ybase = pending.length >= 2 ? own(YBASE, pending[pending.length - 2]![0]) : undefined;
      const yvow = own(YVOW, b);
      if (pending.length >= 2 && pending[pending.length - 1]![0] === "Y" && ybase && yvow) {
        for (const [cc, ccidx] of pending.slice(0, -2)) out.push(need(CONS, cc)[2] + (asp.has(ccidx) ? "ʰ" : ""));
        const [baseK, cmod] = ybase;
        const [small, vm, tail] = yvow;
        out.push(baseK + cmod + (asp.has(pending[pending.length - 2]![1]) ? "ʰ" : "") + small + vm + tail);
        pending = [];
        continue;
      }
      if (pending.length) {
        const [last, lidx] = pending[pending.length - 1]!;
        for (const [c, cidx] of pending.slice(0, -1)) out.push(need(CONS, c)[2] + (asp.has(cidx) ? "ʰ" : ""));
        if (flapAt.has(lidx) && own(FLAP, last)) flap = FLAP[last]!;
        else {
          const base = need(CONS, last);
          onset = asp.has(lidx) ? ([base[0], base[1] + "ʰ", base[2]] as const) : base; // 強勢のある母音の前の p t k ch は有気音(ʰ)
        }
        pending = [];
      }
      const nxt = k + 1 < seq.length ? seq[k + 1]![0] : null;
      out.push(nucleus(b, s, onset, flap, nxt));
    } else {
      pending.push([b, seq[k]![2]]);
    }
  }
  for (const [c, cidx] of pending) out.push(flapAt.has(cidx) && own(FLAP, c) ? "ㇻ" + FLAP[c] : need(CONS, c)[2]);
  return out.join("");
}
