import type { GameState, HostTeam, Team } from "@/lib/types";

// Host-mode synthetic-player name helpers, ported from legacy server.js htd/hLeader/hGuesser.

export function htd(room: GameState, team: Team): HostTeam | undefined {
  return team === "red" ? room.hRed : room.hBlue;
}

export function hLeader(room: GameState): string {
  return htd(room, room.turn)?.leader ?? "القائد";
}

// The current guesser for the on-turn team: the first non-leader player rotated by gIdx.
export function hGuesser(room: GameState): string {
  const td = htd(room, room.turn);
  if (!td) return "اللاعب";
  const guessers = td.players.filter((n) => n !== td.leader);
  if (guessers.length === 0) return td.players[0] ?? "اللاعب";
  return guessers[(td.gIdx || 0) % guessers.length]!;
}

// Returns a copy of the room with the on-turn team's gIdx advanced (immutable).
// Mirrors legacy `htd(room, room.turn).gIdx = (gIdx || 0) + 1` performed on a miss.
export function rotateGuesser(room: GameState): GameState {
  const td = htd(room, room.turn);
  if (!td) return room;
  const advanced: HostTeam = { ...td, gIdx: (td.gIdx || 0) + 1 };
  return room.turn === "red" ? { ...room, hRed: advanced } : { ...room, hBlue: advanced };
}
