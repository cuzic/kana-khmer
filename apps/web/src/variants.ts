import type { Phrase, Variant } from "./data";
import type { Settings } from "./settings";

/** Variants to show: the one matching the speaker's gender (or "any"); with gender unset, all polite ones. Casual forms are supplementary. */
export function pickVariants(phrase: Phrase, gender: Settings["speakerGender"]) {
  const polite = phrase.variants.filter((v) => v.register === "polite");
  const casual = phrase.variants.filter((v) => v.register === "casual");
  let main: Variant[] = polite;
  let other: Variant[] = [];
  if (gender !== "unset") {
    main = polite.filter((v) => v.speaker === gender || v.speaker === "any");
    other = polite.filter((v) => !main.includes(v));
  }
  return { main, other, casual };
}
