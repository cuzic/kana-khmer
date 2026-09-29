import { readFileSync } from "node:fs";
import { parse } from "yaml";
import { CourseInput, PhrasesFile, ScenesFile, type PhraseInput, type SceneInput } from "./schema";

export interface CourseData { course: CourseInput; phrases: PhraseInput[]; scenes: SceneInput[] }

/** courses/<id>/ を読む(course.yaml・phrases.yaml・scenes.yaml) */
export function loadCourse(dir: string): CourseData {
  const read = (name: string) => parse(readFileSync(`${dir}/${name}`, "utf8"));
  return {
    course: CourseInput.parse(read("course.yaml")),
    phrases: PhrasesFile.parse(read("phrases.yaml")),
    scenes: ScenesFile.parse(read("scenes.yaml")),
  };
}
