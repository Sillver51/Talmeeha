import { describe, it, expect } from "vitest";
import { needsSuddenDeath, resolveSuddenDeath } from "@/lib/game/suddenDeath";
import type { Card } from "@/lib/types";

const c = (t: Card["t"], rv = false): Card => ({ w: "x", t, rv });

// -------------------------------------------------------------------
// Minimal boards
// -------------------------------------------------------------------

/** Both teams have cards remaining. */
const bothRemaining = [
  c("red"),      // unrevealed red
  c("blue"),     // unrevealed blue
  c("neutral"),
];

/** Red already cleared (0 remaining), blue has one left. */
const redCleared = [
  c("red", true), // revealed
  c("blue"),
];

/** Blue already cleared, red has one left. */
const blueCleared = [
  c("red"),
  c("blue", true),
];

// -------------------------------------------------------------------
// needsSuddenDeath
// -------------------------------------------------------------------

describe("needsSuddenDeath", () => {
  it("returns true when endedOnClock is true and both teams have remaining > 0", () => {
    expect(
      needsSuddenDeath({ board: bothRemaining, turn: "red", endedOnClock: true })
    ).toBe(true);
  });

  it("returns false when endedOnClock is false", () => {
    expect(
      needsSuddenDeath({ board: bothRemaining, turn: "red", endedOnClock: false })
    ).toBe(false);
  });

  it("returns false when endedOnClock is absent", () => {
    expect(
      needsSuddenDeath({ board: bothRemaining, turn: "red" })
    ).toBe(false);
  });

  it("returns false when red team has 0 remaining (game already has a winner)", () => {
    expect(
      needsSuddenDeath({ board: redCleared, turn: "blue", endedOnClock: true })
    ).toBe(false);
  });

  it("returns false when blue team has 0 remaining (game already has a winner)", () => {
    expect(
      needsSuddenDeath({ board: blueCleared, turn: "red", endedOnClock: true })
    ).toBe(false);
  });
});

// -------------------------------------------------------------------
// resolveSuddenDeath — Tier 1: different remaining counts
// -------------------------------------------------------------------

describe("resolveSuddenDeath — tier 1: fewest remaining wins", () => {
  it("picks red when red has fewer remaining words", () => {
    // red: 1 unrevealed, blue: 2 unrevealed
    const board = [c("red"), c("blue"), c("blue")];
    expect(
      resolveSuddenDeath({ board, turn: "red", endedOnClock: true })
    ).toBe("red");
  });

  it("picks blue when blue has fewer remaining words", () => {
    // red: 2 unrevealed, blue: 1 unrevealed
    const board = [c("red"), c("red"), c("blue")];
    expect(
      resolveSuddenDeath({ board, turn: "blue", endedOnClock: true })
    ).toBe("blue");
  });
});

// -------------------------------------------------------------------
// resolveSuddenDeath — Tier 2: remaining tied, different wrong guesses
// -------------------------------------------------------------------

describe("resolveSuddenDeath — tier 2: fewest wrong guesses wins", () => {
  const board = [c("red"), c("blue")]; // 1 remaining each (tied)

  it("picks red when red has fewer wrong guesses", () => {
    expect(
      resolveSuddenDeath({
        board,
        turn: "blue",
        endedOnClock: true,
        wrongGuesses: { red: 1, blue: 3 },
      })
    ).toBe("red");
  });

  it("picks blue when blue has fewer wrong guesses", () => {
    expect(
      resolveSuddenDeath({
        board,
        turn: "red",
        endedOnClock: true,
        wrongGuesses: { red: 4, blue: 2 },
      })
    ).toBe("blue");
  });
});

// -------------------------------------------------------------------
// resolveSuddenDeath — Tier 3: full tie → fallback to opponent of turn
// -------------------------------------------------------------------

describe("resolveSuddenDeath — tier 3: full tie → opponent of on-clock team", () => {
  const board = [c("red"), c("blue")]; // 1 remaining each (tied)

  it("returns blue when turn=red (red is on the clock)", () => {
    expect(
      resolveSuddenDeath({
        board,
        turn: "red",
        endedOnClock: true,
        wrongGuesses: { red: 2, blue: 2 },
      })
    ).toBe("blue");
  });

  it("returns red when turn=blue (blue is on the clock)", () => {
    expect(
      resolveSuddenDeath({
        board,
        turn: "blue",
        endedOnClock: true,
        wrongGuesses: { red: 2, blue: 2 },
      })
    ).toBe("red");
  });

  it("treats absent wrongGuesses as 0/0 and falls back to opponent of turn (turn=red → blue)", () => {
    expect(
      resolveSuddenDeath({ board, turn: "red", endedOnClock: true })
    ).toBe("blue");
  });

  it("treats absent wrongGuesses as 0/0 and falls back to opponent of turn (turn=blue → red)", () => {
    expect(
      resolveSuddenDeath({ board, turn: "blue", endedOnClock: true })
    ).toBe("red");
  });
});
