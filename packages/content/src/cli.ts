// usage: tsx src/cli.ts <check|build> [--profile prod|preview]
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { buildBundle, type Profile } from "./build";
import { loadData } from "./load";

const root = fileURLToPath(new URL("..", import.meta.url));
const [cmd, ...rest] = process.argv.slice(2);
const pi = rest.indexOf("--profile");
const profile = (pi >= 0 ? rest[pi + 1] : "preview") as Profile;

if ((cmd !== "check" && cmd !== "build") || (profile !== "prod" && profile !== "preview")) {
  console.error("usage: cli <check|build> [--profile prod|preview]");
  process.exit(2);
}

const { phrases, scenes } = loadData(`${root}data`);
const { bundle, errors, warnings } = buildBundle(phrases, scenes, {
  profile,
  audioExists: (f) => existsSync(`${root}data/audio/${f}`),
});
for (const w of warnings) console.warn(`warn: ${w}`);
for (const e of errors) console.error(`error: ${e}`);
if (errors.length > 0) process.exit(1);
// prod: 警告ゼロが CI の条件(design.md §7)
if (profile === "prod" && warnings.length > 0) process.exit(1);

if (cmd === "build") {
  mkdirSync(`${root}dist`, { recursive: true });
  writeFileSync(`${root}dist/phrases.json`, JSON.stringify(bundle, null, 2) + "\n");
}
console.log(`${cmd} ok (${profile}): ${bundle.phrases.length} phrases, ${bundle.scenes.length} scenes`);
