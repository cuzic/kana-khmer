// 見せる層の選択。tools/en-prosody-spike/src/layers.py の移植。
export const ALL = ["size", "bold", "nucleus", "weak", "breaks", "link", "beat", "kana", "ipa", "audio"] as const;
export type LayerName = (typeof ALL)[number];
export type Layers = Record<LayerName, boolean>;

export const PRESETS: Record<string, readonly LayerName[]> = {
  入門: ["size", "bold", "nucleus", "weak", "breaks", "kana", "audio"],
  標準: ["size", "bold", "nucleus", "weak", "breaks", "link", "beat", "kana", "audio"],
  詳細: ALL,
  リズム: ["size", "bold", "nucleus", "weak", "breaks", "beat"],
};

const isLayer = (s: string): s is LayerName => (ALL as readonly string[]).includes(s);
const isPreset = (s: string) => Object.hasOwn(PRESETS, s);

/** "標準" のようなプリセット名、"size,beat,kana" のような列挙、"詳細,-ipa" のような差し引きを受ける。 */
export function parseLayers(spec?: string | null): Layers {
  if (!spec) return Object.fromEntries(ALL.map((n) => [n, true])) as Layers;
  let on = new Set<string>();
  for (const part of spec.split(",").map((p) => p.trim()).filter(Boolean)) {
    if (isPreset(part)) on = new Set(PRESETS[part]);
    else if (part === "all") on = new Set(ALL);
    else if (part.startsWith("-") && isLayer(part.slice(1))) on.delete(part.slice(1));
    else if (part.startsWith("+") && isLayer(part.slice(1))) on.add(part.slice(1));
    else if (isLayer(part)) on.add(part);
    else throw new Error(`未知の層: ${part}(使えるもの: ${ALL.join(", ")} / プリセット: ${Object.keys(PRESETS).join(", ")})`);
  }
  return Object.fromEntries(ALL.map((n) => [n, on.has(n)])) as Layers;
}
