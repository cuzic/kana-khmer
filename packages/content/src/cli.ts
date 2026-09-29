// usage: tsx src/cli.ts <check|build> [--course <from>-<to>] [--profile prod|preview]
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { buildBundle, type Profile } from "./build";
import { loadCourse } from "./load";
import { getNotation } from "./notation";

const repoRoot = fileURLToPath(new URL("../../..", import.meta.url));
const pkgRoot = fileURLToPath(new URL("..", import.meta.url));
const [cmd, ...rest] = process.argv.slice(2);
const opt = (name: string, dflt: string) => { const i = rest.indexOf(name); return i >= 0 ? (rest[i + 1] ?? dflt) : dflt; };
const profile = opt("--profile", "preview") as Profile;
const courseId = opt("--course", "ja-km");

if ((cmd !== "check" && cmd !== "build") || (profile !== "prod" && profile !== "preview")) {
  console.error("usage: cli <check|build> [--course <from>-<to>] [--profile prod|preview]");
  process.exit(2);
}

const dir = `${repoRoot}courses/${courseId}`;
const { course, phrases, scenes } = loadCourse(dir);
if (course.id !== courseId) { console.error(`error: course.yaml の id "${course.id}" がディレクトリ名 "${courseId}" と違います`); process.exit(1); }
const notation = getNotation(course.notation.package);
if (notation.input !== course.notation.input) {
  console.error(`error: notation.input "${course.notation.input}" が ${notation.id} の入力形式 "${notation.input}" と違います`);
  process.exit(1);
}
const { bundle, errors, warnings } = buildBundle(phrases, scenes, {
  profile,
  notation,
  audioExists: (f) => existsSync(`${dir}/audio/${f}`),
});
for (const w of warnings) console.warn(`warn: ${w}`);
for (const e of errors) console.error(`error: ${e}`);
if (errors.length > 0) process.exit(1);
// prod: 警告ゼロが CI の条件(design.md §7)
if (profile === "prod" && warnings.length > 0) process.exit(1);

if (cmd === "build") {
  mkdirSync(`${pkgRoot}dist/${courseId}`, { recursive: true });
  writeFileSync(`${pkgRoot}dist/${courseId}/phrases.json`, JSON.stringify(bundle, null, 2) + "\n");
}
console.log(`${cmd} ok (${courseId}, ${profile}): ${bundle.phrases.length} phrases, ${bundle.scenes.length} scenes`);
