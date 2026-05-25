import { remaining } from "./win";
import type { Card, Team } from "@/lib/types";

export interface SuddenDeathRoom {
  board: readonly Card[];
  /** The team currently "on the clock" (whose timer expired). */
  turn: Team;
  /** Set by the server when the phase ended due to the clock running out. */
  endedOnClock?: boolean;
  /** Optional per-team wrong-guess tally; defaults to 0/0 when absent. */
  wrongGuesses?: Partial<Record<Team, number>>;
}

const opponent = (t: Team): Team => (t === "red" ? "blue" : "red");

/**
 * Returns true when a sudden-death resolution is needed:
 * the phase ended on the clock AND both teams still have unrevealed words.
 */
export function needsSuddenDeath(room: SuddenDeathRoom): boolean {
  return (
    room.endedOnClock === true &&
    remaining(room.board, "red") > 0 &&
    remaining(room.board, "blue") > 0
  );
}

/**
 * Deterministic sudden-death resolver. Resolution order:
 *   1. Fewest remaining unrevealed words wins.
 *   2. Tie on remaining → fewest wrong guesses wins.
 *   3. Full tie → the team NOT on the clock (opponent of `turn`) wins.
 *
 * Pure and side-effect-free; reads state only via `remaining` and the
 * optional `wrongGuesses` tally.
 */
export function resolveSuddenDeath(room: SuddenDeathRoom): Team {
  const rRed = remaining(room.board, "red");
  const rBlue = remaining(room.board, "blue");

  // Tier 1: fewest remaining words wins
  if (rRed !== rBlue) return rRed < rBlue ? "red" : "blue";

  // Tier 2: fewest wrong guesses wins (treat absent as 0)
  const wRed = room.wrongGuesses?.red ?? 0;
  const wBlue = room.wrongGuesses?.blue ?? 0;
  if (wRed !== wBlue) return wRed < wBlue ? "red" : "blue";

  // Tier 3: full tie → the team that was NOT on the clock wins
  return opponent(room.turn);
}
