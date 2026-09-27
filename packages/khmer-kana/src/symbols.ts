// NFKC / NFKD must never be applied to notation strings: they replace modifier letters by plain letters (ʰ → h, ᵊ → ə ...).
export const NONSYL = "̯"; // ◌̯  vowelless consonant (used where no small kana exists)
export const HANDAKUTEN = "゚"; // ゚  part of ㇷ゚ (coda/prefix p). No longer used for ŋ (see NASAL_MOD).
export const NASAL_MOD = "ᵑ"; // ᵑ  U+1D51, ŋ marker (word-initial and coda). Shared convention with the other kana-<lang> notations.
export const BREVE = "̆"; // combining breve (short diphthongs)

export const CONS_MODS = ["ʰ", "ˡ", "ʳ", "ᵑ"] as const;
export const VOWEL_MODS = ["ᵋ", "ᵓ", "ᵅ", "ᵊ", "ᶤ"] as const;
