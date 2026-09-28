// NFKC / NFKD must never be applied to notation strings: they replace modifier letters by plain letters (ʰ → h, ᵊ → ə ...).
export const NONSYL = "̯"; // ◌̯  vowelless consonant (used where no small kana exists)
export const HANDAKUTEN = "゚"; // ゚  part of ㇷ゚ (coda/prefix p). No longer used for ŋ (see NASAL_MOD).
export const NASAL_MOD = "ᵑ"; // ᵑ  U+1D51, ŋ marker (word-initial and coda). Shared convention with the other kana-<lang> notations.
export const GLOTTAL_MOD = "ˀ"; // ˀ  U+02C0, ʔ marker (prefix position only; ʔ is near-silent there, so it gets a modifier rather than a full kana+◌̯ like the other undefined prefix consonants). Shared convention with the other kana-<lang> notations.
export const BREVE = "̆"; // combining breve (short diphthongs)

export const CONS_MODS = ["ʰ", "ˡ", "ʳ", "ᵑ", "ˀ"] as const;
export const VOWEL_MODS = ["ᵋ", "ᵓ", "ᵅ", "ᵊ", "ᶤ"] as const;

/**
 * Modifiers dropped in lite notation. Chosen by corpus functional load (khmer-kana-spec.md §7,
 * 2026-09-28): collapsing each contrast across ~7,700 Wiktionary Khmer headwords and counting how many
 * distinct words become indistinguishable from another word. ʰ (3.5%), ɑ/ᵅ (3.3%), ə/ᵊ (2.7%), word-final
 * ŋ/n (2.2%), r/l (2.1%) are kept even in lite; ɨ/ᶤ (0.5%), ɔ/ᵓ (0.4%), ɛ/ᵋ (0.2%) and ˀ (not measured;
 * ʔ is near-silent in its only position, see PREFIX in tables.ts) are dropped.
 */
export const LITE_DROP = new Set<string>(["ˀ", "ᵋ", "ᵓ", "ᶤ"]);
