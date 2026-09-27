import { KhmerKanaError } from "./errors";
import { HANDAKUTEN } from "./symbols";
import {
  CODA_KANA,
  CONS_MOD_OF,
  DENASAL,
  ONSET_EXCEPTIONS,
  ONSET_ROWS,
  PREFIX,
  SECOND,
  VOWEL,
  type BaseConsonant,
} from "./tables";
import type { NotationLevel, Rendered, Span, Syllable, Utterance } from "./types";

const baseOf = (c: string): BaseConsonant => c.replace("ʰ", "") as BaseConsonant;

function renderSyllable(sy: Syllable, out: Span[]): void {
  const where = sy.onset.join("");
  const prefixes = sy.onset.slice(0, -1);
  const main = sy.onset[sy.onset.length - 1]!;

  for (const p of prefixes) {
    const form = PREFIX[baseOf(p)];
    if (!form) {
      throw new KhmerKanaError("NO_VOWELLESS_FORM", `no vowelless form defined for "${baseOf(p)}" in a cluster`, where);
    }
    for (const part of form) out.push({ kind: part.kind, text: part.text, ipa: baseOf(p) });
  }

  const base = baseOf(main);
  const row = ONSET_ROWS[base];
  const v = VOWEL[sy.nucleus.v1];
  const exception = ONSET_EXCEPTIONS[base + sy.nucleus.v1];
  out.push({
    kind: base === "ŋ" ? "kana-nasal" : "kana",
    text: exception?.full ?? row[v.row],
    ipa: base,
    ...(exception ? { lite: exception.lite } : {}),
  });
  if (main.endsWith("ʰ")) out.push({ kind: "cons-mod", text: "ʰ", ipa: main });
  const cm = CONS_MOD_OF[base];
  if (cm) out.push({ kind: "cons-mod", text: cm, ipa: base });
  if (v.mod) out.push({ kind: "vowel-mod", text: v.mod, ipa: sy.nucleus.v1 });

  const { v2, long, short } = sy.nucleus;
  if (!v2 && long) out.push({ kind: "long", text: "ー", ipa: "ː" });
  if (v2) {
    const second = SECOND[v2];
    if (!second) throw new KhmerKanaError("NO_TABLE_ENTRY", `no second-element kana for "${v2}"`, where);
    const text = short ? second.short : second.long;
    if (!text) throw new KhmerKanaError("NO_TABLE_ENTRY", `no short form for "${v2}"`, where);
    out.push({ kind: "kana", text, ipa: v2 });
    if (second.mod) out.push({ kind: "vowel-mod", text: second.mod, ipa: v2 });
  }

  if (sy.coda) {
    for (const part of CODA_KANA[sy.coda]) out.push({ kind: part.kind, text: part.text, ipa: sy.coda });
  }
}

function build(spans: Span[]): Rendered {
  return { text: spans.map((s) => s.text).join(""), spans };
}

/** Detailed notation: kana plus modifier letters. */
export function renderFull(u: Utterance): Rendered {
  const spans: Span[] = [];
  u.forEach((word, wi) => {
    if (wi > 0) spans.push({ kind: "space", text: " " });
    for (const sy of word) renderSyllable(sy, spans);
  });
  return build(spans);
}

/**
 * Lite notation, derived from the detailed notation's spans (never by string replacement):
 * modifier letters are dropped (◌̯ stays), and ゚-marked kana become plain kana.
 * ㇷ゚ is a plain "kana" span, so its half-voiced mark is untouched.
 */
export function liteFromFull(full: Rendered): Rendered {
  const spans: Span[] = [];
  for (const s of full.spans) {
    if (s.kind === "cons-mod" || s.kind === "vowel-mod") continue;
    if (s.lite !== undefined) {
      const { lite, ...rest } = s;
      spans.push({ ...rest, text: lite });
      continue;
    }
    if (s.kind === "kana-nasal") {
      const plain = DENASAL[s.text];
      if (plain === undefined) {
        throw new KhmerKanaError("NO_TABLE_ENTRY", `no plain form for "${s.text}" (${HANDAKUTEN})`, s.text);
      }
      spans.push({ ...s, kind: "kana", text: plain });
    } else {
      spans.push(s);
    }
  }
  return build(spans);
}

export function renderLite(u: Utterance): Rendered {
  return liteFromFull(renderFull(u));
}

export function renderKana(u: Utterance, level: NotationLevel): Rendered {
  return level === "full" ? renderFull(u) : renderLite(u);
}
