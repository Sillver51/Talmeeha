import type { DigitStyle } from "@/lib/i18n/digits";

export type Palette = "default" | "colorblind";
export type ReducedMotion = "system" | "on" | "off";

export interface Prefs {
  palette: Palette;
  reducedMotion: ReducedMotion;
  digits: DigitStyle;
  sound: boolean;
  /** Master output volume, 0–100. */
  volume: number;
}

export const DEFAULT_PREFS: Prefs = {
  palette: "default",
  reducedMotion: "system",
  digits: "western",
  sound: true,
  volume: 60,
};

function clampVolume(v: number): number {
  if (!Number.isFinite(v)) return 60;
  if (v < 0) return 0;
  if (v > 100) return 100;
  return Math.round(v);
}

/** Immutable overlay of a partial patch onto a base prefs object. */
export function mergePrefs(base: Prefs, patch: Partial<Prefs>): Prefs {
  const next: Prefs = { ...base, ...patch };
  next.volume = clampVolume(next.volume);
  return next;
}

/** The `<html>` data-* attributes that CSS keys theming/motion off. (`sound`/`volume` have no CSS hook.) */
export function prefsDataAttributes(p: Prefs): Record<string, string> {
  return {
    "data-palette": p.palette,
    "data-reduced-motion": p.reducedMotion,
    "data-digits": p.digits,
  };
}
