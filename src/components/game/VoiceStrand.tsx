"use client";

import type { PlayerView, Team } from "@/lib/types";
import type { Role } from "@/lib/ui/roles";
import type { LogEvent } from "@/lib/game/logParser";
import {
  resolveCapsulePhrase,
  type CapsuleLastEvent,
  type CapsuleState,
  type Moment,
} from "@/lib/copy/capsule";

interface VoiceStrandProps {
  gs: PlayerView;
  role: Role;
  myId: string | null;
  lastEvent: LogEvent | null;
  /** Optional explicit moment override (Headline computes the same value). */
  moment?: Moment;
}

/** Map a parsed LogEvent into the capsule's compact CapsuleLastEvent.
 *  We don't always know whether a `hit` was own-color vs wrong-color from
 *  the server log alone, so we default to "hit-own" for hits — server's
 *  authoritative state will already have flipped `turn` on wrong hits, so
 *  the rail's color/glyph carry the truth; the phrase here is a vibe layer.
 */
function toCapsuleEvent(e: LogEvent, gs: PlayerView): CapsuleLastEvent | undefined {
  switch (e.kind) {
    case "clue":     return { kind: "clue" };
    case "hit":      return { kind: "hit-own" };
    case "miss":     return { kind: "hit-neutral" };
    case "assassin": return { kind: "assassin" };
    case "timeOut":  return { kind: "time-out" };
    case "turnEnd":
    case "turnSkipped": {
      const next: Team = gs.turn === "red" ? "blue" : "red";
      return { kind: "turn-end", nextTeamName: gs.teamNames[next] };
    }
    default: return undefined;
  }
}

/** VoiceStrand — featured poetic line below the status rail. Phrase pool
 *  is deterministic per (gameId, bucket); transitions are handled by the
 *  React `key` prop on the inner `<span>` (CSS keyframes in game.css).
 */
export default function VoiceStrand({
  gs, role, myId, lastEvent, moment,
}: VoiceStrandProps) {
  const me = myId ? gs.players[myId] : null;
  const isMyTurn = me?.team != null && me.team === gs.turn;
  const name =
    role === "leader" && me
      ? me.name
      : role === "leader"
        ? (gs.leaders[gs.turn] ?? "")
        : (me?.name ?? "");
  const winnerName = gs.winner ? gs.teamNames[gs.winner] : undefined;

  const state: CapsuleState = {
    phase: gs.phase as CapsuleState["phase"],
    gphase: gs.gphase,
    role,
    isMyTurn,
    gameId: gs.code,
    name,
    clue: gs.clue?.w,
    count: gs.clue?.n,
    winnerName,
    moment,
    lastEvent: lastEvent ? toCapsuleEvent(lastEvent, gs) : undefined,
  };

  const phrase = resolveCapsulePhrase(state);

  // The `key` swap triggers the CSS fade/translate on phrase change.
  return (
    <output className="voice-strand" aria-live="polite" aria-atomic="true">
      <span className="voice-line" key={phrase}>{phrase}</span>
    </output>
  );
}
