import { BREVE } from "./symbols";
import type { Syllable, Utterance } from "./types";

function syllableToIpa(s: Syllable): string {
  const n = s.nucleus;
  const nucleus = n.v1 + (n.short ? BREVE : "") + (n.v2 ? n.v2 : n.long ? "ː" : "");
  return s.onset.join("") + nucleus + (s.coda ?? "");
}

/** Canonical IPA (NFC). Inverse of parseIpa. */
export function toIpa(u: Utterance): string {
  return u.map((w) => w.map(syllableToIpa).join(".")).join(" ").normalize("NFC");
}
