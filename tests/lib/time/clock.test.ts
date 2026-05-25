import { afterEach, describe, expect, it } from "vitest";
import { estimatedServerNow, getClockOffset, setClockOffset } from "../../../src/lib/time/clock";

afterEach(() => {
  // Reset global offset so tests don't bleed into each other.
  setClockOffset(0);
});

describe("clock", () => {
  it("estimatedServerNow() is approximately Date.now() when offset is 0", () => {
    const before = Date.now();
    const result = estimatedServerNow();
    const after = Date.now();
    expect(result).toBeGreaterThanOrEqual(before);
    expect(result).toBeLessThanOrEqual(after);
  });

  it("getClockOffset() returns 0 by default", () => {
    expect(getClockOffset()).toBe(0);
  });

  it("setClockOffset(5000) makes estimatedServerNow() ~5000ms ahead of Date.now()", () => {
    setClockOffset(5000);
    const diff = estimatedServerNow() - Date.now();
    expect(diff).toBeGreaterThanOrEqual(4999);
    expect(diff).toBeLessThanOrEqual(5001);
  });

  it("getClockOffset() returns the value set by setClockOffset", () => {
    setClockOffset(1234);
    expect(getClockOffset()).toBe(1234);
  });

  it("setClockOffset(0) resets to zero", () => {
    setClockOffset(9999);
    setClockOffset(0);
    expect(getClockOffset()).toBe(0);
  });
});
