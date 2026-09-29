// 表記ライブラリの差し込み口(ADR-0020)。コースの notation.package から引く。
// ビルドは khmer-kana / ja-hangul を直接 import せず、ここのアダプタだけを通す。
import { KhmerKanaError, parseIpa, renderFull, renderLite, toIpa, type Utterance } from "khmer-kana";
import { JaHangulError, renderHangul, renderRomaji } from "ja-hangul";

export interface NotationResult {
  /** 正規化した発音(クメール語は IPA。日本語はカナのまま) */
  pron: string;
  /** 詳細/ライトの読み(クメール語はカナ、日本語はハングル) */
  full: string;
  lite: string;
  /** 音節構造。ある表記ライブラリだけが持つ(クメール語) */
  syllables?: unknown;
  /** ラテン文字転写(日本語は修正ヘボン式ローマ字)。表記ライブラリが出せるときだけ */
  latin?: string;
}
export class NotationError extends Error {}

export interface Notation {
  id: string;
  /** pron の形式(course.yaml の notation.input と一致すること) */
  input: "ipa" | "kana";
  convert(pron: string): NotationResult;
  /** 語ごとの pron を、語境界を保って1つの読みにする(parts の分かち書き用) */
  convertWords(prons: string[]): { full: string; lite: string; latin?: string };
}

export const khmerNotation: Notation = {
  id: "khmer-kana",
  input: "ipa",
  convert(pron) {
    try {
      const syllables = parseIpa(pron);
      return { pron: toIpa(syllables), full: renderFull(syllables).text, lite: renderLite(syllables).text, syllables };
    } catch (e) {
      throw new NotationError(e instanceof KhmerKanaError ? `${e.code}: ${e.message}` : String(e));
    }
  },
  convertWords(prons) {
    // 語ごとに parse した音節を1つの Utterance の別々の語として渡し、renderFull の語間 space span をそのまま使う
    const u: Utterance = [];
    for (const p of prons) {
      try { u.push(...parseIpa(p)); } catch (e) { throw new NotationError(e instanceof KhmerKanaError ? `${e.code}: ${e.message}` : String(e)); }
    }
    return { full: renderFull(u).text, lite: renderLite(u).text };
  },
};

export const jaHangulNotation: Notation = {
  id: "ja-hangul",
  input: "kana",
  convert(pron) {
    try {
      return { pron, full: renderHangul(pron, "full"), lite: renderHangul(pron, "lite"), latin: renderRomaji(pron) };
    } catch (e) {
      throw new NotationError(e instanceof JaHangulError ? `${e.code}: ${e.message}` : String(e));
    }
  },
  convertWords(prons) {
    try {
      return {
        full: prons.map((p) => renderHangul(p, "full")).join(" "),
        lite: prons.map((p) => renderHangul(p, "lite")).join(" "),
        latin: prons.map((p) => renderRomaji(p)).join(" "),
      };
    } catch (e) {
      throw new NotationError(e instanceof JaHangulError ? `${e.code}: ${e.message}` : String(e));
    }
  },
};

const REGISTRY: Record<string, Notation> = { [khmerNotation.id]: khmerNotation, [jaHangulNotation.id]: jaHangulNotation };

export function getNotation(id: string): Notation {
  const n = REGISTRY[id];
  if (!n) throw new Error(`未登録の表記ライブラリ "${id}" (登録済み: ${Object.keys(REGISTRY).join(", ")})`);
  return n;
}
