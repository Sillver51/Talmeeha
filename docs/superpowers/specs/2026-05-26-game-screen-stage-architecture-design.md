# Game Screen — Stage Architecture (Design Spec)

> **Status:** Draft for review · **Author:** Claude (brainstorming) with JoeDev · **Date:** 2026-05-26
> **Predecessors:** [`2026-05-23-talmeeha-nextjs-design.md`](./2026-05-23-talmeeha-nextjs-design.md) · [`2026-05-23-talmeeha-redesign-design.md`](./2026-05-23-talmeeha-redesign-design.md) · [`2026-05-25-talmeeha-liquid-night-blitz-design.md`](./2026-05-25-talmeeha-liquid-night-blitz-design.md)
> **Scope:** in-game screen only (`#s-game`). Foundation CSS fix touches `globals.css`.
> **Constraints:** stay inside [`DESIGN.md`](../../../DESIGN.md) (Neon Night) · [`docs/brand/BRAND.md`](../../brand/BRAND.md) voice · RTL-native · no server / store / game-logic changes.

---

## 1. Why this spec exists

A live audit (Playwright tour across Home → Setup → Game on desktop 1440×900 and mobile 390×844) surfaced two distinct problems:

1. **A real CSS cascade bug** — `src/app/globals.css:247` is an **unlayered** universal reset:

   ```css
   *{box-sizing:border-box;margin:0;padding:0}
   ```

   In Tailwind v4, utilities live inside `@layer utilities`. Per the CSS cascade rules, unlayered rules beat layered rules regardless of specificity. As a result, every `px-*`, `py-*`, `m-*`, `mt-*`, `pe-*`, `ps-*` utility in the app is silently zeroed. Symptoms observed in the browser:

   - `+ أضف` (add-player) renders as a squished 41×28 px pink chip that visually overlaps the input.
   - `🚀 ابدأ اللعبة` renders as a 700×32 px thin gradient strip — no vertical padding.
   - `إرسال` (clue submit), `رجوع`, `إنهاء الدور` all render flat/cramped.
   - `/ui-catalog` (the "DESIGN.md as components" reference page) is system-wide broken.

   Computed-style probe via `getComputedStyle` confirmed `padding: 0px` on every shadcn `Button` regardless of its `px-*` utility class.

2. **The game screen lacks game-feel.** Eight separate dark panels stack above the board (`GameHeader`, `HostBar`, `HandoffGate`, current-player-badge, `Counters`, `CluePanel`, `LeaderPanel`/`ActionRow`, then the `Board`, then `GameLog`). On mobile, ~50% of the viewport is chrome before the board appears. Word cards render as flat bevelled bricks, not the **glass tiles** spec'd by Neon Night ([`DESIGN.md` §0](../../../DESIGN.md#0-neon-night-phase-1--live-system)). Information is duplicated across the turn-box and the current-player-badge. The game log is text-only and easy to miss. There are no phase rituals — clue submission, card reveal, turn handoff, and the win sequence all happen with zero motion, so the screen reads like a debug admin panel.

This spec addresses both: a one-line foundation fix, then a three-zone redesign of the game screen with a tasteful synthesized audio layer and Arabic-native signature moments.

---

## 2. Goals

- **Make every shadcn button in the app render at its intended size.** Repair the cascade so utilities win against the legacy reset.
- **Compress chrome density on the game screen.** Single source of truth for "whose turn / what phase / what's the clue". Board becomes the hero.
- **Express true Neon Night material on the board.** Glass tiles per [`DESIGN.md` §0 and §6](../../../DESIGN.md#0-neon-night-phase-1--live-system).
- **Add a motion language of eight phase rituals** that turn state changes into felt moments without ever interrupting play.
- **Add a tasteful synthesized audio layer** — opt-in, zero asset weight, autoplay-policy clean, gated by user preference.
- **Carry distinctive Arabic-native moments** (tashkeel headline, calligraphy cascade, personal initial sweep, Maqam Rast win phrase) so Talmeeha reads as something only an Arabic-first team would have built.
- **Preserve parity.** Server, store, types, game logic, and the existing role/phase visibility rules are untouched. Migration is a UI re-composition.

## 3. Non-goals

- Redesign of Home, Setup, Lobby, or `WinModal` (separate follow-up specs if desired).
- New brand tokens, palettes, or fonts. We use only what Neon Night already defines.
- Server-side, store, or socket-contract changes.
- Game-logic / rules changes.
- Recorded audio files, voice-over, TTS, or vocal music.
- Haptic vibration API.
- Removing or rewriting `globals.css` (we wrap the broken reset and add a new scoped `game.css`; trimming the legacy file is a future spec).

---

## 4. Foundation — the CSS cascade fix

### 4.1 The change

In `src/app/globals.css`, replace line 247:

```css
*{box-sizing:border-box;margin:0;padding:0}
```

with:

```css
@layer base {
  *{box-sizing:border-box;margin:0;padding:0}
}
```

That is the only change. The legacy hand-built styles below (`.screen`, `.btn`, `.wc`, `.team-setup-card`, etc.) remain unlayered, which means they retain their current cascade priority relative to one another. Tailwind v4 utility classes — which live inside `@layer utilities` — now win against this reset (because layered utilities outrank base which outranks the layered-but-implicitly-lower base order).

### 4.2 Why this is safe

- Legacy CSS rules don't target shadcn elements (`[data-slot]`), so they don't compete.
- The shadcn `[data-slot]` reset (lines 238–245 of `globals.css`) is already inside `@layer base` and continues to win over its own scope.
- Existing inline `style={...}` attributes are unaffected — inline styles always win.
- The vanilla `.btn-*` classes are unused on the migrated screens (per recent commits 5908827, fa38768, 71931de — buttons are shadcn).

### 4.3 Verification (acceptance criteria)

- `getComputedStyle` on `.add-player-row button[data-slot="button"]` reports `padding-inline ≥ 10px` (was 0).
- `+ أضف` button visually clears the input field (no overlap).
- `ابدأ اللعبة` renders ≥ 36 px tall.
- `/ui-catalog` page renders each variant at correct height (≥ 28 px, depending on size).
- A Playwright regression test on `/ui-catalog` asserts a sample `<Button size="default">` has nonzero `padding-inline`.

---

## 5. Architecture — three zones

The game screen becomes a sticky-top + flexible-middle + sticky-bottom stage.

```
┌───────────────────────────────────────────────┐
│  STATUS STRIP    sticky-top    56–64 px       │   single source of truth
│  ┌───────┐ ┌───────────────────────┐ ┌─────┐  │
│  │ red   │ │   Turn Capsule        │ │blue │  │
│  │ score │ │  + clue + timer       │ │score│  │
│  └───────┘ └───────────────────────┘ └─────┘  │
│              [⚙ host sheet trigger]            │
├───────────────────────────────────────────────┤
│                                               │
│          BOARD STAGE       flex-1             │
│  · ambient team-glow loop (CSS keyframe)      │
│  · faint Arabic-letter constellation (SVG)    │
│  · 5×5 glass tiles (real Neon Night)          │
│  · leader key sweep on first entry            │
│  · doubt badges, key tints                    │
│                                               │
├───────────────────────────────────────────────┤
│  ACTION DOCK     sticky-bottom    auto h      │   role-aware shape-shifter
│   Leader → clue input · Guesser → pills       │
│   Host (leader phase) → handoff · (guess) →   │
│   controls · Ended → "لعبة جديدة"             │
│   Off-turn → collapsed strip                  │
└───────────────────────────────────────────────┘
```

### 5.1 Component map

**New components** (in `src/components/game/`):

| Component | Responsibility | Replaces |
|---|---|---|
| `StatusStrip.tsx` | Top sticky strip; renders scores + capsule + host-sheet trigger | `GameHeader`, `Counters`, parts of `HostBar`/`HandoffGate`, `CluePanel` |
| `TurnCapsule.tsx` | Center of the strip; pure render-by-(role, phase, gphase, turn) | (new) |
| `PoeticCapsule.tsx` | Picks one Arabic phrase from a state-keyed library | (new) |
| `BoardStage.tsx` | Ambient stage frame around `<Board/>`; key-sweep trigger; doubt overlay | (wraps) |
| `ArabicConstellation.tsx` | Decorative SVG constellation in stage background | (new) |
| `CalligraphyText.tsx` | Per-letter span wrapper for reveal cascade | (new) |
| `ActionDock.tsx` | Bottom sticky panel; routes by (role, phase, turn) to one of 5 shapes | `LeaderPanel`, `ActionRow`, bottom half of `HandoffGate`, redundant badge |
| `dock/LeaderInput.tsx` | Clue word + count + send | `LeaderPanel` |
| `dock/GuesserActions.tsx` | Doubt-mode pill + end-turn | `ActionRow` |
| `dock/HostHandoff.tsx` | "Pass to leader" + hold-to-peek | `HandoffGate` (host case) |
| `dock/HostGuessControls.tsx` | Hint snapshot + end-turn (host during guess phase) | `HostBar` (subset) |
| `dock/EndedActions.tsx` | "New game" CTA shown above the WinModal scrim | (new) |
| `dock/OffTurnStrip.tsx` | Collapsed 24-px strip with whose-turn + countdown | (new) |

**Absorbed (deleted as standalone files):**
`GameHeader.tsx`, `HostBar.tsx`, `HandoffGate.tsx`, `Counters.tsx`, `CluePanel.tsx`, `LeaderPanel.tsx`, `ActionRow.tsx`.

**Kept (unchanged or near-unchanged):**

- `Board.tsx` — wrapped by `BoardStage`; internal map/render is preserved.
- `WordCard.tsx` — props contract preserved; visual restyle (glass material) + reveal animation hooks. `React.memo` added for re-render discipline.
- `TurnTimer.tsx` — logic stays; its visual is reduced to a border-pulse on the capsule, driven by the same `deadlineAt` countdown.
- `WinModal.tsx` — Radix Dialog as-is.
- `Confetti.tsx` — reused for win sequence with team-color particles.
- `GameLog.tsx` — on desktop, visible inline at start-bottom; on mobile (≤520 px), moves into a drawer triggered from the strip.

### 5.2 Server / store / types — zero changes

The new components consume `useGameStore` selectors:

- `StatusStrip` → `gs`, `myId`, `isHost`, `winsData`, `prefs.digits`
- `TurnCapsule` → derived from `gs.turn`, `gs.phase`, `gs.gphase`, `gs.clue`, `gs.guessesLeft`, `gs.leaders`, `gs.players[myId]`
- `BoardStage` → `gs`, `myId`, `role`, `hostViewLeader`, `peeking`, `doubtMode`
- `ActionDock` → `role`, `gs.phase`, `gs.gphase`, `gs.turn`, `isMyTurn` + actions `sendClue`, `endTurn`, `toggleDoubtMode`

Roles continue to come from `myRole(gs, myId, isHost)` in `src/lib/ui/roles.ts`. No new selectors or store slices are required.

### 5.3 Mobile-first geometry

| Breakpoint | Status Strip | Board | Action Dock |
|---|---|---|---|
| ≤ 360 px | 52 px tall, scores as 1 line | 3 cols, gap 4 px | 80 px default, 144 px when leader input focused |
| ≤ 520 px | 56 px tall | 4 cols, gap 5 px | 88 px default |
| ≥ 720 px | 64 px tall | 5 cols, gap 7 px | 96 px default, log visible inline at start-bottom |

The board always wins remaining viewport. Strip and dock are `position: sticky` (top / bottom). On mobile, the strip's host-sheet trigger (a `⚙` icon-button) opens an existing shadcn `Sheet` containing host controls + the `GameLog` drawer.

---

## 6. Word card material — true Neon Night glass

Per [`DESIGN.md` §0 and §6](../../../DESIGN.md#0-neon-night-phase-1--live-system) the canonical unrevealed state is glass, not sand. Current CSS still emits the embossed sand brick; this spec migrates it.

### 6.1 States

| State | Treatment |
|---|---|
| Unrevealed (glass) | `background: rgba(255,255,255,.045)` · `backdrop-filter: blur(10px)` · `border: 1px solid rgba(255,255,255,.10)` · `box-shadow: inset 0 1px 0 rgba(255,255,255,.06), 0 2px 6px rgba(0,0,0,.3)` · text `--text` |
| Hover (interactive) | `transform: translateY(-2px) scale(1.02)` · grape border + `0 4px 16px rgba(139,92,246,.4)` glow |
| Revealed — red | `linear-gradient(135deg, #D01830, #FF4D8D)` · `0 0 14px rgba(255,77,141,.4)` bloom · white text |
| Revealed — blue | `linear-gradient(135deg, #0C30B0, #34A8FF)` · blue bloom · white text |
| Revealed — neutral | `linear-gradient(135deg, #3A2E1A, #4A3C22)` · tan text |
| Revealed — assassin | `linear-gradient(135deg, #0D0505, #1A0808)` · sharp red bloom · ☠ + dim red text |
| Leader key view (`h-{type}`) | translucent team tint fill + 2 px team-color border on hidden tiles (unchanged from current rule) |
| Doubt badge | `🤔` + count chip in top-start corner, grape background |

### 6.2 Reveal animation

A 3D Y-axis flip, 350 ms, spring eased (`cubic-bezier(.34, 1.56, .64, 1)`):

```css
.wc.reveal-flip {
  transform-style: preserve-3d;
  animation: wcFlip 350ms cubic-bezier(.34, 1.56, .64, 1) both;
}
@keyframes wcFlip {
  0%   { transform: rotateY(0) }
  100% { transform: rotateY(180deg) }
}
.wc.reveal-flip > .back { transform: rotateY(180deg); backface-visibility: hidden; }
```

The board element gets `perspective: 1000px`. The bloom is a pseudo-element with a radial gradient, opacity tweened from 0 → 1 → .6 across the flip.

`will-change: transform` is set on the card *during* the reveal and removed in a `transitionend`/`animationend` handler so it doesn't accumulate.

### 6.3 Calligraphy cascade on reveal

The revealed word renders via `<CalligraphyText word={card.w} />`. Each Arabic letter is wrapped in a `<span>` with `animation-delay: calc(var(--i) * 30ms)` and a fade-in-from-start-side keyframe. The visual evokes Arabic calligraphy writing flow (right-to-left character cascade). Under `prefers-reduced-motion`, the cascade collapses to a single fade.

---

## 7. Motion language — eight phase rituals

| # | Moment | Visual | Sound |
|---|---|---|---|
| 1 | Clue submitted | Clue word shimmer-sweeps into the Turn Capsule (grape → gold → cyan background-position sweep, 600 ms). Dock height transitions from input-mode to guesser-mode (240 ms cubic-bezier(.34,1.56,.64,1)). | Ascending 3-note shimmer (G→B→D, triangle voice) |
| 2 | Card reveal (own color) | 3D Y-flip + team-color bloom. Score number count-ups; team glyph (▲ / ⬣) does a single 1.15× → 1.0 bounce. | Team-tuned major chime |
| 3 | Card reveal (wrong color) | Flip + ±3 px shake (4 cycles, 240 ms total). Capsule briefly pulses red, then swaps to the new active team's color. | Minor two-note descent |
| 4 | Card reveal (neutral) | Flip + warm-brown bloom. Capsule swaps team color. | Soft mallet thud |
| 5 | Card reveal (assassin) | Flip + sharp red bloom. Stage desaturates 180 ms (filter: grayscale .6) before `WinModal` opens. | Deep gong + reverb tail |
| 6 | Turn handoff | Capsule text slides start-side out, new text slides end-side in (240 ms, opacity cross-fade). Capsule gradient morphs simultaneously. | Whoosh + team chord |
| 7 | Timer urgency | `< 10 s`: capsule border pulses (1 s loop, opacity .6 → 1). `< 3 s`: border color shifts gold, pulse intensifies. | Subtle tick layer, only `< 10 s` |
| 8 | Win sequence | Wave reveal: tiles flip in row order (80 ms stagger). Stage glow brightens to winner color. `WinModal` fades in. `Confetti` emits team-color particles. | 6-note phrase in **Maqam Rast** (D-E-F#-G-A-Bb) |

Additional ambient/idle motion:

- **Stage glow loop** — single pseudo-element with `radial-gradient` in active team color; opacity .5 ↔ 1, scale 1 ↔ 1.05, 7 s ease-in-out, infinite. Zero JS.
- **Arabic constellation breath** — `<ArabicConstellation/>` is a fixed SVG of faint Arabic letterforms (ا ل م ر) layered behind the board; opacity 0.04 ↔ 0.08 on the same 7 s loop.
- **Leader key sweep (polished)** — existing diagonal grape→gold sweep on the leader's first entry to the playing phase. Adds an inline initial-letter (`أ` for أحمد) that fades in/out at board center during the sweep — a personal "the key is yours" moment.
- **Doubt aura** — toggling `🤔 وضع الشك` emits a purple ripple that briefly tints the stage edge (radial-gradient pseudo, opacity 0 → .35 → 0, 600 ms).
- **Hand-pass animation** — for host pass-and-play handoff, a small CSS-drawn hand glides from start-side to end-side, looping. Culturally evocative of physical passing.

### 7.1 Reduced-motion behavior

All eight rituals respect:

```css
@media (prefers-reduced-motion: reduce) { … }
[data-reduced-motion="on"] { … }
```

Reduced-motion fallbacks: flip → instant fade; shake → no shake; bloom → static; sweep → instant tint; pulse → static color shift. Sound is **not** muted by reduced-motion (motion ≠ sound; users may want sound feedback while motion-still). Sound is gated by its own `prefs.sound` instead (§ 8).

---

## 8. Audio layer

### 8.1 Architecture

```
src/lib/audio/
  engine.ts        — single shared AudioContext, master gain, mute pref
  voices.ts        — synthesis primitives (chime, bloom, gong, whoosh, tick)
  events.ts        — high-level: playReveal(team), playClueSubmit(), playWin(), …
  useGameSounds.ts — hook mounted at GameScreen; subscribes to relevant store fields
```

`AudioContext` is created lazily on the first user gesture (any click within the game screen) so we comply with the browser autoplay policy. If `prefs.sound === false` (the default), no context is ever created.

Voices are built from `OscillatorNode` (sine/triangle for chimes, sawtooth + sine for the gong, white-noise band-pass for the whoosh) and `GainNode` envelopes (linearRampToValueAtTime). No audio files. Total JS cost: ~3 KB.

### 8.2 Event ⇄ sound table

| Event | Voice |
|---|---|
| `playClueSubmit()` | Triangle G4 → B4 → D5, 80 ms each, soft attack |
| `playReveal('red')` | Sine A4 + triangle B5, 250 ms decay |
| `playReveal('blue')` | Sine E5 + triangle B5, 250 ms decay |
| `playReveal('neutral')` | Sine 220 Hz, 80 ms envelope |
| `playReveal('assassin')` | Sine C2 + saw C2, 1.8 s decay, low-pass filter |
| `playWrong()` | Sine Bb4 → A4, 120 ms |
| `playTurnHandoff(team)` | Band-passed white-noise whoosh + two-note chord in team key |
| `playTickUnder10()` | Repeating tick (`setInterval` driven by `deadlineAt`); muted ≥10 s |
| `playWin(team)` | 6-note Maqam Rast phrase: D-E-F#-G-A-Bb, triangle voice, 150 ms per note |
| `playTileHover()` | Optional, default-off; -30 dB ultra-quiet tap |

### 8.3 User-facing settings

The existing `SettingsSheet` (`src/components/a11y/SettingsSheet.tsx`) gains two controls:

- `الصوت` — shadcn `Switch`, persisted as `prefs.sound: boolean` (default `false`).
- `مستوى الصوت` — shadcn `Slider` 0–100, persisted as `prefs.volume: number` (default `60`). Disabled when `sound` is off.

`prefsStore` adds the two fields and writes them to `localStorage` like the existing prefs.

### 8.4 Testing the audio layer

- Unit (vitest): stub `window.AudioContext`; assert `engine.init()` is a no-op when `prefs.sound=false`; assert each `playX()` schedules the expected number of `OscillatorNode.start()` calls.
- Integration: render `<GameScreen/>` with mocked store; trigger state changes; assert hook calls the right event functions (spy on `events.ts`).
- Manual: with sound on, perform each ritual in the live app and confirm voice character matches the table.

---

## 9. Arabic-native creative — phrase library

`src/lib/copy/capsule.ts` exports a state-keyed phrase library. Each state may resolve to one of 2–4 phrases; selection is deterministic from a hash of `(state-key, gs.gameId)` so the phrase stays stable for the duration of a game but varies between games. The library is **the only place** the spec adds Arabic copy.

Examples (representative, not exhaustive — voice per [`BRAND.md`](../../brand/BRAND.md)):

```ts
// state: { phase: 'playing', gphase: false, isMyTurn: true, role: 'leader' }
[
  "هذا دورك يا {name} · همِسة واحدة",
  "كلمة واحدة، يا قائد {name}، يكفي",
  "{name}، الفريق ينتظر تَلْميحَتك",
]

// state: { phase: 'playing', gphase: true, isMyTurn: true, role: 'guesser', clue: '{clue}', count: '{count}' }
[
  "{clue} · {count} · ما الذي يخطر ببالك؟",
  "اقرأ اللوحة بهدوء — {clue}",
]

// state: { phase: 'playing', isMyTurn: false }
[
  "تنفّس · سيلتقطها الفريق الآخر",
  "اشرب رشفة قهوة، الدور للفريق الآخر",
]
```

The library is co-located with its types and tested with snapshot tests (assert every state-key resolves to at least one phrase; assert template variables are interpolated correctly).

A separate constant `CAPSULE_HEADLINE_TASHKEEL = "تَلْميحَة"` is rendered once per game on capsule mount (the brand word with diacritics) — a small premium touch.

---

## 10. Performance discipline

- **Compositor-only animation** — only `transform` and `opacity` are animated. No `width/height/top/left` animation on the hot path.
- **`will-change` discipline** — applied on the card during the reveal, removed in the `animationend` handler. Not set globally.
- **`React.memo(WordCard)`** with a shallow-equal props check. Verified that turn-tick updates don't re-render all 25 tiles.
- **Capsule timer pulse is pure CSS** keyframes; no per-frame React state updates.
- **Ambient stage glow** is a single pseudo-element animating `opacity` + `transform: scale()`. Zero JS, zero layout.
- **`backdrop-filter` bounded** to four surfaces (strip, dock, stage, tiles). Verified on mid-range Android Chrome in dev tools throttle (4× slowdown) — stays > 50 fps during reveal.
- **Confetti canvas** is only mounted while the `WinModal` is open. Unmounted (and `cancelAnimationFrame` called) on close.
- **AudioContext** lazy-init on first gesture; not created at all if `prefs.sound=false`.

Acceptance: Chrome DevTools Performance trace of a full guess-and-reveal cycle shows zero Layout/Recalculate-Style entries on the main thread during the animation.

---

## 11. Testing strategy

### 11.1 Unit (`vitest`)

- **TurnCapsule:** rendered with mocked store states across the full `role × phase × gphase × isMyTurn` matrix (≥ 12 combinations). Asserts the right phrase resolves, the right team color applies, the timer pulse class appears `< 10 s`.
- **ActionDock router:** asserts the right child component renders for each `(role, phase, gphase, isMyTurn)` combination.
- **Audio engine:** stubs `AudioContext`; asserts no scheduling when `prefs.sound=false`; asserts each `playX()` schedules the expected oscillators.
- **CalligraphyText:** asserts each Arabic letter renders as a span with the right inline `--i` index.
- **Capsule phrases:** asserts every state-key resolves; asserts template variables interpolate; asserts deterministic-by-gameId.

### 11.2 Integration (`vitest` + React Testing Library)

- `<GameScreen/>` mounted with a mocked store running through a scripted turn (clue → reveal own → reveal wrong → end turn). Asserts the right components render and the right audio events fire (spy on `events.ts`).

### 11.3 E2E (`playwright`)

- **Visual snapshots** at desktop (1440×900) and mobile (390×844):
  - leader pre-clue, leader post-clue (own waiting), guesser post-clue, host leader phase, host guess phase, win red, win blue, ended-by-assassin
- **Cascade regression:** on `/ui-catalog`, assert a sample `<Button size="default">` has nonzero `padding-inline`.
- **Reduced-motion check:** set `[data-reduced-motion="on"]`; trigger a reveal; assert no `transform` animation runs (the back-face appears via opacity only).
- **Audio default-off:** load `/`; perform a click; assert no `AudioContext` was created (window-level spy).

### 11.4 Manual sanity

Two-tab parity test: open the app in two browser windows, play a full host-mode game in window A while a viewer watches in window B. Confirms server authority is untouched and the new components render correctly for both viewers.

---

## 12. Migration plan (sequencing)

1. **Foundation:** the one-line cascade fix in `globals.css:247`. Verify `/ui-catalog` is clean. *(Atomic, mergable on its own.)*
2. **Audio scaffolding:** add `src/lib/audio/*` with `prefs.sound=false` default. No call sites yet. Settings adds the toggle. *(Mergable on its own; user-visible only as a settings toggle.)*
3. **New components, structural-only:** build `StatusStrip`, `BoardStage`, `ActionDock` and the five dock shapes with current materials/styles — no animations, no audio wiring yet. Switch `GameScreen` to compose them. Delete absorbed components. *(Visual parity with current screen; no regressions.)*
4. **Word card glass material + reveal flip + calligraphy cascade.** New `game.css` introduced. WordCard gets `React.memo`. *(Visible material change.)*
5. **Capsule phrase library + tashkeel headline + poetic micro-copy** wired into `TurnCapsule`.
6. **Motion rituals:** wire the eight phase rituals into the components. Reduced-motion fallbacks first; full motion second. Verified on mobile dev-throttle.
7. **Audio wiring:** subscribe `useGameSounds` in `GameScreen`; map each ritual to its event. Manual QA pass with sound on.
8. **Tests:** unit + integration + Playwright snapshots + cascade regression test.

Each step is its own PR. Steps 3 and 4 are the largest; everything else is small.

---

## 13. Open questions for the user

> None at draft time. If any of the sound voices, phrase examples, or layout decisions feel off after a first pass, they're small to tune.

---

## 14. Glossary refresher (per [`CLAUDE.md`](../../../CLAUDE.md))

تلميحة hint · القائد leader · القاتل assassin · محايد neutral · الفريق team · اللوحة board · علامة الشك doubt mark · وضع المضيف host mode · وضع أونلاين online mode · رمز الغرفة room code · المقام Maqam (Arabic musical mode) · تَلْميحَة tashkeel-decorated brand word for the capsule headline.
