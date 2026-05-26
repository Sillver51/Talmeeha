"use client";

import { useEffect, useState } from "react";
import type { PlayerView, Team } from "@/lib/types";
import type { LogEvent } from "@/lib/game/logParser";
import type { Moment } from "@/lib/copy/capsule";
import { usePrefsStore } from "@/store/prefsStore";
import { formatNumber } from "@/lib/i18n/digits";
import TeamGlyph from "@/components/brand/TeamGlyph";

interface HeadlineProps {
  gs: PlayerView;
  /** Parsed newest log entry; null when log is empty. */
  lastEvent: LogEvent | null;
  /** Milliseconds remaining until turnDeadlineAt; Infinity when no deadline. */
  msLeft: number;
}

function momentOf(gs: PlayerView): Moment {
  if (gs.phase === "ended") return "ended";
  if (gs.gphase && gs.clue) return "clue-given";
  return "awaiting-clue";
}

function urgencyClass(deadline: number | null | undefined, msLeft: number): string {
  if (deadline == null) return "";
  if (msLeft <= 3_000) return " urgency urgency-hard";
  if (msLeft <= 10_000) return " urgency urgency-soft";
  return "";
}

function isRevealKind(k: LogEvent["kind"]): boolean {
  return k === "hit" || k === "miss" || k === "assassin";
}

/** Headline — the rail's morphing center slot. Hosts the 5 moment states
 *  (awaiting-clue, clue-given, urgency overlay, reveal-burst overlay, ended).
 *  Reveal-burst is a transient class applied for 700ms after a new reveal
 *  event arrives; the assassin variant adds a horizontal shake.
 */
export default function Headline({ gs, lastEvent, msLeft }: HeadlineProps) {
  const digits = usePrefsStore((s) => s.digits);
  const moment = momentOf(gs);

  // Reveal-burst: track which log entry we last "consumed" so the burst only
  // fires on transitions, not on every re-render.
  const lastRaw = lastEvent?.raw ?? null;
  const lastKind = lastEvent?.kind ?? null;
  const [burstKey, setBurstKey] = useState<string | null>(null);
  const [shake, setShake] = useState(false);

  useEffect(() => {
    if (!lastRaw || !lastKind || !isRevealKind(lastKind)) return;
    setBurstKey(lastRaw);
    if (lastKind === "assassin") setShake(true);
    const t1 = setTimeout(() => setBurstKey(null), 700);
    const t2 = setTimeout(() => setShake(false), 450);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [lastRaw, lastKind]);

  const urgency = moment === "clue-given" ? urgencyClass(gs.turnDeadlineAt, msLeft) : "";
  const shakeCls = shake ? " shake" : "";
  const burstTeam: Team | "neutral" | "assassin" | null =
    lastKind === "assassin" ? "assassin"
    : lastKind === "hit" ? gs.turn
    : lastKind === "miss" ? "neutral"
    : null;

  return (
    <div
      className={`headline moment-${moment}${urgency}${shakeCls}`}
      role="status"
      aria-live="polite"
      data-team={gs.turn}
    >
      {burstKey != null && burstTeam != null && (
        <span
          className={`reveal-burst burst-${burstTeam}`}
          aria-hidden="true"
          key={burstKey}
        >
          {Array.from({ length: 6 }, (_, i) => (
            <span key={i} className={`spark s${i}`} />
          ))}
        </span>
      )}

      {moment === "awaiting-clue" && (
        <span className="hl-line awaiting">
          في انتظار التلميحة من <strong className="hl-leader">{gs.leaders[gs.turn] ?? ""}</strong>
        </span>
      )}

      {moment === "clue-given" && gs.clue && (
        <>
          <span className="hl-line clue-line">
            <span className="hl-clue clue-shimmer" aria-label={`التلميحة: ${gs.clue.w}`}>
              {gs.clue.w}
            </span>
            <span className="hl-count" aria-label={`عدد الكلمات: ${gs.clue.n}`}>
              {formatNumber(gs.clue.n, digits)}
            </span>
          </span>
          <span className="hl-sub">
            تبقّى <span className="hl-remaining-n">{formatNumber(gs.gleft, digits)}</span>
            {urgency !== "" && (
              <span className="hl-countdown" aria-label={`الوقت المتبقّي: ${Math.ceil(msLeft / 1000)} ثانية`}>
                {formatNumber(Math.max(0, Math.ceil(msLeft / 1000)), digits)}
              </span>
            )}
          </span>
        </>
      )}

      {moment === "ended" && (
        <span className="hl-line ended">
          🏁 فاز {gs.winner ? gs.teamNames[gs.winner] : ""} <TeamGlyph team={gs.winner ?? gs.turn} />
        </span>
      )}
    </div>
  );
}
