import { describe, it, expect } from "vitest";
import { nextTurn } from "@/lib/game/turn";
import type { GameState } from "@/lib/types";

function base(): GameState {
  return {
    code: "1234", phase: "playing", hostMode: false, board: [], turn: "red",
    clue: { w: "بحر", n: 2 }, gleft: 3, gphase: true, winner: null,
    teams: { red: [], blue: [] }, leaders: { red: null, blue: null },
    teamNames: { red: "أحمر", blue: "أزرق" }, players: {},
    doubts: { 5: ["a"] }, wins: { red: 0, blue: 0 }, sRed: 9, sBlue: 8, log: [],
  };
}

describe("nextTurn", () => {
  it("flips the team and resets clue/guess/doubt state", () => {
    const next = nextTurn(base());
    expect(next.turn).toBe("blue");
    expect(next.clue).toBeNull();
    expect(next.gleft).toBe(0);
    expect(next.gphase).toBe(false);
    expect(next.doubts).toEqual({});
  });
  it("does not mutate the input", () => {
    const s = base(); nextTurn(s);
    expect(s.turn).toBe("red");
    expect(s.clue).not.toBeNull();
  });
  it("flips blue back to red", () => {
    const next = nextTurn({ ...base(), turn: "blue" });
    expect(next.turn).toBe("red");
  });
});
