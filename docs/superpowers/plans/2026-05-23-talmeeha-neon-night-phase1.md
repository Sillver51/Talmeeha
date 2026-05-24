# Talmeeha 2.0 — Neon Night Phase 1 (Part 1: Fair · Accessible · Beautiful Core) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the existing Next.js Talmeeha game fair-by-construction (the server stops leaking the key to guessers), accessible (colorblind palette, reduced-motion, Eastern/Western digits), and visually upgraded to the Neon Night design system — without changing any game rules beyond the deliberate "leaders see the full key" improvement.

**Architecture:** A new pure `projectStateFor(room, viewerId)` function in `src/lib/game/` produces a per-viewer `PlayerView` (unrevealed card types become `"hidden"` for non-key-holders). The Socket.io server replaces its single `io.to(code).emit("state", room)` broadcast with a per-socket projected emit (`io.in(code).fetchSockets()` → `projectStateFor`). The client renders a `PlayerView` everywhere `GameState` was rendered. A Zustand `prefsStore` persists accessibility prefs and applies them as `data-*` attributes on `<html>`; CSS keys all Neon Night theming/colorblind/reduced-motion off those attributes.

**Tech Stack:** Next.js 16 (App Router, Turbopack), React 19, TypeScript (strict, `noUncheckedIndexedAccess`), Socket.io 4, Zustand 5, Zod 3, Vitest 2, Playwright (MCP). No new runtime dependencies in Part 1.

**Environment gotchas (this repo, WSL `/mnt/d`):**
- Prefer `node_modules/.bin/<tool>` over `npx`. If a tool reports "Cannot find module", run `npm install` to restore `node_modules/.bin/*` symlinks, then retry.
- The dev server does **not** hot-reload on `/mnt/d`. After changing server/client code, restart `npm run dev` before any Playwright check. First request compiles slowly (~7s); `next` prepare can take 30–60s before `/healthz` returns `ok`.
- `server.js` and `public/index.html` show as git-modified from CRLF↔LF noise — **never stage them**. They are legacy parity reference only.
- Authority for type-correctness is `node_modules/.bin/tsc --noEmit` (exit 0). Ignore editor/LSP `@/...` "Cannot find module" diagnostics.

**Verification commands (used throughout):**
```bash
node_modules/.bin/tsc --noEmit            # types (must be exit 0)
node_modules/.bin/vitest run              # unit + integration (must be all-green)
npm run build                             # Turbopack production build (must succeed)
```

---

## File Structure

| File | Responsibility | Action |
|---|---|---|
| `src/lib/types/index.ts` | Shared socket/game types | Modify (add `VisibleCardType`, `ViewCard`, `RemainingCounts`, `PlayerView`; retype `state` event) |
| `src/lib/game/projection.ts` | Pure role-filtered projection | Create |
| `src/lib/game/index.ts` | Engine barrel | Modify (export projection) |
| `tests/lib/game/projection.test.ts` | Projection unit tests | Create |
| `server/emit.ts` | Per-socket projected `state` broadcaster | Create |
| `server/handlers/{host,online,teams,play,lifecycle}.ts` | Thin socket handlers | Modify (swap broadcast → `broadcastState`) |
| `tests/server/handlers.test.ts` | Server integration tests | Modify (retype helpers; add leak-regression tests) |
| `src/store/gameStore.ts` | Client socket store | Modify (`gs: PlayerView`) |
| `src/lib/ui/roles.ts` | Role helpers | Modify (accept `GameState \| PlayerView`) |
| `src/components/game/*`, `src/components/screens/*` | UI | Modify (retype `gs`/`card`; counts; leader full-key; glyphs; digits) |
| `src/lib/i18n/digits.ts` | Eastern/Western digit formatting | Create |
| `tests/lib/i18n/digits.test.ts` | Digit util tests | Create |
| `src/lib/a11y/prefs.ts` | Pure prefs model + data-attr mapping | Create |
| `tests/lib/a11y/prefs.test.ts` | Prefs model tests | Create |
| `src/store/prefsStore.ts` | Zustand prefs store (persist + apply) | Create |
| `src/components/a11y/PrefsEffect.tsx` | Hydrate + apply prefs on mount | Create |
| `src/components/a11y/SettingsSheet.tsx` | Accessibility settings UI | Create |
| `src/components/brand/TeamGlyph.tsx` | Color-independent team glyph (▲ / ⬣) | Create |
| `src/app/page.tsx` | Screen orchestrator | Modify (mount `PrefsEffect`, settings entry) |
| `src/app/globals.css` | Tokens + Neon Night + glass + glyph + colorblind + motion | Modify |

---

## GROUP 1 — Role-Filtered State (the security fix)

### Task 1: `PlayerView` types + pure `projectStateFor`

**Files:**
- Modify: `src/lib/types/index.ts`
- Create: `src/lib/game/projection.ts`
- Modify: `src/lib/game/index.ts`
- Test: `tests/lib/game/projection.test.ts`

- [ ] **Step 1: Add the view types** (additive — does not yet change the `state` event signature, so the build stays green).

In `src/lib/types/index.ts`, after the `CardType` line (currently `export type CardType = Team | "neutral" | "assassin";`) add:

```typescript
/** A card type as seen by a viewer: real type, or "hidden" when the viewer may not see the key. */
export type VisibleCardType = CardType | "hidden";

/** A board card in a projected, per-viewer view. */
export interface ViewCard { w: string; t: VisibleCardType; rv: boolean; }

/** Public remaining (unrevealed) counts — safe to show everyone. */
export interface RemainingCounts { red: number; blue: number; neutral: number; }

/** What a single client receives: the room state with a role-filtered board + public counts. */
export interface PlayerView extends Omit<GameState, "board"> {
  board: ViewCard[];
  counts: RemainingCounts;
}
```

- [ ] **Step 2: Write the failing projection test.**

Create `tests/lib/game/projection.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { projectStateFor, viewerCanSeeKey } from "@/lib/game";
import type { Card, GameState } from "@/lib/types";

function board(): Card[] {
  return [
    { w: "أسد", t: "red", rv: false },
    { w: "بحر", t: "blue", rv: false },
    { w: "قمر", t: "neutral", rv: false },
    { w: "قاتل", t: "assassin", rv: false },
    { w: "نار", t: "red", rv: true }, // revealed
  ];
}

function gs(overrides: Partial<GameState> = {}): GameState {
  return {
    code: "1234", phase: "playing", hostMode: false,
    board: board(), turn: "red", clue: null, gleft: 0, gphase: false, winner: null,
    teams: { red: ["L_RED", "G_RED"], blue: ["L_BLUE", "G_BLUE"] },
    leaders: { red: "L_RED", blue: "L_BLUE" },
    teamNames: { red: "الأحمر", blue: "الأزرق" },
    players: {
      L_RED: { id: "L_RED", name: "قائد أحمر", team: "red" },
      G_RED: { id: "G_RED", name: "لاعب أحمر", team: "red" },
      L_BLUE: { id: "L_BLUE", name: "قائد أزرق", team: "blue" },
      G_BLUE: { id: "G_BLUE", name: "لاعب أزرق", team: "blue" },
    },
    doubts: {}, wins: { red: 0, blue: 0 }, sRed: 2, sBlue: 1, log: [],
    ...overrides,
  };
}

describe("viewerCanSeeKey", () => {
  it("a team leader can see the key", () => {
    expect(viewerCanSeeKey(gs(), "L_RED")).toBe(true);
    expect(viewerCanSeeKey(gs(), "L_BLUE")).toBe(true);
  });
  it("a guesser cannot see the key", () => {
    expect(viewerCanSeeKey(gs(), "G_RED")).toBe(false);
  });
  it("an unknown or null viewer cannot see the key", () => {
    expect(viewerCanSeeKey(gs(), null)).toBe(false);
    expect(viewerCanSeeKey(gs(), "ghost")).toBe(false);
  });
  it("in host mode only the host socket sees the key", () => {
    const room = gs({ hostMode: true, hostSocketId: "HOST" });
    expect(viewerCanSeeKey(room, "HOST")).toBe(true);
    expect(viewerCanSeeKey(room, "L_RED")).toBe(false);
  });
});

describe("projectStateFor", () => {
  it("hides every unrevealed card's type from a guesser", () => {
    const view = projectStateFor(gs(), "G_RED");
    const unrevealed = view.board.filter((c) => !c.rv);
    expect(unrevealed).toHaveLength(4);
    expect(unrevealed.every((c) => c.t === "hidden")).toBe(true);
  });
  it("still reveals revealed cards' real type to a guesser", () => {
    const view = projectStateFor(gs(), "G_RED");
    expect(view.board.find((c) => c.rv)!.t).toBe("red");
  });
  it("gives a leader the full key", () => {
    const view = projectStateFor(gs(), "L_RED");
    expect(view.board.map((c) => c.t)).toEqual(["red", "blue", "neutral", "assassin", "red"]);
  });
  it("preserves every word for everyone", () => {
    const view = projectStateFor(gs(), "G_RED");
    expect(view.board.map((c) => c.w)).toEqual(["أسد", "بحر", "قمر", "قاتل", "نار"]);
  });
  it("computes public remaining counts from the true board", () => {
    expect(projectStateFor(gs(), "G_RED").counts).toEqual({ red: 1, blue: 1, neutral: 1 });
  });
  it("does not mutate the source room", () => {
    const room = gs();
    const snapshot = JSON.stringify(room);
    projectStateFor(room, "G_RED");
    expect(JSON.stringify(room)).toBe(snapshot);
  });
});
```

- [ ] **Step 3: Run the test — verify it FAILS.**

Run: `node_modules/.bin/vitest run tests/lib/game/projection.test.ts`
Expected: FAIL — `projectStateFor` / `viewerCanSeeKey` are not exported.

- [ ] **Step 4: Implement the projection.**

Create `src/lib/game/projection.ts`:

```typescript
import type { GameState, PlayerView, RemainingCounts, ViewCard } from "@/lib/types";

/**
 * Whether a viewer is allowed to see the full key (every unrevealed card's true type).
 * - Online: a leader of either team (standard Codenames — the full key, a deliberate
 *   improvement over the legacy own-team-only view).
 * - Host (pass-and-play): only the single host socket; the client gates display via host-view.
 * - Everyone else (guessers, spectators): no.
 */
export function viewerCanSeeKey(room: GameState, viewerId: string | null): boolean {
  if (!viewerId) return false;
  if (room.hostMode) return room.hostSocketId === viewerId;
  return room.leaders.red === viewerId || room.leaders.blue === viewerId;
}

/** Public remaining (unrevealed) counts — safe to show all viewers. */
function remainingCounts(room: GameState): RemainingCounts {
  let red = 0, blue = 0, neutral = 0;
  for (const c of room.board) {
    if (c.rv) continue;
    if (c.t === "red") red++;
    else if (c.t === "blue") blue++;
    else if (c.t === "neutral") neutral++;
  }
  return { red, blue, neutral };
}

/**
 * Project the authoritative room into a per-viewer PlayerView.
 * Revealed cards always carry their real type. Unrevealed cards carry their real type
 * ONLY for a key-holder; otherwise the type is replaced with "hidden". Pure + immutable.
 */
export function projectStateFor(room: GameState, viewerId: string | null): PlayerView {
  const seeKey = viewerCanSeeKey(room, viewerId);
  const board: ViewCard[] = room.board.map((c) =>
    c.rv || seeKey ? { w: c.w, t: c.t, rv: c.rv } : { w: c.w, t: "hidden", rv: false },
  );
  return { ...room, board, counts: remainingCounts(room) };
}
```

- [ ] **Step 5: Export from the engine barrel.**

In `src/lib/game/index.ts`, append:

```typescript
export * from "./projection";
```

- [ ] **Step 6: Run the test — verify it PASSES, and types are clean.**

Run: `node_modules/.bin/vitest run tests/lib/game/projection.test.ts && node_modules/.bin/tsc --noEmit`
Expected: projection tests PASS; tsc exits 0.

- [ ] **Step 7: Commit.**

```bash
git add src/lib/types/index.ts src/lib/game/projection.ts src/lib/game/index.ts tests/lib/game/projection.test.ts
git commit -m "feat(game): pure projectStateFor role-filtered view (security)"
```

---

### Task 2: Per-socket projected `state` broadcaster

**Files:**
- Create: `server/emit.ts`

- [ ] **Step 1: Create the broadcaster.**

Create `server/emit.ts`:

```typescript
import type { Server } from "socket.io";
import type { ClientToServerEvents, ServerToClientEvents } from "@/lib/types";
import { projectStateFor } from "@/lib/game";
import { store } from "./rooms";

/**
 * Emit the role-filtered PlayerView to every socket in a room. Replaces the legacy
 * single `io.to(code).emit("state", room)` broadcast: each connected socket receives a
 * view projected for its own id (playerId === socket.id throughout this app), so guessers
 * never receive an unrevealed card's true type. Reads the freshest room from the store.
 */
export async function broadcastState(
  io: Server<ClientToServerEvents, ServerToClientEvents>,
  code: string,
): Promise<void> {
  const room = store.get(code);
  if (!room) return;
  const sockets = await io.in(code).fetchSockets();
  for (const s of sockets) {
    s.emit("state", projectStateFor(room, s.id));
  }
}
```

- [ ] **Step 2: Type-check.**

Run: `node_modules/.bin/tsc --noEmit`
Expected: exit 0. (`broadcastState` is not yet referenced — this only adds a file.)

- [ ] **Step 3: Commit.**

```bash
git add server/emit.ts
git commit -m "feat(server): per-socket projected state broadcaster"
```

---

### Task 3: Wire the projected broadcast into every handler + retype the `state` event

**Files:**
- Modify: `src/lib/types/index.ts`
- Modify: `server/handlers/host.ts`, `server/handlers/online.ts`, `server/handlers/teams.ts`, `server/handlers/play.ts`, `server/handlers/lifecycle.ts`
- Modify: `tests/server/handlers.test.ts` (helper retype only)

- [ ] **Step 1: Retype the `state` event to deliver a `PlayerView`.**

In `src/lib/types/index.ts`, change the `ServerToClientEvents` interface so `state` carries a `PlayerView`:

```typescript
export interface ServerToClientEvents {
  state: (s: PlayerView) => void;
  joined: (p: Joined) => void;
  error: (msg: string) => void;
}
```

- [ ] **Step 2: Replace each broadcast with `broadcastState` (host handler).**

In `server/handlers/host.ts`: add the import near the other imports —
```typescript
import { broadcastState } from "../emit";
```
Then replace the final broadcast line:
```typescript
    io.to(code).emit("state", room);
```
with:
```typescript
    void broadcastState(io, code);
```

- [ ] **Step 3: Replace broadcasts in `online.ts`.**

In `server/handlers/online.ts`: add `import { broadcastState } from "../emit";`. Replace **both** occurrences of:
```typescript
    io.to(code).emit("state", room);
```
and
```typescript
    io.to(code).emit("state", next);
```
each with:
```typescript
    void broadcastState(io, code);
```

- [ ] **Step 4: Replace broadcasts in `teams.ts`.**

In `server/handlers/teams.ts`: add `import { broadcastState } from "../emit";`. Replace both `io.to(code).emit("state", next);` lines with `void broadcastState(io, code);`.

- [ ] **Step 5: Replace broadcasts in `play.ts`.**

In `server/handlers/play.ts`: add `import { broadcastState } from "../emit";`. Replace all four `io.to(code).emit("state", next);` lines (submit_clue, guess_card, toggle_doubt, end_turn) with `void broadcastState(io, code);`.

- [ ] **Step 6: Replace broadcasts in `lifecycle.ts`.**

In `server/handlers/lifecycle.ts`: add `import { broadcastState } from "../emit";`. Replace all three `io.to(code).emit("state", next);` lines (start_game, restart, disconnect) with `void broadcastState(io, code);`.

- [ ] **Step 7: Retype the integration-test helpers to `PlayerView`** (the `state` event now delivers `PlayerView`; the helpers still only read shared fields, so existing assertions keep working).

In `tests/server/handlers.test.ts`:
- Add `PlayerView` to the type import:
```typescript
import type {
  ClientToServerEvents,
  GameState,
  PlayerView,
  ServerToClientEvents,
  Team,
} from "@/lib/types";
```
- Change the `next` helper return type from `Promise<GameState>` to `Promise<PlayerView>`:
```typescript
const next = (s: Socket, ev: string): Promise<PlayerView> =>
  new Promise((res) => s.once(ev, res));
```
- Change `waitForState` to use `PlayerView`:
```typescript
function waitForState(s: Socket, pred: (st: PlayerView) => boolean): Promise<PlayerView> {
  return new Promise((res) => {
    const handler = (st: PlayerView) => {
      if (pred(st)) {
        s.off("state", handler);
        res(st);
      }
    };
    s.on("state", handler);
  });
}
```
- Change `teamsReady`'s parameter type:
```typescript
const teamsReady = (st: PlayerView): boolean =>
```
- Change `startOnlineGame`'s return type annotation `state: GameState` → `state: PlayerView`:
```typescript
async function startOnlineGame(): Promise<{
  code: string;
  state: PlayerView;
  host: Socket;
  guest: Socket;
  redMember: Socket;
  blueMember: Socket;
}> {
```
(`GameState` stays imported — `gsFactory`-style usage in other tests still needs it; leave the import.)

- [ ] **Step 8: Type-check + run the full server suite.**

Run: `node_modules/.bin/tsc --noEmit && node_modules/.bin/vitest run tests/server/handlers.test.ts`
Expected: tsc exit 0; all existing handler tests PASS. (The `host`/`guest` sockets in `startOnlineGame` are the team **leaders**, so their projected views carry the full key — every existing assertion that reads `state.board` keeps seeing real card types.)

- [ ] **Step 9: Commit.**

```bash
git add src/lib/types/index.ts server/handlers tests/server/handlers.test.ts
git commit -m "feat(server): emit role-filtered PlayerView per socket"
```

---

### Task 4: Regression tests — the key never leaks to a guesser

**Files:**
- Modify: `tests/server/handlers.test.ts`

- [ ] **Step 1: Write the leak-regression tests.**

Append this `describe` block to `tests/server/handlers.test.ts` (after the `play flow` block):

```typescript
describe("role-filtered state (security regression)", () => {
  it("never sends an unrevealed card's real type to a guesser", async () => {
    const { host, guest, redMember, blueMember } = await startOnlineGame();
    // redMember is a guesser (red team, not leader). Wait for its projected playing view.
    const view = await waitForState(
      redMember,
      (st) => st.phase === "playing" && st.board.length === 25,
    );
    const leaked = view.board.filter((c) => !c.rv && c.t !== "hidden");
    expect(leaked).toHaveLength(0);
    // Counts are still public so the UI can render remaining tallies.
    expect(view.counts.red + view.counts.blue + view.counts.neutral).toBeGreaterThan(0);
    [host, guest, redMember, blueMember].forEach((s) => s.close());
  });

  it("sends the full key (no hidden cards) to a leader", async () => {
    const { host, guest, redMember, blueMember } = await startOnlineGame();
    // host is the red leader.
    const view = await waitForState(
      host,
      (st) => st.phase === "playing" && st.board.length === 25,
    );
    expect(view.board.some((c) => c.t === "hidden")).toBe(false);
    expect(view.board.some((c) => c.t === "assassin")).toBe(true);
    [host, guest, redMember, blueMember].forEach((s) => s.close());
  });
});
```

- [ ] **Step 2: Run — verify PASS.**

Run: `node_modules/.bin/vitest run tests/server/handlers.test.ts`
Expected: all PASS, including the two new regression tests.

- [ ] **Step 3: Commit.**

```bash
git add tests/server/handlers.test.ts
git commit -m "test(server): assert guessers never receive the key (leak regression)"
```

---

## GROUP 2 — Client renders the `PlayerView`

### Task 5: Migrate the client store + role helpers + component prop types to `PlayerView`

**Files:**
- Modify: `src/store/gameStore.ts`
- Modify: `src/lib/ui/roles.ts`
- Modify: `src/components/screens/GameScreen.tsx`, `src/components/game/GameHeader.tsx`, `src/components/game/CluePanel.tsx`, `src/components/game/LeaderPanel.tsx`, `src/components/game/Board.tsx`

- [ ] **Step 1: Store holds a `PlayerView`.**

In `src/store/gameStore.ts`:
- Change the type import to include `PlayerView` and drop unused `GameState` if the compiler flags it (keep `Team`):
```typescript
import type {
  ClientToServerEvents,
  PlayerView,
  ServerToClientEvents,
  Team,
} from "@/lib/types";
```
- Change the store field type:
```typescript
  gs: PlayerView | null;
```
- The `socket.on("state", (state) => { ... })` handler needs no logic change (it reads `state.phase`, `state.wins`, `state.teamNames` — all present on `PlayerView`).

- [ ] **Step 2: Role helpers accept either shape.**

In `src/lib/ui/roles.ts`, change the type import and the four exported signatures so they accept the authoritative `GameState` (used by unit tests) **or** a client `PlayerView`:
```typescript
import type { GameState, HostTeam, PlayerView, Team } from "@/lib/types";

type GameView = GameState | PlayerView;
```
Then change each signature:
- `export function myRole(gs: GameView | null, myId: string | null, isHost: boolean): Role {`
- `export function myTurn(gs: GameView | null, myId: string | null): boolean {`
- `function htd(gs: GameView, team: Team): HostTeam | undefined {`
- `export function hLeader(gs: GameView): string {`
- `export function hGuesser(gs: GameView): string {`

(No body changes — these only read `players`, `leaders`, `turn`, `hRed`, `hBlue`, all common to both types.)

- [ ] **Step 3: Retype the components that receive `gs` and don't touch `board` types directly.**

For each file below, change the prop interface field `gs: GameState;` → `gs: PlayerView;`, and update the `import type { GameState ... }` to `import type { PlayerView ... }` (keeping any other named imports like `Team`):

- `src/components/screens/GameScreen.tsx` — it reads `gs.board.length` and `gs.players[...]` (both fine on `PlayerView`). It pulls `gs` from the store (already `PlayerView` after Step 1), so just confirm no `GameState` import remains unused.
- `src/components/game/GameHeader.tsx` — `interface GameHeaderProps { gs: PlayerView; ... }`; import `PlayerView`.
- `src/components/game/CluePanel.tsx` — `interface CluePanelProps { gs: PlayerView; }`; import `PlayerView`.
- `src/components/game/LeaderPanel.tsx` — `interface LeaderPanelProps { gs: PlayerView; isHost: boolean; }`; import `PlayerView`.
- `src/components/game/Board.tsx` — `interface BoardProps { gs: PlayerView; role: Role; myId: string | null; myTeam: Team | null; isMyTurn: boolean; }`; change import to `import type { PlayerView, Team } from "@/lib/types";`.
- `src/components/screens/WinModal.tsx` — `interface WinModalProps { gs: PlayerView; }`; change import to `import type { PlayerView, Team } from "@/lib/types";`. It reads `gs.board.some((c) => c.t === "assassin" && c.rv)` (a revealed card carries its real type, so this still works) and `gs.winner` / `gs.teamNames`.

- [ ] **Step 4: Type-check.**

Run: `node_modules/.bin/tsc --noEmit`
Expected: errors remain only in `WordCard.tsx` (board cell type) and `Counters.tsx` (board filtering) — fixed in Tasks 6–7. If errors appear elsewhere, retype that file's `gs` prop to `PlayerView` the same way.

- [ ] **Step 5: Commit.**

```bash
git add src/store/gameStore.ts src/lib/ui/roles.ts src/components/screens/GameScreen.tsx src/components/game/GameHeader.tsx src/components/game/CluePanel.tsx src/components/game/LeaderPanel.tsx src/components/game/Board.tsx src/components/screens/WinModal.tsx
git commit -m "refactor(client): render PlayerView (role-filtered state)"
```

---

### Task 6: Counters read public counts (not the board)

**Files:**
- Modify: `src/components/game/Counters.tsx`

> Rationale: a guesser's board now has `t: "hidden"` for unrevealed cards, so `board.filter(c => c.t === "red" && !c.rv)` would read `0`. The server-provided `gs.counts` carries the true remaining tallies for everyone.

- [ ] **Step 1: Swap board-derived counts for `gs.counts`.**

In `src/components/game/Counters.tsx`:
- Change the import to `PlayerView`:
```typescript
import type { PlayerView } from "@/lib/types";
```
- Change the prop interface:
```typescript
interface CountersProps {
  gs: PlayerView;
}
```
- Replace the three `const rem* = gs.board.filter(...)` lines with:
```typescript
  const remR = gs.counts.red;
  const remB = gs.counts.blue;
  const remN = gs.counts.neutral;
```

- [ ] **Step 2: Type-check.**

Run: `node_modules/.bin/tsc --noEmit`
Expected: `Counters.tsx` errors gone; only `WordCard.tsx` remains.

- [ ] **Step 3: Commit.**

```bash
git add src/components/game/Counters.tsx
git commit -m "fix(ui): counters use server counts (works for guessers)"
```

---

### Task 7: WordCard handles `"hidden"` + renders the full key for leaders

**Files:**
- Modify: `src/components/game/WordCard.tsx`

> Behaviour change: a leader now sees the **full** key (red/blue/neutral/assassin), not just their own team + assassin. A guesser's unrevealed cards are `"hidden"` and render as plain (glass) tiles.

- [ ] **Step 1: Retype the card and rewrite the unrevealed class logic.**

In `src/components/game/WordCard.tsx`:
- Change the type import:
```typescript
import type { MouseEvent } from "react";
import type { PlayerView, Team, ViewCard } from "@/lib/types";
import type { Role } from "@/lib/ui/roles";
```
- Change the prop types: `card: Card;` → `card: ViewCard;` and `phase: GameState["phase"];` → `phase: PlayerView["phase"];`.
- Replace the class-building block (the `let className = "wc"; ... if (dCount > 0) ...` section) with:

```typescript
  let className = "wc";
  if (isHost) {
    // Host (pass-and-play) receives the full key; client gates display via host-view / pre-guess.
    if ((hostViewLeader || !gphase) && card.t !== "hidden") className += ` hv-${card.t}`;
  } else if (isLeader) {
    // Online leader sees the full key: tint EVERY unrevealed card by its true type.
    if (card.t !== "hidden") className += ` h-${card.t}`;
  }
  if (dCount > 0) className += " doubted";
```

(The `myTeam` prop is now unused by the class logic but is still passed for guesser turn checks elsewhere; leave the prop in place. If tsc flags `myTeam` as unused, prefix it `_myTeam` in the destructure **only if** it is genuinely unreferenced — verify first.)

- [ ] **Step 2: Type-check.**

Run: `node_modules/.bin/tsc --noEmit`
Expected: exit 0 (whole project clean).

- [ ] **Step 3: Run the full unit + integration suite (no regressions).**

Run: `node_modules/.bin/vitest run`
Expected: all green (the original 54 + projection + 2 regression tests).

- [ ] **Step 4: Commit.**

```bash
git add src/components/game/WordCard.tsx
git commit -m "feat(ui): leaders see full key; guesser tiles render hidden"
```

---

## GROUP 3 — Accessibility foundation

### Task 8: Eastern/Western digit formatting util

**Files:**
- Create: `src/lib/i18n/digits.ts`
- Test: `tests/lib/i18n/digits.test.ts`

- [ ] **Step 1: Write the failing test.**

Create `tests/lib/i18n/digits.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { toEasternDigits, formatNumber, formatDigits } from "@/lib/i18n/digits";

describe("toEasternDigits", () => {
  it("maps western to eastern arabic digits", () => {
    expect(toEasternDigits("0123456789")).toBe("٠١٢٣٤٥٦٧٨٩");
  });
  it("leaves non-digit characters untouched", () => {
    expect(toEasternDigits("رمز 1234")).toBe("رمز ١٢٣٤");
  });
});

describe("formatNumber", () => {
  it("western style returns plain digits", () => {
    expect(formatNumber(42, "western")).toBe("42");
  });
  it("eastern style converts", () => {
    expect(formatNumber(42, "eastern")).toBe("٤٢");
  });
});

describe("formatDigits", () => {
  it("converts embedded digits for eastern", () => {
    expect(formatDigits("تبقّى 2 تخمينات", "eastern")).toBe("تبقّى ٢ تخمينات");
  });
  it("passes a string through unchanged for western", () => {
    expect(formatDigits("تبقّى 2 تخمينات", "western")).toBe("تبقّى 2 تخمينات");
  });
});
```

- [ ] **Step 2: Run — verify it FAILS.**

Run: `node_modules/.bin/vitest run tests/lib/i18n/digits.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement.**

Create `src/lib/i18n/digits.ts`:

```typescript
export type DigitStyle = "western" | "eastern";

const EASTERN = ["٠", "١", "٢", "٣", "٤", "٥", "٦", "٧", "٨", "٩"] as const;

/** Replace ASCII digits in a string with Eastern-Arabic digits. */
export function toEasternDigits(input: string): string {
  return input.replace(/[0-9]/g, (d) => EASTERN[Number(d)]!);
}

/** Format a number per the chosen digit style. */
export function formatNumber(n: number, style: DigitStyle): string {
  const s = String(n);
  return style === "eastern" ? toEasternDigits(s) : s;
}

/** Format any string's embedded digits per the chosen style. */
export function formatDigits(input: string, style: DigitStyle): string {
  return style === "eastern" ? toEasternDigits(input) : input;
}
```

- [ ] **Step 4: Run — verify PASS.**

Run: `node_modules/.bin/vitest run tests/lib/i18n/digits.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit.**

```bash
git add src/lib/i18n/digits.ts tests/lib/i18n/digits.test.ts
git commit -m "feat(i18n): eastern/western digit formatting"
```

---

### Task 9: Pure prefs model (palette · reduced-motion · digits · sound)

**Files:**
- Create: `src/lib/a11y/prefs.ts`
- Test: `tests/lib/a11y/prefs.test.ts`

- [ ] **Step 1: Write the failing test.**

Create `tests/lib/a11y/prefs.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { DEFAULT_PREFS, mergePrefs, prefsDataAttributes, type Prefs } from "@/lib/a11y/prefs";

describe("DEFAULT_PREFS", () => {
  it("defaults to an accessible, non-surprising baseline", () => {
    expect(DEFAULT_PREFS).toEqual({
      palette: "default",
      reducedMotion: "system",
      digits: "western",
      sound: true,
    });
  });
});

describe("mergePrefs", () => {
  it("overlays a partial patch onto a base", () => {
    const next = mergePrefs(DEFAULT_PREFS, { palette: "colorblind", digits: "eastern" });
    expect(next.palette).toBe("colorblind");
    expect(next.digits).toBe("eastern");
    expect(next.sound).toBe(true);
  });
  it("does not mutate the base", () => {
    const base: Prefs = { ...DEFAULT_PREFS };
    mergePrefs(base, { sound: false });
    expect(base.sound).toBe(true);
  });
});

describe("prefsDataAttributes", () => {
  it("maps prefs to the html data-* attributes CSS keys off", () => {
    expect(
      prefsDataAttributes({
        palette: "colorblind",
        reducedMotion: "on",
        digits: "eastern",
        sound: false,
      }),
    ).toEqual({
      "data-palette": "colorblind",
      "data-reduced-motion": "on",
      "data-digits": "eastern",
    });
  });
});
```

- [ ] **Step 2: Run — verify it FAILS.**

Run: `node_modules/.bin/vitest run tests/lib/a11y/prefs.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement.**

Create `src/lib/a11y/prefs.ts`:

```typescript
import type { DigitStyle } from "@/lib/i18n/digits";

export type Palette = "default" | "colorblind";
export type ReducedMotion = "system" | "on" | "off";

export interface Prefs {
  palette: Palette;
  reducedMotion: ReducedMotion;
  digits: DigitStyle;
  sound: boolean;
}

export const DEFAULT_PREFS: Prefs = {
  palette: "default",
  reducedMotion: "system",
  digits: "western",
  sound: true,
};

/** Immutable overlay of a partial patch onto a base prefs object. */
export function mergePrefs(base: Prefs, patch: Partial<Prefs>): Prefs {
  return { ...base, ...patch };
}

/** The `<html>` data-* attributes that CSS keys theming/motion off. (`sound` has no CSS hook.) */
export function prefsDataAttributes(p: Prefs): Record<string, string> {
  return {
    "data-palette": p.palette,
    "data-reduced-motion": p.reducedMotion,
    "data-digits": p.digits,
  };
}
```

- [ ] **Step 4: Run — verify PASS.**

Run: `node_modules/.bin/vitest run tests/lib/a11y/prefs.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit.**

```bash
git add src/lib/a11y/prefs.ts tests/lib/a11y/prefs.test.ts
git commit -m "feat(a11y): pure prefs model + data-attr mapping"
```

---

### Task 10: Prefs store + apply-on-mount effect

**Files:**
- Create: `src/store/prefsStore.ts`
- Create: `src/components/a11y/PrefsEffect.tsx`
- Modify: `src/app/page.tsx`

- [ ] **Step 1: Create the Zustand prefs store** (SSR-safe persistence; applies attributes to `<html>`).

Create `src/store/prefsStore.ts`:

```typescript
import { create } from "zustand";
import {
  DEFAULT_PREFS,
  mergePrefs,
  prefsDataAttributes,
  type Prefs,
} from "@/lib/a11y/prefs";

const PREFS_KEY = "talmeeha_prefs";

// SSR-safe storage — never touched at module load / during render.
function loadPrefs(): Prefs {
  if (typeof window === "undefined") return DEFAULT_PREFS;
  try {
    const s = window.localStorage.getItem(PREFS_KEY);
    if (s) return mergePrefs(DEFAULT_PREFS, JSON.parse(s) as Partial<Prefs>);
  } catch {
    // ignore corrupt persisted state
  }
  return DEFAULT_PREFS;
}

function savePrefs(p: Prefs): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(PREFS_KEY, JSON.stringify(p));
  } catch {
    // ignore quota / private-mode errors
  }
}

function applyToDocument(p: Prefs): void {
  if (typeof document === "undefined") return;
  const el = document.documentElement;
  for (const [k, v] of Object.entries(prefsDataAttributes(p))) el.setAttribute(k, v);
}

interface PrefsStore extends Prefs {
  hydrate(): void;
  update<K extends keyof Prefs>(key: K, value: Prefs[K]): void;
}

export const usePrefsStore = create<PrefsStore>((set, get) => ({
  ...DEFAULT_PREFS,
  hydrate() {
    const p = loadPrefs();
    applyToDocument(p);
    set(p);
  },
  update(key, value) {
    const current: Prefs = {
      palette: get().palette,
      reducedMotion: get().reducedMotion,
      digits: get().digits,
      sound: get().sound,
    };
    const next = mergePrefs(current, { [key]: value } as Partial<Prefs>);
    savePrefs(next);
    applyToDocument(next);
    set(next);
  },
}));
```

- [ ] **Step 2: Create the mount effect.**

Create `src/components/a11y/PrefsEffect.tsx`:

```tsx
"use client";

import { useEffect } from "react";
import { usePrefsStore } from "@/store/prefsStore";

/** Hydrates persisted prefs and applies them to <html> on first client mount. */
export default function PrefsEffect() {
  const hydrate = usePrefsStore((s) => s.hydrate);
  useEffect(() => {
    hydrate();
  }, [hydrate]);
  return null;
}
```

- [ ] **Step 3: Mount it in the orchestrator.**

In `src/app/page.tsx`:
- Add the import: `import PrefsEffect from "@/components/a11y/PrefsEffect";`
- Add `<PrefsEffect />` to the returned fragment, alongside `<Toast />`:
```tsx
  return (
    <>
      <PrefsEffect />
      {renderScreen(gs?.phase ?? null, clientScreen)}
      <Toast />
    </>
  );
```

- [ ] **Step 4: Type-check.**

Run: `node_modules/.bin/tsc --noEmit`
Expected: exit 0.

- [ ] **Step 5: Commit.**

```bash
git add src/store/prefsStore.ts src/components/a11y/PrefsEffect.tsx src/app/page.tsx
git commit -m "feat(a11y): prefs store applied as html data-attributes"
```

---

## GROUP 4 — Neon Night design system

### Task 11: Neon Night tokens + glass + colorblind palette + reduced-motion (CSS)

**Files:**
- Modify: `src/app/globals.css`

> All edits are in `:root` / new rules. Keep existing token **names** so dependent rules keep working; only change values + add new tokens and attribute-scoped overrides.

- [ ] **Step 1: Upgrade team tokens to neon + add glass/cyan/gradient tokens.**

In `src/app/globals.css`, in the `:root` block, replace the team color block:
```css
  /* teams */
  --red:    #F04060;
  --red2:   #FF7090;
  --red-bg: rgba(240,64,96,0.12);
  --red-glow: rgba(240,64,96,0.06);

  --blue:    #2D6EFF;
  --blue2:   #6699FF;
  --blue-bg: rgba(45,110,255,0.12);
  --blue-glow: rgba(45,110,255,0.06);
```
with:
```css
  /* teams (Neon Night) */
  --red:    #FF4D8D;
  --red2:   #FF8FB6;
  --red-bg: rgba(255,77,141,0.12);
  --red-glow: rgba(255,77,141,0.08);

  --blue:    #34A8FF;
  --blue2:   #9AD2FF;
  --blue-bg: rgba(52,168,255,0.12);
  --blue-glow: rgba(52,168,255,0.08);
```
Then, immediately after the `--shadow:` line (still inside `:root`), add:
```css
  /* Neon Night additions */
  --cyan: #34E0E0;
  --glass:     rgba(255,255,255,.045);
  --glass-brd: rgba(255,255,255,.10);
  --grad-signature: linear-gradient(90deg, var(--grape) 0%, var(--gold) 50%, var(--cyan) 100%);
```

- [ ] **Step 2: Colorblind palette (Wong) — scoped to `[data-palette="colorblind"]`.**

Append to `globals.css`:
```css
/* ─── COLORBLIND PALETTE (Wong) — toggled via prefs ─── */
[data-palette="colorblind"]{
  --red:    #E69F00;  /* orange */
  --red2:   #F6C453;
  --red-bg: rgba(230,159,0,0.14);
  --red-glow: rgba(230,159,0,0.10);

  --blue:    #0072B2;  /* blue */
  --blue2:   #56A8DE;
  --blue-bg: rgba(0,114,178,0.16);
  --blue-glow: rgba(0,114,178,0.10);
}
```

- [ ] **Step 3: Reduced-motion — honour both the OS setting and the in-app toggle.**

The file already has a `@media (prefers-reduced-motion: reduce)` rule (~line 114). Append an explicit in-app override that kills animation/transition when the user forces it on (and lets `"off"` keep motion even if the OS prefers reduced):
```css
/* ─── REDUCED MOTION (in-app toggle: "on" forces off) ─── */
html[data-reduced-motion="on"] *,
html[data-reduced-motion="on"] *::before,
html[data-reduced-motion="on"] *::after{
  animation: none !important;
  transition: none !important;
  scroll-behavior: auto !important;
}
```

- [ ] **Step 4: Glass unrevealed tiles + leader full-key neutral class.**

Replace the base `.wc` background/hover (sand → glass) and add the missing `h-neutral`. In `globals.css`:

Replace:
```css
.wc{
  background:linear-gradient(145deg,#F5E8C4,#EDD99A);
  color:#1A0E04;
```
with:
```css
.wc{
  background:var(--glass);
  color:var(--text);
  backdrop-filter:blur(6px);
```
Replace:
```css
.wc:hover:not(.rv){
  transform:translateY(-4px) scale(1.04);
  box-shadow:0 10px 28px rgba(0,0,0,.55), inset 0 1px 0 rgba(255,255,255,.3);
  background:linear-gradient(145deg,#FFF0C8,#F5DE9A);
}
```
with:
```css
.wc:hover:not(.rv){
  transform:translateY(-4px) scale(1.04);
  box-shadow:0 10px 28px rgba(0,0,0,.55), 0 0 0 1px var(--glass-brd) inset;
  background:rgba(255,255,255,.08);
}
```
Also update the base border + the `.wc::after` sheen to suit dark glass:
- In `.wc`, change `border:2px solid rgba(0,0,0,0.08);` → `border:1px solid var(--glass-brd);`
- In `.wc`, change `box-shadow:0 4px 12px rgba(0,0,0,.45), inset 0 1px 0 rgba(255,255,255,.3);` → `box-shadow:0 4px 14px rgba(0,0,0,.45), inset 0 1px 0 rgba(255,255,255,.06);`

Then add the leader-key neutral class (mirrors `hv-neutral`) right after the existing `.wc.h-blue { ... }` rule:
```css
.wc.h-neutral{
  background:linear-gradient(145deg,#3A3020,#2C2418);
  border-color:#A08040;
  color:#D4B870;
  font-weight:800;
  text-shadow:0 1px 3px rgba(0,0,0,.5);
}
```

- [ ] **Step 5: Build to confirm CSS compiles.**

Run: `npm run build`
Expected: Turbopack build succeeds (no CSS parse errors).

- [ ] **Step 6: Commit.**

```bash
git add src/app/globals.css
git commit -m "feat(design): Neon Night tokens, glass tiles, colorblind + reduced-motion"
```

---

### Task 12: TeamGlyph component (color-independent identity) + integration

**Files:**
- Create: `src/components/brand/TeamGlyph.tsx`
- Modify: `src/components/game/GameHeader.tsx`, `src/components/game/Counters.tsx`
- Modify: `src/app/globals.css`

- [ ] **Step 1: Create the glyph component.**

Create `src/components/brand/TeamGlyph.tsx`:

```tsx
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
```

- [ ] **Step 2: Style the glyph.**

Append to `src/app/globals.css`:
```css
/* ─── TEAM GLYPH (color-independent identity) ─── */
.team-glyph{
  display:inline-block;
  font-size:.9em;
  line-height:1;
  vertical-align:middle;
  filter:drop-shadow(0 0 4px currentColor);
}
.team-glyph.tg-red{color:var(--red2);}
.team-glyph.tg-blue{color:var(--blue2);}
```

- [ ] **Step 3: Add glyphs to the header score labels.**

In `src/components/game/GameHeader.tsx`:
- Add `import TeamGlyph from "@/components/brand/TeamGlyph";`
- In the red `score-label`, prefix the name with a glyph:
```tsx
        <div className="score-label" id="hdr-red-name">
          <TeamGlyph team="red" /> {gs.teamNames.red}
        </div>
```
- In the blue `score-label`:
```tsx
        <div className="score-label" id="hdr-blue-name">
          <TeamGlyph team="blue" /> {gs.teamNames.blue}
        </div>
```

- [ ] **Step 4: Add glyphs to the counter pills** (so the remaining tally is distinguishable without color).

In `src/components/game/Counters.tsx`:
- Add `import TeamGlyph from "@/components/brand/TeamGlyph";`
- In the red counter pill, after the `dot` span, add the glyph; same for blue:
```tsx
      <div className="counter-pill cp-red">
        <span className="dot dot-red"></span>
        <TeamGlyph team="red" />
        <span id="rem-r">{remR}</span>
      </div>
      <div className="counter-pill cp-blue">
        <span className="dot dot-blue"></span>
        <TeamGlyph team="blue" />
        <span id="rem-b">{remB}</span>
      </div>
```

- [ ] **Step 5: Type-check + build.**

Run: `node_modules/.bin/tsc --noEmit && npm run build`
Expected: tsc exit 0; build succeeds.

- [ ] **Step 6: Commit.**

```bash
git add src/components/brand/TeamGlyph.tsx src/components/game/GameHeader.tsx src/components/game/Counters.tsx src/app/globals.css
git commit -m "feat(a11y): color-independent team glyphs (▲ red / ⬣ blue)"
```

---

### Task 13: Wire digit style into in-game numbers

**Files:**
- Modify: `src/components/game/GameHeader.tsx`, `src/components/game/Counters.tsx`, `src/components/game/CluePanel.tsx`

> Reads `digits` from the prefs store and formats the visible numbers (scores, remaining tallies, clue number, guesses-left) accordingly.

- [ ] **Step 1: Format header scores.**

In `src/components/game/GameHeader.tsx`:
- Add imports:
```typescript
import { usePrefsStore } from "@/store/prefsStore";
import { formatNumber } from "@/lib/i18n/digits";
```
- Inside the component body (after `const tb = turnBox(...)`), read the style and wrap the numbers:
```typescript
  const digits = usePrefsStore((s) => s.digits);
```
- Change `{gs.sRed ?? 9}` → `{formatNumber(gs.sRed ?? 9, digits)}` and `{gs.sBlue ?? 8}` → `{formatNumber(gs.sBlue ?? 8, digits)}`.
- Change `{winsRed} انتصار` → `{formatNumber(winsRed, digits)} انتصار` and the blue equivalent.

- [ ] **Step 2: Format counters.**

In `src/components/game/Counters.tsx`:
- Add the same two imports.
- Add `const digits = usePrefsStore((s) => s.digits);` in the body.
- Wrap each rendered count: `{formatNumber(remR, digits)}`, `{formatNumber(remB, digits)}`, `{formatNumber(remN, digits)}`, and the doubt count `{formatNumber(totalDoubts, digits)}`.

- [ ] **Step 3: Format the clue panel.**

In `src/components/game/CluePanel.tsx`:
- Add the same two imports and `const digits = usePrefsStore((s) => s.digits);`.
- Change `{gs.clue.n}` → `{formatNumber(gs.clue.n, digits)}`.
- Change the guesses-left line to format the count:
```tsx
        {gs.clue && gs.gphase ? `تبقّى ${formatNumber(gs.gleft, digits)} تخمينات` : ""}
```

- [ ] **Step 4: Type-check.**

Run: `node_modules/.bin/tsc --noEmit`
Expected: exit 0.

- [ ] **Step 5: Commit.**

```bash
git add src/components/game/GameHeader.tsx src/components/game/Counters.tsx src/components/game/CluePanel.tsx
git commit -m "feat(a11y): in-game numbers honour eastern/western digit pref"
```

---

### Task 14: Settings sheet (accessibility controls)

**Files:**
- Create: `src/components/a11y/SettingsSheet.tsx`
- Modify: `src/app/globals.css`
- Modify: `src/app/page.tsx`

- [ ] **Step 1: Build the settings sheet.**

Create `src/components/a11y/SettingsSheet.tsx`:

```tsx
"use client";

import { usePrefsStore } from "@/store/prefsStore";

interface SettingsSheetProps {
  open: boolean;
  onClose: () => void;
}

/** Accessibility settings: colorblind palette, reduced motion, digit style, sound. */
export default function SettingsSheet({ open, onClose }: SettingsSheetProps) {
  const palette = usePrefsStore((s) => s.palette);
  const reducedMotion = usePrefsStore((s) => s.reducedMotion);
  const digits = usePrefsStore((s) => s.digits);
  const sound = usePrefsStore((s) => s.sound);
  const update = usePrefsStore((s) => s.update);

  if (!open) return null;

  return (
    <div className="settings-wrap" role="dialog" aria-modal="true" aria-label="الإعدادات">
      <div className="settings-sheet">
        <div className="settings-head">
          <span className="settings-title">⚙ الإعدادات</span>
          <button className="btn btn-ghost btn-sm" onClick={onClose} aria-label="إغلاق">
            ✕
          </button>
        </div>

        <div className="settings-row">
          <span>ألوان مناسبة لعمى الألوان</span>
          <button
            className={palette === "colorblind" ? "toggle on" : "toggle"}
            role="switch"
            aria-checked={palette === "colorblind"}
            onClick={() => update("palette", palette === "colorblind" ? "default" : "colorblind")}
          >
            {palette === "colorblind" ? "مُفعّل" : "مُعطّل"}
          </button>
        </div>

        <div className="settings-row">
          <span>تقليل الحركة</span>
          <button
            className={reducedMotion === "on" ? "toggle on" : "toggle"}
            role="switch"
            aria-checked={reducedMotion === "on"}
            onClick={() => update("reducedMotion", reducedMotion === "on" ? "system" : "on")}
          >
            {reducedMotion === "on" ? "مُفعّل" : "تلقائي"}
          </button>
        </div>

        <div className="settings-row">
          <span>الأرقام</span>
          <button
            className="toggle"
            onClick={() => update("digits", digits === "eastern" ? "western" : "eastern")}
          >
            {digits === "eastern" ? "١٢٣ عربية" : "123 لاتينية"}
          </button>
        </div>

        <div className="settings-row">
          <span>الصوت</span>
          <button
            className={sound ? "toggle on" : "toggle"}
            role="switch"
            aria-checked={sound}
            onClick={() => update("sound", !sound)}
          >
            {sound ? "مُفعّل" : "مُعطّل"}
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Style the sheet.**

Append to `src/app/globals.css`:
```css
/* ─── SETTINGS SHEET ─── */
.settings-wrap{
  position:fixed;inset:0;z-index:60;
  background:rgba(5,4,12,.62);
  backdrop-filter:blur(4px);
  display:flex;align-items:flex-end;justify-content:center;
}
.settings-sheet{
  width:100%;max-width:520px;
  background:var(--surface);
  border:1px solid var(--glass-brd);
  border-radius:var(--r-lg) var(--r-lg) 0 0;
  padding:1rem 1.1rem 1.4rem;
  box-shadow:var(--shadow);
}
.settings-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:.6rem;}
.settings-title{font-weight:900;font-size:1.05rem;}
.settings-row{
  display:flex;align-items:center;justify-content:space-between;
  padding:.62rem 0;border-top:1px solid var(--border);
  font-weight:700;font-size:.92rem;
}
.toggle{
  border:1px solid var(--glass-brd);
  background:var(--glass);color:var(--text2);
  border-radius:999px;padding:.32rem .8rem;
  font-weight:800;font-size:.8rem;cursor:pointer;
  font-family:inherit;
}
.toggle.on{background:var(--grad-signature);color:#0A0A0F;border-color:transparent;}
.settings-gear{
  position:fixed;top:.7rem;inset-inline-start:.7rem;z-index:40;
  width:40px;height:40px;border-radius:50%;
  border:1px solid var(--glass-brd);background:var(--glass);
  color:var(--text);font-size:1.1rem;cursor:pointer;
  display:flex;align-items:center;justify-content:center;
}
```

- [ ] **Step 3: Add a global gear button that opens the sheet.**

In `src/app/page.tsx`:
- Add imports + state:
```tsx
import { useEffect, useState } from "react";
import SettingsSheet from "@/components/a11y/SettingsSheet";
```
- Inside `Home`, add `const [settingsOpen, setSettingsOpen] = useState(false);`
- Render the gear + sheet in the fragment:
```tsx
  return (
    <>
      <PrefsEffect />
      <button
        className="settings-gear"
        aria-label="الإعدادات"
        onClick={() => setSettingsOpen(true)}
      >
        ⚙
      </button>
      {renderScreen(gs?.phase ?? null, clientScreen)}
      <SettingsSheet open={settingsOpen} onClose={() => setSettingsOpen(false)} />
      <Toast />
    </>
  );
```

- [ ] **Step 4: Type-check + build.**

Run: `node_modules/.bin/tsc --noEmit && npm run build`
Expected: tsc exit 0; build succeeds.

- [ ] **Step 5: Commit.**

```bash
git add src/components/a11y/SettingsSheet.tsx src/app/globals.css src/app/page.tsx
git commit -m "feat(a11y): settings sheet (palette, motion, digits, sound)"
```

---

### Task 15: Signature motion (clue shimmer · flip-reveal · win confetti)

**Files:**
- Modify: `src/app/globals.css`
- Create: `src/components/game/Confetti.tsx`
- Modify: `src/components/screens/WinModal.tsx`

> All motions are gated: the `html[data-reduced-motion="on"]` kill rule (Task 11 Step 3) and `@media (prefers-reduced-motion: reduce)` both disable them.

- [ ] **Step 1: Clue-word signature shimmer.**

In `src/app/globals.css`, replace the existing `.clue-word-big { ... }` rule with:
```css
.clue-word-big{
  font-size:1.5rem;font-weight:900;letter-spacing:-.5px;
  background:var(--grad-signature);
  background-size:200% auto;
  -webkit-background-clip:text;background-clip:text;color:transparent;
  animation:clueShimmer 3s linear infinite;
}
@keyframes clueShimmer{ to{ background-position:200% center; } }
```

- [ ] **Step 2: Flip-reveal on newly revealed cards.**

Append to `src/app/globals.css` (a card transitions from glass `wc` → `wc rv rv-*` only when freshly revealed, so the keyed DOM node animates once; already-revealed cards keep the class and do not re-fire):
```css
@keyframes wcFlip{ 0%{transform:rotateY(90deg);opacity:.35;} 100%{transform:rotateY(0);opacity:1;} }
.wc.rv{ animation:wcFlip .32s cubic-bezier(.34,1.56,.64,1); }
```

- [ ] **Step 3: Confetti component.**

Create `src/components/game/Confetti.tsx`:
```tsx
"use client";

const PIECES = Array.from({ length: 28 });
const COLORS = ["#FF4D8D", "#34A8FF", "#FFD060", "#34E0E0", "#A78BFA"];

/** Pure-CSS confetti burst for the win modal. Hidden under reduced-motion. */
export default function Confetti() {
  return (
    <div className="confetti" aria-hidden="true">
      {PIECES.map((_, i) => (
        <span
          key={i}
          className="confetti-piece"
          style={{
            left: `${(i * 97) % 100}%`,
            animationDelay: `${(i % 10) * 0.08}s`,
            background: COLORS[i % COLORS.length],
          }}
        />
      ))}
    </div>
  );
}
```

- [ ] **Step 4: Confetti styles (with reduced-motion guards).**

Append to `src/app/globals.css`:
```css
/* ─── WIN CONFETTI ─── */
.confetti{position:absolute;inset:0;overflow:hidden;pointer-events:none;z-index:5;}
.confetti-piece{
  position:absolute;top:-14px;width:9px;height:14px;border-radius:2px;opacity:.9;
  animation:confettiFall 2.4s linear forwards;
}
@keyframes confettiFall{ to{ transform:translateY(115vh) rotate(540deg); opacity:.2; } }
@media (prefers-reduced-motion: reduce){ .confetti{display:none;} }
html[data-reduced-motion="on"] .confetti{display:none;}
```

- [ ] **Step 5: Mount confetti in the win modal.**

In `src/components/screens/WinModal.tsx`:
- Add `import Confetti from "@/components/game/Confetti";`
- Render `<Confetti />` as the first child inside `<div className="modal-wrap" id="win-modal">` (before `<div className="modal">`).

- [ ] **Step 6: Type-check + build.**

Run: `node_modules/.bin/tsc --noEmit && npm run build`
Expected: tsc exit 0; build succeeds.

- [ ] **Step 7: Commit.**

```bash
git add src/app/globals.css src/components/game/Confetti.tsx src/components/screens/WinModal.tsx
git commit -m "feat(motion): clue shimmer, flip-reveal, win confetti (reduced-motion gated)"
```

---

## GROUP 5 — Verification

### Task 16: Full verification + reviewer agents

**Files:** none (verification only)

- [ ] **Step 1: Static gates.**

Run:
```bash
node_modules/.bin/tsc --noEmit
node_modules/.bin/vitest run
npm run build
```
Expected: tsc exit 0; **all** Vitest tests green (54 original + projection + 2 leak-regression + digits + prefs); Turbopack build succeeds. If a tool reports "Cannot find module", run `npm install` and retry.

- [ ] **Step 2: Start a clean dev server for Playwright.**

```bash
pkill -f "tsx watch server/index.ts" 2>/dev/null; sleep 1
nohup npm run dev > /tmp/talmeeha-dev.log 2>&1 &
# poll until ready (first compile is slow on /mnt/d):
for i in $(seq 1 40); do curl -fs localhost:3000/healthz && break; sleep 2; done
```
Expected: `ok`.

- [ ] **Step 3: Playwright — security (the core outcome).**

Drive an **online** two-client round (create as red leader on one context/tab, join as a red guesser on another). On the guesser context, run in the page:
```js
// guesser must NOT be able to read any unrevealed card's real type from the socket payload
// (the store holds the projected view):
JSON.stringify(window /* via app state */ )
```
Practical assertion: as the guesser, inspect the rendered board — unrevealed cells must carry **no** `hv-*`/`h-*`/`rv-*` color class (plain glass), while the leader context shows the full key. Capture a screenshot of each. Confirm the guesser cannot deduce colors from the DOM.

- [ ] **Step 4: Playwright — host round, mobile + desktop.**

- Desktop (1280×800) and mobile (390×844): home → host setup (2 players + leader each) → board renders 25 glass tiles, RTL, fits viewport (4 columns at 390px). Submit a clue as host, guess a card, confirm flip-reveal + counters decrement.
- Assert **0 console errors / 0 warnings** on each screen (use a no-extension context).

- [ ] **Step 5: Playwright — accessibility modes.**

Open settings (⚙) and verify:
- **Colorblind palette:** toggling sets `document.documentElement.dataset.palette === "colorblind"`; team colors shift to Wong orange/blue; glyphs (▲/⬣) remain on scores + counters + revealed cards.
- **Reduced motion:** toggling sets `data-reduced-motion="on"`; the grape mascot + tile transitions stop animating.
- **Digits:** toggling to Eastern renders scores/clue number/guesses-left as ٠–٩.
- Confirm screenshots match the Neon Night look (dark canvas, glass tiles, neon team accents).

- [ ] **Step 6: Reviewer agents.**

Run the project reviewer agents over the diff:
- `socket-event-reviewer` — focus on `server/emit.ts`, the handler broadcast swap, and `src/lib/game/projection.ts` (server authority, no leak, thin handlers).
- `game-logic-reviewer` — focus on `projection.ts` purity/immutability + parity (no rules changed beyond the documented full-key view).
- `arabic-rtl-reviewer` — focus on `SettingsSheet`, `TeamGlyph`, the Neon Night CSS, digits, RTL correctness, and Arabic copy.

Address any CRITICAL/HIGH findings before closing the part.

- [ ] **Step 7: Update DESIGN.md note (Neon Night is now the live system).**

In `DESIGN.md`, add a short "Neon Night (Phase 1)" note at the top documenting: glass unrevealed tiles, neon team colors `--red #FF4D8D` / `--blue #34A8FF`, `--cyan #34E0E0`, `--grad-signature`, the `[data-palette="colorblind"]` Wong overrides, `[data-reduced-motion]`, `[data-digits]`, and team glyphs ▲/⬣. Commit:
```bash
git add DESIGN.md
git commit -m "docs(design): document Neon Night Phase 1 system"
```

- [ ] **Step 8: Stop the dev server.**

```bash
pkill -f "tsx watch server/index.ts" 2>/dev/null
```

---

## Self-Review Notes (spec → plan coverage for Part 1)

- **§3 fairness / §6 role-filtered state** → Tasks 1–7 (projection, per-socket emit, leak regression, client render, leaders' full key).
- **§4 Neon Night design system** → Tasks 11–12 (tokens, glass tiles, neon teams, signature gradient, glyphs).
- **§4.2 team identity color-independent** → Task 12 (TeamGlyph) + Task 11 colorblind palette.
- **§6 public counts for guessers** → Task 6 (`gs.counts`).
- **§2.6 / §8.6 accessibility (palette, reduced-motion, digits, sound, settings)** → Tasks 8–10, 13–14.
- **§5 motion (clue shimmer, flip-reveal, confetti) + reduced-motion guards** → Task 15 (signature motions) + Task 11 Step 3 (reduced-motion kill). Score count-up is left as optional polish.
- **§12 testing/verification** → Task 16 (tsc, vitest, build, Playwright across mobile/desktop + colorblind + reduced-motion, reviewer agents).

**Deferred to Part 2** (`2026-05-23-talmeeha-neon-night-phase1b.md`): zero-friction join (QR + deep-link), reconnection/rejoin, teach-by-doing onboarding, pass-the-phone handoff + hold-to-peek, win/share card (canvas → PNG), PWA (manifest + service worker + install).
