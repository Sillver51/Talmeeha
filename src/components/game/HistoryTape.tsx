"use client";

import { useEffect, useMemo, useRef, type ReactNode } from "react";
import {
  CircleCheck,
  CircleX,
  Clock,
  Flag,
  Lightbulb,
  ScrollText,
  Sparkles,
  SkipForward,
  Skull,
  Trophy,
} from "lucide-react";
import type { Team } from "@/lib/types";
import { parseLogEntry, type LogEvent, type LogEventKind } from "@/lib/game/logParser";

/**
 * History Tape — replaces the legacy `<GameLog/>`.
 *
 * Sits in the flexible row between BoardStage and ActionDock and grows to
 * fill all the vertical space that the board doesn't claim. Always visible,
 * always scrollable — no toggle. Renders the server's log strings as a typed
 * timeline:
 *   [icon]  actor · event text   [optional chip]
 * Team identity colors the leading accent rail (border-inline-start), with
 * the brand grape as the neutral default. content-visibility:auto on the
 * scroll container keeps off-screen rows out of the layout pass; the top of
 * the scroller is masked with a fade so older entries dissolve as new ones
 * append. Auto-scrolls to the latest entry on update.
 *
 * Accessibility:
 *  - Section has an aria-label "سجل الأحداث".
 *  - A visually-hidden <output aria-live="polite"> announces the latest
 *    event for screen readers.
 */
interface HistoryTapeProps {
  log: readonly string[];
  teamNames?: { red: string; blue: string };
  /** Optional name→team lookup so hit/miss events inherit the actor's team. */
  playerTeams?: Record<string, Team>;
}

interface EventVisual {
  Icon: typeof Lightbulb;
  accent: "red" | "blue" | "gold" | "grape" | "neutral" | "danger";
}

const VISUALS: Record<LogEventKind, EventVisual> = {
  clue:           { Icon: Lightbulb,   accent: "gold" },
  hit:            { Icon: CircleCheck, accent: "grape" },
  miss:           { Icon: CircleX,     accent: "neutral" },
  assassin:       { Icon: Skull,       accent: "danger" },
  win:            { Icon: Trophy,      accent: "gold" },
  suddenDeathWin: { Icon: Trophy,      accent: "gold" },
  timeOut:        { Icon: Clock,       accent: "danger" },
  turnEnd:        { Icon: SkipForward, accent: "neutral" },
  turnSkipped:    { Icon: SkipForward, accent: "neutral" },
  start:          { Icon: Flag,        accent: "grape" },
  roomCreated:    { Icon: Sparkles,    accent: "grape" },
  info:           { Icon: Sparkles,    accent: "neutral" },
};

function visualForEvent(e: LogEvent): EventVisual {
  const base = VISUALS[e.kind];
  if (e.team === "red") return { ...base, accent: "red" };
  if (e.team === "blue") return { ...base, accent: "blue" };
  return base;
}

type KeyedEvent = LogEvent & { _key: string };

export default function HistoryTape({ log, teamNames, playerTeams }: HistoryTapeProps) {
  const scrollerRef = useRef<HTMLOListElement | null>(null);

  // Server pushes newest-first. We render chronologically (oldest top → newest
  // bottom). Stable monotonic keys derived from original-index-from-tail so
  // React doesn't remount the whole list when a new line prepends.
  const events = useMemo<KeyedEvent[]>(() => {
    if (!log.length) return [];
    return [...log]
      .map((raw, i) => {
        const parsed = parseLogEntry(raw, teamNames);
        let event = parsed;
        if ((parsed.kind === "hit" || parsed.kind === "miss") && parsed.by && playerTeams) {
          const team = playerTeams[parsed.by];
          if (team) event = { ...parsed, team };
        }
        return { ...event, _key: String(log.length - 1 - i) };
      })
      .reverse();
  }, [log, teamNames, playerTeams]);

  const latest = events[events.length - 1];

  // Auto-scroll to latest on any update.
  useEffect(() => {
    const el = scrollerRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [events.length]);

  return (
    <section className="history-tape" aria-label="سجل الأحداث">
      <output className="sr-only" aria-live="polite" aria-atomic="true">
        {latest ? renderEventText(latest) : ""}
      </output>

      <header className="ht-header">
        <span className="ht-title">
          <ScrollText size={13} aria-hidden="true" strokeWidth={2.5} />
          السجل
        </span>
        <span className="ht-title" aria-hidden="true">
          <span className="ht-dot" />
        </span>
      </header>

      {events.length === 0 ? (
        <div className="ht-empty" role="status">
          في انتظار أوّل حدث…
        </div>
      ) : (
        <ol id="ht-scroller" ref={scrollerRef} className="ht-scroller">
          {events.map((e) => (
            <li key={e._key}>
              <HistoryRow event={e} />
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

function HistoryRow({ event }: { event: LogEvent }) {
  const { Icon, accent } = visualForEvent(event);
  return (
    <div className={`ht-row ht-accent-${accent}`}>
      <span className="ht-icon" aria-hidden="true">
        <Icon size={14} strokeWidth={2.5} />
      </span>
      <span className="ht-text">{renderEvent(event)}</span>
    </div>
  );
}

function renderEvent(e: LogEvent): ReactNode {
  switch (e.kind) {
    case "clue":
      return e.by && e.word ? (
        <>
          <strong>{e.by}</strong> · تلميحة:
          <em className="ht-word"> «{e.word}» </em>
          <ChipNumber n={e.count ?? 0} />
        </>
      ) : e.raw;
    case "hit":
      return e.by && e.word ? (
        <>
          <strong>{e.by}</strong> أصاب:<em className="ht-word"> «{e.word}»</em>
        </>
      ) : e.raw;
    case "miss":
      return e.by && e.word ? (
        <>
          <strong>{e.by}</strong> أخطأ:<em className="ht-word"> «{e.word}»</em>
        </>
      ) : e.raw;
    case "assassin":
      return (
        <>
          {e.by ? <strong>{e.by}</strong> : null} كشف القاتل!
        </>
      );
    case "win":
    case "suddenDeathWin":
      return e.raw.replace(/🍇|🏆|⏰/g, "").trim();
    case "timeOut":
      return "انتهى الوقت";
    case "turnEnd":
      return "انتهى الدور";
    case "turnSkipped":
      return "تمرير الدور — لا يوجد لاعب متصل";
    case "start":
      return e.raw.replace(/🍇/g, "").trim();
    case "roomCreated":
      return "تم إنشاء الغرفة";
    default:
      return e.raw;
  }
}

function renderEventText(e: LogEvent): string {
  switch (e.kind) {
    case "clue": return e.by && e.word ? `${e.by} · تلميحة: ${e.word} ${e.count ?? ""}`.trim() : e.raw;
    case "hit": return e.by && e.word ? `${e.by} أصاب: ${e.word}` : e.raw;
    case "miss": return e.by && e.word ? `${e.by} أخطأ: ${e.word}` : e.raw;
    case "assassin": return e.by ? `${e.by} كشف القاتل` : e.raw;
    case "win":
    case "suddenDeathWin": return e.raw.replace(/🍇|🏆|⏰/g, "").trim();
    case "timeOut": return "انتهى الوقت";
    case "turnEnd": return "انتهى الدور";
    case "turnSkipped": return "تمرير الدور";
    case "start": return e.raw.replace(/🍇/g, "").trim();
    case "roomCreated": return "تم إنشاء الغرفة";
    default: return e.raw;
  }
}

function ChipNumber({ n }: { n: number }) {
  if (n <= 0) return null;
  return <span className="ht-num">{n}</span>;
}
