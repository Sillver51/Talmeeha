import type { GameState } from "@/lib/types";

export function nextTurn(state: GameState): GameState {
  return {
    ...state,
    turn: state.turn === "red" ? "blue" : "red",
    clue: null,
    gleft: 0,
    gphase: false,
    doubts: {},
  };
}
