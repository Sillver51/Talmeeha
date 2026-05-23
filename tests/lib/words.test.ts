import { describe, it, expect } from "vitest";
import { WORDS, BOARD_SIZE } from "@/lib/words";

describe("word bank", () => {
  it("has enough unique words for a board", () => {
    expect(WORDS.length).toBeGreaterThanOrEqual(BOARD_SIZE);
    expect(new Set(WORDS).size).toBe(WORDS.length);
  });
  it("contains only single Arabic words", () => {
    for (const w of WORDS) {
      expect(w).not.toContain(" ");
      expect(/[؀-ۿ]/.test(w)).toBe(true);
    }
  });
});
