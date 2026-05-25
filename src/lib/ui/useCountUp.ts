"use client";

import { useEffect, useState } from "react";

/**
 * Pure count-up interpolation: the displayed integer for a given animation
 * progress (0→1). Extracted so the easing/rounding logic is unit-testable
 * without rAF or the DOM. Progress is clamped to [0,1]; the result always
 * lands exactly on `target` at progress ≥ 1.
 *
 * Uses the same ease-out shape as the spring tokens (decelerating) so the
 * number rushes up then settles, matching the win-modal title entrance.
 */
export function countUpValue(start: number, target: number, progress: number): number {
  if (progress <= 0) return Math.round(start);
  if (progress >= 1) return target;
  // ease-out cubic: fast start, gentle settle.
  const eased = 1 - Math.pow(1 - progress, 3);
  return Math.round(start + (target - start) * eased);
}

/**
 * True when motion should be skipped: either the in-app reduced-motion toggle
 * (`--motion-scale` resolved to 0 on <html>) or the OS preference. SSR-safe —
 * returns false when `window`/`document` are unavailable so the server render
 * always shows the final value, avoiding a hydration jump.
 */
function prefersNoMotion(): boolean {
  if (typeof window === "undefined" || typeof document === "undefined") return false;
  try {
    const scale = getComputedStyle(document.documentElement)
      .getPropertyValue("--motion-scale")
      .trim();
    if (scale === "0") return true;
  } catch {
    // getComputedStyle can throw in exotic environments; fall through to media query.
  }
  return (
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

/**
 * Animate an integer counter from 0 up to `target` over `durationMs` using
 * requestAnimationFrame. Dependency-free and SSR-safe. Under reduced motion
 * (in-app toggle OR OS preference) it jumps straight to `target`.
 *
 * Returns the current integer; format it for display with `formatNumber`.
 */
export function useCountUp(target: number, durationMs = 900): number {
  // Start at the final value so SSR / first paint never flash a wrong number;
  // the effect resets to 0 and animates only on the client when motion is on.
  const [value, setValue] = useState(target);

  useEffect(() => {
    if (durationMs <= 0 || prefersNoMotion()) {
      setValue(target);
      return;
    }

    let raf = 0;
    let startTs: number | null = null;
    setValue(0);

    const tick = (ts: number) => {
      if (startTs === null) startTs = ts;
      const progress = (ts - startTs) / durationMs;
      setValue(countUpValue(0, target, progress));
      if (progress < 1) {
        raf = requestAnimationFrame(tick);
      }
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, durationMs]);

  return value;
}
