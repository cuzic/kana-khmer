// NFKC / NFKD must never be applied to notation strings: they replace modifier letters by plain letters (ʰ → h, ᵊ → ə ...).
export const NONSYL = "̯"; // ◌̯  vowelless consonant (used where no small kana exists)
export const HANDAKUTEN = "゚"; // ゚  ŋ (nasal g) marker; also part of ㇷ゚
export const BREVE = "̆"; // combining breve (short diphthongs)

export const CONS_MODS = ["ʰ", "ˡ", "ʳ"] as const;
export const VOWEL_MODS = ["ᵋ", "ᵓ", "ᵅ", "ᵊ", "ᶤ"] as const;
