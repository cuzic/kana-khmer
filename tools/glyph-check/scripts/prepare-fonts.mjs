// Copy @fontsource packages (400 weight css + files) into public/fonts so the page can serve them.
import { cpSync, mkdirSync, existsSync } from "node:fs";

for (const pkg of ["noto-sans", "noto-sans-jp", "noto-sans-khmer"]) {
  const src = `node_modules/@fontsource/${pkg}`;
  const dst = `public/fonts/${pkg}`;
  if (!existsSync(src)) throw new Error(`missing ${src}; run pnpm install first`);
  mkdirSync(dst, { recursive: true });
  cpSync(`${src}/400.css`, `${dst}/400.css`);
  cpSync(`${src}/files`, `${dst}/files`, { recursive: true });
}
console.log("fonts copied");
