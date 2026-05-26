"use client";

import { Crown, Eye, EyeOff, Settings } from "lucide-react";
import type { PlayerView, Team } from "@/lib/types";
import type { Role } from "@/lib/ui/roles";
import TeamGlyph from "@/components/brand/TeamGlyph";
import { Button } from "@/components/ui/button";
import { usePrefsStore } from "@/store/prefsStore";
import { useGameStore } from "@/store/gameStore";
import { formatNumber, type DigitStyle } from "@/lib/i18n/digits";

/** Compact, monochrome crown chip rendered inline before the wins number. */
const CrownIcon = () => (
  <Crown size={11} aria-hidden="true" focusable="false" strokeWidth={2.5} />
);
import TurnCapsule from "./TurnCapsule";

interface StatusStripProps {
  gs: PlayerView;
  role: Role;
  myId: string | null;
  isHost: boolean;
  winsRed: number;
  winsBlue: number;
}

/**
 * The top rail of the Night Stage.
 *
 * Two "tally stones" (score capsules) flank the central turn capsule. The
 * active team's stone lights up with a team-color ring + soft halo and a
 * micro-lift; the idle stone stays matte. A dot bar under each numeral shows
 * remaining unrevealed cards as the team glyph — color-independent identity.
 * The leading team (by wins) shows a crown chip instead of a plain wins pill.
 *
 * Host action chips inline as a 4th grid column at ≥720px (via @container);
 * below that they wrap into a tray row.
 */
export default function StatusStrip({
  gs, role, myId, isHost, winsRed, winsBlue,
}: StatusStripProps) {
  const digits = usePrefsStore((s) => s.digits);
  const hostViewLeader = useGameStore((s) => s.hostViewLeader);
  const toggleHostView = useGameStore((s) => s.toggleHostView);
  const goToSetup = () => useGameStore.setState({ clientScreen: "setup" });

  const activeTeam = gs.phase === "playing" ? gs.turn : null;
  const leader: Team | null =
    winsRed === winsBlue ? null : winsRed > winsBlue ? "red" : "blue";

  return (
    <header className="status-strip" role="banner">
      <TallyStone
        team="red"
        remaining={gs.sRed ?? 0}
        wins={winsRed}
        teamName={gs.teamNames.red}
        digits={digits}
        active={activeTeam === "red"}
        leader={leader === "red"}
      />
      <TurnCapsule gs={gs} role={role} myId={myId} />
      <TallyStone
        team="blue"
        remaining={gs.sBlue ?? 0}
        wins={winsBlue}
        teamName={gs.teamNames.blue}
        digits={digits}
        active={activeTeam === "blue"}
        leader={leader === "blue"}
      />

      {isHost && (
        <div className="ss-actions">
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

interface TallyStoneProps {
  team: Team;
  remaining: number;
  wins: number;
  teamName: string;
  digits: DigitStyle;
  active: boolean;
  leader: boolean;
}

function TallyStone({
  team, remaining, wins, teamName, digits, active, leader,
}: TallyStoneProps) {
  // Initial board sizes are 9 (red, goes first) and 8 (blue) — derive a
  // safe max for the dot bar from the remaining count if it's higher, so
  // a non-default configuration still renders gracefully.
  const dotMax = team === "red" ? Math.max(9, remaining) : Math.max(8, remaining);

  return (
    <div
      className={`ss-score ${team}${active ? " active" : ""}`}
      data-team={team}
      aria-label={`نقاط ${teamName}: ${remaining}، انتصارات: ${wins}`}
    >
      <div className="n" aria-hidden="false">{formatNumber(remaining, digits)}</div>

      <div className="ss-dots" aria-hidden="true">
        {Array.from({ length: dotMax }, (_, i) => (
          <span key={i} className={`d${i < remaining ? " lit" : ""}`}>
            <TeamGlyph team={team} />
          </span>
        ))}
      </div>

      <div className="team-row">
        <TeamGlyph team={team} />
        <span className="team-name">{teamName}</span>
      </div>

      <span
        className={leader ? "wins crown" : "wins"}
        aria-label={`الانتصارات: ${wins}`}
      >
        {leader ? <CrownIcon /> : null}
        {formatNumber(wins, digits)}
      </span>
    </div>
  );
}
