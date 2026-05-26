"use client";

import type { CSSProperties } from "react";

interface CalligraphyTextProps {
  word: string;
  className?: string;
}

/**
 * Renders an Arabic word as per-letter spans so CSS can cascade a fade-in
 * animation (the .calligraphy class in game.css). Each child span receives
 * a CSS custom property `--i` (its index, used by animation-delay).
 *
 * Splitting by `Array.from` is grapheme-aware in modern engines for basic
 * BMP characters; joined Arabic ligatures may visually re-flow, which is
 * acceptable for a cascade effect.
 */
export default function CalligraphyText({ word, className }: CalligraphyTextProps) {
  const letters = Array.from(word);
  return (
    <span className={className ? `calligraphy ${className}` : "calligraphy"}>
      {letters.map((ch, i) => (
        <span key={i} style={{ "--i": String(i) } as CSSProperties}>
          {ch}
        </span>
      ))}
    </span>
  );
}
