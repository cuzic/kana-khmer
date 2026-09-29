import { useEffect, useState } from "react";
import { course } from "./course";

export interface Settings {
  notation: "lite" | "full";
  speakerGender: "male" | "female" | "unset";
  newPerDay: number; // 3〜10、既定 6
}
/** コースごとに名前空間を分ける(ADR-0022)。ja-km の旧キーは初回に読んで移す */
const KEY = `kana:${course.id}:settings`;
const LEGACY_KEY = course.id === "ja-km" ? "kana-khmer:settings" : undefined;
const DEFAULTS: Settings = { notation: "lite", speakerGender: "unset", newPerDay: 6 };

function load(): Settings {
  let saved: Partial<Settings> = {};
  try {
    const raw = localStorage.getItem(KEY) ?? (LEGACY_KEY ? localStorage.getItem(LEGACY_KEY) : null);
    saved = JSON.parse(raw ?? "{}");
  } catch {
    /* storage unavailable or corrupt: use defaults */
  }
  // ?notation= / ?gender= override the saved value (used for screenshots and links)
  const q = new URLSearchParams(location.search);
  const notation = q.get("notation");
  const gender = q.get("gender");
  const merged = { ...DEFAULTS, ...saved };
  return {
    ...merged,
    newPerDay: Math.min(10, Math.max(3, Math.round(Number(merged.newPerDay)) || DEFAULTS.newPerDay)),
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
