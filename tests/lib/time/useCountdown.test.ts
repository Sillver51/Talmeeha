import { describe, expect, it } from "vitest";
import { remainingMs } from "../../../src/lib/time/useCountdown";

// Only the pure helper is tested here. The rAF hook itself requires a browser
// environment (requestAnimationFrame, document) and is not tested in the node
// vitest environment — the same approach used for countUpValue in useCountUp.ts.

describe("remainingMs", () => {
  it("returns 0 when deadlineAt is null", () => {
    expect(remainingMs(null, 1000)).toBe(0);
  });

  it("returns 0 when deadlineAt is undefined", () => {
    expect(remainingMs(undefined, 1000)).toBe(0);
  });

  it("returns the correct difference when deadline is in the future", () => {
    expect(remainingMs(5000, 1000)).toBe(4000);
  });

  it("clamps to 0 when now is past the deadline (never negative)", () => {
    expect(remainingMs(1000, 5000)).toBe(0);
  });

  it("returns 0 when now equals the deadline", () => {
    expect(remainingMs(1000, 1000)).toBe(0);
  });
});
