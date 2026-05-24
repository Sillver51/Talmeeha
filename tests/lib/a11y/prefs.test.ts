import { describe, it, expect } from "vitest";
import { DEFAULT_PREFS, mergePrefs, prefsDataAttributes, type Prefs } from "@/lib/a11y/prefs";

describe("DEFAULT_PREFS", () => {
  it("defaults to an accessible, non-surprising baseline", () => {
    expect(DEFAULT_PREFS).toEqual({
      palette: "default",
      reducedMotion: "system",
      digits: "western",
      sound: true,
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
});

describe("prefsDataAttributes", () => {
  it("maps prefs to the html data-* attributes CSS keys off", () => {
    expect(
      prefsDataAttributes({
        palette: "colorblind",
        reducedMotion: "on",
        digits: "eastern",
        sound: false,
      }),
    ).toEqual({
      "data-palette": "colorblind",
      "data-reduced-motion": "on",
      "data-digits": "eastern",
    });
  });
});
