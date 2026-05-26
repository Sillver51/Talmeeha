import { describe, it, expect } from "vitest";
import { DEFAULT_PREFS, mergePrefs, prefsDataAttributes, type Prefs } from "@/lib/a11y/prefs";

describe("DEFAULT_PREFS", () => {
  it("defaults to an accessible, non-surprising baseline", () => {
    expect(DEFAULT_PREFS).toEqual({
      palette: "default",
      reducedMotion: "system",
      digits: "western",
      sound: true,
      volume: 60,
    });
  });
});

describe("mergePrefs", () => {
  it("overlays a partial patch onto a base", () => {
    const next = mergePrefs(DEFAULT_PREFS, { palette: "colorblind", digits: "eastern" });
    expect(next.palette).toBe("colorblind");
    expect(next.digits).toBe("eastern");
    expect(next.sound).toBe(true);
  });
  it("does not mutate the base", () => {
    const base: Prefs = { ...DEFAULT_PREFS };
    mergePrefs(base, { sound: false });
    expect(base.sound).toBe(true);
  });
  it("clamps volume above 100", () => {
    expect(mergePrefs(DEFAULT_PREFS, { volume: 150 }).volume).toBe(100);
  });
  it("clamps volume below 0", () => {
    expect(mergePrefs(DEFAULT_PREFS, { volume: -5 }).volume).toBe(0);
  });
  it("rounds non-integer volume", () => {
    expect(mergePrefs(DEFAULT_PREFS, { volume: 42.7 }).volume).toBe(43);
  });
  it("falls back to 60 for non-finite volume", () => {
    expect(mergePrefs(DEFAULT_PREFS, { volume: Number.NaN }).volume).toBe(60);
  });
});

describe("prefsDataAttributes", () => {
  it("maps prefs to the html data-* attributes CSS keys off", () => {
    expect(
      prefsDataAttributes({
        palette: "colorblind",
        reducedMotion: "on",
        digits: "eastern",
        sound: false,
        volume: 60,
      }),
    ).toEqual({
      "data-palette": "colorblind",
      "data-reduced-motion": "on",
      "data-digits": "eastern",
    });
  });
});
