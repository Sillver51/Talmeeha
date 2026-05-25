# Design Spec — Talmeeha 2.0 "Liquid Night" Experience + Blitz

- **Date:** 2026-05-25
- **Status:** Approved (brainstorming)
- **Builds on:** Phase 1 (shipped & merged to `main`): role-filtered `PlayerView`, accessibility prefs (`data-*` on `<html>`), Neon Night tokens, team glyphs, PWA, reconnection, share card. Architecture (server-authoritative state, thin Socket.io handlers, pure engine in `src/lib/game`, `prefsStore`) is sound and unchanged in spirit.
- **Decisions locked (brainstorming):** Art direction = **A · Liquid Night** (evolve Neon Night into OS-grade liquid glass — keep dark cosmos + neon teams + grape/gold/cyan). Phase 2 timers = **opt-in, OFF by default**, **per-turn countdown**, **server-authoritative**. Sound = **OFF by default**. Delivery = **clean slices, each ships green**.
- **Research basis:** two research briefs (game-UX/best-practice + GitHub/tech + 2026 design trends) — key sources: [Motion bundle/a11y](https://motion.dev/docs/react-reduce-bundle-size), [Next 16 View Transitions](https://nextjs.org/docs/app/guides/view-transitions), [WCAG 2.2.1 Timing Adjustable](https://www.w3.org/WAI/WCAG22/Understanding/timing-adjustable.html), [game "juice"](https://garden.bradwoods.io/notes/design/juice), [Howler audio sprites](https://howlerjs.com/), [oklch/color-mix Baseline](https://web.dev/articles/baseline-in-action-color-theme), [Kenney CC0 UI audio](https://kenney.nl/assets/ui-audio).

---

## 1. Vision

Phase 1 made Talmeeha *fair, accessible, and beautiful*. The gap now is **game feel and art direction** — today's screens read like a polished dark web-form, not a game. Phase 2.x keeps the shipped identity and architecture but makes the experience **tactile, dramatic, and alive**: a glowing liquid-glass night table where the board is the hero, every tap lands with weight, the hint and the win are theatrical, and an optional blitz layer adds tension for those who want it — without ever stressing a casual majlis or breaking accessibility.

Brand promise unchanged: *"تلميحة واحدة تكفي"* — a premium, warm gathering, not a corporate app.

## 2. Experience principles (extends Phase 1 §2)

1. **The board is the hero.** Chrome recedes (liquid glass); the 25 tiles are the content. One viewport on mobile, no scroll in-game.
2. **Juice the frequent moment, escalate the rare one.** The everyday card tap/reveal feels great (even on a neutral); confetti/fireworks are reserved for the win.
3. **Every key action = visual + (optional) sound + (optional) haptic** redundant confirmation; pitch/pattern encodes meaning (your-color vs enemy vs assassin).
4. **Optimistic, never blocking.** Taps animate immediately; the authoritative server `state` reconciles. Sound/haptics are additive — the game is fully playable silent and motion-free.
5. **Fair & relaxed by default.** Timers OFF by default; the competitive layer is opt-in per room.
6. **Accessibility is parity, not an afterthought.** Every effect has a reduced-motion fallback; urgency never relies on color alone; timed phases never trap setup/reading; SR users get equivalent cues. (Carries Phase 1 §6.)
7. **RTL-native.** Logical properties only; forward = leftward; room code never digit-reversed; mirrored directional cues.

## 3. Tech foundation

New runtime dependencies (all lazy-loaded / tree-shaken; total baseline ≈ **14kb gzip**, all gated behind `[data-reduced-motion]` and `prefs`):

| Package | Use | Cost |
|---|---|---|
| `motion` | Tile gestures, spring reveals, `AnimatePresence`, `layoutId` shared-element. Use `LazyMotion` + `domAnimation` + the `m` component. Built-in `useReducedMotion()`. | ~5kb (lazy) |
| `@formkit/auto-animate` | One-line animated move-log + lobby player list. | ~3.3kb |
| `canvas-confetti` | Win-moment celebration burst. | ~6kb |
| `use-sound` (+ lazy `howler` peer) | SFX hook; Howler only for the audio sprite, lazy-loaded after first gesture. | ~1kb + lazy |
| `gsap` (optional, lazy, win modal only) | Signature win sequence (SplitText timeline). Free for commercial use. | 0 baseline (dynamic import) |

Native, zero-cost: **View Transitions** (`next.config` `viewTransition: true` + React 19.2 / Next 16 support) for screen changes home→setup→lobby→game→win, as progressive enhancement (guarded by reduced-motion + feature detection).

**Modern-CSS token pass** (0kb, simplifies the system):
- Migrate the palette to **`oklch()`**; derive every team tint/glow/hover/border with **`color-mix()`** / relative color syntax from one base hue per team. The Wong colorblind palette becomes a **single hue swap** instead of 8 hand-tuned rgba values.
- **`clamp()`** fluid type for logo/clue word (drop fixed rem ladders).
- **Container queries** so `<Board>` sizes to its container (removes the 4 viewport breakpoints; lets the board render in a lobby preview too).
- **Motion tokens:** `--ease-spring: cubic-bezier(.34,1.56,.64,1)`, `--dur-fast/-base/-slow`, and `--motion-scale` (1 normally; `[data-reduced-motion="on"]` and the OS `prefers-reduced-motion` query set it to 0). Animations multiply durations by `--motion-scale` — one knob, no scattered `!important`.
- `:has()` for parent-state styling (board dims when a tile is being revealed) without JS.

> **CSS decision (updated 2026-05-25): adopt shadcn/ui + Tailwind v4.** *(Supersedes the original "no Tailwind introduction" constraint.)* Tailwind v4 (CSS-first, `@import "tailwindcss"`, no `tailwind.config.js`) + shadcn/ui (Radix, copy-in components in `src/components/ui/`) is now the component system, **coexisting** with the existing `globals.css` CSS-vars approach — the vanilla styles are NOT ripped out. The modern-CSS token pass above still stands (oklch/`color-mix()`/clamp/container/motion-tokens); shadcn's semantic tokens (`--primary`/`--ring` = grape, dark `--background`, gold/teams) are mapped to the brand palette in oklch in `globals.css`. Config: `components.json` (`style: radix-nova`, `rtl: true`, `cssVariables: true`). One font (Tajawal) preserved via `--font-sans`. Word-card state classes keep their semantics (color = meaning); never recolor them decoratively. See DESIGN.md §4a for the full token map and component locations.

## 4. Liquid Night visual system

Evolves Neon Night (not a reset). Dark cosmos + neon teams (`--red`, `--blue`), grape brand, gold leadership, cyan accent — all migrated to oklch. The upgrade is **material**: glass panels/tiles become *refractive* — layered backdrop-blur + a 1px edge highlight + a faint specular sheen — so chrome reads as floating glass above the content and the board pops. Unrevealed tiles are dark liquid glass that subtly refract the starfield; the grape mascot عنقود remains the one constant kinetic element. Glow is reserved for *live* signals (active turn, focus, score) — never decorative (per DESIGN.md).

## 5. The tactile board (signature interactions)

- **3D card-flip reveal** — `perspective` on the board, `transform-style: preserve-3d`, `rotateY` flip with `--ease-spring` overshoot + slight squash/stretch; back = glass, front = revealed team color + glyph. Fires once when the server `rv` flag flips (keyed DOM node). This replaces the flat Phase 1 flip and is the highest-impact feel upgrade.
- **Press feedback** — `whileTap` spring (scale .96 → overshoot back).
- **Staggered mount** — the 25 tiles cascade in (`staggerChildren`) on game start.
- **Animated count-ups** — the remaining-words counters tick rather than snap.
- **Optimistic flip-start** — on a guesser's tap, the tile lifts/begins flipping immediately; the server `state` confirms the final color (reconcile/revert if rejected). Hides Socket.io latency.
- All gated: reduced-motion → instant crossfade reveal, no stagger/overshoot, instant counts.

## 6. Signature experience moments

- **Leader "you hold the key."** When القائد receives the full key, play a private, dramatic reveal (key-glow sweep across their board) — not a silent state change. Guessers never see it (server already projects `hidden`).
- **Shared-element tile → win modal.** The winning (or assassin) tile flies into the result via `layoutId` / `view-transition-name`. Highest "wow" per line.
- **Win.** Confetti + score count-up + team-colored title; optional lazy GSAP SplitText flourish on the team name. Rare → big.
- **Assassin.** Brief freeze-frame + a tiny (0.1–0.3s) screen shake — the one moment that earns it; restrained dread, never strobing.
- **Lobby energy.** Surface live presence ("انضم X", ready states, the disconnected flag from Phase 1) with `auto-animate` so the wait feels alive.

## 7. Sound + haptics

- **Engine:** `use-sound` (lazy Howler) playing one preloaded **CC0 audio sprite** (Kenney UI/Interface packs): `tap, correct, wrong, pass, assassin, win, warning, tick`. Budget < ~200KB, `.webm` + `.m4a` (iOS). Generated via `audiosprite`.
- **Unlock:** create/`resume()` the `AudioContext` on the first user gesture (the "create room"/"start game" tap). Until then, fully silent + playable.
- **Model:** **default OFF**; mute + master volume persisted in `prefsStore` (same pattern as a11y prefs), exposed as `role="switch"` in Settings. Map sound to meaning (correct = bright ascending tick; neutral/enemy = soft thud; assassin = sting; win = fanfare).
- **Haptics:** Vibration API tied to the same sound/haptics pref — correct = `10`, wrong/turn-end = `[20,40,20]`, assassin = `80`, timer-warning = short pulse. No-ops on unsupported (iOS); enhancement only; must be inside the tap handler.

## 8. Blitz — Phase 2 mechanics

### 8.1 Timer model
- **OFF by default**, enabled per-room in setup. **Per-turn countdown** (one clock spanning the on-turn team's clue + guesses).
- **Presets** (named, no raw number): **مريح ≈ 90s**, **عادي ≈ 60s** (default when on), **سريع ≈ 30s**.
- **On expiry → the turn passes. Never auto-reveal a card** (auto-reveal could hit the assassin = unfair instant loss).
- Final ~10s escalates: ring pulse + color/state change (+ optional tick sound + haptic).
- Setup / join / team-pick / board-read are **never** under the clock.

### 8.2 Server-authoritative timing
- Add to the room/`PlayerView`: `turnDeadlineAt: number | null` (epoch ms) and timer config (`enabled`, `preset`, `durationMs`).
- On turn start the server sets `turnDeadlineAt = Date.now() + durationMs` and schedules a **single `setTimeout`** that is the *only* code path that ends a timed-out turn (it calls the existing pure `nextTurn` → `store.set` → `broadcastState`). Cancel/clear on any turn-ending action (guess that ends turn, manual end, game end, disconnect teardown). `.unref()` the timer (per Phase 1 presence learning).
- Clients render the countdown by recomputing `turnDeadlineAt − estimatedServerNow` on `requestAnimationFrame` (never a decrementing counter — drifts + dies in background tabs). One-time client↔server clock-offset estimate on connect; recompute from `turnDeadlineAt` on `visibilitychange`/refocus. The client clock is **cosmetic**; only the server timeout mutates state. Reconnecting clients get the live deadline for free in the next `state`.
- New pure helpers in `src/lib/game/` (timer config resolution, preset→durationMs) — deterministic, unit-tested.

### 8.3 Sudden-death
- Triggers **only** in timed mode when the clock ends with both teams still holding words.
- Resolution: a **blitz speed-round** (next correctly-guessed word wins). Deterministic fallback chain so a session can never hang: speed-round winner → fewest words remaining → fewest wrong guesses → (final) the team not on the clock. Pure resolver in `src/lib/game/`, unit-tested. Paired with max juice for the finale.

## 9. Accessibility (throughout — non-negotiable)

- Every motion/sound effect has a calm fallback keyed off the existing `data-*` prefs (crossfade not flip; no shake/confetti; instant counts; visual equivalent for every sound).
- Timers OFF by default ⇒ the default game has **no** timing barrier (satisfies WCAG 2.2.1; the real-time/essential exception covers opted-in rooms). Generous presets chosen before play = the practical "adjustable" analog.
- Time announced to SR via `aria-live="polite"` at **30s/10s only** (not every second).
- Urgency encoded by **numeral + shrinking ring + state change**, never color alone. Colorblind glyphs ▲/⬣ retained everywhere.
- ≥44px touch targets; `:focus-visible` rings; dialogs keep Escape + focus management (Phase 1 pattern).

## 10. Architecture & data flow (deltas only)

- **Types** (`src/lib/types`): `turnDeadlineAt`, timer config on `GameState`/room and projected into `PlayerView` (deadline is public, safe). `prefsStore` gains `sound`, `volume`, `haptics`.
- **Server**: a small turn-deadline scheduler module woven into the existing thin handlers + `broadcastState`; the `setTimeout` is the only auto-expiry authority. Sudden-death handled by the same validate→pure-fn→store→broadcast pattern. No change to server authority or the projection security boundary.
- **Client**: a `src/lib/time/` clock-offset + `useCountdown(deadlineAt)` rAF hook; a `src/lib/sound/` layer; `src/lib/motion/` shared variants + reduced-motion guards; components evolve in place (Board/WordCard/GameHeader/CluePanel/WinModal/LobbyScreen/SetupScreen). New: `TurnTimer`, sudden-death UI, leader key-reveal.
- **Engine** (`src/lib/game`): pure timer-config + sudden-death resolvers (unit-tested). No existing rule changes.

## 11. Build slices (each = its own implementation plan; each ships green: `tsc` + tests + build + reviewer + Playwright smoke)

1. **Foundation** — **shadcn/ui + Tailwind v4 adoption** (CSS-first; `components.json` `radix-nova`/`rtl:true`/`cssVariables`; brand tokens mapped to shadcn semantics in oklch; core components in `src/components/ui/`; coexists with existing vanilla `globals.css` — see §3 CSS decision + DESIGN.md §4a) + modern-CSS token pass (oklch/color-mix/container/clamp/motion-tokens) + liquid-glass material + add deps (`motion`, `auto-animate`, `canvas-confetti`) + enable View Transitions for screen changes. Visual refresh of all existing screens with no behavior change.
2. **Tactile board** — 3D card-flip reveal, press/stagger/count-ups, optimistic flip. The hero interactions.
3. **Signature moments** — shared-element tile→win-modal, confetti/win sequence (+ optional lazy GSAP), leader "you hold the key" reveal, lobby presence energy.
4. **Sound + haptics** — `use-sound`/Howler sprite (CC0), `AudioContext` unlock, `prefsStore` sound/volume/haptics, Settings controls, haptics layer.
5. **Blitz** — server-authoritative per-turn timers (off-by-default, presets, last-10s escalation, expiry-passes-never-reveals) + clock-offset/`useCountdown` + `TurnTimer` UI + sudden-death resolver & UI.

Order rationale: Foundation unblocks everything; the board (2) and moments (3) are the headline "creativity" the owner asked for; sound (4) and blitz (5) layer on cleanly. Slices can be re-ordered on request (e.g., sound before blitz is fine).

## 12. Testing & verification (per slice)

- Pure logic (timer config, sudden-death, clock-offset math) unit-tested (TDD); coverage ≥ 80% on `src/lib/**`.
- Server integration: timer expiry **passes the turn and never reveals a card**; sudden-death resolves deterministically.
- Reduced-motion / sound-off / colorblind **parity** checks; RTL correctness.
- Playwright across mobile (390px) + desktop: a timed round, the flip/reveal, win celebration, sound toggle; **0 console errors**; bundle-budget check (~14kb added baseline).
- Project reviewer agents (game-logic / socket-event / arabic-rtl) per slice; address CRITICAL/HIGH before merge.

## 13. Out of scope (this spec)
Word packs + daily challenge (Phase 3), AI solo/co-op (Phase 4), progression/social/leaderboards (Phase 5), backend persistence/Redis, native wrappers, background music (SFX only for now). Real 3D/WebGL (fake depth with CSS).

## 14. Success criteria
A casual player opens a link and is playing in <30s; the board feels like real cards (flip/press/sound/haptic); the hint and the win are theatrical; an optional blitz adds tension without stress; everything is fully usable color-blind, reduced-motion, and sound-off; RTL is flawless; bundle stays lean; and every quality gate is green. The result is, demonstrably, the best-looking and best-feeling open-source Codenames-style game.
