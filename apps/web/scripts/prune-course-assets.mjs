// vite build 後に、選んだコース以外の画像を dist から外す(public/images/<course>/ を全コースぶん置いているため)。ADR-0020。
import { existsSync, readdirSync, rmSync } from "node:fs";

const course = JSON.parse((await import("node:fs")).readFileSync(new URL("../src/generated/course.json", import.meta.url), "utf8")).id;
const root = new URL("../dist/images/", import.meta.url);
if (existsSync(root)) {
  for (const name of readdirSync(root)) {
    if (name !== course) rmSync(new URL(`${name}/`, root), { recursive: true, force: true });
  }
}
console.log(`pruned dist/images (kept ${course})`);
