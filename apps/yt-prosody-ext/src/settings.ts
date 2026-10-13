import { PRESETS } from "en-prosody";

/** 拡張で選べる層(音声を使わないので、音声による形の層 audio は無い) */
export const LAYERS = [
  ["size", "強勢を大きさで"],
  ["bold", "内容語を太字"],
  ["nucleus", "核の色と下線"],
  ["weak", "弱形を灰色"],
  ["breaks", "区切り / //"],
  ["link", "つながり ‿"],
  ["beat", "ビート"],
  ["kana", "カナ"],
  ["ipa", "右肩の IPA"],
] as const;

export type LayerKey = (typeof LAYERS)[number][0];
export type LayerState = Record<LayerKey, boolean>;
export interface Settings {
  enabled: boolean;
  layers: LayerState;
}

export const PRESET_NAMES = ["入門", "標準", "詳細", "リズム"] as const;

export function presetLayers(name: string): LayerState {
  const on = new Set<string>((PRESETS as Record<string, readonly string[]>)[name] ?? []);
  return Object.fromEntries(LAYERS.map(([k]) => [k, on.has(k)])) as LayerState;
}

export const DEFAULTS: Settings = { enabled: true, layers: presetLayers("標準") };
const KEY = "ytProsody";

export async function loadSettings(): Promise<Settings> {
  try {
    const got = await chrome.storage.sync.get(KEY);
    const s = got[KEY] as Partial<Settings> | undefined;
    if (!s) return structuredClone(DEFAULTS);
    const layers = { ...DEFAULTS.layers };
    for (const [k] of LAYERS) if (typeof s.layers?.[k] === "boolean") layers[k] = s.layers[k];
    return { enabled: s.enabled ?? true, layers };
  } catch {
    return structuredClone(DEFAULTS);
  }
}

export async function saveSettings(s: Settings): Promise<void> {
  await chrome.storage.sync.set({ [KEY]: s });
}

export function onSettingsChanged(fn: (s: Settings) => void): void {
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === "sync" && changes[KEY]) void loadSettings().then(fn);
  });
}
