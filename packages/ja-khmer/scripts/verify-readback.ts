// 生成したクメール文字を、独立の読み戻し(scripts/readback.ts。Module:km-pron の移植)で IPA にして、意図した日本語音と照らす(ADR-0010 決定7(a))。
// 意図との一致は「許容集合」で判定する(音声の近さ。厳密な同一ではない)。回帰テストであり、音の妥当性の独立した検査ではない(設計書 §9.1)。
// 任意実行: Module:km-pron の Lua(CC BY-SA)はリポジトリに入れない。
//   KM_PRON_LUA=km-pron.lua pnpm verify:readback        既存の Lua を使う
//   pnpm verify:readback --fetch                        英語版 Wiktionary から取得(取れなければスキップして終了コード 0)
//   Lua が無ければスキップ(終了コード 0)。不一致は一覧に出すだけで終了コードには影響しない(表は暫定で、不一致は既知を含む)。
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { renderKhmer, SPEC_TABLE } from "../src";
import { loadTables, readKhmer } from "./readback";

const LUA_URL = "https://en.wiktionary.org/w/index.php?title=Module:km-pron&action=raw";

async function locateLua(): Promise<string | null> {
  const env = process.env.KM_PRON_LUA;
  if (env) return existsSync(env) ? env : null;
  if (!process.argv.includes("--fetch")) return null;
  const path = join(tmpdir(), "km-pron.lua");
  if (existsSync(path)) return path;
  try {
    const res = await fetch(LUA_URL, { headers: { "User-Agent": "kana-khmer-verify-readback" } });
    if (!res.ok) return null;
    mkdirSync(tmpdir(), { recursive: true });
    writeFileSync(path, await res.text());
    return path;
  } catch {
    return null;
  }
}

// 行 → [Module の読みで許す語頭の IPA, 母音]。し・ち・じ などは行の例外を先に置く
const INIT: Record<string, string[]> = { "": ["ʔ"], k: ["k", "kʰ"], g: ["ɡ"], ny: ["ɲ"], s: ["s"], z: ["z"], j: ["c"], ch: ["c", "cʰ"], t: ["t", "tʰ"], d: ["ɗ", "d"], ts: ["ts", "s", "t"], n: ["n"], h: ["h"], f: ["f"], b: ["ɓ", "b"], p: ["p", "pʰ"], m: ["m"], y: ["j"], r: ["r", "ɾ"], w: ["ʋ", "w"] };
// 母音の許容。設計書 v0.12 の基底は短い拍でも長母音記号を使う(§4.3)ので、短い拍も長い読みを許す。長音マーカーは読まれないので、長い拍も同じ基底の読み
const NUC: Record<string, { s: string[]; l: string[] }> = {
  a: { s: ["a", "ɑ", "aː", "ɑː"], l: ["aː", "ɑː"] },
  i: { s: ["i", "iː"], l: ["iː"] },
  u: { s: ["u", "uː", "ɨ"], l: ["uː", "ou"] },
  e: { s: ["e", "eː"], l: ["eː"] },
  o: { s: ["o", "oː", "ou", "uː"], l: ["oː", "ou", "uː"] },
};
const CODA: Record<"N" | "Q", string[]> = { N: ["n", "ŋ", "m"], Q: ["k", "t", "p", "ʔ"] };

const ROWS: [string, string, Record<string, string>?][] = [
  ["あいうえお", ""], ["かきくけこ", "k"], ["がぎぐげご", "g"], ["さしすせそ", "s"], ["ざじずぜぞ", "z", { じ: "j" }],
  ["たちつてと", "t", { ち: "ch", つ: "ts" }], ["だぢづでど", "d", { ぢ: "j", づ: "z" }], ["なにぬねの", "n"], ["はひふへほ", "h", { ふ: "f" }],
  ["ばびぶべぼ", "b"], ["ぱぴぷぺぽ", "p"], ["まみむめも", "m"], ["やいゆえよ", "y"], ["らりるれろ", "r"], ["わいうえを", "w", { を: "" }],
];
const VOWELS = "aiueo";
/** 基本の拍(1文字) → [語頭, 母音] */
function basicOf(h: string): [string, string] | null {
  for (const [chars, init, ex] of ROWS) {
    if (init === "y" && !"やゆよ".includes(h)) continue;
    if (init === "w" && !"わを".includes(h)) continue;
    const i = chars.indexOf(h);
    if (i >= 0) return [ex && h in ex ? ex[h]! : init, VOWELS[i]!];
  }
  return null;
}
const SMALL: Record<string, string> = { ゃ: "a", ゅ: "u", ょ: "o" };
const esc = (x: string) => x.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const strip = (s: string) => s.replace(/[ˢʰᵃⁱᵘᵉᵒ̄]/gu, "");
const kata = (h: string) => h.replace(/[ぁ-ゖ]/g, (c) => String.fromCharCode(c.charCodeAt(0) + 0x60));

interface Case { kana: string; input: string; init: string; v: string; long: boolean; yoon: boolean; coda: "N" | "Q" | null }

function expected(cs: Case): RegExp {
  const init = INIT[cs.init]!.map(esc).join("|");
  // い段+終子音は i が別の母音に変わる(設計書 §6.5)。基底は長母音記号なので i/iː を許す
  const nucs = (cs.coda && cs.v === "i" ? ["i", "iː"] : NUC[cs.v]![cs.long ? "l" : "s"]).map(esc).join("|");
  const glide = cs.yoon ? "j" : "";
  const codaRe = cs.coda ? `(${CODA[cs.coda].map(esc).join("|")})` : "ʔ?";
  return new RegExp(`^(${init})${glide}(${nucs})${codaRe}$`, "u");
}

const cases: Case[] = [];
for (const h of Object.keys(SPEC_TABLE)) {
  let init: string, v: string, yoon = false;
  if (h.length === 2) {
    const b = basicOf(h[0]!)!;
    init = b[0] === "n" ? "ny" : b[0] === "s" ? "s" : b[0];
    v = SMALL[h[1]!]!;
    yoon = !["s", "j", "ch", "ny"].includes(init);
  } else {
    const b = basicOf(h);
    if (!b) continue;
    [init, v] = b;
  }
  for (const long of [false, true]) cases.push({ kana: kata(h) + (long ? "ー" : ""), input: kata(h) + (long ? "ー" : ""), init, v, long, yoon, coda: null });
  cases.push({ kana: kata(h) + "ン", input: kata(h) + "ン", init, v, long: false, yoon, coda: "N" });
  cases.push({ kana: kata(h) + "ッ", input: kata(h) + "ッカ", init, v, long: false, yoon, coda: "Q" });
}

const luaPath = await locateLua();
if (!luaPath) {
  console.log("skip: Module:km-pron の Lua が無い。KM_PRON_LUA=<path> を指定するか --fetch を付ける(ネットに出られなければスキップ)");
  process.exit(0);
}
const T = loadTables(luaPath);
const bad: string[] = [];
let ok = 0;
for (const cs of cases) {
  const r = renderKhmer(cs.input);
  // 促音は後ろに「カ」を付けて作ったので、先頭の音節(末子音まで)だけを読む
  const khmer = strip(cs.coda === "Q" ? r.phrases[0]!.syllables[0]!.text : r.text);
  const reading = readKhmer(T, khmer);
  if (reading !== null && expected(cs).test(reading.replace(/[.ˈ]/g, ""))) ok++;
  else bad.push(`| ${cs.kana} | ${khmer} | ${reading === null ? "(読めない)" : reading} |`);
}
console.log(`読み戻し一致 ${ok} / ${cases.length}\n\n| かな | クメール文字 | 読み戻し IPA |\n|---|---|---|\n${bad.join("\n")}`);
