"use client";

import type { PlayerView } from "@/lib/types";
import type { Role } from "@/lib/ui/roles";
import { usePrefsStore } from "@/store/prefsStore";
import { formatNumber } from "@/lib/i18n/digits";
import { useCountdown } from "@/lib/time/useCountdown";
import TeamGlyph from "@/components/brand/TeamGlyph";
import PoeticCapsule from "./PoeticCapsule";

interface TurnCapsuleProps {
  gs: PlayerView;
  role: Role;
  myId: string | null;
}

function urgencyClass(deadlineAt: number | null | undefined, msLeft: number): string {
  if (deadlineAt == null) return "";
  if (msLeft <= 3000) return " urgency-hard";
  if (msLeft <= 10_000) return " urgency-soft";
  return "";
}

/**
 * The "Stage Light" — center of the status rail. Renders:
 *  - turn announcement (دور {team}) when no clue yet, or
 *  - {clue word in continuous shimmer} {count chip} {remaining}
 * Wrapped in role="status" aria-live="polite" so screen readers announce
 * the turn change and the clue once it arrives.
 */
export default function TurnCapsule({ gs, role, myId }: TurnCapsuleProps) {
  const digits = usePrefsStore((s) => s.digits);
  const deadlineAt = gs.turnDeadlineAt ?? null;
  const msLeft = useCountdown(deadlineAt);
  const turnClass = gs.turn === "red" ? " red" : "";

  const showClue = gs.clue && gs.gphase;
  const turnLabel =
    gs.phase === "ended"
      ? "🏁 انتهت اللعبة"
      : gs.turn === "red"
        ? gs.teamNames.red
        : gs.teamNames.blue;

  return (
    <div
      className={`turn-capsule${turnClass}${urgencyClass(deadlineAt, msLeft)}`}
      role="status"
      aria-live="polite"
    >
      <div className="turn-line">
        {showClue && gs.clue ? (
          <>
            <span className="clue-shimmer" aria-label={`التلميحة: ${gs.clue.w}`}>
              {gs.clue.w}
            </span>
            <span className="clue-chip" aria-label={`عدد الكلمات: ${gs.clue.n}`}>
              {formatNumber(gs.clue.n, digits)}
            </span>
            <span className="remaining" aria-label={`تبقّى ${gs.gleft}`}>
              تبقّى {formatNumber(gs.gleft, digits)}
            </span>
          </>
        ) : gs.phase === "ended" ? (
          <span>{turnLabel}</span>
        ) : (
          <span>
            دور {turnLabel} <TeamGlyph team={gs.turn} />
          </span>
        )}
      </div>
      <PoeticCapsule gs={gs} role={role} myId={myId} />
    </div>
  );
}
