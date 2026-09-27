// Input schema for data/phrases.yaml and data/scenes.yaml. See docs/design.md §4.1.
import { z } from "zod";

const slug = z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "kebab-case の id");

/** A sound-alike in another language to help memorize the form. Sound only; meaning and origin are unrelated. */
export const MnemonicInput = z.object({
  lang: z.string().min(1),   // 例: イタリア語
  word: z.string().min(1),   // 例: ciao
  reading: z.string().min(1),// 例: チャオ
  note: z.string().default(""),
});

export const VariantInput = z.object({
  mnemonic: MnemonicInput.optional(),
  speaker: z.enum(["any", "male", "female"]),
  register: z.enum(["polite", "casual"]).default("polite"),
  khmer: z.string().min(1),
  ipa: z.string().min(1),
  audio: z.string().min(1),
});

export const WordInput = z.object({ khmer: z.string().min(1), ipa: z.string().min(1), ja: z.string().min(1) });

export const PhraseInput = z.object({
  id: slug,
  scene: slug,
  ja: z.string().min(1),
  usage: z.string().default(""),
  variants: z.array(VariantInput).min(1),
  words: z.array(WordInput).default([]),
  addressee: z.object({
    gender: z.enum(["male", "female", "any"]),
    age: z.enum(["older", "younger", "any"]),
  }).optional(),
  review: z.object({ ipa: z.boolean(), audio: z.boolean(), usage: z.boolean() }),
  audioSource: z.enum(["native", "tts"]),
});
export type PhraseInput = z.infer<typeof PhraseInput>;

export const SceneInput = z.object({ id: slug, title: z.string().min(1), order: z.number().int() });
export type SceneInput = z.infer<typeof SceneInput>;

export const PhrasesFile = z.array(PhraseInput);
export const ScenesFile = z.array(SceneInput);
