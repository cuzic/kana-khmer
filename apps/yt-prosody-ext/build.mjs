// dist/ に拡張を組み立てる。  node build.mjs [--test]
//   --test: localhost のテスト用ページ(test/fixture.html)でも動くように、manifest の matches に http://localhost/* を足す。
import { build } from "esbuild";
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = dirname(fileURLToPath(import.meta.url));
const dist = join(root, "dist");
const dict = join(root, "../../packages/en-prosody/data/cmudict.txt");
const isTest = process.argv.includes("--test");

if (!existsSync(dict)) {
  console.error("packages/en-prosody/data/cmudict.txt がありません。先に `pnpm --filter en-prosody gen:dict` を実行してください。");
  process.exit(1);
}
rmSync(dist, { recursive: true, force: true });
mkdirSync(dist, { recursive: true });

await build({
  entryPoints: { content: join(root, "src/content.ts"), popup: join(root, "src/popup.ts") },
  outdir: dist,
  bundle: true,
  format: "iife",
  target: "chrome120",
  minify: false,
  sourcemap: false,
  logLevel: "info",
});

const manifest = JSON.parse(readFileSync(join(root, "manifest.json"), "utf8"));
if (isTest) {
  manifest.content_scripts[0].matches.push("http://localhost/*");
  manifest.web_accessible_resources[0].matches.push("http://localhost/*");
  manifest.name += "(test)";
}
writeFileSync(join(dist, "manifest.json"), JSON.stringify(manifest, null, 2));
cpSync(join(root, "src/popup.html"), join(dist, "popup.html"));
cpSync(dict, join(dist, "cmudict.txt"));
console.log(`built ${isTest ? "(test) " : ""}→ ${dist}`);
