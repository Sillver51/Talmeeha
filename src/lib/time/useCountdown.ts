"use client";

import { useEffect, useState } from "react";
import { estimatedServerNow } from "./clock";

/** Remaining milliseconds until `deadlineAt`, clamped to ≥ 0. Returns 0 when there is no deadline. */
export function remainingMs(deadlineAt: number | null | undefined, now: number): number {
  if (deadlineAt == null) return 0;
  return Math.max(0, deadlineAt - now);
}

/**
 * Remaining milliseconds until `deadlineAt`, recomputed every animation frame from
 * the estimated server clock (never a decrementing counter). Returns 0 when
 * `deadlineAt` is null. Recomputes immediately on tab `visibilitychange` (a
 * backgrounded tab throttles rAF). SSR-safe: the initial value is computed without
 * touching the DOM; rAF/document are only used inside the effect.
 */
export function useCountdown(deadlineAt: number | null | undefined): number {
  const [ms, setMs] = useState(() => remainingMs(deadlineAt, estimatedServerNow()));

  useEffect(() => {
    if (deadlineAt == null) {
      setMs(0);
      return;
    }

    let raf = 0;
    const tick = () => {
      const next = remainingMs(deadlineAt, estimatedServerNow());
      setMs(next);
      // Keep ticking while time remains; once at 0 the value can't change until the
      // deadline prop changes (which re-runs this effect), so stop to save frames.
      if (next > 0) raf = requestAnimationFrame(tick);
    };
    const onVisible = () => {
      const next = remainingMs(deadlineAt, estimatedServerNow());
      setMs(next);
      if (next > 0 && raf === 0) raf = requestAnimationFrame(tick);
    };

    document.addEventListener("visibilitychange", onVisible);
    raf = requestAnimationFrame(tick);

    return () => {
      if (raf) cancelAnimationFrame(raf);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [deadlineAt]);

  return ms;
}
