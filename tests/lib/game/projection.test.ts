import { describe, it, expect } from "vitest";
import { projectStateFor, viewerCanSeeKey } from "@/lib/game";
import type { Card, GameState } from "@/lib/types";

function board(): Card[] {
  return [
    { w: "أسد", t: "red", rv: false },
    { w: "بحر", t: "blue", rv: false },
    { w: "قمر", t: "neutral", rv: false },
    { w: "قاتل", t: "assassin", rv: false },
    { w: "نار", t: "red", rv: true }, // revealed
  ];
}

function gs(overrides: Partial<GameState> = {}): GameState {
  return {
    code: "1234", phase: "playing", hostMode: false,
    board: board(), turn: "red", clue: null, gleft: 0, gphase: false, winner: null,
    teams: { red: ["L_RED", "G_RED"], blue: ["L_BLUE", "G_BLUE"] },
    leaders: { red: "L_RED", blue: "L_BLUE" },
    teamNames: { red: "الأحمر", blue: "الأزرق" },
    players: {
      L_RED: { id: "L_RED", name: "قائد أحمر", team: "red" },
      G_RED: { id: "G_RED", name: "لاعب أحمر", team: "red" },
      L_BLUE: { id: "L_BLUE", name: "قائد أزرق", team: "blue" },
      G_BLUE: { id: "G_BLUE", name: "لاعب أزرق", team: "blue" },
    },
    doubts: {}, wins: { red: 0, blue: 0 }, sRed: 2, sBlue: 1, log: [],
    ...overrides,
  };
}

describe("viewerCanSeeKey", () => {
  it("a team leader can see the key", () => {
    expect(viewerCanSeeKey(gs(), "L_RED")).toBe(true);
    expect(viewerCanSeeKey(gs(), "L_BLUE")).toBe(true);
  });
  it("a guesser cannot see the key", () => {
    expect(viewerCanSeeKey(gs(), "G_RED")).toBe(false);
  });
  it("an unknown or null viewer cannot see the key", () => {
    expect(viewerCanSeeKey(gs(), null)).toBe(false);
    expect(viewerCanSeeKey(gs(), "ghost")).toBe(false);
  });
  it("in host mode only the host socket sees the key", () => {
    const room = gs({ hostMode: true, hostSocketId: "HOST" });
    expect(viewerCanSeeKey(room, "HOST")).toBe(true);
    expect(viewerCanSeeKey(room, "L_RED")).toBe(false);
  });
});

describe("projectStateFor", () => {
  it("hides every unrevealed card's type from a guesser", () => {
    const view = projectStateFor(gs(), "G_RED");
    const unrevealed = view.board.filter((c) => !c.rv);
    expect(unrevealed).toHaveLength(4);
    expect(unrevealed.every((c) => c.t === "hidden")).toBe(true);
  });
  it("still reveals revealed cards' real type to a guesser", () => {
    const view = projectStateFor(gs(), "G_RED");
    expect(view.board.find((c) => c.rv)!.t).toBe("red");
  });
  it("gives a leader the full key", () => {
    const view = projectStateFor(gs(), "L_RED");
    expect(view.board.map((c) => c.t)).toEqual(["red", "blue", "neutral", "assassin", "red"]);
  });
  it("preserves every word for everyone", () => {
    const view = projectStateFor(gs(), "G_RED");
    expect(view.board.map((c) => c.w)).toEqual(["أسد", "بحر", "قمر", "قاتل", "نار"]);
  });
  it("computes public remaining counts from the true board", () => {
    expect(projectStateFor(gs(), "G_RED").counts).toEqual({ red: 1, blue: 1, neutral: 1 });
  });
  it("does not mutate the source room", () => {
    const room = gs();
    const snapshot = JSON.stringify(room);
    projectStateFor(room, "G_RED");
    expect(JSON.stringify(room)).toBe(snapshot);
  });
});
