# Design Spec — Talmeeha → Next.js Migration

- **Date:** 2026-05-23
- **Status:** Approved (brainstorming)
- **Decisions locked:** Next.js + custom server + Socket.io · Deploy to Railway/Render · Evolve existing identity (see [`DESIGN.md`](../../../DESIGN.md), [`BRAND.md`](../../brand/BRAND.md))

---

## 1. Goal & Non-Goals

**Goal:** Refactor the existing vanilla (Express + Socket.io + single 1221-line `index.html`)
Talmeeha into a typed, testable, component-based **Next.js 16 (App Router) + React 19 +
TypeScript** application, preserving 100% of current gameplay and both modes (host pass-and-play +
online rooms), while extracting game logic into pure, unit-tested functions and adopting the
formal design system.

> **Runtime baseline (Next 16):** Node ≥ 20.9.0 (Node 18 dropped), TypeScript ≥ 5.1, React 19.
> Turbopack is the default bundler for `next build` — keep `next.config.ts` free of any
> `webpack` config. The custom-server programmatic API (`next({ dev })` → `getRequestHandler()`
> → `app.prepare()`) is unchanged in 16, so the Socket.io + custom-server approach below holds.

**Non-goals (this migration):**
- No new gameplay features (no spectator chat, no timers, no accounts) — parity first.
- No database — rooms stay in-memory (matches current behavior). Persistence is a future RFC.
- No move off Socket.io. No serverless realtime rewrite.
- No i18n framework — the app is Arabic-only by design (RTL native).

---

## 2. Current-State Summary (what we're porting)

| Concern | Today | Notes |
|---|---|---|
| Server | `server.js` (312 lines), Express static + Socket.io | Untyped room objects, game logic inline in socket handlers |
| Client | `public/index.html` (1221 lines) | Inline CSS (design tokens already as CSS vars) + vanilla JS render loop |
| State sync | Full-room `broadcast(room)` on every event | Server is authoritative; client re-renders from `state` |
| Word bank | `WB` array (~250 Arabic words) in `server.js` | Move to data module |
| Modes | host (`hRed/hBlue` synthetic players) + online (socket-id players) | Both must survive |
| Game rules | `buildBoard`, `checkWin`, `nextTurn`, guess resolution in `guess_card` | **Tangled — extract to pure lib** |
| Persistence | `localStorage` wins, `sessionStorage` name (client) | Keep as-is |

---

## 3. Target Architecture

### 3.1 Runtime: custom Next.js server + Socket.io

A custom server (`server/index.ts`) creates the HTTP server, attaches the Socket.io `Server`,
and delegates all non-socket requests to the Next.js request handler. This keeps one process,
one port, one deploy unit on Railway — and lets us reuse the existing socket logic almost verbatim.

```
HTTP request ──► custom server ──► /socket.io/*  ► Socket.io engine
                                └► everything else ► Next.js handler (App Router)
```

`package.json`: `dev` runs the custom server via `tsx watch`; `build` runs `next build` then
compiles the server; `start` runs the compiled server. Railway runs `start`.

### 3.2 Folder structure

```
talmeeha/
├── DESIGN.md  BRAND.md(docs/brand)  CLAUDE.md
├── server/
│   ├── index.ts            # custom server: Next handler + Socket.io bootstrap
│   ├── socket.ts           # io.on('connection') → registers event handlers
│   ├── handlers/           # one file per event group (create, join, team, clue, guess, turn)
│   └── rooms.ts            # in-memory room store (Map) + lifecycle (create/get/delete/cleanup)
├── src/
│   ├── app/
│   │   ├── layout.tsx      # <html dir=rtl lang=ar>, Tajawal font, global tokens
│   │   ├── page.tsx        # Home (mode select) — client island
│   │   └── globals.css     # design tokens (CSS vars) + base + Tailwind layers
│   ├── components/
│   │   ├── brand/          # <Logo/>, <Anqood/> (mascot), <Toast/>
│   │   ├── screens/        # <HomeScreen/> <SetupScreen/> <LobbyScreen/> <GameScreen/> <WinModal/>
│   │   └── game/           # <Board/> <WordCard/> <CluePanel/> <LeaderPanel/> <GameHeader/> <Counters/> <GameLog/>
│   ├── lib/
│   │   ├── game/           # PURE rules: board.ts, rules.ts, win.ts, turn.ts (+ *.test.ts)
│   │   ├── types/          # shared Room/Player/Card/GameState + socket event maps
│   │   └── words/          # arabic word bank (data + helpers)
│   ├── store/              # Zustand store (socket connection + game state)
│   └── styles/             # tailwind token mapping
├── tests/e2e/              # Playwright journeys
├── .claude/  .mcp.json
└── next.config.ts  tailwind.config.ts  tsconfig.json  vitest.config.ts
```

### 3.3 Shared types (the backbone)

A single source of truth in `src/lib/types/` is imported by **both** server and client,
making the socket contract type-safe end to end.

```ts
type Team = 'red' | 'blue';
type CardType = Team | 'neutral' | 'assassin';
type Phase = 'lobby' | 'setup' | 'playing' | 'ended';

interface Card { w: string; t: CardType; rv: boolean; }
interface Player { id: string; name: string; team: Team | null; }
interface GameState {        // == what the server broadcasts as 'state'
  code: string; phase: Phase; hostMode: boolean;
  board: Card[]; turn: Team; clue: { w: string; n: number } | null;
  gleft: number; gphase: boolean; winner: Team | null;
  teams: Record<Team, string[]>; leaders: Record<Team, string | null>;
  teamNames: Record<Team, string>; players: Record<string, Player>;
  doubts: Record<number, string[]>; wins: Record<Team, number>;
  sRed: number; sBlue: number; log: string[];
  hRed?: HostTeam; hBlue?: HostTeam;
}

// Typed Socket.io event maps (client→server, server→client)
interface ClientToServer { create_host: (p: CreateHostPayload) => void; /* …all events */ }
interface ServerToClient { state: (s: GameState) => void; joined: (p: Joined) => void; error: (m: string) => void; }
```

### 3.4 Pure game logic (the main quality win)

Everything currently inline in `server.js` becomes pure, dependency-free functions in
`src/lib/game/` — deterministic (board takes an injectable RNG/seed for tests):

- `board.ts` → `buildBoard(rng): { board, startTeam }`, `shuffle(arr, rng)`
- `win.ts` → `checkWin(board): Team | null`, `remaining(board, team)`
- `turn.ts` → `nextTurn(state): GameState` (immutable — returns new state)
- `rules.ts` → `resolveGuess(state, index): { state, outcome }` (hit/miss/assassin/win)

Handlers in `server/handlers/` become thin: validate sender → call pure fn → store new state
→ broadcast. **Immutability** (per coding-style rules): pure fns return new objects, never mutate.

### 3.5 Client state — Zustand

A single `useGameStore`:
- Holds the socket instance, `myId`, `roomCode`, `gameState`, local UI flags (`doubtMode`,
  `hostViewLeader`), and `winsData` (localStorage-backed).
- Subscribes to `state`/`joined`/`error`; exposes typed action emitters (`submitClue`,
  `guessCard`, `selectTeam`, …).
- Components select only the slices they need → minimal re-renders. The current monolithic
  `renderGame()` becomes derived selectors + small components.

### 3.6 Styling

Tailwind v4 with the DESIGN.md tokens registered as the theme (CSS vars remain canonical in
`globals.css`; Tailwind maps to them so both `var(--grape)` and `bg-grape` work). Word-card
state classes and the signature gradients are preserved exactly. RTL via `dir="rtl"` on `<html>`.

---

## 4. Data Flow (unchanged conceptually, now typed)

1. Client emits a typed action (e.g., `guess_card`) via the store.
2. Server handler validates the sender's role/turn, calls a pure `lib/game` function.
3. Store replaces the room's state immutably; `broadcast(room)` emits typed `state`.
4. All clients in the room receive `state`; Zustand updates; selectors re-render affected components.

Server stays **authoritative**; clients are pure projections of server state (as today).

---

## 5. Error Handling & Edge Cases (parity)

- Invalid room code → `error` event → toast (existing behavior).
- Wrong-sender actions (non-leader submitting clue, off-turn guess) → ignored server-side.
- Disconnect → remove player, clear leadership, delete empty rooms, host disconnect tears
  down host-mode room (port existing `disconnect` logic).
- Validation at boundaries with **Zod** schemas on every inbound socket payload (new — closes
  the current "trust the client shape" gap), per security/coding-style rules.

---

## 6. Testing Strategy

- **Vitest unit (target ≥80%):** all of `src/lib/game` (seeded RNG → deterministic boards,
  every guess outcome, win conditions, turn flips, doubt toggling), word-bank helpers, store reducers.
- **Vitest integration:** socket handlers against an in-memory `io` (create→join→team→start→
  clue→guess→win for both modes).
- **Playwright E2E:** (1) host mode full round on one client; (2) online mode two clients —
  create+join, pick teams/leaders, clue, guess, win modal. Mobile viewport + RTL assertions.

---

## 7. Deployment (Railway/Render)

- Single Node service. `start` = compiled custom server. `PORT` from env (already supported).
- Health: `GET /` serves the app. Add `/healthz` returning 200 for platform checks.
- Railway MCP is available in this environment for provisioning/deploy.
- Env: `PORT` only (no secrets today). Document future `REDIS_URL` for multi-instance rooms.

---

## 8. Migration Phases (high level — detailed plan follows via writing-plans)

1. **Scaffold:** Next 16 + TS + Tailwind + custom server hello-world + Socket.io echo.
2. **Types + word bank:** port `WB`, define shared types + Zod schemas.
3. **Pure game lib + tests:** extract board/rules/win/turn, unit-test to ≥80%.
4. **Server handlers:** port all socket events onto the pure lib + room store.
5. **Design system:** `globals.css` tokens, Tailwind map, `<Logo/>`/`<Anqood/>`.
6. **Screens/components:** Home → Setup → Lobby → Game → WinModal, wired to Zustand.
7. **E2E + polish:** Playwright journeys, responsive/RTL pass, parity audit vs. old app.
8. **Deploy:** Railway, smoke test both modes.

---

## 9. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Socket.io + custom server HMR friction in dev | `tsx watch` for server; Next dev for client; documented dev script |
| Behavior drift from the original during port | Pure-fn unit tests encode current rules; parity E2E audit in phase 7 |
| In-memory rooms lost on redeploy | Accepted (matches today); Redis noted as future RFC |
| Host-mode synthetic players complexity | Keep `hRed/hBlue` shape in types; cover with dedicated tests |
| RTL/gradient regressions | Preserve exact CSS tokens/classes; visual check vs. `preview.html` |
