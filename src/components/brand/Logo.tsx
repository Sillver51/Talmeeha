import Anqood from "./Anqood";

/**
 * Talmeeha wordmark تلميحة with the signature grape→gold→red gradient.
 * Ports the legacy `.logo-wrap` / `.logo` / `.logo-tag` lockups.
 * - `full`   — large wordmark (home / marketing), default 4.2rem via `.logo`.
 * - `compact`— smaller wordmark (~2.2rem) for in-game / lobby headers.
 */
interface LogoProps {
  size?: "full" | "compact";
  /** Optional tagline shown beneath the wordmark. */
  tagline?: string;
  /** Show the floating grape mascot above the wordmark. */
  mascot?: boolean;
}

const COMPACT_SIZE = "2.2rem";

export default function Logo({
  size = "full",
  tagline,
  mascot = false,
}: LogoProps) {
  const compact = size === "compact";
  return (
    <div className="logo-wrap">
      {mascot && <Anqood size={compact ? "1.6rem" : undefined} />}
      <div className="logo" style={compact ? { fontSize: COMPACT_SIZE } : undefined}>
        تلميحة
      </div>
      {tagline && <div className="logo-tag">{tagline}</div>}
    </div>
  );
}
