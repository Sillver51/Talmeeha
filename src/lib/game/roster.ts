import type { GameState, Team } from "@/lib/types";

/**
 * True if `team` has at least one connected member who can guess (i.e. a
 * non-leader, non-disconnected player). A team with only its leader (or only
 * disconnected players) cannot make progress on its turn.
 */
export function teamHasActiveGuesser(room: GameState, team: Team): boolean {
  return room.teams[team].some(
    (id) =>
      id !== room.leaders[team] && Boolean(room.players[id]) && !room.players[id]!.disconnected,
  );
}
