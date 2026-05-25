import type { Team } from "@/lib/types";

/** Color-independent team marker: ▲ for red, ⬣ (hexagon) for blue. Decorative by default. */
interface TeamGlyphProps {
  team: Team;
  className?: string;
  /** When provided, exposes the glyph to screen readers with this label. */
  label?: string;
}

const GLYPH: Record<Team, string> = { red: "▲", blue: "⬣" };

export default function TeamGlyph({ team, className, label }: TeamGlyphProps) {
  return (
    <span
      className={`team-glyph tg-${team}${className ? ` ${className}` : ""}`}
      aria-hidden={label ? undefined : true}
      role={label ? "img" : undefined}
      aria-label={label}
    >
      {GLYPH[team]}
    </span>
  );
}
