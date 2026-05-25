import type { GameState, PlayerView, RemainingCounts, ViewCard } from "@/lib/types";

/**
 * Whether a viewer is allowed to see the full key (every unrevealed card's true type).
 * - Online: a leader of either team (standard Codenames — the full key, a deliberate
 *   improvement over the legacy own-team-only view).
 * - Host (pass-and-play): only the single host socket; the client gates display via host-view.
 * - Everyone else (guessers, spectators): no.
 */
export function viewerCanSeeKey(room: GameState, viewerId: string | null): boolean {
  if (!viewerId) return false;
  if (room.hostMode) return room.hostSocketId === viewerId;
  return room.leaders.red === viewerId || room.leaders.blue === viewerId;
}

/** Public remaining (unrevealed) counts — safe to show all viewers. */
function remainingCounts(room: GameState): RemainingCounts {
  let red = 0, blue = 0, neutral = 0;
  for (const c of room.board) {
    if (c.rv) continue;
    if (c.t === "red") red++;
    else if (c.t === "blue") blue++;
    else if (c.t === "neutral") neutral++;
  }
  return { red, blue, neutral };
}

/**
 * Project the authoritative room into a per-viewer PlayerView.
 * Revealed cards always carry their real type. Unrevealed cards carry their real type
 * ONLY for a key-holder; otherwise the type is replaced with "hidden". Pure + immutable.
 */
export function projectStateFor(room: GameState, viewerId: string | null): PlayerView {
  const seeKey = viewerCanSeeKey(room, viewerId);
  const board: ViewCard[] = room.board.map((c) =>
    c.rv || seeKey ? { w: c.w, t: c.t, rv: c.rv } : { w: c.w, t: "hidden", rv: false },
  );
  return { ...room, board, counts: remainingCounts(room) };
}
