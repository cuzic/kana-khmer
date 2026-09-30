import { course } from "../course";
import type { Dict } from "./ja";
import { ja } from "./ja";
import { ko } from "./ko";
import { th } from "./th";

const dicts: Record<string, Dict> = { ja, ko, th };

/** 選んだコースの from の言語の UI 文言 */
export const t: Dict = (() => {
  const d = dicts[course.from];
  if (!d) throw new Error(`UI 文言の辞書がありません: from="${course.from}" (apps/web/src/i18n/${course.from}.ts を足す)`);
  return d;
})();
