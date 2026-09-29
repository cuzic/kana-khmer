import type { Bundle } from "../../../packages/content/src/build";
import bundle from "./generated/bundle.json";

// generated/bundle.json は `pnpm gen`(content gen:web。COURSE=<from>-<to>、既定 ja-km)が出す。ADR-0020。
// The shape is checked here once.
export const data = bundle as unknown as Bundle;
export type { Phrase, Scene, Variant } from "../../../packages/content/src/build";
