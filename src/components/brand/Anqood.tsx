"use client";

/**
 * Anqood (عنقود) — the floating grape mascot 🍇.
 * Ports the legacy `.grape-wrap` / `.grape-emoji` (float + glow keyframes).
 * The float/glow animation is disabled via CSS when the user prefers reduced
 * motion (see `@media (prefers-reduced-motion: reduce)` in globals.css).
 */
interface AnqoodProps {
  /** Font-size of the grape; defaults to the legacy 3.5rem via CSS. */
  size?: string;
  /** Extra class names appended to the wrapper. */
  className?: string;
}

export default function Anqood({ size, className }: AnqoodProps) {
  const wrapClass = className ? `grape-wrap ${className}` : "grape-wrap";
  return (
    <div className={wrapClass}>
      <span
        className="grape-emoji"
        role="img"
        aria-label="عنقود"
        style={size ? { fontSize: size } : undefined}
      >
        🍇
      </span>
    </div>
  );
}
