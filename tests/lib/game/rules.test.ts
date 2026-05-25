import { describe, it, expect } from "vitest";
import { submitClue, resolveGuess, toggleDoubt, endTimedGame } from "@/lib/game/rules";
import { resolveSuddenDeath } from "@/lib/game/suddenDeath";
import type { Card, GameState } from "@/lib/types";

const c = (w: string, t: Card["t"], rv = false): Card => ({ w, t, rv });

function state(board: Card[], over: Partial<GameState> = {}): GameState {
  return {
    code: "1234", phase: "playing", hostMode: false, board, turn: "red",
    clue: { w: "x", n: 1 }, gleft: 2, gphase: true, winner: null,
    teams: { red: [], blue: [] }, leaders: { red: null, blue: null },
    teamNames: { red: "أحمر", blue: "أزرق" }, players: {},
    doubts: {}, wins: { red: 0, blue: 0 }, sRed: 1, sBlue: 1, log: [], ...over,
  };
}

describe("submitClue", () => {
  it("opens the guess phase with gleft = num + 1", () => {
    const s = submitClue(state([c("بحر", "red")], { clue: null, gphase: false, gleft: 0 }),
      "بحر", 2, "القائد");
    expect(s.clue).toEqual({ w: "بحر", n: 2 });
    expect(s.gleft).toBe(3);
    expect(s.gphase).toBe(true);
  });
});

describe("resolveGuess", () => {
  it("own color: reveals, decrements gleft, stays this turn", () => {
    const s = state([c("بحر", "red"), c("قمر", "red"), c("ليل", "blue")], { gleft: 2, sRed: 2 });
    const { state: n, outcome } = resolveGuess(s, 0, "لاعب");
    expect(outcome).toBe("hit");
    expect(n.board[0]!.rv).toBe(true);
    expect(n.gleft).toBe(1);
    expect(n.turn).toBe("red");
    expect(n.sRed).toBe(1);
  });
  it("own color with gleft hitting 0 ends the turn", () => {
    const s = state([c("بحر", "red"), c("قمر", "red"), c("ليل", "blue")], { gleft: 1, sRed: 2 });
    const { state: n } = resolveGuess(s, 0, "لاعب");
    expect(n.turn).toBe("blue");
    expect(n.gphase).toBe(false);
  });
  it("enemy/neutral ends the turn", () => {
    const s = state([c("بحر", "neutral"), c("قمر", "red"), c("ليل", "blue")], { gleft: 2 });
    const { state: n, outcome } = resolveGuess(s, 0, "لاعب");
    expect(outcome).toBe("miss");
    expect(n.turn).toBe("blue");
  });
  it("assassin ends the game for the other team", () => {
    const s = state([c("بحر", "assassin"), c("قمر", "red")]);
    const { state: n, outcome } = resolveGuess(s, 0, "لاعب");
    expect(outcome).toBe("assassin");
    expect(n.phase).toBe("ended");
    expect(n.winner).toBe("blue");
    expect(n.wins.blue).toBe(1);
  });
  it("assassin takes precedence over a simultaneous team win", () => {
    // red has already cleared its only red card; guessing the assassin must still lose
    const s = state([c("قاتل", "assassin"), c("بحر", "red", true), c("قمر", "blue")]);
    const { state: n, outcome } = resolveGuess(s, 0, "لاعب");
    expect(outcome).toBe("assassin");
    expect(n.winner).toBe("blue"); // other team wins despite red having 0 remaining
    expect(n.phase).toBe("ended");
  });
  it("revealing a team's last card wins the game", () => {
    const s = state([c("بحر", "red"), c("قمر", "blue")], { gleft: 2, sRed: 1 });
    const { state: n, outcome } = resolveGuess(s, 0, "لاعب");
    expect(outcome).toBe("win");
    expect(n.phase).toBe("ended");
    expect(n.winner).toBe("red");
  });
  it("a winning own-color hit logs the hit line then the trophy", () => {
    const s = state([c("بحر", "red"), c("قمر", "blue")], { gleft: 2, sRed: 1 });
    const { state: n, outcome } = resolveGuess(s, 0, "لاعب");
    expect(outcome).toBe("win");
    expect(n.winner).toBe("red");
    expect(n.log[0]).toContain("🏆"); // trophy is newest
    expect(n.log.some((l) => l.includes("إصابة"))).toBe(true); // hit line also present
  });
  it("ignores an already-revealed card", () => {
    const s = state([c("بحر", "red", true)]);
    const { outcome } = resolveGuess(s, 0, "لاعب");
    expect(outcome).toBe("noop");
  });
  it("does not mutate the input board", () => {
    const s = state([c("بحر", "red"), c("قمر", "red")]);
    resolveGuess(s, 0, "لاعب");
    expect(s.board[0]!.rv).toBe(false);
  });
  it("a neutral/enemy miss bumps wrongGuesses[turn] and resets clockTimeouts", () => {
    const s = state([c("بحر", "neutral"), c("قمر", "red"), c("ليل", "blue")], {
      gleft: 2,
      turn: "red",
      clockTimeouts: 3,
      wrongGuesses: { red: 1, blue: 0 },
    });
    const { state: n, outcome } = resolveGuess(s, 0, "لاعب");
    expect(outcome).toBe("miss");
    expect(n.wrongGuesses).toEqual({ red: 2, blue: 0 });
    expect(n.clockTimeouts).toBe(0);
  });
  it("an own-color hit resets clockTimeouts to 0", () => {
    const s = state([c("بحر", "red"), c("قمر", "red"), c("ليل", "blue")], {
      gleft: 2,
      sRed: 2,
      clockTimeouts: 5,
    });
    const { state: n, outcome } = resolveGuess(s, 0, "لاعب");
    expect(outcome).toBe("hit");
    expect(n.clockTimeouts).toBe(0);
  });
});

describe("endTimedGame", () => {
  it("ends the game with the sudden-death winner and bumps that team's wins", () => {
    // red has 1 remaining, blue has 2 → tier-1 picks red.
    const s = state(
      [c("بحر", "red"), c("قمر", "blue"), c("ليل", "blue")],
      { turn: "blue", wins: { red: 0, blue: 0 } },
    );
    const expected = resolveSuddenDeath({ ...s, endedOnClock: true });
    const n = endTimedGame(s);
    expect(n.phase).toBe("ended");
    expect(n.endedOnClock).toBe(true);
    expect(n.winner).toBe(expected);
    expect(n.winner).toBe("red");
    expect(n.wins[expected]).toBe(1);
  });
});

describe("toggleDoubt", () => {
  it("adds then removes a player's doubt on a card", () => {
    let s = toggleDoubt(state([c("بحر", "red")]), 0, "p1");
    expect(s.doubts[0]).toEqual(["p1"]);
    s = toggleDoubt(s, 0, "p1");
    expect(s.doubts[0]).toBeUndefined();
  });
});
