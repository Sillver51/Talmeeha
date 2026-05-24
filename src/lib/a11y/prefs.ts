import type { DigitStyle } from "@/lib/i18n/digits";

export type Palette = "default" | "colorblind";
export type ReducedMotion = "system" | "on" | "off";

export interface Prefs {
  palette: Palette;
  reducedMotion: ReducedMotion;
  digits: DigitStyle;
  sound: boolean;
}

export const DEFAULT_PREFS: Prefs = {
  palette: "default",
  reducedMotion: "system",
  digits: "western",
  sound: true,
};

/** Immutable overlay of a partial patch onto a base prefs object. */
export function mergePrefs(base: Prefs, patch: Partial<Prefs>): Prefs {
  return { ...base, ...patch };
}

/** The `<html>` data-* attributes that CSS keys theming/motion off. (`sound` has no CSS hook.) */
export function prefsDataAttributes(p: Prefs): Record<string, string> {
  return {
    "data-palette": p.palette,
    "data-reduced-motion": p.reducedMotion,
    "data-digits": p.digits,
  };
}
