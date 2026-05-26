"use client";

import type { PlayerView } from "@/lib/types";
import type { Role } from "@/lib/ui/roles";
import { resolveCapsulePhrase, type CapsuleState } from "@/lib/copy/capsule";

interface PoeticCapsuleProps {
  gs: PlayerView;
  role: Role;
  myId: string | null;
}

/**
 * Picks one Arabic phrase from the library based on the current
 * (role, phase, gphase, isMyTurn) state. Deterministic per game (gs.code).
 */
export default function PoeticCapsule({ gs, role, myId }: PoeticCapsuleProps) {
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
  };
  return <span className="sub-line">{resolveCapsulePhrase(state)}</span>;
}
