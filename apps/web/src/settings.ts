import { useEffect, useState } from "react";

export interface Settings {
  notation: "lite" | "full";
  speakerGender: "male" | "female" | "unset";
}
const KEY = "kana-khmer:settings";
const DEFAULTS: Settings = { notation: "lite", speakerGender: "unset" };

function load(): Settings {
  try {
    return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) ?? "{}") };
  } catch {
    return DEFAULTS;
  }
}

export function useSettings() {
  const [settings, set] = useState<Settings>(load);
  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(settings));
    } catch {
      /* storage unavailable: keep in memory */
    }
  }, [settings]);
  return [settings, set] as const;
}
