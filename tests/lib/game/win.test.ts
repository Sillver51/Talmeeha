import { describe, it, expect } from "vitest";
import { remaining, checkWin } from "@/lib/game/win";
import type { Card } from "@/lib/types";

const c = (t: Card["t"], rv = false): Card => ({ w: "x", t, rv });

describe("win", () => {
  it("counts unrevealed cards of a team", () => {
    const board = [c("red"), c("red", true), c("blue")];
    expect(remaining(board, "red")).toBe(1);
    expect(remaining(board, "blue")).toBe(1);
  });
  it("returns winner when a team has 0 unrevealed", () => {
    const board = [c("red", true), c("red", true), c("blue")];
    expect(checkWin(board)).toBe("red");
  });
  it("returns null when both teams still have cards", () => {
    expect(checkWin([c("red"), c("blue")])).toBeNull();
  });
});
