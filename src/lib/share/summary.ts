import type { PlayerView, Team } from "@/lib/types";

export interface ShareSummary {
  winner: Team;
  winnerName: string;
  loserName: string;
  /** Cards the losing team still had unrevealed — the victory margin. */
  margin: number;
  assassin: boolean;
}

/** Pure, spoiler-free summary of a finished game for the share card. */
export function shareCardSummary(view: PlayerView): ShareSummary {
  const winner: Team = view.winner ?? "red";
  const loser: Team = winner === "red" ? "blue" : "red";
  const assassin = view.board.some((c) => c.t === "assassin" && c.rv);
  return {
    winner,
    winnerName: view.teamNames[winner],
    loserName: view.teamNames[loser],
    margin: view.counts[loser],
    assassin,
  };
}
