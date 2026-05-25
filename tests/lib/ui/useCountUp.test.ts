import { describe, it, expect } from "vitest";
import { countUpValue } from "@/lib/ui/useCountUp";

describe("countUpValue", () => {
  it("returns the start value (rounded) at or before progress 0", () => {
    expect(countUpValue(0, 10, 0)).toBe(0);
    expect(countUpValue(0, 10, -0.5)).toBe(0);
    expect(countUpValue(3.4, 10, 0)).toBe(3);
  });

  it("lands exactly on target at or beyond progress 1", () => {
    expect(countUpValue(0, 10, 1)).toBe(10);
    expect(countUpValue(0, 10, 1.7)).toBe(10);
    expect(countUpValue(0, 7, 1)).toBe(7);
  });

  it("eases toward the target monotonically without overshoot", () => {
    let prev = countUpValue(0, 100, 0);
    for (let p = 0.1; p <= 1; p += 0.1) {
      const cur = countUpValue(0, 100, p);
      expect(cur).toBeGreaterThanOrEqual(prev);
      expect(cur).toBeLessThanOrEqual(100);
      prev = cur;
    }
  });

  it("front-loads progress (ease-out: past the midpoint by halfway)", () => {
    // ease-out cubic at p=0.5 → 1-(0.5)^3 = 0.875 of the distance.
    expect(countUpValue(0, 1000, 0.5)).toBe(875);
  });

  it("handles a zero target", () => {
    expect(countUpValue(0, 0, 0.5)).toBe(0);
    expect(countUpValue(0, 0, 1)).toBe(0);
  });

  it("handles a target of one (the common single-win case)", () => {
    expect(countUpValue(0, 1, 0)).toBe(0);
    expect(countUpValue(0, 1, 1)).toBe(1);
  });
});
