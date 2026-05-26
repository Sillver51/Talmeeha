"use client";

import { LazyMotion, MotionConfig, domAnimation } from "motion/react";
import type { ReactNode } from "react";

/**
 * Single client-side Motion boundary for the whole app:
 *  - LazyMotion + domAnimation loads the ~17 kB feature bundle once.
 *  - `strict` makes the build fail if anyone uses a heavy `motion.*` component
 *    instead of the tree-shaken `m.*` — keeps the bundle honest.
 *  - reducedMotion="user" honors the OS / browser `prefers-reduced-motion`
 *    setting AND the in-app `data-reduced-motion` attribute set by prefsStore.
 *
 * This is the ONE place we import from `motion/react`. Every consumer below
 * must import the `m.*` components from `motion/react-m`.
 */
export default function MotionProviders({ children }: { children: ReactNode }) {
  // LazyMotion must be the OUTER provider — MotionConfig reads the feature
  // context set by LazyMotion (per motion/react docs). Swapping the order
  // silently breaks `reducedMotion="user"`.
  return (
    <LazyMotion features={domAnimation} strict>
      <MotionConfig reducedMotion="user">
        {children}
      </MotionConfig>
    </LazyMotion>
  );
}
