import { useEffect, useState } from "react";

export interface Settings {
  notation: "lite" | "full";
  speakerGender: "male" | "female" | "unset";
}
const KEY = "kana-khmer:settings";
const DEFAULTS: Settings = { notation: "lite", speakerGender: "unset" };

function load(): Settings {
  let saved: Partial<Settings> = {};
  try {
    saved = JSON.parse(localStorage.getItem(KEY) ?? "{}");
  } catch {
    /* storage unavailable or corrupt: use defaults */
  }
  // ?notation= / ?gender= override the saved value (used for screenshots and links)
  const q = new URLSearchParams(location.search);
  const notation = q.get("notation");
  const gender = q.get("gender");
  return {
    ...DEFAULTS,
    ...saved,
    ...(notation === "lite" || notation === "full" ? { notation } : {}),
    ...(gender === "male" || gender === "female" || gender === "unset" ? { speakerGender: gender } : {}),
  };
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
