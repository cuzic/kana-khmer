// Print a summary of every report-*.json and exit non-zero if any check failed.
// Failures are expected to be informative (the point is to find glyph problems), so CI runs this last.
import { readdirSync, readFileSync } from "node:fs";

const dir = process.env.OUT_DIR ?? "artifacts";
let bad = 0;
for (const f of readdirSync(dir).filter(f => f.startsWith("report-"))) {
  const r = JSON.parse(readFileSync(`${dir}/${f}`, "utf8"));
  if (r.error) { console.log(`${f}: ERROR ${r.error}`); bad++; continue; }
  console.log(`${f}: ${r.failed} failed / ${r.results.length}  (${r.ua})`);
  for (const x of r.results.filter(x => !x.ok)) console.log(`  [${x.mode}] ${x.item} (${x.cp ?? ""}) ${JSON.stringify(x)}`);
  bad += r.failed;
}
process.exit(bad ? 1 : 0);
