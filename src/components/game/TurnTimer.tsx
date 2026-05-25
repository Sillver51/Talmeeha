"use client";

import { useEffect, useRef, useState } from "react";
import { useCountdown } from "@/lib/time/useCountdown";
import { formatNumber } from "@/lib/i18n/digits";
import { usePrefsStore } from "@/store/prefsStore";

interface TurnTimerProps {
  deadlineAt: number | null | undefined;
  durationMs: number | undefined; // full turn duration, for the ring fraction
}

const RADIUS = 22;
const CIRC = 2 * Math.PI * RADIUS;
const URGENT_AT = 10; // seconds

export default function TurnTimer({ deadlineAt, durationMs }: TurnTimerProps) {
  const digits = usePrefsStore((s) => s.digits);
  const ms = useCountdown(deadlineAt);
  const [announcement, setAnnouncement] = useState("");
  const announcedRef = useRef<number | null>(null);

  const secs = Math.ceil(ms / 1000);

  // Reset announced tracker when deadline changes (new turn).
  useEffect(() => {
    announcedRef.current = null;
    setAnnouncement("");
  }, [deadlineAt]);

  // Announce only at 30s and 10s, once each per turn.
  useEffect(() => {
    if (deadlineAt == null) return;
    if ((secs === 30 || secs === 10) && announcedRef.current !== secs) {
      announcedRef.current = secs;
      const unit = secs >= 3 && secs <= 10 ? "ثوانٍ" : "ثانية";
      setAnnouncement(`${formatNumber(secs, digits)} ${unit} متبقية`);
    }
  }, [secs, deadlineAt, digits]);

  if (deadlineAt == null) return null;

  const frac =
    durationMs && durationMs > 0
      ? Math.max(0, Math.min(1, ms / durationMs))
      : 0;
  const dashoffset = CIRC * (1 - frac);
  const urgent = secs <= URGENT_AT;

  return (
    <div
      className={`turn-timer${urgent ? " urgent" : ""}`}
      data-urgent={urgent ? "true" : "false"}
    >
      {/* Ring depletes from top; aria-hidden since the numeral carries the value. */}
      <svg className="turn-timer-ring" viewBox="0 0 52 52" aria-hidden="true">
        <circle className="ttr-track" cx="26" cy="26" r={RADIUS} />
        <circle
          className="ttr-fill"
          cx="26"
          cy="26"
          r={RADIUS}
          style={{ strokeDasharray: CIRC, strokeDashoffset: dashoffset }}
        />
      </svg>

      {/* Visible numeral — aria-hidden because the sr-only live region announces. */}
      <span className="tt-secs" aria-hidden="true">
        {formatNumber(secs, digits)}
      </span>

      {/* Screen-reader live region — announces only at 30s and 10s. */}
      <span className="sr-only" aria-live="polite">
        {announcement}
      </span>
    </div>
  );
}
