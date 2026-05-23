import { describe, it, expect } from "vitest";
import { mulberry32, shuffle } from "@/lib/game/rng";

describe("rng", () => {
  it("is deterministic for a given seed", () => {
    const a = mulberry32(42); const b = mulberry32(42);
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
  });
  it("shuffle is a permutation (no loss, no dupes)", () => {
    const input = [1, 2, 3, 4, 5];
    const out = shuffle(input, mulberry32(7));
    expect([...out].sort()).toEqual([1, 2, 3, 4, 5]);
    expect(input).toEqual([1, 2, 3, 4, 5]); // input not mutated
  });
  it("same seed → same shuffle order", () => {
    const x = shuffle([1, 2, 3, 4, 5], mulberry32(7));
    const y = shuffle([1, 2, 3, 4, 5], mulberry32(7));
    expect(x).toEqual(y);
  });
});
