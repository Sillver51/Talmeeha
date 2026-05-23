import type { Card, GameState, Team } from "@/lib/types";
import { nextTurn } from "./turn";
import { checkWin, remaining } from "./win";

export type GuessOutcome = "hit" | "miss" | "assassin" | "win" | "noop";

const LOG_CAP = 50;
function addLog(log: readonly string[], line: string): string[] {
  return [line, ...log].slice(0, LOG_CAP);
}

// Re-derive team counts from the board each guess (legacy used per-step deltas); board is the single source of truth, so this also self-heals any drift.
function withCounts(state: GameState): GameState {
  return { ...state, sRed: remaining(state.board, "red"), sBlue: remaining(state.board, "blue") };
}

function endGame(state: GameState, winner: Team, logLine: string): GameState {
  return {
    ...state,
    winner,
    phase: "ended",
    wins: { ...state.wins, [winner]: state.wins[winner] + 1 },
    log: addLog(state.log, logLine),
  };
}

export function submitClue(state: GameState, word: string, num: number, by: string): GameState {
  return {
    ...state,
    clue: { w: word, n: num },
    gleft: num + 1,
    gphase: true,
    log: addLog(state.log, `💡 ${by}: "${word}" — ${num}`),
  };
}

export function resolveGuess(
  state: GameState,
  index: number,
  by: string,
): { state: GameState; outcome: GuessOutcome } {
  const card = state.board[index];
  if (!card || card.rv) return { state, outcome: "noop" };

  const board: Card[] = state.board.map((c, i) => (i === index ? { ...c, rv: true } : c));
  const doubts = { ...state.doubts };
  delete doubts[index];
  let s = withCounts({ ...state, board, doubts });

  if (card.t === "assassin") {
    const winner: Team = s.turn === "red" ? "blue" : "red";
    return {
      state: endGame({ ...s, log: addLog(s.log, `☠️ ${by} كشف القاتل!`) }, winner,
        `🏆 فاز ${s.teamNames[winner]}! 🍇`),
      outcome: "assassin",
    };
  }

  if (card.t === s.turn) {
    // own color: log the hit + decrement BEFORE checking win (matches legacy order)
    s = { ...s, gleft: s.gleft - 1, log: addLog(s.log, `✅ ${by}: "${card.w}" — إصابة!`) };
    const won = checkWin(board);
    if (won) return { state: endGame(s, won, `🏆 فاز ${s.teamNames[won]}! 🍇`), outcome: "win" };
    if (s.gleft <= 0) s = nextTurn(s);
    return { state: s, outcome: "hit" };
  }

  // neutral/enemy: log the miss, then check win (revealing an enemy card can win it for them)
  s = { ...s, log: addLog(s.log, `❌ ${by}: "${card.w}"`) };
  const won = checkWin(board);
  if (won) return { state: endGame(s, won, `🏆 فاز ${s.teamNames[won]}! 🍇`), outcome: "win" };
  return { state: nextTurn(s), outcome: "miss" };
}

export function toggleDoubt(state: GameState, index: number, key: string): GameState {
  const arr = state.doubts[index] ?? [];
  const has = arr.includes(key);
  const nextArr = has ? arr.filter((k) => k !== key) : [...arr, key];
  const doubts = { ...state.doubts };
  if (nextArr.length === 0) delete doubts[index];
  else doubts[index] = nextArr;
  return { ...state, doubts };
}
