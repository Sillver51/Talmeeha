import type { GameState, HostTeam, Team } from "@/lib/types";

export type Role = "host" | "leader" | "guesser" | "spectator";

/**
 * Determine the local client's role.
 * Ported from legacy `myRole` (public/index.html ~948–955).
 */
export function myRole(
  gs: GameState | null,
  myId: string | null,
  isHost: boolean,
): Role {
  if (!gs) return "spectator";
  if (isHost) return "host";
  if (!myId) return "spectator";
  const team = gs.players[myId]?.team;
  if (!team) return "spectator";
  if (gs.leaders[team] === myId) return "leader";
  return "guesser";
}

/**
 * Whether it is the local player's team's turn.
 * Ported from legacy `myTurn` (public/index.html ~956).
 */
export function myTurn(gs: GameState | null, myId: string | null): boolean {
  if (!gs || !myId) return false;
  return gs.players[myId]?.team === gs.turn;
}

/** Host-team data for a given team (legacy `htd`, ~995). */
function htd(gs: GameState, team: Team): HostTeam | undefined {
  return team === "red" ? gs.hRed : gs.hBlue;
}

/**
 * Host-mode current leader name for the on-turn team.
 * Ported from legacy `hLeader` (~996); returns "" when host data is absent.
 */
export function hLeader(gs: GameState): string {
  return htd(gs, gs.turn)?.leader ?? "";
}

/**
 * Host-mode current guesser name for the on-turn team: the first non-leader
 * player rotated by `gIdx`, falling back to the first player.
 * Ported from legacy `hGuesser` (~997–1002); returns "" when host data is absent.
 */
export function hGuesser(gs: GameState): string {
  const td = htd(gs, gs.turn);
  if (!td) return "";
  const guessers = td.players.filter((n) => n !== td.leader);
  if (guessers.length > 0) {
    return guessers[(td.gIdx || 0) % guessers.length] ?? "";
  }
  return td.players[0] ?? "";
}
