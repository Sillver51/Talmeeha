"use client";

import { Eye, EyeOff, Settings } from "lucide-react";
import type { PlayerView } from "@/lib/types";
import type { Role } from "@/lib/ui/roles";
import type { LogEvent } from "@/lib/game/logParser";
import { Button } from "@/components/ui/button";
import { useGameStore } from "@/store/gameStore";
import { useCountdown } from "@/lib/time/useCountdown";
import ArcDial from "./ArcDial";
import Headline from "./Headline";
import VoiceStrand from "./VoiceStrand";

interface StatusStripProps {
  gs: PlayerView;
  role: Role;
  myId: string | null;
  isHost: boolean;
  winsRed: number;
  winsBlue: number;
  /** Newest parsed log entry (computed once in GameScreen). */
  lastEvent: LogEvent | null;
}

/**
 * Top rail of the Night Stage — the "Pulse" redesign.
 *
 *   [ARC-RED]   [HEADLINE (5 moment states)]   [ARC-BLUE]
 *               [VOICE STRAND]
 *               [HOST TRAY (when host)]
 *
 * No game logic here — purely compositional. State/server reads happen
 * inside the children; the strip just routes props.
 */
export default function StatusStrip({
  gs, role, myId, isHost, winsRed, winsBlue, lastEvent,
}: StatusStripProps) {
  const hostViewLeader = useGameStore((s) => s.hostViewLeader);
  const toggleHostView = useGameStore((s) => s.toggleHostView);
  const goToSetup = () => useGameStore.setState({ clientScreen: "setup" });

  const msLeft = useCountdown(gs.turnDeadlineAt ?? null);
  const activeTeam = gs.phase === "playing" ? gs.turn : null;

  return (
    <header className="status-strip" role="banner">
      <div className="status-rail">
        <ArcDial
          team="red"
          remaining={gs.sRed ?? 0}
          wins={winsRed}
          teamName={gs.teamNames.red}
          active={activeTeam === "red"}
        />
        <Headline gs={gs} lastEvent={lastEvent} msLeft={msLeft} />
        <ArcDial
          team="blue"
          remaining={gs.sBlue ?? 0}
          wins={winsBlue}
          teamName={gs.teamNames.blue}
          active={activeTeam === "blue"}
        />
      </div>

      <VoiceStrand gs={gs} role={role} myId={myId} lastEvent={lastEvent} />

      {isHost && (
        <div className="host-tray">
          <Button
            variant="ghost"
            size="xs"
            onClick={toggleHostView}
            aria-pressed={hostViewLeader}
            aria-label={hostViewLeader ? "إخفاء المفتاح" : "إظهار المفتاح"}
          >
            {hostViewLeader
              ? <><EyeOff size={14} aria-hidden="true" /> إخفاء</>
              : <><Eye size={14} aria-hidden="true" /> المفتاح</>}
          </Button>
          <Button variant="ghost" size="xs" onClick={goToSetup} aria-label="الإعداد">
            <Settings size={14} aria-hidden="true" /> الإعداد
          </Button>
        </div>
      )}
    </header>
  );
}
