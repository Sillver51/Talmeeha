/**
 * Parses the server's log strings into a typed structure so the client can
 * render a rich timeline (icon, team color, structured text) instead of a
 * raw string list. The server log format is preserved as the source of
 * truth — we never re-author log lines, we only project them.
 *
 * Recognised legacy formats (from src/lib/game/rules.ts and server/*):
 *   `💡 {by}: "{word}" — {num}`           → clue
 *   `✅ {by}: "{word}" — إصابة!`           → hit
 *   `❌ {by}: "{word}"`                    → miss
 *   `☠️ {by} كشف القاتل!`                  → assassin
 *   `🏆 فاز {team}!? 🍇?`                  → win
 *   `⏰🏆 فاز {team} بالحسم! 🍇`           → suddenDeathWin
 *   `⏰ انتهى الوقت`                       → timeOut
 *   `⏭ انتهى الدور`                       → turnEnd
 *   `⏭ تم تمرير الدور — لا يوجد لاعب…`    → turnSkipped
 *   `بدأت اللعبة! يبدأ {team} 🍇`          → start
 *   `تم إنشاء الغرفة! 🍇`                  → roomCreated
 * Anything else falls into `info`.
 */
import type { Team } from "@/lib/types";

export type LogEventKind =
  | "clue"
  | "hit"
  | "miss"
  | "assassin"
  | "win"
  | "suddenDeathWin"
  | "timeOut"
  | "turnEnd"
  | "turnSkipped"
  | "start"
  | "roomCreated"
  | "info";

export interface LogEvent {
  kind: LogEventKind;
  /** Raw text — fallback for unknown lines and screen readers. */
  raw: string;
  /** Speaker / actor name when present. */
  by?: string;
  /** Word the actor referenced (clue or guess target). */
  word?: string;
  /** Clue count (only for kind="clue"). */
  count?: number;
  /** Inferred team tint when the kind implies one. */
  team?: Team;
}

const TEAM_RX_RED = /(الفريق الأحمر|أحمر|🔴)/;
const TEAM_RX_BLUE = /(الفريق الأزرق|أزرق|🔵)/;

function teamOf(s: string, teamNames?: { red: string; blue: string }): Team | undefined {
  if (teamNames?.red && s.includes(teamNames.red)) return "red";
  if (teamNames?.blue && s.includes(teamNames.blue)) return "blue";
  if (TEAM_RX_RED.test(s)) return "red";
  if (TEAM_RX_BLUE.test(s)) return "blue";
  return undefined;
}

export function parseLogEntry(
  raw: string,
  teamNames?: { red: string; blue: string },
): LogEvent {
  // Order matters: more specific patterns (e.g. suddenDeath uses ⏰🏆) before general.
  if (raw.startsWith("💡")) {
    const m = raw.match(/^💡\s+(.+?):\s*"(.+?)"\s*—\s*(\d+)/);
    if (m) return { kind: "clue", raw, by: m[1], word: m[2], count: Number(m[3]) };
    return { kind: "clue", raw };
  }
  if (raw.startsWith("✅")) {
    const m = raw.match(/^✅\s+(.+?):\s*"(.+?)"/);
    if (m) return { kind: "hit", raw, by: m[1], word: m[2] };
    return { kind: "hit", raw };
  }
  if (raw.startsWith("❌")) {
    const m = raw.match(/^❌\s+(.+?):\s*"(.+?)"/);
    if (m) return { kind: "miss", raw, by: m[1], word: m[2] };
    return { kind: "miss", raw };
  }
  if (raw.startsWith("☠️")) {
    const m = raw.match(/^☠️\s+(.+?)\s+/);
    return { kind: "assassin", raw, by: m?.[1] };
  }
  if (raw.startsWith("⏰🏆")) {
    return { kind: "suddenDeathWin", raw, team: teamOf(raw, teamNames) };
  }
  if (raw.startsWith("⏰")) {
    return { kind: "timeOut", raw };
  }
  if (raw.startsWith("🏆")) {
    return { kind: "win", raw, team: teamOf(raw, teamNames) };
  }
  if (raw.startsWith("⏭")) {
    if (raw.includes("تم تمرير")) return { kind: "turnSkipped", raw };
    return { kind: "turnEnd", raw };
  }
  if (raw.includes("بدأت اللعبة")) {
    return { kind: "start", raw, team: teamOf(raw, teamNames) };
  }
  if (raw.includes("تم إنشاء الغرفة")) {
    return { kind: "roomCreated", raw };
  }
  return { kind: "info", raw };
}
