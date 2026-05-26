"use client";

import { useEffect, useRef, useState } from "react";
import type { PlayerView, Team } from "@/lib/types";
import type { Role } from "@/lib/ui/roles";
import Board from "./Board";
import ArabicConstellation from "./ArabicConstellation";

interface BoardStageProps {
  gs: PlayerView;
  role: Role;
  myId: string | null;
  myTeam: Team | null;
  isMyTurn: boolean;
  /** Optional leader initial to flash during the key sweep (first char of name). */
  leaderInitial?: string | null;
}

/**
 * Wraps the existing <Board/> in an ambient stage container that:
 *  - applies a team-colored radial glow that pulses 7s ease-in-out infinite
 *  - holds a faint Arabic-letter constellation behind the board
 *  - on the leader's first entry to the playing phase (per game), flashes the
 *    leader's first initial at board center for ~1s
 */
export default function BoardStage({
  gs,
  role,
  myId,
  myTeam,
  isMyTurn,
  leaderInitial,
}: BoardStageProps) {
  const playing = gs.phase === "playing";
  const isLeader = role === "leader";
  const [flash, setFlash] = useState(false);
  const fired = useRef(false);

  useEffect(() => {
    if (!playing) {
      fired.current = false;
      setFlash(false);
      return;
    }
    if (!isLeader || fired.current) return;
    fired.current = true;
    setFlash(true);
    const t = setTimeout(() => setFlash(false), 1000);
    return () => clearTimeout(t);
  }, [playing, isLeader]);

  const teamClass = gs.turn === "red" ? "team-red" : "team-blue";

  return (
    <div className={`board-stage ${teamClass}`}>
      <ArabicConstellation />
      {flash && leaderInitial ? (
        <div className="initial-flash" aria-hidden="true">{leaderInitial}</div>
      ) : null}
      <Board gs={gs} role={role} myId={myId} myTeam={myTeam} isMyTurn={isMyTurn} />
    </div>
  );
}
