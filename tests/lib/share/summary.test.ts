import { describe, it, expect } from "vitest";
import { shareCardSummary } from "@/lib/share/summary";
import type { PlayerView, ViewCard } from "@/lib/types";

function view(overrides: Partial<PlayerView> = {}): PlayerView {
  const board: ViewCard[] = [
    { w: "أ", t: "red", rv: true },
    { w: "ب", t: "blue", rv: false },
    { w: "ج", t: "neutral", rv: true },
  ];
  return {
    code: "1234", phase: "ended", hostMode: false,
    board, counts: { red: 0, blue: 3, neutral: 1 },
    turn: "red", clue: null, gleft: 0, gphase: false, winner: "red",
    teams: { red: [], blue: [] }, leaders: { red: null, blue: null },
    teamNames: { red: "الصقور", blue: "النمور" },
    players: {}, doubts: {}, wins: { red: 1, blue: 0 }, sRed: 0, sBlue: 3, log: [],
    ...overrides,
  };
}

describe("shareCardSummary", () => {
  it("names the winner and loser from teamNames", () => {
    const s = shareCardSummary(view());
    expect(s.winnerName).toBe("الصقور");
    expect(s.loserName).toBe("النمور");
  });
  it("computes the margin as the loser's remaining cards", () => {
    expect(shareCardSummary(view()).margin).toBe(3); // blue still had 3
  });
  it("flags an assassin ending", () => {
    const v = view({ board: [{ w: "ق", t: "assassin", rv: true }], winner: "blue" });
    const s = shareCardSummary(v);
    expect(s.assassin).toBe(true);
    expect(s.winnerName).toBe("النمور");
  });
  it("defaults a null winner to red without throwing", () => {
    expect(shareCardSummary(view({ winner: null })).winnerName).toBe("الصقور");
  });
});
