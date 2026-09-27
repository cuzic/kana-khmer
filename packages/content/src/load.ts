import { readFileSync } from "node:fs";
import { parse } from "yaml";
import { PhrasesFile, ScenesFile, type PhraseInput, type SceneInput } from "./schema";

export function loadData(dir: string): { phrases: PhraseInput[]; scenes: SceneInput[] } {
  const read = (name: string) => parse(readFileSync(`${dir}/${name}`, "utf8"));
  return { phrases: PhrasesFile.parse(read("phrases.yaml")), scenes: ScenesFile.parse(read("scenes.yaml")) };
}
