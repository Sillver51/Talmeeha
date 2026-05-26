"use client";

import type { Team } from "@/lib/types";
import TeamGlyph from "@/components/brand/TeamGlyph";

const MAX_TICKS = 5;

const SIZE = 56;
const STROKE = 4;
const RADIUS = (SIZE - STROKE) / 2; // 26
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

interface ArcDialProps {
  team: Team;
  /** Cards of this team's color still hidden on the board. */
  remaining: number;
  /** Card count this team held at the start of the game (9 if starting team,
   *  8 otherwise). Derived per game by the parent; do not hardcode here. */
  startingTotal: number;
  /** Lifetime games won by this team in the current room. */
  wins: number;
  /** Used only for the aria-label. */
  teamName: string;
  /** When true, full saturation + halo; otherwise dimmed. */
  active: boolean;
}

/**
 * Circular SVG arc dial — the rail's score primitive. Replaces the legacy
 * TallyStone's numeral + dot-bar + team-name + wins pill with a single
 * informational element. Arc stroke encodes `remaining / startingTotal`;
 * the center glyph is color-independent identity; tick marks above the
 * arc represent lifetime wins (max 5 visible, then +N overflow chip).
 *
 * Animations live in game.css and key off the `.arc-dial` class.
 */
export default function ArcDial({
  team, remaining, startingTotal, wins, teamName, active,
}: ArcDialProps) {
  const denom = Math.max(startingTotal, remaining, 1);
  const safeRemaining = Math.max(0, Math.min(remaining, denom));
  const fraction = safeRemaining / denom;
  const dashOffset = CIRCUMFERENCE * (1 - fraction);

  const visibleTicks = Math.min(wins, MAX_TICKS);
  const overflow = wins > MAX_TICKS;
  const tickCells = Array.from({ length: MAX_TICKS }, (_, i) => i < visibleTicks);

  const ariaLabel =
    `نقاط ${teamName}: ${safeRemaining} من ${startingTotal}` +
    (wins > 0 ? `، انتصارات: ${wins}` : "");

  return (
    <div
      className={`arc-dial ${team}${active ? " active" : ""}`}
      data-team={team}
      role="img"
      aria-label={ariaLabel}
    >
      <div className="arc-ticks" aria-hidden="true">
        {overflow ? (
          <span className="arc-overflow">+{wins}</span>
        ) : (
          tickCells.map((lit, i) => (
            <span key={i} className={`arc-tick${lit ? " lit" : ""}`} />
          ))
        )}
      </div>

      <svg
        className="arc-svg"
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        width={SIZE}
        height={SIZE}
        aria-hidden="true"
        focusable="false"
      >
        <circle
          className="arc-bg"
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          strokeWidth={STROKE}
          fill="none"
        />
        <circle
          className="arc-fg"
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          strokeWidth={STROKE}
          fill="none"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={dashOffset}
          strokeLinecap="round"
          transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}
        />
      </svg>

      <span className="arc-glyph" aria-hidden="true">
        <TeamGlyph team={team} />
      </span>
    </div>
  );
}
