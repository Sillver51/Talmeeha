# Status Rail "Pulse" Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current `StatusStrip` (TallyStone × 2 + TurnCapsule + buried PoeticCapsule) with the "Pulse" redesign: two arc-dials + a morphing headline + a featured voice strand, driven by five moment states derived from existing `PlayerView` fields. No server, socket-contract, or game-logic changes.

**Architecture:** Reuse existing primitives wherever possible — extend `src/lib/game/logParser.ts` with a tiny `lastEventOf` helper, extend `src/lib/copy/capsule.ts` with moment-aware phrase buckets, build three new presentational React components, rewrite the status zone of `src/app/game.css`. New components: `ArcDial`, `Headline`, `VoiceStrand`. Deleted: `TurnCapsule`, `PoeticCapsule`.

**Tech Stack:** Next.js 16 App Router · React 19 · TypeScript · Tailwind + plain CSS (`game.css`) · Vitest + happy-dom for component tests · Tajawal font · Arabic-first RTL.

**Spec:** [`docs/superpowers/specs/2026-05-26-status-rail-pulse-redesign.md`](../specs/2026-05-26-status-rail-pulse-redesign.md)

---

## Plan notes (delta from spec)

The spec mentioned creating `src/lib/ui/lastEvent.ts` and `src/lib/ui/usePoeticPhrase.ts`. Audit of the existing codebase showed both responsibilities already live elsewhere:

- **Log parsing** → `src/lib/game/logParser.ts` already exports `parseLogEntry` returning a `LogEvent` discriminated union with exactly the fields we need. We add a one-function helper `lastEventOf(log, teamNames)` to this file.
- **Phrase pool** → `src/lib/copy/capsule.ts` already exports `resolveCapsulePhrase(state)` with the deterministic `djb2` hash + interpolation. We extend its `CapsuleState` with optional `lastEvent` + `moment` fields and add new phrase buckets.

This keeps the dep graph clean and avoids creating parallel utilities.

---

## File map

**Modified:**
- `src/lib/game/logParser.ts` — add `lastEventOf` helper.
- `src/lib/copy/capsule.ts` — extend `CapsuleState`, add moment-aware buckets, update `bucketFor` priority chain.
- `src/components/game/StatusStrip.tsx` — restructure to compose new pieces.
- `src/components/screens/GameScreen.tsx` — compute `lastEvent` once, pass through to `StatusStrip`.
- `src/app/game.css` — rewrite status zone (lines ~25–242 + responsive overrides ~549–574).

**Created:**
- `src/components/game/ArcDial.tsx` — SVG arc + center glyph + win-tick marks.
- `src/components/game/Headline.tsx` — center slot with 5 moment states.
- `src/components/game/VoiceStrand.tsx` — featured poetic line below the rail.
- `tests/lib/capsule.test.ts` — tests for new phrase buckets.
- `tests/components/game/ArcDial.test.tsx` — structural + a11y tests.
- `tests/components/game/Headline.test.tsx` — moment-state tests.

**Extended:**
- `tests/lib/logParser.test.ts` — add `lastEventOf` cases.

**Deleted:**
- `src/components/game/TurnCapsule.tsx` — superseded by `Headline.tsx`.
- `src/components/game/PoeticCapsule.tsx` — superseded by `VoiceStrand.tsx` (phrase logic stays in `capsule.ts`).

---

## Task 1: `lastEventOf` helper

**Files:**
- Modify: `src/lib/game/logParser.ts`
- Modify: `tests/lib/logParser.test.ts`

- [ ] **Step 1.1: Add failing tests for `lastEventOf`**

Append to `tests/lib/logParser.test.ts` (before the closing `});` of the existing `describe`):

```typescript
  describe("lastEventOf", () => {
    const teamNames = { red: "الفريق الأحمر", blue: "الفريق الأزرق" };

    it("returns null for an empty log", () => {
      expect(lastEventOf([], teamNames)).toBeNull();
    });

    it("parses the newest entry (server pushes newest-first)", () => {
      const log = [
        '✅ ليلى: "نخلة" — إصابة!', // newest
        '💡 عمر: "بحر" — 3',
      ];
      const e = lastEventOf(log, teamNames);
      expect(e?.kind).toBe("hit");
      expect(e?.by).toBe("ليلى");
      expect(e?.word).toBe("نخلة");
    });

    it("resolves team names on win lines", () => {
      const log = [`🏆 فاز ${teamNames.red}! 🍇`];
      const e = lastEventOf(log, teamNames);
      expect(e?.kind).toBe("win");
      expect(e?.team).toBe("red");
    });
  });
```

And update the import at the top of the file:

```typescript
import { parseLogEntry, lastEventOf } from "@/lib/game/logParser";
```

- [ ] **Step 1.2: Run the failing test**

Run: `npx vitest run tests/lib/logParser.test.ts`
Expected: FAIL — "lastEventOf is not a function".

- [ ] **Step 1.3: Implement `lastEventOf`**

Append to `src/lib/game/logParser.ts`:

```typescript
/**
 * Returns the parsed last (newest) entry from a server log, or null if empty.
 * The server pushes newest-first, so log[0] is the most recent line.
 * Used by Headline (reveal-burst trigger) and VoiceStrand (phrase selection).
 */
export function lastEventOf(
  log: readonly string[],
  teamNames?: { red: string; blue: string },
): LogEvent | null {
  if (!log.length) return null;
  return parseLogEntry(log[0]!, teamNames);
}
```

- [ ] **Step 1.4: Run tests, expect green**

Run: `npx vitest run tests/lib/logParser.test.ts`
Expected: PASS — all describe blocks green.

- [ ] **Step 1.5: Commit**

```bash
git add src/lib/game/logParser.ts tests/lib/logParser.test.ts
git commit -m "feat(log): add lastEventOf helper for status-rail consumers"
```

---

## Task 2: Moment-aware phrase buckets in `capsule.ts`

**Files:**
- Modify: `src/lib/copy/capsule.ts`
- Create: `tests/lib/capsule.test.ts`

The spec's voice-strand table maps moment + last event → phrase category. Today `bucketFor()` only uses `(role, phase, gphase, isMyTurn)`. We add `moment` and `lastEvent` to `CapsuleState` and re-route the priority chain so reactive phrases (post-hit, post-miss, post-assassin, urgency, end-turn) win over the existing buckets when their triggers are present.

- [ ] **Step 2.1: Add failing tests for new buckets**

Create `tests/lib/capsule.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { resolveCapsulePhrase, type CapsuleState } from "@/lib/copy/capsule";

const base: CapsuleState = {
  phase: "playing",
  gphase: true,
  role: "guesser",
  isMyTurn: true,
  gameId: "ABCD",
};

describe("resolveCapsulePhrase — moment-aware buckets", () => {
  it("returns a praise phrase after own-team hit", () => {
    const out = resolveCapsulePhrase({
      ...base,
      lastEvent: { kind: "hit-own" },
    });
    expect(out).toMatch(/إصابة|موفّق|أحسنت/);
  });

  it("returns a pity phrase after wrong-color hit", () => {
    const out = resolveCapsulePhrase({
      ...base,
      lastEvent: { kind: "hit-wrong" },
    });
    expect(out.length).toBeGreaterThan(0);
    expect(out).not.toMatch(/إصابة موفّقة/);
  });

  it("returns a gravity phrase after assassin reveal", () => {
    const out = resolveCapsulePhrase({
      ...base,
      lastEvent: { kind: "assassin" },
    });
    expect(out).toMatch(/قاتل|نهاية/);
  });

  it("returns an urgency phrase when moment is 'urgency'", () => {
    const out = resolveCapsulePhrase({
      ...base,
      moment: "urgency",
    });
    expect(out).toMatch(/يضيق|ضاق|الوقت/);
  });

  it("returns a handoff phrase after end-turn", () => {
    const out = resolveCapsulePhrase({
      ...base,
      lastEvent: { kind: "turn-end", nextTeamName: "المحيط" },
    });
    expect(out).toMatch(/المحيط/);
  });

  it("is deterministic per gameId", () => {
    const a = resolveCapsulePhrase({ ...base, lastEvent: { kind: "hit-own" } });
    const b = resolveCapsulePhrase({ ...base, lastEvent: { kind: "hit-own" } });
    expect(a).toBe(b);
  });

  it("falls back to existing role/phase buckets when no moment/event is set", () => {
    // pre-clue leader on own turn — existing leaderMyTurnPreClue bucket
    const out = resolveCapsulePhrase({
      ...base,
      role: "leader",
      gphase: false,
      name: "حسن",
    });
    expect(out).toMatch(/حسن|دورك|قائد/);
  });
});
```

- [ ] **Step 2.2: Run, expect failures**

Run: `npx vitest run tests/lib/capsule.test.ts`
Expected: FAIL — type errors on `lastEvent` / `moment` (don't exist yet on `CapsuleState`).

- [ ] **Step 2.3: Extend `CapsuleState` + `PHRASES` + `bucketFor`**

Edit `src/lib/copy/capsule.ts`. Replace the existing `CapsuleState` interface, `PHRASES` constant, and `bucketFor` function with the versions below. Keep everything else (`djb2`, `interpolate`, `resolveCapsulePhrase`, `CAPSULE_HEADLINE_TASHKEEL`) unchanged.

```typescript
export type Moment =
  | "awaiting-clue"
  | "clue-given"
  | "urgency"
  | "reveal-burst"
  | "ended";

/** Compact tag for the last log event, used to pick reactive phrases. */
export type CapsuleLastEvent =
  | { kind: "clue" }
  | { kind: "hit-own" }
  | { kind: "hit-wrong" }
  | { kind: "hit-neutral" }
  | { kind: "assassin" }
  | { kind: "turn-end"; nextTeamName?: string }
  | { kind: "time-out" };

export interface CapsuleState {
  phase: "playing" | "ended" | "lobby" | "setup";
  gphase?: boolean;
  role: Role;
  isMyTurn: boolean;
  gameId: string;
  name?: string;
  clue?: string;
  count?: number;
  winnerName?: string;
  /** Optional explicit moment override (set by Headline / VoiceStrand). */
  moment?: Moment;
  /** Optional last log event, used for reactive phrases. */
  lastEvent?: CapsuleLastEvent;
}

type PhraseSet = readonly string[];

const PHRASES = {
  // Existing buckets ----------------------------------------------------
  endedWinner: [
    "🏆 فاز فريق {winnerName}",
    "🎉 ختام موفّق — {winnerName} في الصدارة",
  ],
  endedAssassin: [
    "☠ اقترب القاتل — انتهت الجولة",
  ],
  leaderMyTurnPreClue: [
    "هذا دورك يا {name} · همِسة واحدة",
    "كلمة واحدة، يا قائد {name}، يكفي",
    "{name}، الفريق ينتظر تَلْميحَتك",
  ],
  leaderMyTurnPostClue: [
    "في انتظار الفريق…",
    "تنفّس — يخمّنون الآن",
  ],
  guesserMyTurnPostClue: [
    "{clue} · {count} · ما الذي يخطر ببالك؟",
    "اقرأ اللوحة بهدوء — {clue} · {count}",
  ],
  guesserOffTurn: [
    "تنفّس · سيلتقطها الفريق الآخر",
    "اشرب رشفة قهوة، الدور للفريق الآخر",
  ],
  spectator: [
    "👁 تشاهد — انتظر الجولة القادمة",
  ],
  hostLeaderPhase: [
    "مرّر الجهاز إلى القائد",
  ],
  hostGuessPhase: [
    "الفريق يخمّن — راقب اللوحة",
  ],
  fallback: [
    "في انتظار الجولة…",
  ],
  // New moment-aware buckets -------------------------------------------
  reactPraise: [
    "إصابة موفّقة!",
    "أحسنتم — كلمة وقعت في محلّها",
    "تلميحة سديدة، إصابة موفّقة",
  ],
  reactPity: [
    "ليس هذا اللون…",
    "كادت تكون لنا",
    "ابتعدنا قليلاً عن المراد",
  ],
  reactNeutral: [
    "كلمة محايدة… كاد القلب يقفز",
    "محايدة — نفَس عميق",
  ],
  reactAssassin: [
    "وقع القاتل. النهاية.",
    "☠ سقطت الكلمة الخاطئة",
  ],
  reactHandoff: [
    "الكلمة الآن لـ{nextTeamName}",
    "دور {nextTeamName} — صمت قبل الهمسة",
  ],
  reactTimeOut: [
    "انتهى الوقت — الدور للآخرين",
    "ضاق الوقت قبل التلميحة",
  ],
  urgencyTension: [
    "الوقت يضيق…",
    "ثوانٍ قليلة قبل الصمت",
    "ضاق الزمن — اختر",
  ],
} as const satisfies Record<string, PhraseSet>;

type Bucket = keyof typeof PHRASES;

function bucketFor(s: CapsuleState): Bucket {
  // 1. Ended state always wins.
  if (s.phase === "ended") {
    return s.winnerName ? "endedWinner" : "endedAssassin";
  }

  // 2. Reactive phrases — last log event takes priority over moment/role.
  if (s.lastEvent) {
    switch (s.lastEvent.kind) {
      case "hit-own":      return "reactPraise";
      case "hit-wrong":    return "reactPity";
      case "hit-neutral":  return "reactNeutral";
      case "assassin":     return "reactAssassin";
      case "turn-end":     return "reactHandoff";
      case "time-out":     return "reactTimeOut";
      // clue: fall through to role-based buckets below
    }
  }

  // 3. Urgency overlay overrides role buckets when set.
  if (s.moment === "urgency") return "urgencyTension";

  // 4. Existing role/phase buckets (unchanged behavior).
  if (s.role === "spectator") return "spectator";
  if (s.role === "host") return s.gphase ? "hostGuessPhase" : "hostLeaderPhase";
  if (s.role === "leader" && s.isMyTurn) {
    return s.gphase ? "leaderMyTurnPostClue" : "leaderMyTurnPreClue";
  }
  if (s.role === "guesser" && s.isMyTurn && s.gphase) {
    return "guesserMyTurnPostClue";
  }
  if (!s.isMyTurn) return "guesserOffTurn";
  return "fallback";
}
```

Also update `interpolate` to handle the new `{nextTeamName}` token. Replace the existing `interpolate` function with:

```typescript
function interpolate(template: string, s: CapsuleState): string {
  const nextTeamName =
    s.lastEvent && s.lastEvent.kind === "turn-end"
      ? (s.lastEvent.nextTeamName ?? "")
      : "";
  return template
    .replace(/\{name\}/g, s.name ?? "")
    .replace(/\{clue\}/g, s.clue ?? "")
    .replace(/\{count\}/g, s.count != null ? String(s.count) : "")
    .replace(/\{winnerName\}/g, s.winnerName ?? "")
    .replace(/\{nextTeamName\}/g, nextTeamName);
}
```

The `Role` import is already present in the file. No new imports needed.

- [ ] **Step 2.4: Run tests, expect green**

Run: `npx vitest run tests/lib/capsule.test.ts tests/lib/logParser.test.ts`
Expected: PASS — both suites green.

- [ ] **Step 2.5: Verify type-check across consumers**

Run: `npx tsc --noEmit`
Expected: PASS — `PoeticCapsule.tsx` still type-checks because new fields on `CapsuleState` are optional.

- [ ] **Step 2.6: Commit**

```bash
git add src/lib/copy/capsule.ts tests/lib/capsule.test.ts
git commit -m "feat(copy): moment-aware phrase buckets for voice strand"
```

---

## Task 3: `ArcDial` component

**Files:**
- Create: `src/components/game/ArcDial.tsx`
- Create: `tests/components/game/ArcDial.test.tsx`

- [ ] **Step 3.1: Write failing tests**

Create `tests/components/game/ArcDial.test.tsx`:

```typescript
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import ArcDial from "@/components/game/ArcDial";

describe("ArcDial", () => {
  it("renders an SVG with correct aria-label for red team", () => {
    render(
      <ArcDial team="red" remaining={5} wins={2} teamName="الفريق الأحمر" active />,
    );
    const dial = screen.getByRole("img");
    expect(dial.getAttribute("aria-label")).toMatch(/الفريق الأحمر/);
    expect(dial.getAttribute("aria-label")).toMatch(/5/);
    expect(dial.getAttribute("aria-label")).toMatch(/9/);
    expect(dial.getAttribute("aria-label")).toMatch(/2/);
  });

  it("uses the larger of (startingTotal, remaining) when remaining exceeds default", () => {
    // Blue starts at 8 by default; if remaining is somehow 10, denominator widens.
    render(
      <ArcDial team="blue" remaining={10} wins={0} teamName="الفريق الأزرق" active />,
    );
    expect(screen.getByRole("img").getAttribute("aria-label")).toMatch(/10/);
  });

  it("applies the active class when active and not when idle", () => {
    const { container, rerender } = render(
      <ArcDial team="red" remaining={5} wins={0} teamName="x" active />,
    );
    expect(container.querySelector(".arc-dial.active")).not.toBeNull();
    rerender(
      <ArcDial team="red" remaining={5} wins={0} teamName="x" active={false} />,
    );
    expect(container.querySelector(".arc-dial.active")).toBeNull();
  });

  it("renders up to 5 tick marks, then collapses to +N chip", () => {
    const { container, rerender } = render(
      <ArcDial team="red" remaining={5} wins={3} teamName="x" active />,
    );
    expect(container.querySelectorAll(".arc-tick.lit")).toHaveLength(3);

    rerender(
      <ArcDial team="red" remaining={5} wins={7} teamName="x" active />,
    );
    expect(container.querySelector(".arc-overflow")?.textContent).toBe("+7");
  });
});
```

- [ ] **Step 3.2: Run, expect failure**

Run: `npx vitest run tests/components/game/ArcDial.test.tsx`
Expected: FAIL — cannot resolve `@/components/game/ArcDial`.

- [ ] **Step 3.3: Implement `ArcDial.tsx`**

Create `src/components/game/ArcDial.tsx`:

```typescript
"use client";

import type { Team } from "@/lib/types";
import TeamGlyph from "@/components/brand/TeamGlyph";

const TEAM_START_TOTAL: Record<Team, number> = { red: 9, blue: 8 };
const MAX_TICKS = 5;

const SIZE = 56;
const STROKE = 4;
const RADIUS = (SIZE - STROKE) / 2; // 26
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

interface ArcDialProps {
  team: Team;
  /** Cards of this team's color still hidden on the board. */
  remaining: number;
  /** Lifetime games won by this team in the current room. */
  wins: number;
  /** Used only for the aria-label. */
  teamName: string;
  /** When true, full saturation + halo; otherwise dimmed. */
  active: boolean;
}

/**
 * Circular SVG arc dial — the rail's score primitive. Replaces the legacy
 * TallyStone's numeral + dot-bar + team-name + wins pill with a single
 * informational element. Arc stroke encodes `remaining / startingTotal`;
 * the center glyph is color-independent identity; tick marks above the
 * arc represent lifetime wins (max 5 visible, then +N overflow chip).
 *
 * Animations live in game.css and key off the `.arc-dial` class.
 */
export default function ArcDial({
  team, remaining, wins, teamName, active,
}: ArcDialProps) {
  const startingTotal = Math.max(TEAM_START_TOTAL[team], remaining);
  const safeRemaining = Math.max(0, Math.min(remaining, startingTotal));
  const fraction = startingTotal === 0 ? 0 : safeRemaining / startingTotal;
  const dashOffset = CIRCUMFERENCE * (1 - fraction);

  const visibleTicks = Math.min(wins, MAX_TICKS);
  const overflow = wins > MAX_TICKS;
  const tickCells = Array.from({ length: MAX_TICKS }, (_, i) => i < visibleTicks);

  const ariaLabel =
    `نقاط ${teamName}: ${safeRemaining} من ${startingTotal}` +
    (wins > 0 ? `، انتصارات: ${wins}` : "");

  return (
    <div
      className={`arc-dial ${team}${active ? " active" : ""}`}
      data-team={team}
      role="img"
      aria-label={ariaLabel}
    >
      <div className="arc-ticks" aria-hidden="true">
        {overflow ? (
          <span className="arc-overflow">+{wins}</span>
        ) : (
          tickCells.map((lit, i) => (
            <span key={i} className={`arc-tick${lit ? " lit" : ""}`} />
          ))
        )}
      </div>

      <svg
        className="arc-svg"
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        width={SIZE}
        height={SIZE}
        aria-hidden="true"
        focusable="false"
      >
        <circle
          className="arc-bg"
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          strokeWidth={STROKE}
          fill="none"
        />
        <circle
          className="arc-fg"
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          strokeWidth={STROKE}
          fill="none"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={dashOffset}
          strokeLinecap="round"
          transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}
        />
      </svg>

      <span className="arc-glyph" aria-hidden="true">
        <TeamGlyph team={team} />
      </span>
    </div>
  );
}
```

- [ ] **Step 3.4: Run ArcDial tests, expect green**

Run: `npx vitest run tests/components/game/ArcDial.test.tsx`
Expected: PASS — all 4 tests green.

- [ ] **Step 3.5: Commit**

```bash
git add src/components/game/ArcDial.tsx tests/components/game/ArcDial.test.tsx
git commit -m "feat(game): ArcDial — SVG arc + center glyph + win-tick marks"
```

---

## Task 4: `Headline` component

**Files:**
- Create: `src/components/game/Headline.tsx`
- Create: `tests/components/game/Headline.test.tsx`

This component owns the 5 moment states. It consumes the live `gs`, the precomputed `lastEvent`, and `msLeft` (already computed by the existing `useCountdown` hook). Reveal-burst is purely visual (particle elements with `aria-hidden`); the assassin shake is a class toggle keyed off `lastEvent`.

- [ ] **Step 4.1: Write failing tests**

Create `tests/components/game/Headline.test.tsx`:

```typescript
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import Headline from "@/components/game/Headline";
import type { PlayerView } from "@/lib/types";
import type { LogEvent } from "@/lib/game/logParser";

function baseGs(): PlayerView {
  return {
    code: "ABCD",
    phase: "playing",
    turn: "red",
    gphase: false,
    gleft: 0,
    clue: null,
    players: {},
    teamNames: { red: "النار", blue: "المحيط" },
    leaders: { red: "حسن", blue: "ليلى" },
    log: [],
    sRed: 9,
    sBlue: 8,
    board: [],
    turnDeadlineAt: null,
    // any additional optional fields are not required by Headline
  } as unknown as PlayerView;
}

describe("Headline", () => {
  it("awaiting-clue: shows leader's name", () => {
    const gs = baseGs();
    render(<Headline gs={gs} lastEvent={null} msLeft={Infinity} />);
    expect(screen.getByText(/حسن/)).toBeTruthy();
  });

  it("clue-given: shows the clue word and remaining count", () => {
    const gs = baseGs();
    gs.gphase = true;
    gs.clue = { w: "محيط", n: 3 };
    gs.gleft = 2;
    render(<Headline gs={gs} lastEvent={null} msLeft={Infinity} />);
    expect(screen.getByText(/محيط/)).toBeTruthy();
    expect(screen.getByText(/تبقّى/)).toBeTruthy();
  });

  it("ended: shows the winning team", () => {
    const gs = baseGs();
    gs.phase = "ended";
    gs.winner = "blue";
    render(<Headline gs={gs} lastEvent={null} msLeft={Infinity} />);
    expect(screen.getByText(/المحيط/)).toBeTruthy();
  });

  it("urgency: applies the urgency class when msLeft <= 10s", () => {
    const gs = baseGs();
    gs.gphase = true;
    gs.clue = { w: "بحر", n: 1 };
    gs.gleft = 1;
    gs.turnDeadlineAt = Date.now() + 9_000;
    const { container } = render(
      <Headline gs={gs} lastEvent={null} msLeft={9_000} />,
    );
    expect(container.querySelector(".headline.urgency")).not.toBeNull();
  });

  it("assassin: applies the shake class when last event is assassin", () => {
    const gs = baseGs();
    const lastEvent: LogEvent = { kind: "assassin", raw: "☠️ جود كشف القاتل!", by: "جود" };
    const { container } = render(
      <Headline gs={gs} lastEvent={lastEvent} msLeft={Infinity} />,
    );
    expect(container.querySelector(".headline.shake")).not.toBeNull();
  });
});
```

- [ ] **Step 4.2: Run, expect failure**

Run: `npx vitest run tests/components/game/Headline.test.tsx`
Expected: FAIL — module `Headline` not found.

- [ ] **Step 4.3: Implement `Headline.tsx`**

Create `src/components/game/Headline.tsx`:

```typescript
"use client";

import { useEffect, useState } from "react";
import type { PlayerView, Team } from "@/lib/types";
import type { LogEvent } from "@/lib/game/logParser";
import type { Moment } from "@/lib/copy/capsule";
import { usePrefsStore } from "@/store/prefsStore";
import { formatNumber } from "@/lib/i18n/digits";
import TeamGlyph from "@/components/brand/TeamGlyph";

interface HeadlineProps {
  gs: PlayerView;
  /** Parsed newest log entry; null when log is empty. */
  lastEvent: LogEvent | null;
  /** Milliseconds remaining until turnDeadlineAt; Infinity when no deadline. */
  msLeft: number;
}

function momentOf(gs: PlayerView): Moment {
  if (gs.phase === "ended") return "ended";
  if (gs.gphase && gs.clue) return "clue-given";
  return "awaiting-clue";
}

function urgencyClass(deadline: number | null | undefined, msLeft: number): string {
  if (deadline == null) return "";
  if (msLeft <= 3_000) return " urgency urgency-hard";
  if (msLeft <= 10_000) return " urgency urgency-soft";
  return "";
}

function isRevealKind(k: LogEvent["kind"]): boolean {
  return k === "hit" || k === "miss" || k === "assassin";
}

/** Headline — the rail's morphing center slot. Hosts the 5 moment states
 *  (awaiting-clue, clue-given, urgency overlay, reveal-burst overlay, ended).
 *  Reveal-burst is a transient class applied for 700ms after a new reveal
 *  event arrives; the assassin variant adds a horizontal shake.
 */
export default function Headline({ gs, lastEvent, msLeft }: HeadlineProps) {
  const digits = usePrefsStore((s) => s.digits);
  const moment = momentOf(gs);

  // Reveal-burst: track which log entry we last "consumed" so the burst only
  // fires on transitions, not on every re-render.
  const lastRaw = lastEvent?.raw ?? null;
  const lastKind = lastEvent?.kind ?? null;
  const [burstKey, setBurstKey] = useState<string | null>(null);
  const [shake, setShake] = useState(false);

  useEffect(() => {
    if (!lastRaw || !lastKind || !isRevealKind(lastKind)) return;
    setBurstKey(lastRaw);
    if (lastKind === "assassin") setShake(true);
    const t1 = setTimeout(() => setBurstKey(null), 700);
    const t2 = setTimeout(() => setShake(false), 450);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [lastRaw, lastKind]);

  const urgency = moment === "clue-given" ? urgencyClass(gs.turnDeadlineAt, msLeft) : "";
  const shakeCls = shake ? " shake" : "";
  const burstTeam: Team | "neutral" | "assassin" | null =
    lastKind === "assassin" ? "assassin"
    : lastKind === "hit" ? gs.turn
    : lastKind === "miss" ? "neutral"
    : null;

  return (
    <div
      className={`headline moment-${moment}${urgency}${shakeCls}`}
      role="status"
      aria-live="polite"
      data-team={gs.turn}
    >
      {burstKey != null && burstTeam != null && (
        <span
          className={`reveal-burst burst-${burstTeam}`}
          aria-hidden="true"
          key={burstKey}
        >
          {Array.from({ length: 6 }, (_, i) => (
            <span key={i} className={`spark s${i}`} />
          ))}
        </span>
      )}

      {moment === "awaiting-clue" && (
        <span className="hl-line awaiting">
          في انتظار التلميحة من <strong className="hl-leader">{gs.leaders[gs.turn] ?? ""}</strong>
        </span>
      )}

      {moment === "clue-given" && gs.clue && (
        <>
          <span className="hl-line clue-line">
            <span className="hl-clue clue-shimmer" aria-label={`التلميحة: ${gs.clue.w}`}>
              {gs.clue.w}
            </span>
            <span className="hl-count" aria-label={`عدد الكلمات: ${gs.clue.n}`}>
              {formatNumber(gs.clue.n, digits)}
            </span>
          </span>
          <span className="hl-sub">
            تبقّى <span className="hl-remaining-n">{formatNumber(gs.gleft, digits)}</span>
            {urgency !== "" && (
              <span className="hl-countdown" aria-label={`الوقت المتبقّي: ${Math.ceil(msLeft / 1000)} ثانية`}>
                {formatNumber(Math.max(0, Math.ceil(msLeft / 1000)), digits)}
              </span>
            )}
          </span>
        </>
      )}

      {moment === "ended" && (
        <span className="hl-line ended">
          🏁 فاز {gs.winner ? gs.teamNames[gs.winner] : ""} <TeamGlyph team={gs.winner ?? gs.turn} />
        </span>
      )}
    </div>
  );
}
```

- [ ] **Step 4.4: Run Headline tests, expect green**

Run: `npx vitest run tests/components/game/Headline.test.tsx`
Expected: PASS — all 5 tests green.

- [ ] **Step 4.5: Commit**

```bash
git add src/components/game/Headline.tsx tests/components/game/Headline.test.tsx
git commit -m "feat(game): Headline — morphing center slot for 5 moment states"
```

---

## Task 5: `VoiceStrand` component

**Files:**
- Create: `src/components/game/VoiceStrand.tsx`

`VoiceStrand` is a thin wrapper around the extended `resolveCapsulePhrase` — it computes the `CapsuleState` from props (already deterministic by `gameId`), maps the live `LogEvent` to the new `CapsuleLastEvent` discriminator, and renders the phrase with a keyed `<output>` so screen readers announce changes politely.

- [ ] **Step 5.1: Implement `VoiceStrand.tsx`**

Create `src/components/game/VoiceStrand.tsx`:

```typescript
"use client";

import type { PlayerView, Team } from "@/lib/types";
import type { Role } from "@/lib/ui/roles";
import type { LogEvent } from "@/lib/game/logParser";
import {
  resolveCapsulePhrase,
  type CapsuleLastEvent,
  type CapsuleState,
  type Moment,
} from "@/lib/copy/capsule";

interface VoiceStrandProps {
  gs: PlayerView;
  role: Role;
  myId: string | null;
  lastEvent: LogEvent | null;
  /** Optional explicit moment override (Headline computes the same value). */
  moment?: Moment;
}

/** Map a parsed LogEvent into the capsule's compact CapsuleLastEvent.
 *  We don't always know whether a `hit` was own-color vs wrong-color from
 *  the server log alone, so we default to "hit-own" for hits — server's
 *  authoritative state will already have flipped `turn` on wrong hits, so
 *  the rail's color/glyph carry the truth; the phrase here is a vibe layer.
 */
function toCapsuleEvent(e: LogEvent, gs: PlayerView): CapsuleLastEvent | undefined {
  switch (e.kind) {
    case "clue":     return { kind: "clue" };
    case "hit":      return { kind: "hit-own" };
    case "miss":     return { kind: "hit-neutral" };
    case "assassin": return { kind: "assassin" };
    case "timeOut":  return { kind: "time-out" };
    case "turnEnd":
    case "turnSkipped": {
      const next: Team = gs.turn === "red" ? "blue" : "red";
      return { kind: "turn-end", nextTeamName: gs.teamNames[next] };
    }
    default: return undefined;
  }
}

/** VoiceStrand — featured poetic line below the status rail. Phrase pool
 *  is deterministic per (gameId, bucket); transitions are handled by the
 *  React `key` prop on the inner `<span>` (CSS keyframes in game.css).
 */
export default function VoiceStrand({
  gs, role, myId, lastEvent, moment,
}: VoiceStrandProps) {
  const me = myId ? gs.players[myId] : null;
  const isMyTurn = me?.team != null && me.team === gs.turn;
  const name =
    role === "leader" && me
      ? me.name
      : role === "leader"
        ? (gs.leaders[gs.turn] ?? "")
        : (me?.name ?? "");
  const winnerName = gs.winner ? gs.teamNames[gs.winner] : undefined;

  const state: CapsuleState = {
    phase: gs.phase as CapsuleState["phase"],
    gphase: gs.gphase,
    role,
    isMyTurn,
    gameId: gs.code,
    name,
    clue: gs.clue?.w,
    count: gs.clue?.n,
    winnerName,
    moment,
    lastEvent: lastEvent ? toCapsuleEvent(lastEvent, gs) : undefined,
  };

  const phrase = resolveCapsulePhrase(state);

  // The `key` swap triggers the CSS fade/translate on phrase change.
  return (
    <output className="voice-strand" aria-live="polite" aria-atomic="true">
      <span className="voice-line" key={phrase}>{phrase}</span>
    </output>
  );
}
```

- [ ] **Step 5.2: Type-check**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 5.3: Commit**

```bash
git add src/components/game/VoiceStrand.tsx
git commit -m "feat(game): VoiceStrand — featured poetic line below the rail"
```

---

## Task 6: Restructure `StatusStrip.tsx`

**Files:**
- Modify: `src/components/game/StatusStrip.tsx`

Drop the local `TallyStone` helper and `CrownIcon`. The component becomes a thin composer: two `<ArcDial>` + one `<Headline>` + one `<VoiceStrand>` + optional host tray.

- [ ] **Step 6.1: Replace `StatusStrip.tsx`**

Overwrite `src/components/game/StatusStrip.tsx` with:

```typescript
"use client";

import { Eye, EyeOff, Settings } from "lucide-react";
import type { PlayerView } from "@/lib/types";
import type { Role } from "@/lib/ui/roles";
import type { LogEvent } from "@/lib/game/logParser";
import { Button } from "@/components/ui/button";
import { useGameStore } from "@/store/gameStore";
import { useCountdown } from "@/lib/time/useCountdown";
import ArcDial from "./ArcDial";
import Headline from "./Headline";
import VoiceStrand from "./VoiceStrand";

interface StatusStripProps {
  gs: PlayerView;
  role: Role;
  myId: string | null;
  isHost: boolean;
  winsRed: number;
  winsBlue: number;
  /** Newest parsed log entry (computed once in GameScreen). */
  lastEvent: LogEvent | null;
}

/**
 * Top rail of the Night Stage — the "Pulse" redesign.
 *
 *   [ARC-RED]   [HEADLINE (5 moment states)]   [ARC-BLUE]
 *               [VOICE STRAND]
 *               [HOST TRAY (when host)]
 *
 * No game logic here — purely compositional. State/server reads happen
 * inside the children; the strip just routes props.
 */
export default function StatusStrip({
  gs, role, myId, isHost, winsRed, winsBlue, lastEvent,
}: StatusStripProps) {
  const hostViewLeader = useGameStore((s) => s.hostViewLeader);
  const toggleHostView = useGameStore((s) => s.toggleHostView);
  const goToSetup = () => useGameStore.setState({ clientScreen: "setup" });

  const msLeft = useCountdown(gs.turnDeadlineAt ?? null);
  const activeTeam = gs.phase === "playing" ? gs.turn : null;

  return (
    <header className="status-strip" role="banner">
      <div className="status-rail">
        <ArcDial
          team="red"
          remaining={gs.sRed ?? 0}
          wins={winsRed}
          teamName={gs.teamNames.red}
          active={activeTeam === "red"}
        />
        <Headline gs={gs} lastEvent={lastEvent} msLeft={msLeft} />
        <ArcDial
          team="blue"
          remaining={gs.sBlue ?? 0}
          wins={winsBlue}
          teamName={gs.teamNames.blue}
          active={activeTeam === "blue"}
        />
      </div>

      <VoiceStrand gs={gs} role={role} myId={myId} lastEvent={lastEvent} />

      {isHost && (
        <div className="host-tray">
          <Button
            variant="ghost"
            size="xs"
            onClick={toggleHostView}
            aria-pressed={hostViewLeader}
            aria-label={hostViewLeader ? "إخفاء المفتاح" : "إظهار المفتاح"}
          >
            {hostViewLeader
              ? <><EyeOff size={14} aria-hidden="true" /> إخفاء</>
              : <><Eye size={14} aria-hidden="true" /> المفتاح</>}
          </Button>
          <Button variant="ghost" size="xs" onClick={goToSetup} aria-label="الإعداد">
            <Settings size={14} aria-hidden="true" /> الإعداد
          </Button>
        </div>
      )}
    </header>
  );
}
```

- [ ] **Step 6.2: Type-check**

Run: `npx tsc --noEmit`
Expected: FAIL — `GameScreen.tsx` does not yet pass `lastEvent`. We'll fix that in Task 7. The error should be confined to GameScreen.

- [ ] **Step 6.3: Commit**

```bash
git add src/components/game/StatusStrip.tsx
git commit -m "refactor(game): StatusStrip composes ArcDial + Headline + VoiceStrand"
```

---

## Task 7: Update `GameScreen.tsx` to compute `lastEvent`

**Files:**
- Modify: `src/components/screens/GameScreen.tsx`

- [ ] **Step 7.1: Add `lastEvent` computation + wire prop**

In `src/components/screens/GameScreen.tsx`, add the import near the existing imports:

```typescript
import { lastEventOf } from "@/lib/game/logParser";
```

Then, within the `GameScreen` function, immediately after the existing `playerTeams` memo, add:

```typescript
  const lastEvent = useMemo(
    () => lastEventOf(gs.log ?? [], gs.teamNames),
    [gs.log, gs.teamNames],
  );
```

Finally, update the `<StatusStrip ... />` JSX to pass the new prop:

```typescript
        <StatusStrip
          gs={gs}
          role={role}
          myId={myId}
          isHost={isHost}
          winsRed={winsData.red || 0}
          winsBlue={winsData.blue || 0}
          lastEvent={lastEvent}
        />
```

- [ ] **Step 7.2: Type-check**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 7.3: Commit**

```bash
git add src/components/screens/GameScreen.tsx
git commit -m "feat(game): compute lastEvent once in GameScreen and pass through"
```

---

## Task 8: Rewrite status zone CSS in `game.css`

**Files:**
- Modify: `src/app/game.css`

The current file contains a `.status-strip` block (~line 30), `.ss-score` block (~44), `.ss-dots` block (~104), `.ss-actions` block (~121), `.turn-capsule` blocks (~136-242 incl. urgency variants), plus responsive overrides at the bottom (~549-574). All of these go away — replaced by `.status-strip`, `.status-rail`, `.arc-dial`, `.headline`, `.voice-strand`, `.host-tray`, plus their responsive overrides.

- [ ] **Step 8.1: Find the bounds of the old block**

Run: `grep -n "^\.status-strip\|^\.ss-\|^\.tally\|^\.turn-capsule\|^\.board-stage" src/app/game.css`
Expected: shows the `^.status-strip` line and the first `^.board-stage` line — the block to delete spans from the first to (just before) the second. Note the line numbers.

- [ ] **Step 8.2: Delete the old status & turn-capsule CSS**

Open `src/app/game.css`. Delete:

1. The `.status-strip { ... }` block (current sticky/grid container).
2. Every `.ss-score`, `.ss-dots`, `.ss-actions`, `.tally-*` rule and modifier.
3. Every `.turn-capsule` rule (including `.urgency-soft`, `.urgency-hard`, `.clue-shimmer`, `.clue-chip`, `.remaining`, `.sub-line`, `.turn-line`).
4. The two `@media (prefers-reduced-motion: ...)` rules whose selector lists begin with `.turn-capsule` (around lines 515 and 526 in the current file).
5. In the small-screen `@media (max-width: 640px)` block (around line 549), delete every selector that begins with `.ss-score`, `.ss-dots`, `.ss-actions`, `.status-strip`, or `.turn-capsule`.
6. In the very-small `@media (max-width: 360px)` block (around line 572), delete the `.ss-score`-targeted rules.
7. In the performance/containment line (currently `.action-dock, .status-strip { contain: layout style; }`), keep only `.action-dock { contain: layout style; }` for now — we'll re-add `.status-strip` containment in the new block.

Do NOT touch `.board-stage`, `.action-dock`, `.history-tape`, `.wc`, `.team-glyph`, or anything outside the status zone.

- [ ] **Step 8.3: Insert the new status zone CSS**

Insert the block below at the position where the old `.status-strip { ... }` rule lived (between the file header comment and `.board-stage`):

```css
/* ============================================================
 * Status rail — "Pulse" redesign
 * Layout:
 *   .status-strip       outer container (sticky, vertical stack)
 *     .status-rail      horizontal row: [arc] [headline] [arc]
 *     .voice-strand     featured poetic line below the rail
 *     .host-tray        host-only action chips
 * ============================================================ */
.status-strip {
  position: sticky; top: 0; z-index: 5;
  display: flex; flex-direction: column; gap: .35rem;
  padding-block: .5rem .35rem;
  contain: layout style;
}

.status-rail {
  display: grid;
  grid-template-columns: 56px minmax(0, 1fr) 56px;
  align-items: center;
  gap: .75rem;
}

/* ----- ArcDial ---------------------------------------------- */
.arc-dial {
  position: relative;
  width: 56px; height: 56px;
  display: grid; place-items: center;
  transition: transform 220ms ease, filter 220ms ease;
  filter: saturate(.5) brightness(.85);
  --arc-color: var(--text2);
}
.arc-dial.red  { --arc-color: var(--red, #FF4D8D); }
.arc-dial.blue { --arc-color: var(--blue, #34A8FF); }

.arc-dial.active {
  filter: none;
  transform: scale(1.04);
}
.arc-dial.active::after {
  content: "";
  position: absolute; inset: -6px;
  border-radius: 50%;
  box-shadow: 0 0 16px color-mix(in oklab, var(--arc-color) 55%, transparent);
  pointer-events: none;
}

.arc-svg { display: block; }
.arc-bg {
  stroke: color-mix(in oklab, var(--arc-color) 18%, transparent);
}
.arc-fg {
  stroke: var(--arc-color);
  transition: stroke-dashoffset 320ms cubic-bezier(.2,.7,.2,1);
}

.arc-glyph {
  position: absolute; inset: 0;
  display: grid; place-items: center;
  color: var(--arc-color);
  font-size: 1.05rem; line-height: 1;
  text-shadow: 0 0 6px color-mix(in oklab, var(--arc-color) 60%, transparent);
}

.arc-ticks {
  position: absolute;
  inset-block-start: -8px;
  inset-inline-start: 50%;
  transform: translateX(-50%);
  display: flex; gap: 3px;
  pointer-events: none;
}
.arc-tick {
  width: 4px; height: 4px;
  border-radius: 50%;
  background: color-mix(in oklab, var(--arc-color) 25%, transparent);
  transition: background 220ms ease, transform 220ms ease;
}
.arc-tick.lit {
  background: var(--arc-color);
  box-shadow: 0 0 4px color-mix(in oklab, var(--arc-color) 70%, transparent);
}
.arc-overflow {
  font-size: .58rem;
  font-weight: 800;
  color: var(--arc-color);
  background: color-mix(in oklab, var(--arc-color) 18%, transparent);
  border-radius: 999px;
  padding: 1px 6px;
  line-height: 1.2;
}

/* ----- Headline --------------------------------------------- */
.headline {
  position: relative;
  display: flex; flex-direction: column; align-items: center; gap: .15rem;
  padding: .45rem .6rem;
  min-height: 3rem;
  border-radius: 14px;
  background: linear-gradient(180deg,
    rgba(255,255,255,.04),
    rgba(255,255,255,.02) 60%,
    transparent);
  border: 1px solid var(--border2, rgba(255,255,255,.06));
  overflow: hidden;
}

.headline .hl-line {
  display: inline-flex; align-items: center; gap: .4rem;
  font-weight: 900;
  font-size: clamp(.95rem, 2.6vw, 1.1rem);
  line-height: 1.2;
  text-align: center;
}

.headline.moment-awaiting-clue .hl-line.awaiting {
  font-weight: 800;
}
.headline .hl-leader {
  position: relative;
  font-weight: 900;
  padding-block-end: 2px;
}
.headline .hl-leader::after {
  content: "";
  position: absolute;
  inset-inline: 0; inset-block-end: 0;
  block-size: 2px; border-radius: 2px;
  background: var(--team-c, var(--grape, #B084FF));
  animation: hl-leader-pulse 2s ease-in-out infinite;
}
.headline[data-team="red"] .hl-leader { --team-c: var(--red); }
.headline[data-team="blue"] .hl-leader { --team-c: var(--blue); }
@keyframes hl-leader-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: .5; }
}

.headline .hl-clue.clue-shimmer {
  font-weight: 900;
  font-size: clamp(1.1rem, 3vw, 1.4rem);
  background: linear-gradient(90deg,
    var(--text) 0%, var(--gold, #E0C070) 50%, var(--text) 100%);
  background-size: 200% 100%;
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  animation: hl-shimmer 8s linear infinite;
}
@keyframes hl-shimmer {
  from { background-position: 200% 0; }
  to   { background-position: -200% 0; }
}

.headline .hl-count {
  display: inline-grid; place-items: center;
  min-width: 1.5rem; padding: 1px 8px;
  border-radius: 999px;
  font-weight: 900; font-size: .8rem;
  background: var(--team-c, var(--grape));
  color: #fff;
}
.headline[data-team="red"]  .hl-count { background: var(--red); }
.headline[data-team="blue"] .hl-count { background: var(--blue); }

.headline .hl-sub {
  display: inline-flex; align-items: baseline; gap: .5rem;
  font-weight: 600; font-size: .85rem;
  color: var(--text2, rgba(240,240,240,.85));
}
.headline .hl-remaining-n { font-weight: 800; color: var(--text); }

.headline.urgency {
  outline: 1px solid var(--gold, #E0C070);
  outline-offset: -1px;
  animation: hl-urgency-pulse 2s ease-in-out infinite;
}
.headline.urgency-hard {
  animation: none;
  outline-width: 1px;
  outline-color: var(--gold);
}
@keyframes hl-urgency-pulse {
  0%, 100% { outline-color: var(--gold); }
  50%      { outline-color: color-mix(in oklab, var(--gold) 60%, transparent); }
}
.headline .hl-countdown {
  font-weight: 700; color: var(--gold);
  font-variant-numeric: tabular-nums;
  transition: transform 150ms ease;
}
.headline.urgency-hard .hl-countdown { transform: scale(1.1); }

.headline.shake { animation: hl-shake 150ms ease-in-out 3; }
@keyframes hl-shake {
  0%, 100% { transform: translateX(0); }
  25%      { transform: translateX(-2px); }
  75%      { transform: translateX(2px); }
}

/* Reveal burst ------------------------------------------------ */
.reveal-burst {
  position: absolute; inset: 0;
  pointer-events: none;
  display: grid; place-items: center;
}
.reveal-burst .spark {
  position: absolute;
  width: 4px; height: 4px;
  border-radius: 50%;
  opacity: 0;
  animation: spark-fly 600ms ease-out forwards;
}
.reveal-burst.burst-red .spark    { background: var(--red); box-shadow: 0 0 6px var(--red); }
.reveal-burst.burst-blue .spark   { background: var(--blue); box-shadow: 0 0 6px var(--blue); }
.reveal-burst.burst-neutral .spark{ background: var(--gold); box-shadow: 0 0 6px var(--gold); }
.reveal-burst.burst-assassin .spark{ background: #FF3358; box-shadow: 0 0 6px #FF3358; }

.reveal-burst .s0 { --dx:  18px; --dy: -10px; animation-delay: 0ms; }
.reveal-burst .s1 { --dx: -18px; --dy: -10px; animation-delay: 30ms; }
.reveal-burst .s2 { --dx:  22px; --dy:   6px; animation-delay: 60ms; }
.reveal-burst .s3 { --dx: -22px; --dy:   6px; animation-delay: 90ms; }
.reveal-burst .s4 { --dx:   0px; --dy: -22px; animation-delay: 120ms; }
.reveal-burst .s5 { --dx:   0px; --dy:  18px; animation-delay: 150ms; }

@keyframes spark-fly {
  from { transform: translate(0, 0) scale(.4); opacity: 0; }
  20%  { opacity: 1; }
  to   { transform: translate(var(--dx), var(--dy)) scale(1); opacity: 0; }
}

/* ----- Voice strand ----------------------------------------- */
.voice-strand {
  display: block;
  text-align: center;
  min-height: 1.25rem;
  font-family: inherit;
}
.voice-strand .voice-line {
  display: inline-block;
  font-style: italic;
  font-weight: 600;
  font-size: clamp(.78rem, 2.2vw, .9rem);
  color: var(--text2, rgba(240,240,240,.92));
  max-width: 60ch;
  animation: voice-in 280ms cubic-bezier(.2,.7,.2,1);
}
@keyframes voice-in {
  from { opacity: 0; transform: translateY(-6px); }
  to   { opacity: 1; transform: translateY(0); }
}

/* ----- Host tray -------------------------------------------- */
.host-tray {
  display: flex; justify-content: flex-end; gap: .3rem;
  padding-inline: .25rem;
}

/* Reduced motion --------------------------------------------- */
@media (prefers-reduced-motion: reduce) {
  .headline .hl-clue.clue-shimmer { animation: none; background: var(--text); -webkit-background-clip: initial; background-clip: initial; color: var(--text); }
  .headline.urgency, .headline.shake, .headline .hl-leader::after { animation: none; }
  .arc-fg { transition: none; }
  .reveal-burst .spark { animation: none; opacity: 0; }
  .voice-strand .voice-line { animation: none; }
}
[data-reduced-motion="on"] .headline .hl-clue.clue-shimmer,
[data-reduced-motion="on"] .headline.urgency,
[data-reduced-motion="on"] .headline.shake,
[data-reduced-motion="on"] .headline .hl-leader::after,
[data-reduced-motion="on"] .voice-strand .voice-line,
[data-reduced-motion="on"] .arc-fg,
[data-reduced-motion="on"] .reveal-burst .spark {
  animation: none !important;
  transition: none !important;
}

/* Responsive ------------------------------------------------- */
@media (max-width: 640px) {
  .status-rail {
    grid-template-columns: 48px minmax(0, 1fr) 48px;
    gap: .5rem;
  }
  .arc-dial { width: 48px; height: 48px; }
  .arc-glyph { font-size: .95rem; }
  .arc-ticks { inset-block-start: -7px; gap: 2px; }
  .arc-tick { width: 3px; height: 3px; }
  .headline { min-height: 2.6rem; padding: .35rem .5rem; }
  .voice-strand .voice-line { font-size: .78rem; }
}
@media (max-width: 360px) {
  .arc-ticks { display: none; }
  .arc-dial .arc-overflow {
    position: absolute; inset-block-start: -6px; inset-inline-start: 50%;
    transform: translateX(-50%);
  }
}
```

Append (at the very bottom of the file, near the other `contain:` rules):

```css
.status-strip { contain: layout style; }
```

- [ ] **Step 8.4: Build verification**

Run: `npm run lint`
Expected: PASS — no orphaned selectors, no parse errors.

Run: `npm run build`
Expected: PASS — Next 16 / Turbopack build completes; no missing-class warnings.

- [ ] **Step 8.5: Commit**

```bash
git add src/app/game.css
git commit -m "feat(css): status zone rewrite for Pulse (arcs, headline, voice strand)"
```

---

## Task 9: Delete superseded components

**Files:**
- Delete: `src/components/game/TurnCapsule.tsx`
- Delete: `src/components/game/PoeticCapsule.tsx`

- [ ] **Step 9.1: Verify nothing still imports them**

Run: `grep -rn "from \"@/components/game/TurnCapsule\"\|from \"@/components/game/PoeticCapsule\"\|from \"./TurnCapsule\"\|from \"./PoeticCapsule\"" src/ tests/`
Expected: NO matches.

If any match exists, fix the importing file first (most likely a leftover in `StatusStrip.tsx` if Task 6 wasn't completed cleanly).

- [ ] **Step 9.2: Delete the files**

Run: `rm src/components/game/TurnCapsule.tsx src/components/game/PoeticCapsule.tsx`

- [ ] **Step 9.3: Type-check + build**

Run: `npx tsc --noEmit && npm run build`
Expected: PASS — no missing module errors.

- [ ] **Step 9.4: Commit**

```bash
git add -A src/components/game/
git commit -m "refactor(game): remove TurnCapsule + PoeticCapsule (superseded by Pulse)"
```

---

## Task 10: Full verification + visual smoke

**Files:** none (verification only)

- [ ] **Step 10.1: Lint**

Run: `npm run lint`
Expected: PASS.

- [ ] **Step 10.2: Tests + coverage**

Run: `npm test -- --coverage`
Expected: PASS for all suites. Coverage thresholds in `vitest.config.ts` (80% lines / functions / branches / statements on `src/lib/**`) hold.

- [ ] **Step 10.3: Type-check**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 10.4: Build**

Run: `npm run build`
Expected: PASS — Next.js + tsup server build both succeed.

- [ ] **Step 10.5: Visual smoke check on dev server**

Run: `npm run dev`

Then in a browser, manually verify each moment state in a host-mode game (single device):

1. Create a host game; deal a board.
2. **`awaiting-clue`**: in the leader phase, the rail shows "في انتظار التلميحة من [leader]" with a pulsing team-color underline on the leader's name. Both arcs render with correct fill ratios (red: 9/9 full, blue: 8/8 full). Active team's arc is bright; inactive is dimmed.
3. **`clue-given`**: submit a clue (e.g. "بحر 3"). The rail switches to clue + count chip + "تبقّى N".
4. **`reveal-burst`**: reveal a card of the active team's color. A brief particle burst fires behind the headline; the active arc decrements by 1/total with a smooth tween.
5. **`urgency`**: wait until ~10s remain on a turn (or shorten the timer config). The headline gains a 1px gold outline + small countdown numeral.
6. **`reveal-burst` (assassin)**: reveal the assassin (use host view to find it). Headline shakes; voice strand picks up the gravity phrase.
7. **`ended`**: complete a game. Headline shows "🏁 فاز [team]"; winner's arc sweeps full.
8. Resize to 390px width and confirm arcs shrink to 48px, headline reflows, no horizontal scroll.

If any state fails to render correctly, capture the failure in a follow-up bugfix task — do not paper over with a placeholder.

- [ ] **Step 10.6: Final commit (if any docs touched during smoke)**

If steps 10.1–10.5 surface minor doc or comment fixes, commit them with:

```bash
git add -u
git commit -m "chore(game): final polish from Pulse smoke check"
```

---

## Self-review (run after writing the plan)

Author: re-read the plan with fresh eyes against the spec.

- ✅ **Spec coverage:**
  - §2.1 five moment states → Task 4 (Headline) + Task 2 (capsule phrases) + Task 8 (CSS classes).
  - §2.2 arc dial → Task 3.
  - §2.3 morphing headline → Task 4 + Task 8 keyframes.
  - §2.4 voice strand → Task 5 + Task 2 phrase buckets.
  - §2.5 responsive recomposition → Task 8 media queries.
  - §2.6 last-event extractor → Task 1 (delivered via extension to existing logParser).
  - §3 accessibility → ARIA labels in Tasks 3 / 4 / 5; `prefers-reduced-motion` block in Task 8; `[data-palette="colorblind"]` left to existing tokens (no new arc-specific overrides needed because `--red` / `--blue` already cascade through the palette swap).
  - §4 files touched → all 7 modifications + 3 new files + 2 deletions tracked across the 10 tasks.
  - §5 out of scope → server, game logic, socket types, BoardStage, ActionDock, HistoryTape, WinModal: not touched by any task.
  - §6 acceptance criteria → verified in Task 10.

- ✅ **Placeholder scan:** no `TBD` / `TODO` / "fill in details" / "similar to" remain. All code blocks contain complete code, all commands have exact paths and expected outputs.

- ✅ **Type consistency:** `LogEvent` / `CapsuleLastEvent` / `Moment` / `Team` references match across Tasks 1, 2, 4, 5. `lastEventOf` signature `(log, teamNames) => LogEvent | null` is identical at definition site (Task 1) and consumer (Task 7).
