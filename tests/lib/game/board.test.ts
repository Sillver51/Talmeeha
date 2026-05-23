import { describe, it, expect } from "vitest";
import { buildBoard } from "@/lib/game/board";
import { mulberry32 } from "@/lib/game/rng";
import { WORDS, BOARD_SIZE } from "@/lib/words";

describe("buildBoard", () => {
  it("creates a 25-card board with correct type distribution", () => {
    const { board, startTeam } = buildBoard(WORDS, mulberry32(1));
    expect(board).toHaveLength(BOARD_SIZE);
    const other = startTeam === "red" ? "blue" : "red";
    const count = (t: string) => board.filter((c) => c.t === t).length;
    expect(count(startTeam)).toBe(9);
    expect(count(other)).toBe(8);
    expect(count("neutral")).toBe(7);
    expect(count("assassin")).toBe(1);
  });
  it("all cards start unrevealed with unique words", () => {
    const { board } = buildBoard(WORDS, mulberry32(2));
    expect(board.every((c) => c.rv === false)).toBe(true);
    expect(new Set(board.map((c) => c.w)).size).toBe(BOARD_SIZE);
  });
  it("is deterministic for a fixed seed", () => {
    const a = buildBoard(WORDS, mulberry32(99));
    const b = buildBoard(WORDS, mulberry32(99));
    expect(a).toEqual(b);
  });
});
