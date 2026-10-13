// docs/ja-khmer-spec.md §5 → src/spec-table.generated.ts。設計書の表を変えたら `pnpm gen` を実行する。
// `--check` を付けると書き込まず、生成物が設計書と一致しているかだけ調べる(ずれていれば終了コード 1)。
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { parseSpecTable } from "../src/spec-parse";

export const SPEC_PATH = fileURLToPath(new URL("../../../docs/ja-khmer-spec.md", import.meta.url));
const OUT_PATH = fileURLToPath(new URL("../src/spec-table.generated.ts", import.meta.url));

export function generate(specText: string): string {
  const table = parseSpecTable(specText);
  const rows = Object.entries(table)
    .map(([k, r]) => `  ${k}: { c: ${JSON.stringify(r.c)}, v: ${JSON.stringify(r.v)}, sh: ${JSON.stringify(r.sh)}, detail: ${JSON.stringify(r.detail)} },`)
    .join("\n");
  return `// 自動生成: scripts/gen-table.ts(\`pnpm gen\`)。docs/ja-khmer-spec.md §5 の対応表から作る。手で編集しない。
// 設計書の表を変えたら \`pnpm gen\`。test/table.test.ts が設計書との一致を検査する。
import type { SpecRow } from "./spec-parse";

export const SPEC_TABLE: Readonly<Record<string, SpecRow>> = {
${rows}
};
`;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const out = generate(readFileSync(SPEC_PATH, "utf8"));
  if (process.argv.includes("--check")) {
    if (readFileSync(OUT_PATH, "utf8") !== out) { console.error("spec-table.generated.ts が設計書とずれている。pnpm gen を実行する"); process.exit(1); }
    console.log("ok");
  } else {
    writeFileSync(OUT_PATH, out);
    console.log(`wrote ${OUT_PATH}`);
  }
}
