// P (round trip), E (errors), N (normalization)
import { describe, expect, it } from "vitest";
import { KhmerKanaError, parseIpa, toIpa, type ErrorCode } from "../src";

const code = (ipa: string): ErrorCode | undefined => {
  try {
    parseIpa(ipa);
  } catch (e) {
    if (e instanceof KhmerKanaError) return e.code;
    throw e;
  }
  return undefined;
};

describe("structure", () => {
  it("ʔɑː.kun is one word of two syllables", () => {
    const u = parseIpa("ʔɑː.kun");
    expect(u).toEqual([
      [
        { onset: ["ʔ"], nucleus: { v1: "ɑ", long: true } },
        { onset: ["k"], nucleus: { v1: "u", long: false }, coda: "n" },
      ],
    ]);
  });

  it("splits words on spaces", () => {
    expect(parseIpa("kʰɲom mɨn cɑŋ baːn teː")).toHaveLength(5);
  });

  it("iə-type diphthongs are long by default; ae ao ei ou are not", () => {
    expect(parseIpa("kiə")[0]![0]!.nucleus).toEqual({ v1: "i", long: true, v2: "ə" });
    expect(parseIpa("kae")[0]![0]!.nucleus).toEqual({ v1: "a", long: false, v2: "e" });
  });

  it("breve diphthong is short and not long", () => {
    expect(parseIpa("kĭə")[0]![0]!.nucleus).toEqual({ v1: "i", long: false, v2: "ə", short: true });
  });

  it("keeps aspirated consonants as single tokens; up to 3 onset consonants", () => {
    expect(parseIpa("cʰkae")[0]![0]!.onset).toEqual(["cʰ", "k"]);
    expect(parseIpa("strəj")[0]![0]!.onset).toEqual(["s", "t", "r"]);
  });
});

describe("normalization (N)", () => {
  it("accepts b/d as aliases of ɓ/ɗ", () => {
    expect(parseIpa("baːt")).toEqual(parseIpa("ɓaːt"));
    expect(parseIpa("daə")).toEqual(parseIpa("ɗaə"));
  });

  it("accepts the breve in NFC (U+012D) and NFD (i + U+0306)", () => {
    const nfc = "k\u012D\u0259"; // k ĭ ə
    const nfd = "ki\u0306\u0259";
    expect(nfc).toContain("\u012D");
    expect(parseIpa(nfc)).toEqual(parseIpa(nfd));
  });

  it("toIpa emits NFC", () => {
    const out = toIpa(parseIpa("ki\u0306\u0259"));
    expect(out).toBe("k\u012D\u0259");
    expect(out).toBe(out.normalize("NFC"));
  });

  it("NFKC destroys modifier letters (why it is forbidden)", () => {
    expect("ᵊʰˡ".normalize("NFKC")).toBe("əhl");
  });
});

describe("round trip (P)", () => {
  const samples = [
    "ʔɑː.kun", "kʰɲom", "tʰlaj", "ɲam", "sʔaːt", "ɗaə", "tɨw", "pʰsaː", "tʰom", "cʰap", "cʰkae", "srəj", "miən",
    "ciəŋ", "loːk", "ɓaːt", "kʰɑːŋ", "mɗaːj", "lʔɑː", "strəj", "skraː", "kĭə", "kŭə", "kĕə", "kŏə", "kae", "kou",
    "kʰɲom mɨn cɑŋ ɓaːn teː", "kaw", "kac", "kaɲ",
  ];
  for (const ipa of samples) {
    it(ipa, () => {
      expect(toIpa(parseIpa(ipa))).toBe(ipa.normalize("NFC"));
      expect(parseIpa(toIpa(parseIpa(ipa)))).toEqual(parseIpa(ipa));
    });
  }
});

describe("errors (E)", () => {
  const cases: [string, ErrorCode][] = [
    ["kar", "BAD_CODA"], // word-final r is not pronounced
    ["kʰʰa", "NO_VOWEL"],
    ["k", "NO_VOWEL"],
    ["kaːː", "BAD_NUCLEUS"],
    ["xa", "UNKNOWN_SYMBOL"],
    ["aː", "BAD_ONSET"], // vowel-initial needs an explicit ʔ
    ["mʰa", "BAD_ONSET"], // only p t c k aspirate
    ["ptkra", "BAD_ONSET"], // > 3 onset consonants
    ["kiaː", "BAD_NUCLEUS"], // ia is not a diphthong
    ["kĭ", "BAD_NUCLEUS"], // breve without ə
    ["kĭːə", "BAD_NUCLEUS"], // breve + length
    ["kaːə", "BAD_NUCLEUS"], // length before second vowel
    ["kaɓ", "BAD_CODA"],
    ["", "EMPTY"],
    [" kaː", "EMPTY"],
    ["kaː  kaː", "EMPTY"],
    ["kaː.", "EMPTY"],
    ["ka.", "EMPTY"],
    ["kaŋk", "TRAILING"],
  ];
  for (const [ipa, expected] of cases) {
    it(`${JSON.stringify(ipa)} → ${expected}`, () => {
      expect(code(ipa)).toBe(expected);
    });
  }

  it("a multi-syllable word without '.' is an error, not a silent guess", () => {
    expect(code("ʔɑːkun")).toBeDefined();
  });
});
