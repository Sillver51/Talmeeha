# Talmeeha 2.0 — Slice 5: Blitz (server-authoritative timers + sudden-death) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:test-driven-development. Steps use `- [ ]` tracking. Full design context: spec `docs/superpowers/specs/2026-05-25-talmeeha-liquid-night-blitz-design.md` §8.

**Goal:** Add an **opt-in, OFF-by-default, per-turn countdown** with server-authoritative timing, last-10s escalation, and a deterministic sudden-death tiebreaker — without ever auto-revealing a card or breaking the existing game.

**Architecture:** The server owns the clock. On turn start (if the room's timer is enabled), the server sets `turnDeadlineAt = Date.now() + durationMs` on the room and schedules a single `setTimeout` that is the **only** code path that ends a timed-out turn (it calls the existing pure `nextTurn` → `store.set` → `broadcastState`; it NEVER reveals a card). `turnDeadlineAt` is projected into `PlayerView` (public, safe). Clients render the countdown by recomputing `turnDeadlineAt − estimatedServerNow` on `requestAnimationFrame` (never a decrementing counter), with a one-time clock-offset estimate on connect. Sudden-death triggers only in timed mode when the clock ends with both teams still holding words; a pure resolver picks the winner deterministically.

**Tech Stack:** Next 16 / React 19 / TS, Socket.io, Zustand, Zod, Vitest. No new deps. All motion reduced-motion-gated via the existing `--motion-scale` token; urgency encoded by numeral + shrinking ring + state (never color alone); `aria-live="polite"` at 30s/10s only.

**Environment (WSL `/mnt/d`):** `node_modules/.bin/<tool>` for tsc/vitest; restart `npm run dev` before Playwright and confirm it bound (`🍇 … المنفذ 3000`, not "Another next dev server"); never stage `server.js`/`public/index.html`. Authority: `node_modules/.bin/tsc --noEmit` exit 0.

**🚨 Git guardrails for the implementer:** branch `feat/blitz` only; ONLY `git add <files>` + `git commit`; NEVER checkout/switch/branch/merge/rebase/reset/pull/push/stash. The controller handles PR/merge/Playwright.

---

## File Structure

| File | Responsibility | Action |
|---|---|---|
| `src/lib/types/index.ts` | `TimerPreset`, `TimerConfig`, `GameState.timer`, `GameState.turnDeadlineAt`, project `turnDeadlineAt` into `PlayerView`; add `set_timer` client event | Modify |
| `src/lib/game/timer.ts` | Pure: preset→durationMs, `DEFAULT_TIMER`, `applyTurnDeadline(room, now)` (sets deadline iff enabled), `clearTurnDeadline(room)` | Create |
| `src/lib/game/suddenDeath.ts` | Pure: `needsSuddenDeath(room)` + `resolveSuddenDeath(room)` deterministic winner | Create |
| `src/lib/game/index.ts` | Barrel: export timer + suddenDeath | Modify |
| `src/lib/schemas/index.ts` | `setTimerSchema` (Zod) | Modify |
| `tests/lib/game/timer.test.ts` | Unit | Create |
| `tests/lib/game/suddenDeath.test.ts` | Unit | Create |
| `server/timers.ts` | Per-room turn-deadline scheduler (setTimeout map, `.unref()`, cancel) — mirrors `server/presence.ts` shape | Create |
| `server/handlers/timer.ts` | `set_timer` handler (host/leader authorizes; lobby/setup only) | Create |
| `server/handlers/lifecycle.ts` · `play.ts` · `socket.ts` | Arm deadline on turn start (start_game) + every turn change (guess that flips, end_turn, miss); cancel on game end/disconnect; register timer handler | Modify |
| `tests/server/handlers.test.ts` | Integration: expiry passes turn + NEVER reveals; rejoin gets live deadline | Modify |
| `src/lib/time/clock.ts` | Client clock-offset estimate (one-shot on connect) | Create |
| `src/lib/time/useCountdown.ts` | rAF hook → remaining ms from `deadlineAt` | Create |
| `src/components/game/TurnTimer.tsx` | Ring + numeral + aria-live + last-10s escalation | Create |
| `src/components/game/GameScreen.tsx` | Mount `TurnTimer` when `turnDeadlineAt` set | Modify |
| `src/components/screens/SetupScreen.tsx` + `LobbyScreen.tsx` | Timer toggle + preset picker (host setup / lobby) | Modify |
| `src/store/gameStore.ts` | `setTimer(preset|off)` action; emit clock ping on connect | Modify |
| `src/app/globals.css` | TurnTimer ring + escalation styles (motion-scale gated) | Modify |

---

## GROUP A — Pure logic (TDD)

### Task 1: Timer config (pure)
- [ ] **Step 1 — failing test** `tests/lib/game/timer.test.ts`: assert `PRESETS.normal.durationMs === 60000`, presets relaxed=90000/blitz=30000; `DEFAULT_TIMER = { enabled:false, preset:"normal", durationMs:60000 }`; `applyTurnDeadline(room, 1000)` returns a NEW room with `turnDeadlineAt = 1000 + durationMs` when `room.timer.enabled`, and `turnDeadlineAt = null` when disabled (immutability: source unchanged); `clearTurnDeadline(room)` returns room with `turnDeadlineAt = null`.
- [ ] **Step 2 — run, verify FAIL.** `node_modules/.bin/vitest run tests/lib/game/timer.test.ts`
- [ ] **Step 3 — implement** `src/lib/game/timer.ts`: export `type TimerPreset = "relaxed"|"normal"|"blitz"`; `interface TimerConfig { enabled: boolean; preset: TimerPreset; durationMs: number }`; `const PRESETS: Record<TimerPreset,{durationMs:number;label:string}>` (relaxed 90000 "مريح", normal 60000 "عادي", blitz 30000 "سريع"); `DEFAULT_TIMER`; `applyTurnDeadline(room, now)` / `clearTurnDeadline(room)` returning new objects (spread). Add `turnDeadlineAt?: number | null` reads via `room.timer`.
- [ ] **Step 4 — run, verify PASS** + `tsc --noEmit`.
- [ ] **Step 5 — commit** `feat(game): pure timer config + turn-deadline helpers`.

### Task 2: Sudden-death resolver (pure)
- [ ] **Step 1 — failing test** `tests/lib/game/suddenDeath.test.ts`: `needsSuddenDeath` true only when phase ended-on-clock with both teams' remaining>0 (use a flag the server sets, e.g. `endedOnClock:true`); `resolveSuddenDeath` deterministic order: fewest remaining words → fewest wrong guesses → fallback the team NOT on the clock (`turn`'s opponent). Cover ties at each level + the fallback.
- [ ] **Step 2 — verify FAIL.**
- [ ] **Step 3 — implement** `src/lib/game/suddenDeath.ts` (pure, deterministic; reads `counts`/remaining via the existing `remaining(board, team)` from `win.ts`, and a `wrongGuesses` tally if present else 0). Keep the "speed-round" runtime variant OUT of pure logic (it's a UI/flow concern) — the pure resolver is the deterministic fallback chain.
- [ ] **Step 4 — verify PASS** + tsc.
- [ ] **Step 5 — commit** `feat(game): deterministic sudden-death resolver`.

---

## GROUP B — Types + server authority

### Task 3: Types + schema
- [ ] Add to `GameState`: `timer?: TimerConfig; turnDeadlineAt?: number | null; endedOnClock?: boolean`. `PlayerView` already extends `Omit<GameState,"board">` so it inherits these (turnDeadlineAt is public/safe). Add `set_timer: (p:{code:string; preset: TimerPreset | "off"}) => void` to `ClientToServerEvents`. Export timer/suddenDeath from `src/lib/game/index.ts`.
- [ ] `src/lib/schemas/index.ts`: `setTimerSchema = z.object({ code, preset: z.enum(["relaxed","normal","blitz","off"]) })`.
- [ ] tsc clean. Commit `feat(types): timer config + turnDeadlineAt + set_timer contract`.

### Task 4: Server turn-deadline scheduler + handlers
- [ ] Create `server/timers.ts` mirroring `server/presence.ts`: `armTurnDeadline(io, code, durationMs, run)` sets a `setTimeout(...).unref()` keyed by code (cancels prior); `cancelTurnDeadline(code)`. The scheduled `run` is provided by the caller and must end the turn via the pure `nextTurn` then `store.set` + `broadcastState` — **it must NEVER call resolveGuess / reveal a card**.
- [ ] Create `server/handlers/timer.ts`: `registerTimerHandlers` — on `set_timer`, validate (Zod), authorize (host socket or a team leader; room must be `phase` lobby/setup — reject mid-game), set `room.timer` (preset→config, "off"→disabled) via store; broadcast. Register in `server/socket.ts`.
- [ ] In `lifecycle.ts` `start_game` and `play.ts` (after any turn change: a guess that flips the turn, `end_turn`, host miss-rotation, assassin/end): if `room.timer?.enabled`, set `turnDeadlineAt` (via `applyTurnDeadline`) on the stored room AND `armTurnDeadline(io, code, durationMs, expireFn)`; `cancelTurnDeadline(code)` on game end (winner set) and in `disconnect` teardown. The `expireFn`: re-read room; if still that team's turn & playing, `nextTurn({...room, log:["⏰ انتهى الوقت", ...room.log]})` (pass, NO reveal) → store → broadcast → re-arm for the next team.
  - **Critical invariant:** expiry only ever PASSES the turn. It must not reveal, must not hit the assassin, must not end the game (unless the board state already would).
- [ ] tsc clean. Commit `feat(server): server-authoritative per-turn deadline scheduler`.

### Task 5: Server integration tests
- [ ] In `tests/server/handlers.test.ts`: a test that enables `set_timer` "blitz" in lobby, starts a game, and asserts the projected state carries a `turnDeadlineAt` (number, > now). A second test with a SHORT injected duration (or by directly invoking the expire path if exposed) asserting that on expiry the turn flips (`turn` changes) and **no new card became revealed** (`board.filter(rv).length` unchanged) and `phase` stays "playing". Reuse the existing `startOnlineGame`/`waitForState` helpers. Keep deterministic (avoid real 30s waits — prefer a tiny duration via a test-only timer config, e.g. set preset then patch durationMs through the public path, or expose a constant override).
- [ ] `vitest run tests/server/handlers.test.ts` green. Commit `test(server): timer expiry passes turn, never reveals (regression)`.

---

## GROUP C — Client

### Task 6: Clock offset + countdown hook
- [ ] `src/lib/time/clock.ts`: a one-shot client↔server offset estimate. Simplest robust version: on `joined`/connect, the client records `Date.now()`; since the server stamps `turnDeadlineAt` in server time and the client renders with `Date.now()`, assume offset ≈ 0 for a casual game BUT expose `estimatedServerNow()` = `Date.now() + offset` with `offset` settable from a lightweight ping if added. For Slice 5, ship `offset = 0` (documented) with the hook structured to accept an offset later — sub-second drift is acceptable; the server `setTimeout` is the real authority.
- [ ] `src/lib/time/useCountdown.ts`: `useCountdown(deadlineAt: number | null): number` → remaining ms, recomputed via `requestAnimationFrame` from `deadlineAt - estimatedServerNow()`, clamped ≥0, recompute on `visibilitychange`; returns 0 when `deadlineAt` null. Cleanup rAF on unmount/deadline change. (Pure-ish; add a small unit test for a `remainingMs(deadlineAt, now)` helper.)
- [ ] tsc + tests. Commit `feat(client): clock offset + rAF countdown hook`.

### Task 7: TurnTimer UI + integration
- [ ] `src/components/game/TurnTimer.tsx`: reads `gs.turnDeadlineAt` (via props), uses `useCountdown`; renders a shrinking ring (SVG `stroke-dashoffset` from fraction) + the seconds numeral (via `formatNumber(secs, digits)`); `aria-live="polite"` region announcing only at 30s and 10s (track last-announced to avoid spam); last-10s escalation class (pulse/color+ring) gated by `--motion-scale`; urgency conveyed by numeral + shrinking ring + state class (NOT color alone). Hidden when `turnDeadlineAt` null.
- [ ] Mount in `GameScreen.tsx` (near header, when playing). Styles in `globals.css` (`.turn-timer`, ring, `.turn-timer.urgent`, all motion-scale gated; reduced-motion → no pulse, ring still shrinks via the value).
- [ ] tsc + build. Commit `feat(ui): TurnTimer ring + accessible countdown + escalation`.

### Task 8: Setup/lobby toggle + store
- [ ] `src/store/gameStore.ts`: add `setTimer(preset: TimerPreset | "off")` → emits `set_timer`. (Optional: a connect-time clock ping if you implemented offset.)
- [ ] Add a timer toggle + preset picker to host **SetupScreen** (and/or **LobbyScreen** for online) — OFF by default; presets مريح/عادي/سريع using `PRESETS[*].label`. Use shadcn `Switch`/`Button` from `src/components/ui` for on-brand controls. Authorize per server (host/leader).
- [ ] tsc + build. Commit `feat(ui): timer enable + preset picker (off by default)`.

---

## GROUP D — Verification

### Task 9: Full verification + reviewers (CONTROLLER runs this part)
- [ ] `tsc --noEmit` 0 · `vitest run` all green (existing 98 + new) · `npm run build` succeeds + `dist/index.js` produced.
- [ ] Playwright: enable a blitz timer in setup → start a game → confirm the ring counts down + numeral updates + last-10s escalation; let it expire (use the short preset) → **turn passes, NO card revealed, 0 console errors**; toggle reduced-motion → ring still shows time, no pulse; verify timers OFF by default (no timer when not enabled). Mobile + desktop.
- [ ] Reviewers: `game-logic-reviewer` (timer.ts/suddenDeath.ts purity + the never-reveal invariant), `socket-event-reviewer` (scheduler authority, set_timer authorization/validation, cancel on disconnect/end), `arabic-rtl-reviewer` (TurnTimer + preset picker copy/RTL/a11y). Address CRITICAL/HIGH.

---

## Self-Review (spec §8 → plan)
- §8.1 model (off-default, per-turn, presets, expiry-passes-never-reveals, last-10s escalation) → Tasks 1,4,7,8.
- §8.2 server-authoritative (turnDeadlineAt, setTimeout sole authority, rAF client, reconnect gets deadline free, .unref) → Tasks 3,4,6.
- §8.3 sudden-death (deterministic fallback) → Task 2 (pure resolver; runtime speed-round UI deferred — note).
- §9 a11y (off-default=no barrier, aria-live 30/10s, non-color urgency, reduced-motion) → Task 7.
- **Invariant guarded by Task 5 test:** expiry NEVER reveals a card.
- **Deferred (documented):** the live "speed-round" sudden-death UI flow (pure resolver lands now as the deterministic fallback); per-room online timer config UX polish; clock-offset ping (offset=0 shipped, structured for later).
