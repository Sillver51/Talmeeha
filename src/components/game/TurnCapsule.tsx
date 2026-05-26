"use client";

import { useEffect, useRef, useState } from "react";
import type { PlayerView } from "@/lib/types";
import type { Role } from "@/lib/ui/roles";
import { usePrefsStore } from "@/store/prefsStore";
import { formatNumber } from "@/lib/i18n/digits";
import { useCountdown } from "@/lib/time/useCountdown";
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

export default function TurnCapsule({ gs, role, myId }: TurnCapsuleProps) {
  const digits = usePrefsStore((s) => s.digits);
  const deadlineAt = gs.turnDeadlineAt ?? null;
  const msLeft = useCountdown(deadlineAt);
  const turnClass = gs.turn === "red" ? " red" : "";

  // Detect clue arrival to fire the one-shot shimmer animation via key bump
  const [shimmerKey, setShimmerKey] = useState(0);
  const prevClueRef = useRef<string | null>(null);
  useEffect(() => {
    const w = gs.clue?.w ?? null;
    if (w && prevClueRef.current !== w) setShimmerKey((k) => k + 1);
    prevClueRef.current = w;
  }, [gs.clue?.w]);

  const showClue = gs.clue && gs.gphase;
  const turnName =
    gs.phase === "ended"
      ? "🏁 انتهت اللعبة"
      : gs.turn === "red"
        ? `دور ${gs.teamNames.red} 🔴`
        : `دور ${gs.teamNames.blue} 🔵`;

  return (
    <div
      className={`turn-capsule${turnClass}${urgencyClass(deadlineAt, msLeft)}`}
      role="status"
      aria-live="polite"
    >
      <div className="turn-line">
        {showClue && gs.clue ? (
          <>
            <span key={shimmerKey} className="clue-shimmer">{gs.clue.w}</span>
            <span aria-hidden="true"> · </span>
            <span>{formatNumber(gs.clue.n, digits)}</span>
            <span aria-hidden="true"> · </span>
            <span>تبقّى {formatNumber(gs.gleft, digits)}</span>
          </>
        ) : (
          turnName
        )}
      </div>
      <PoeticCapsule gs={gs} role={role} myId={myId} />
    </div>
  );
}
