import { KhmerKanaError } from "./errors";
import { BREVE } from "./symbols";
import { ASPIRABLE, BASE_CONSONANTS, CODAS, DIPHTHONG, SHORT_DIPHTHONG, VOWELS } from "./tables";
import type { Coda, Consonant, Nucleus, Syllable, Utterance, Vowel, Word } from "./types";

const ALLOWED = new Set<string>([...BASE_CONSONANTS, ...VOWELS, "w", "ʰ", "ː", BREVE]);

/** NFD-normalize and map the b/d aliases to the canonical implosives. */
function normalize(s: string): string {
  return s.normalize("NFD").replace(/b/g, "ɓ").replace(/d/g, "ɗ");
}

function parseSyllable(raw: string): Syllable {
  const s = raw;
  for (let k = 0; k < s.length; k++) {
    if (!ALLOWED.has(s[k]!)) throw new KhmerKanaError("UNKNOWN_SYMBOL", `unknown symbol "${s[k]}"`, s, k);
  }
  let i = 0;

  // onset: 1..3 consonants, each optionally aspirated
  const onset: Consonant[] = [];
  while (i < s.length && BASE_CONSONANTS.has(s[i]!)) {
    let c = s[i]!;
    i++;
    if (s[i] === "ʰ") {
      if (!ASPIRABLE.has(c)) throw new KhmerKanaError("BAD_ONSET", `"${c}" cannot be aspirated`, s, i - 1);
      c += "ʰ";
      i++;
    }
    onset.push(c as Consonant);
  }
  if (onset.length === 0) {
    const hint = i < s.length && VOWELS.has(s[i]!) ? ' (vowel-initial syllables need an explicit "ʔ")' : "";
    throw new KhmerKanaError("BAD_ONSET", `no onset consonant${hint}`, s, 0);
  }
  if (onset.length > 3) throw new KhmerKanaError("BAD_ONSET", "more than 3 onset consonants", s, 0);

  // nucleus
  if (i >= s.length || !VOWELS.has(s[i]!)) throw new KhmerKanaError("NO_VOWEL", "expected a vowel", s, i);
  const v1 = s[i]! as Vowel;
  i++;
  let short = false;
  let long = false;
  let v2: Vowel | undefined;
  if (s[i] === BREVE) {
    short = true;
    i++;
  }
  if (s[i] === "ː") {
    if (short) throw new KhmerKanaError("BAD_NUCLEUS", "breve and length mark cannot be combined", s, i);
    long = true;
    i++;
  }
  if (i < s.length && VOWELS.has(s[i]!)) {
    const cand = s[i]! as Vowel;
    if (long) throw new KhmerKanaError("BAD_NUCLEUS", "length mark cannot precede a diphthong's second vowel", s, i);
    if (!DIPHTHONG.has(v1 + cand)) throw new KhmerKanaError("BAD_NUCLEUS", `"${v1}${cand}" is not a diphthong`, s, i);
    v2 = cand;
    i++;
  }
  if (short) {
    if (v2 !== "ə" || !SHORT_DIPHTHONG.has(v1 + v2)) {
      throw new KhmerKanaError("BAD_NUCLEUS", "breve is only allowed on ĭə ŭə ĕə ŏə", s, i);
    }
  } else if (v2 === "ə") {
    long = true; // iə ɨə uə eə oə ɔə aə are long diphthongs
  }
  const nucleus: Nucleus = { v1, long };
  if (v2) nucleus.v2 = v2;
  if (short) nucleus.short = true;

  // coda
  const syllable: Syllable = { onset, nucleus };
  if (i < s.length) {
    const c = s[i]!;
    if (c === "ː" || c === BREVE) {
      throw new KhmerKanaError("BAD_NUCLEUS", "duplicate or misplaced length mark / breve", s, i);
    }
    if (c === "ʰ") {
      throw new KhmerKanaError("BAD_CODA", "aspiration (ʰ) only applies to onset consonants", s, i);
    }
    if (c === "r") {
      throw new KhmerKanaError("BAD_CODA", "word-final r is not pronounced; omit it from the IPA", s, i);
    }
    if (!CODAS.has(c)) throw new KhmerKanaError("BAD_CODA", `"${c}" cannot be a coda`, s, i);
    syllable.coda = c as Coda;
    i++;
  }
  if (i < s.length) throw new KhmerKanaError("TRAILING", "unexpected trailing symbols", s, i);
  return syllable;
}

/**
 * Parse an IPA string: syllables are separated by ".", words by a single space.
 * A word without "." is one syllable (multi-syllable words must carry their "." boundaries).
 */
export function parseIpa(input: string): Utterance {
  const text = normalize(input);
  if (text.length === 0) throw new KhmerKanaError("EMPTY", "empty input", input);
  return text.split(" ").map((w): Word => {
    if (w.length === 0) throw new KhmerKanaError("EMPTY", "empty word (extra or edge space)", input);
    return w.split(".").map((sy) => {
      if (sy.length === 0) throw new KhmerKanaError("EMPTY", "empty syllable", w);
      return parseSyllable(sy);
    });
  });
}
