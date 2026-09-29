// Input schema for courses/<id>/{course,phrases,scenes}.yaml. See docs/design.md §4.1 and ADR-0020.
// フィールド名は言語に依存しない: text = 学ぶ言語(to)の文字、pron = その発音、gloss = 学習者の言語(from)の訳。
import { z } from "zod";

const slug = z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "kebab-case の id");

export const POS = ["noun", "pron", "verb", "adj", "adv", "particle", "prep", "question", "interj"] as const;
/** 分かち書きの1単語。gloss は直訳(意訳ではなく、その語単体の意味)。role は SVO の位置(あれば) */
export const PartInput = z.object({
  text: z.string().min(1),
  pron: z.string().min(1),
  gloss: z.string().min(1),
  pos: z.enum(POS),
  role: z.enum(["S", "V", "O"]).optional(),
});
export type PartInput = z.infer<typeof PartInput>;

export const VariantInput = z.object({
  speaker: z.enum(["any", "male", "female"]),
  register: z.enum(["polite", "casual"]).default("polite"),
  text: z.string().min(1),
  pron: z.string().min(1),
  audio: z.string().min(1),
  /** 単語ごとの分割。連結するとフレーズ全体(text/pron)と一致すること */
  parts: z.array(PartInput).optional(),
});

export const WordInput = z.object({ text: z.string().min(1), pron: z.string().min(1), gloss: z.string().min(1) });

export const PhraseInput = z.object({
  id: slug,
  scene: slug,
  /** 学習者の言語での意味(訳) */
  gloss: z.string().min(1),
  usage: z.string().default(""),
  variants: z.array(VariantInput).min(1),
  words: z.array(WordInput).default([]),
  addressee: z.object({
    gender: z.enum(["male", "female", "any"]),
    age: z.enum(["older", "younger", "any"]),
  }).optional(),
  review: z.object({ pron: z.boolean(), audio: z.boolean(), usage: z.boolean() }),
  audioSource: z.enum(["native", "tts"]),
});
export type PhraseInput = z.infer<typeof PhraseInput>;

export const SceneInput = z.object({ id: slug, title: z.string().min(1), order: z.number().int() });
export type SceneInput = z.infer<typeof SceneInput>;

export const PhrasesFile = z.array(PhraseInput);
export const ScenesFile = z.array(SceneInput);

const lang = z.string().regex(/^[a-z]{2}$/, "ISO 639-1 の2文字");
export const CourseInput = z.object({
  id: z.string().regex(/^[a-z]{2}-[a-z]{2}$/, "<from>-<to>"),
  from: lang,
  to: lang,
  title: z.record(z.string(), z.string()),
  notation: z.object({
    package: z.string().min(1),
    input: z.enum(["ipa", "kana"]),
    levels: z.array(z.enum(["full", "lite"])).min(1),
  }),
  fonts: z.array(z.string()).default([]),
  phrases: z.number().int().positive().optional(),
  deploy: z.object({ cloudflarePagesProject: z.string().min(1) }).optional(),
}).refine((c) => c.id === `${c.from}-${c.to}`, { message: "id は <from>-<to> と一致すること" });
export type CourseInput = z.infer<typeof CourseInput>;
