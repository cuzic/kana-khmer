// phrases.yaml → phrases.json. 読み(カナ・ハングル)は表記ライブラリが生成し、手で書かない(design.md §4.2, §4.3、ADR-0020)。
import { NotationError, type Notation } from "./notation";
import type { PartInput, PhraseInput, SceneInput } from "./schema";

export type Profile = "prod" | "preview";
/** A scene needs at least this many published phrases to be shown in prod (design.md §4.3). */
export const MIN_PHRASES_PER_SCENE = 4;

export interface Part extends PartInput { readingFull: string; readingLite: string }
export interface Variant {
  speaker: "any" | "male" | "female";
  register: "polite" | "casual";
  text: string;
  pron: string;
  /** 音節構造(表記ライブラリによる。クメール語のみ) */
  syllables?: unknown;
  readingFull: string;
  readingLite: string;
  audio: string;
  parts?: Part[];
}
export interface Phrase extends Omit<PhraseInput, "variants" | "words"> {
  variants: Variant[];
  words: { text: string; pron: string; gloss: string }[];
  /** true when any review item is still false (preview shows an "未確認" badge). */
  unreviewed: boolean;
}
export interface Scene extends SceneInput { phraseIds: string[] }
export interface Bundle { schema: 1; profile: Profile; scenes: Scene[]; phrases: Phrase[] }
export interface BuildResult { bundle: Bundle; errors: string[]; warnings: string[] }

export interface BuildOptions {
  profile: Profile;
  /** コースの表記ライブラリ(course.yaml の notation.package) */
  notation: Notation;
  /** Returns whether an audio file exists. Checked only in prod. */
  audioExists?: (file: string) => boolean;
}

function convertPron(notation: Notation, where: string, pron: string, errors: string[]) {
  try {
    return notation.convert(pron);
  } catch (e) {
    if (!(e instanceof NotationError)) throw e;
    errors.push(`${where}: 発音 "${pron}" を変換できません (${e.message})`);
    return undefined;
  }
}

export function buildBundle(phrases: PhraseInput[], scenes: SceneInput[], opts: BuildOptions): BuildResult {
  const { notation } = opts;
  const errors: string[] = [];
  const warnings: string[] = [];
  const sceneIds = new Set<string>();
  for (const s of scenes) {
    if (sceneIds.has(s.id)) errors.push(`scene ${s.id}: id が重複しています`);
    sceneIds.add(s.id);
  }

  const seen = new Set<string>();
  const built: Phrase[] = [];
  for (const p of phrases) {
    if (seen.has(p.id)) errors.push(`phrase ${p.id}: id が重複しています`);
    seen.add(p.id);
    if (!sceneIds.has(p.scene)) errors.push(`phrase ${p.id}: 未定義のシーン "${p.scene}"`);

    const variants: Variant[] = [];
    const speakers = new Set<string>();
    for (const { parts: inputParts, ...v } of p.variants) {
      const key = `${v.speaker}/${v.register}`;
      if (speakers.has(key)) errors.push(`phrase ${p.id}: variants の ${key} が重複しています`);
      speakers.add(key);
      const r = convertPron(notation, `phrase ${p.id}`, v.pron, errors);
      if (!r) continue;
      let parts: Part[] | undefined;
      // parts があれば、その単語境界を使って本文の読みも分かち書きする(語ごとに変換して連結するのではなく、
      // 表記ライブラリの convertWords に語を渡す。クメール語は renderFull の語間 space span をそのまま使う。
      // design.md §2.1 / render.ts の word boundary)。
      let spaced: { full: string; lite: string } | undefined;
      if (inputParts) {
        const where = `phrase ${p.id} の ${key}`;
        const strip = (t: string) => t.replace(/[.\s]/g, "");
        if (inputParts.map((x) => x.text).join("") !== v.text) errors.push(`${where}: parts の text を連結すると "${inputParts.map((x) => x.text).join("")}" になり、フレーズ "${v.text}" と一致しません`);
        if (strip(inputParts.map((x) => x.pron).join("")) !== strip(v.pron)) errors.push(`${where}: parts の pron を連結すると "${inputParts.map((x) => x.pron).join(".")}" になり、フレーズ "${v.pron}" と一致しません`);
        parts = [];
        const okProns: string[] = [];
        for (const x of inputParts) {
          const pr = convertPron(notation, `${where} の部品 ${x.text}`, x.pron, errors);
          if (pr) {
            parts.push({ ...x, pron: pr.pron, readingFull: pr.full, readingLite: pr.lite });
            okProns.push(x.pron);
          }
        }
        spaced = notation.convertWords(okProns);
      }
      variants.push({
        ...v,
        ...(parts ? { parts } : {}),
        pron: r.pron,
        ...(r.syllables !== undefined ? { syllables: r.syllables } : {}),
        readingFull: spaced?.full ?? r.full,
        readingLite: spaced?.lite ?? r.lite,
      });
    }
    if (speakers.has("any/polite") && speakers.size > 1) {
      errors.push(`phrase ${p.id}: speaker any と male/female を polite で併用できません`);
    }
    const words = p.words.map((w) => {
      const r = convertPron(notation, `phrase ${p.id} の単語 ${w.text}`, w.pron, errors);
      return { ...w, pron: r?.pron ?? w.pron };
    });
    if (words.length === 0) warnings.push(`phrase ${p.id}: words が空です(単語タップができません)`);

    built.push({ ...p, variants, words, unreviewed: !(p.review.pron && p.review.audio && p.review.usage) });
  }

  let published = built;
  if (opts.profile === "prod") {
    published = built.filter((p) => !p.unreviewed && p.audioSource === "native");
    const exists = opts.audioExists;
    if (exists) {
      for (const p of published) {
        for (const v of p.variants) {
          if (!exists(v.audio)) errors.push(`phrase ${p.id}: 音声ファイル ${v.audio} がありません`);
        }
      }
    }
  }

  const outScenes: Scene[] = [];
  for (const s of [...scenes].sort((a, b) => a.order - b.order)) {
    const ids = published.filter((p) => p.scene === s.id).map((p) => p.id);
    if (opts.profile === "prod" && ids.length < MIN_PHRASES_PER_SCENE) {
      warnings.push(`scene ${s.id}: 公開フレーズが ${ids.length} 件(${MIN_PHRASES_PER_SCENE} 件未満)のため非公開にします`);
      continue;
    }
    outScenes.push({ ...s, phraseIds: ids });
  }
  const visible = new Set(outScenes.flatMap((s) => s.phraseIds));
  const outPhrases = published.filter((p) => visible.has(p.id));

  return { bundle: { schema: 1, profile: opts.profile, scenes: outScenes, phrases: outPhrases }, errors, warnings };
}
