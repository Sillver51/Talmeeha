# Talmeeha — Plan 2: Game UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan group-by-group, verifying each in the browser with Playwright. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Port the entire playable UI from the legacy `public/index.html` into typed React components in the Next.js 16 app, faithful to `DESIGN.md`/`BRAND.md`, wired to the Plan 1 socket backend via a Zustand store — preserving both modes (host pass-and-play + online) and every interaction.

**Architecture:** A single client store (`src/store/gameStore.ts`, Zustand) owns the socket.io-client connection and all client state; `src/app/page.tsx` is a thin `'use client'` orchestrator that renders one of five screens based on `phase`/connection; screens compose small game components. The legacy bespoke CSS is ported verbatim into `src/app/globals.css` (highest-fidelity path) and consumed via `className`s.

**Tech Stack:** React 19, Next 16 App Router (client components), Zustand 5, socket.io-client 4, the existing `@/lib/types`.

**References (the exact source of truth for parity):**
- Legacy UI markup + CSS + render logic: `public/index.html` (read it fully).
- Design system: `DESIGN.md`. Brand voice/glossary/mascot: `docs/brand/BRAND.md`.
- Socket contract + state shape: `src/lib/types/index.ts`. Backend behavior: `server/handlers/*`.

---

## CSS strategy (deviation from spec §3.6 — noted)

The spec suggested Tailwind v4 mapped to tokens. **Decision: port the legacy hand-crafted CSS verbatim into `src/app/globals.css` instead of using Tailwind.** Rationale: the legacy CSS (`public/index.html` lines ~9–647) is already a complete, polished, responsive, RTL design system that exactly matches `DESIGN.md`; reimplementing it as Tailwind utilities adds risk and effort for zero visual gain. Tailwind can be layered in later if desired. This keeps pixel-parity guaranteed. (Record this in the spec's migration notes during the final task.)

`globals.css` already holds the `:root` tokens (Plan 1). This plan appends the rest: body/starfield background, `.screen`, `.logo`, `.card`, inputs, `.btn*`, `.mode-*`, setup, `.g-header`, `.host-bar`, counters, `.clue-panel`, `.leader-panel`, `.board`, `.wc*` (all card states), lobby, `.game-log`, `.modal*`, `.toast`, utils — copied verbatim from the legacy `<style>` block.

---

## Store shape (`src/store/gameStore.ts`)

The store replaces the legacy module-level globals (`myId`, `myName`, `roomCode`, `gs`, `isHostClient`, `hostViewLeader`, `doubtMode`, `winsData`, `hSetup`) and the socket client (`public/index.html` lines ~837–1029).

```ts
import { create } from "zustand";
import { io, type Socket } from "socket.io-client";
import type { ClientToServerEvents, ServerToClientEvents, GameState, Team } from "@/lib/types";

type Mode = "host" | "online";
type Screen = "home" | "setup" | "lobby" | "game";
interface HostTeamSetup { players: string[]; leader: string | null; name: string }
interface WinsData { red: number; blue: number; redName: string; blueName: string }

interface GameStore {
  socket: Socket<ServerToClientEvents, ClientToServerEvents> | null;
  myId: string | null;
  myName: string;
  roomCode: string | null;
  isHost: boolean;
  gs: GameState | null;
  // local UI
  mode: Mode;
  screen: Screen;            // derived from gs.phase + connection, with home/setup fallbacks
  doubtMode: boolean;
  hostViewLeader: boolean;
  toastMsg: string | null;
  winsData: WinsData;        // localStorage-backed
  hSetup: { red: HostTeamSetup; blue: HostTeamSetup };  // host-mode setup buffer
  // lifecycle
  connect(): void;           // create socket, register state/joined/error listeners
  // actions (thin emitters; mirror legacy functions)
  selectMode(m: Mode): void;
  startHostSetup(name: string): void;
  addPlayer(t: Team, name: string): void;
  removePlayer(t: Team, name: string): void;
  setLeader(t: Team, name: string): void;
  launchHostGame(redName: string, blueName: string): void;   // emit create_host
  createRoom(name: string): void;                            // emit create_online
  joinRoom(code: string, name: string): void;                // emit join_online
  joinTeam(t: Team): void; becomeLeader(t: Team): void; startGame(): void;
  submitClue(word: string, num: number): void;
  guessCard(i: number): void; toggleDoubt(i: number): void;
  endTurn(): void; restart(): void; goHome(): void;
  toggleDoubtMode(): void; toggleHostView(): void;
  toast(msg: string): void; resetWins(): void;
}
```

**Derivation helpers** (selectors, port from legacy): `myRole()` → `'host'|'leader'|'guesser'|'spectator'`; `myTurn()`; host-mode `hLeader()`/`hGuesser()` (from `gs.hRed/hBlue` + `gIdx`). Put these as pure helpers in `src/lib/ui/roles.ts` taking `(gs, myId, isHost)` so they're unit-testable.

**Persistence:** `winsData` ↔ `localStorage["talmeeha_wins"]`; `myName` ↔ `sessionStorage["tname"]` (guard for SSR: only touch storage in `connect()`/effects, never during render).

**Screen routing:** if `!gs` → `home`; else `gs.phase === 'setup'` → `setup` (host), `'lobby'` → `lobby`, `'playing'|'ended'` → `game`. Home/setup are pre-connection client screens for host mode (mirror legacy `show()` logic).

---

## Component tree → legacy mapping

| Component | File | Ports from `public/index.html` |
|---|---|---|
| Page orchestrator | `src/app/page.tsx` (`'use client'`) | screen switch in `show()`/`render()` (~1031–1037, 1195–1199) |
| `Anqood` (mascot) | `components/brand/Anqood.tsx` | `.grape-emoji` + float/glow keyframes |
| `Logo` | `components/brand/Logo.tsx` | `.logo`/`.logo-tag`/`.logo-wrap` (652–657) |
| `Toast` | `components/brand/Toast.tsx` | `.toast` + `toast()` (626–640, 1201–1207) |
| `HomeScreen` | `components/screens/HomeScreen.tsx` | `#s-home` (651–677) + mode/create/join handlers |
| `SetupScreen` | `components/screens/SetupScreen.tsx` | `#s-setup` (679–719) + `renderSetup` (890–904) |
| `LobbyScreen` | `components/screens/LobbyScreen.tsx` | `#s-lobby` (721–755) + `renderLobby` (1039–1059) |
| `GameScreen` | `components/screens/GameScreen.tsx` | `#s-game` (757–815) + `renderGame` (1061–1176) |
| `WinModal` | `components/screens/WinModal.tsx` | `#win-modal` (817–828) + `showWin`/`renderWinSB` (1178–1193) |
| `GameHeader` | `components/game/GameHeader.tsx` | `.g-header` (759–771) |
| `HostBar` | `components/game/HostBar.tsx` | `.host-bar` (773–778) |
| `Counters` | `components/game/Counters.tsx` | `.counters` (784–790) |
| `CluePanel` | `components/game/CluePanel.tsx` | `.clue-panel` (792–796) |
| `LeaderPanel` | `components/game/LeaderPanel.tsx` | `.leader-panel` (798–806) |
| `ActionRow` | `components/game/ActionRow.tsx` | `.action-row` (808–811) |
| `Board` | `components/game/Board.tsx` | `.board` + board build loop (1135–1162) |
| `WordCard` | `components/game/WordCard.tsx` | `.wc*` rendering + class logic (1138–1161) |
| `GameLog` | `components/game/GameLog.tsx` | `.game-log` + log coloring (1164–1173) |

**WordCard class logic (critical parity):** revealed → `rv rv-{t}`; host unrevealed → `hv-{t}` when `hostViewLeader || !gphase`; online leader → `h-{myTeam}`/`h-assassin` for own/assassin; doubt → `doubted` + count; click → guess or (doubt-mode/shift) toggle_doubt. Preserve exactly (legacy 1145–1159).

---

## Task groups (execute via subagent-driven-development, verify each in Playwright)

### Group A — foundation: CSS + store + brand + role helpers
- [ ] Append the full legacy CSS to `src/app/globals.css` (verbatim, tokens already present).
- [ ] `src/lib/ui/roles.ts` pure helpers (`myRole`, `myTurn`, `hLeader`, `hGuesser`) + `tests/lib/ui/roles.test.ts` (TDD; cover host/leader/guesser/spectator).
- [ ] `src/store/gameStore.ts` Zustand store (socket connect + listeners + actions + persistence).
- [ ] `Anqood`, `Logo`, `Toast` components.
- [ ] Verify: `npm run build` + `tsc` clean; tests pass; Playwright: home still renders.

### Group B — pre-game screens
- [ ] `HomeScreen` (mode select, host name → setup, online create/join) wired to store.
- [ ] `SetupScreen` (add/remove players, set leader, team names, launch) — host mode.
- [ ] `LobbyScreen` (room code copy, join team, become leader, start) — online mode.
- [ ] `page.tsx` orchestrator renders home/setup/lobby from store.
- [ ] Verify in Playwright: host setup flow reaches game; online create shows lobby with code.

### Group C — in-game screen + modal
- [ ] `GameHeader`, `HostBar`, `Counters`, `CluePanel`, `LeaderPanel`, `ActionRow`, `Board`, `WordCard`, `GameLog`, `GameScreen`, `WinModal`.
- [ ] Role-based visibility exactly per legacy (host/leader/guesser/spectator; clue phase; ended).
- [ ] Verify in Playwright: full host round (give clue → guess → win modal); online two-client round.

### Group D — E2E verification + review
- [ ] Drive both modes in Playwright at mobile (390px) and desktop widths; assert RTL, board 5/4/3 cols, no overflow, win modal.
- [ ] Run the `arabic-rtl-reviewer` agent over all new components; fix findings.
- [ ] Screenshot key screens; compare against `DESIGN.md`/legacy for visual parity.
- [ ] Optional: a Playwright spec under `tests/e2e/` for a host round (Plan 3 expands E2E).

---

## Verification standards (every group)
- `npx tsc --noEmit` clean; `npm test` green; `npm run build` succeeds (Turbopack).
- Playwright: navigate the running dev server, snapshot + screenshot, **0 console errors** (ignore extension noise — verified clean in Playwright's browser).
- Visual parity with the legacy look (dark canvas, grape/gold gradients, sand cards, glassmorphism), RTL correct.

## Out of scope (Plan 3)
Railway deploy, comprehensive Playwright E2E suite + CI, perf pass. This plan delivers a fully playable app locally.
