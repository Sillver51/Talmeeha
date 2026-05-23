"use client";

/**
 * Game log (`.game-log`) — ports legacy markup (~814) + log coloring
 * (~1164–1173). Each entry gets a color class derived from keywords/emoji,
 * preserving the legacy if/else-if precedence exactly.
 */
interface GameLogProps {
  log: string[];
}

/** Ports the legacy keyword → class mapping (~1166–1172), order-sensitive. */
function entryClass(entry: string): string {
  let c = "log-entry";
  if (entry.includes("✅")) c += " lr";
  else if (entry.includes("أزرق")) c += " lb";
  else if (entry.includes("أحمر") || entry.includes("🔴")) c += " lr";
  else if (
    entry.includes("💡") ||
    entry.includes("🏆") ||
    entry.includes("🍇") ||
    entry.includes("🎉")
  )
    c += " lg";
  else if (entry.includes("☠️") || entry.includes("❌")) c += " la";
  return c;
}

export default function GameLog({ log }: GameLogProps) {
  const entries = log.length ? log : ["🍇 مرحباً! بدأت اللعبة"];
  return (
    <div className="game-log" id="glog">
      {entries.map((entry, i) => (
        <div key={i} className={entryClass(entry)}>
          {entry}
        </div>
      ))}
    </div>
  );
}
