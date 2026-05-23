import type { Card, Team } from "@/lib/types";

export function remaining(board: readonly Card[], team: Team): number {
  return board.filter((c) => c.t === team && !c.rv).length;
}

export function checkWin(board: readonly Card[]): Team | null {
  if (remaining(board, "red") === 0) return "red";
  if (remaining(board, "blue") === 0) return "blue";
  return null;
}
