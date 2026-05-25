import { describe, it, expect } from "vitest";
import { teamHasActiveGuesser } from "@/lib/game/roster";
import type { GameState, Player } from "@/lib/types";

function player(id: string, team: "red" | "blue", disconnected = false): Player {
  return { id, name: id, team, disconnected };
}

function base(overrides: Partial<GameState> = {}): GameState {
  return {
    code: "1234", phase: "playing", hostMode: false, board: [], turn: "red",
    clue: null, gleft: 0, gphase: false, winner: null,
    teams: { red: [], blue: [] }, leaders: { red: null, blue: null },
    teamNames: { red: "أحمر", blue: "أزرق" }, players: {},
    doubts: {}, wins: { red: 0, blue: 0 }, sRed: 9, sBlue: 8, log: [],
    ...overrides,
  };
}

describe("teamHasActiveGuesser", () => {
  it("returns true when a connected non-leader guesser is on the team", () => {
    const room = base({
      teams: { red: ["L1", "G1"], blue: [] },
      leaders: { red: "L1", blue: null },
      players: { L1: player("L1", "red"), G1: player("G1", "red") },
    });
    expect(teamHasActiveGuesser(room, "red")).toBe(true);
  });

  it("returns false when only the leader is on the team", () => {
    const room = base({
      teams: { red: ["L1"], blue: [] },
      leaders: { red: "L1", blue: null },
      players: { L1: player("L1", "red") },
    });
    expect(teamHasActiveGuesser(room, "red")).toBe(false);
  });

  it("returns false when the lone guesser is disconnected", () => {
    const room = base({
      teams: { red: ["L1", "G1"], blue: [] },
      leaders: { red: "L1", blue: null },
      players: { L1: player("L1", "red"), G1: player("G1", "red", true) },
    });
    expect(teamHasActiveGuesser(room, "red")).toBe(false);
  });

  it("returns true when at least one of several members is a connected non-leader", () => {
    const room = base({
      teams: { red: ["L1", "G1", "G2"], blue: [] },
      leaders: { red: "L1", blue: null },
      players: {
        L1: player("L1", "red"),
        G1: player("G1", "red", true), // disconnected
        G2: player("G2", "red"), // connected guesser → true
      },
    });
    expect(teamHasActiveGuesser(room, "red")).toBe(true);
  });
});
