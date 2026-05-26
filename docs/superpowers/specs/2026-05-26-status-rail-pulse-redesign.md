# Status Rail — "Pulse" redesign

> Date: 2026-05-26 · Status: drafted (pending user review)
> Predecessor: [`2026-05-26-game-screen-night-stage-redesign.md`](2026-05-26-game-screen-night-stage-redesign.md)
> Canon overlay: [`DESIGN.md` §0 — Neon Night](../../../DESIGN.md) · [`BRAND.md`](../../brand/BRAND.md)

## 1. Problem

The top status rail of the in-game screen (`StatusStrip` + `TurnCapsule` +
buried `PoeticCapsule`) carries roughly twelve distinct visual items in one
horizontal band:

**Per team (×2 — `TallyStone`):** big remaining-cards numeral · dot bar
(one team-glyph per remaining card) · team-name row with glyph · wins pill
(crown if leading).

**Center (`TurnCapsule`):** pre-clue turn label + glyph · clue mode (clue
word with shimmer + count chip + remaining count) · poetic sub-line.

**Inline host actions:** show/hide key toggle · settings.

Three concrete defects emerge:

1. **Too much info / cluttered.** The dot bar duplicates the numeral; the
   team-name label echoes information already conveyed by team color and
   glyph; the wins pill competes with the primary remaining-cards numeral
   for attention.
2. **Not dynamic.** The rail looks identical across awaiting-clue,
   clue-given, urgency, reveal, and ended phases. Nothing in the layout
   itself tells the player *what moment we are in*. The poetic sub-line
   was designed to fix this but lives at `.62rem opacity .88` and is
   functionally invisible (per the Night Stage audit).
3. **Lack of creative identity.** Symmetric team-glass-capsules + a
   center-pill could belong to any board game. Talmeeha has none of the
   visual identity that distinguishes a memorable HUD.

## 2. Direction — "Pulse"

Keep the Neon-Night glass language and Arabic-first voice. Restructure the
rail around three structural elements that **morph per game moment**:

```
                 ┌─────────────────────────────────────────────┐
   ARC-RED   →   │   HEADLINE (morphs per moment)              │   ←  ARC-BLUE
                 └─────────────────────────────────────────────┘
                 ┌─────────────────────────────────────────────┐
                 │   VOICE STRAND (poetic line, animated)      │
                 └─────────────────────────────────────────────┘
                 (host actions tray — only when host)
```

In RTL, the **red arc sits at the right edge** (logical leading, since red
goes first), blue at the left. Host action chips become a small tray row
beneath when needed — they no longer share the headline rail.

### 2.1 The five moment states

The rail moves through five distinct moment states, all derived from
existing `PlayerView` fields. There are no new socket fields and no
changes to game logic.

| Moment | Trigger condition | What the rail shows |
|---|---|---|
| `awaiting-clue` | `phase === "playing" && !gphase` | Headline: `"في انتظار التلميحة من [leader]"`; leader-name underline pulses in team color |
| `clue-given` | `phase === "playing" && gphase && clue` | Headline: clue word (continuous shimmer) + count chip + `تبقّى N` |
| `urgency` (overlay) | `msLeft ≤ 10s` (atop `clue-given`) | Thin 1px gold stroke on headline + small countdown numeral under the clue line |
| `reveal-burst` (transient ~700ms) | log-event change indicating a card was revealed | Particle burst behind headline, color-keyed to revealed card; assassin = headline shake |
| `ended` | `phase === "ended"` | Headline: `"🏁 فاز [team]"`; winner arc sweeps to 100%, loser fades to 30% |

`urgency` and `reveal-burst` are **overlay states** layered onto the
underlying moment — they do not replace `clue-given`, they decorate it.
`ended` is exclusive.

### 2.2 The arc dial (new primitive)

A single SVG element that replaces *numeral + dot bar + team-name label +
wins pill* per team.

- **Geometry:** 56px diameter on desktop, 48px on mobile. Stroke width
  4px. Arc renders clockwise from 12 o'clock.
- **Fill:** `arc-fill = remaining / startingTotal`. `startingTotal` is
  derived from game rules — red goes first and starts with 9 cards,
  blue with 8 — encoded as a constant `TEAM_START_TOTAL = { red: 9,
  blue: 8 }` co-located with `ArcDial`. The constant is the single
  source of truth on the client; the server's actual values are not
  exposed in `PlayerView`. If a non-default configuration produces
  `remaining > startingTotal`, we widen the denominator to `remaining`
  at render time so the arc never overflows past full.
- **Stroke color:** team neon (`--red #FF4D8D` / `--blue #34A8FF`) at full
  saturation when active, ~40% saturation when idle.
- **Center glyph:** large `<TeamGlyph>` (`▲` red, `⬣` blue), centered.
  Active team: glyph at full color + soft `box-shadow: 0 0 16px team/.4`
  on the arc container; idle: dimmed.
- **Win-tick marks:** small filled chevrons above the arc, one per win,
  max 5 visible. After 5, render a single `+N` chip in team color.

**Behavior:**

- Score drops by 1 (a card of this team's color was revealed) → arc
  tweens to new fill (300ms ease-out) + container scale pulse
  (`1.0 → 1.06 → 1.0`, 250ms).
- New win recorded → new tick element appears with scale-in (200ms) +
  brief team-color halo flash on the container.
- Game ends, this team won → arc sweeps to 100% (600ms ease-in-out) with
  full-saturation pulse; opposite team's arc desaturates further (~20%).

**Reading at a glance:** instead of reading "5", you see "arc roughly
half full, with 1 tick" — you know remaining *and* lifetime wins in one
look. Precise count is preserved for screen readers via
`aria-label="نقاط [team]: 5 من 9، انتصارات: 2"`.

**Animation stack:** plain CSS — `stroke-dashoffset` transitions for the
arc fill, `transform: scale()` for the pulse, CSS keyframes for the
victory sweep and tick scale-in. No Framer Motion / animation library
dependency added (we keep the dep surface tight; this isn't enough
animation to warrant a runtime).

**Performance:** all animated properties are compositor-friendly
(`stroke-dashoffset`, `transform`, `opacity`). `will-change: transform`
applied via a transient `.is-animating` class on the container during
the pulse, removed on `transitionend`. No layout thrash.

### 2.3 The morphing headline

The center slot is one container whose content swaps per moment state.

**State 1 — `awaiting-clue`:**

```
       في انتظار التلميحة من حسن
                  ──────  ← team-color underline, 2s pulse
```

- Weight 800, `clamp(.95rem, 2.6vw, 1.1rem)`.
- Leader name carries a 2px team-color underline that pulses opacity
  `1 → .5 → 1` over 2s, linear loop.
- Optional: leader's first character in a small circular team-color chip
  immediately before the name (echoes the existing `leaderInitial` plumb
  in `GameScreen.tsx`).

**State 2 — `clue-given`:**

```
         المحيط  ✦  ⓷         ← clue word (shimmer) · count chip
              تبقّى ٢                ← remaining (small)
```

- Clue word: weight 900, `clamp(1.1rem, 3vw, 1.4rem)`, **continuous 8s
  shimmer** keyframe (already present in `game.css`).
- Count chip: small filled team-color pill containing `clue.n`. Uses
  `formatNumber(n, digits)` so the chip respects `prefsStore.digits`
  (Arabic-Indic vs Latin).
- Remaining (`تبقّى N`): weight 600, `.85rem`, opacity .9, sand color.
  Uses `gs.gleft`.

**State 3 — `urgency` (overlay on `clue-given`):**

- Adds a 1px gold pixel-stroke (`--gold` token) around the headline
  container. Opacity pulses `1 → .6 → 1` over 2s (slow ease — no
  strobing).
- A small countdown numeral appears below the clue line: weight 700,
  `.85rem`, gold token color, `font-variant-numeric: tabular-nums` to
  prevent width jitter. Renders the integer seconds remaining
  (`Math.ceil(msLeft / 1000)`) formatted via `formatNumber(n, digits)`.
- At `msLeft ≤ 3s`: stroke goes solid gold (no pulse) + the countdown
  numeral scales to `1.1×` for 150ms on each second tick.

**State 4 — `reveal-burst` (transient ~700ms):**

- A small particle burst (4–6 elements) emanates from behind the
  headline, color-keyed to the revealed card:
  - Own-team hit → team color sparks (radial, 400ms fade-out).
  - Wrong-team hit → opposite team color, subdued (50% saturation).
  - Neutral hit → sand/gold sparks.
  - **Assassin** hit → red flash + headline `translateX(±2px)` 3 cycles
    over 150ms (gravity, not celebration).
- Triggered by a `useEffect` watching `gs.log`: compare last entry to
  the previous render's last entry; if the new entry is a reveal event,
  fire the burst. Compute revealed card's color from the log line via
  `lastEvent.ts` extractor (see §2.6).
- Particles are absolute-positioned elements with `transform` +
  `opacity` only. `aria-hidden="true"`.

**State 5 — `ended`:**

```
              🏁 فاز فريق المحيط
```

- Weight 900, `clamp(1.2rem, 3.4vw, 1.5rem)`.
- On mount: one-shot 600ms team-color halo bloom behind the text.
- Coordinates with arc dials per §2.2: winning team's arc sweeps to
  100%, losing team's arc desaturates further.

**Transitions between states:** 250ms cross-fade with translateY 4px.
Old content fades + drops 4px; new content fades in + rises 4px from
4px below. `prefers-reduced-motion` collapses to instant swap.

### 2.4 The voice strand

`PoeticCapsule`'s phrase-pool logic is preserved verbatim. What changes
is positioning and presentation.

- Moves from "buried sub-line inside the turn capsule" to a **dedicated
  strand directly below the rail**.
- Italic Tajawal, weight 600, `clamp(.78rem, 2.2vw, .9rem)`, **full
  opacity** (was `.88`), `--ink-quiet` color.
- Centered, single line, soft `max-width: 60ch`.

**Context-aware speech:** the strand pulls phrases keyed to the
**moment state** + the **last log event** (rather than just the turn).
Phrase pool selection remains deterministic by `gameId + event index`
(existing pattern from commit `a6dd524`).

| Moment / event | Phrase category | Example |
|---|---|---|
| `awaiting-clue` | contemplative | `تصمت العقول قبل أن تنطق` |
| `clue-given` (fresh) | rallying for active team | `يا فريق [team]، الكلمة بين أيديكم` |
| post own-team hit | praise | `إصابة موفّقة!` |
| post wrong-color hit | gentle pity | `ليس هذا اللون…` |
| post neutral hit | wry | `كلمة محايدة… كاد القلب يقفز` |
| `urgency` | tension | `الوقت يضيق…` |
| post-assassin | gravity | `وقع القاتل. النهاية.` |
| post `end-turn` (no reveal) | handoff | `الكلمة الآن لـ[next team]` |
| `ended` | closing | `اللعبة لنا، تلميحة بعد تلميحة` |

**Motion:**

- On phrase change: old phrase fades + translateY `+6px` (200ms), new
  phrase fades in + translateY from `-6px` (250ms, 80ms stagger after
  old exits).
- `aria-live="polite"`; emits each phrase **only once per moment
  change** (track last-announced key in a ref to suppress re-emits from
  unrelated re-renders).
- `prefers-reduced-motion`: instant text swap, no transform.

### 2.5 Responsive recomposition

| Width | Layout |
|---|---|
| `≥1024px` | `[arc-red] [headline center, max-width 60ch] [arc-blue]` flanking; voice strand full-width below; host actions tray right-aligned below voice |
| `640–1023px` | Same horizontal arrangement; headline allowed to shrink to `min-content`; voice strand stays below |
| `<640px` | Arcs collapse to **48px chips** in top corners; headline takes full row 2; voice strand row 3; host tray row 4 |
| `<360px` | Win-tick marks beyond 3 collapse to `+N` chip; voice strand truncates with ellipsis if it overflows 2 lines |

Arc dials maintain ≥ 44×44px tap target if they become interactive in a
future iteration (currently informational).

### 2.6 Last-event extractor (small new utility)

```ts
// src/lib/ui/lastEvent.ts
export type LastEvent =
  | { kind: "clue" }
  | { kind: "reveal-own"; team: Team }
  | { kind: "reveal-wrong"; team: Team }    // hit opposite team's card
  | { kind: "reveal-neutral"; team: Team }
  | { kind: "reveal-assassin"; team: Team }
  | { kind: "end-turn"; team: Team }
  | null;

export function lastEventOf(log: LogLine[], turn: Team): LastEvent;
```

- Pure function, deterministic, unit-tested.
- Parses the last `log` entry; relies only on existing log-line shape
  (no server change). Maps log-line kinds to discriminated
  `LastEvent` variants.
- Used by `Headline` (to trigger `reveal-burst`) and `VoiceStrand`
  (to pick phrase category). Both consume the same value — single
  source of truth for "what just happened".

## 3. Accessibility

- **Arc dial:** `role="img"` + descriptive `aria-label` (`نقاط [team]:
  R من T، انتصارات: W`). Non-interactive.
- **Headline:** `role="status" aria-live="polite"` (already present in
  `TurnCapsule`). Announces once per moment change; particle effects
  carry `aria-hidden="true"`.
- **Voice strand:** `aria-live="polite"`; each phrase emitted at most
  once per moment-change via ref-tracked key.
- **WCAG AA** verified on every headline state. Arc colors are
  decorative (semantic carried by glyph + `aria-label`).
- **`prefers-reduced-motion` + `[data-reduced-motion="on"]`:** kill arc
  tween, headline transition, voice-strand slide, particle burst, and
  shimmer. Arc updates instantly; burst becomes a 200ms opacity flash.
- **`[data-palette="colorblind"]`:** arc strokes use Wong-equivalent
  oklch hues; glyph already carries color-independent identity. Tick
  marks pick up the same swap.
- **RTL native:** arcs positioned with `inset-inline-start` /
  `inset-inline-end`; red arc sits at logical start (visually right in
  `dir="rtl"`). SVG arc paths are symmetrical and require no mirroring.
- **Digits:** count chip, remaining, and countdown all flow through
  `formatNumber(value, digits)`.

## 4. Files touched

- `src/components/game/StatusStrip.tsx` — restructure. Drops
  `TallyStone` helper; renders two `<ArcDial>` + one `<Headline>` +
  `<VoiceStrand>` below the rail; host actions move to a bottom tray.
- `src/components/game/ArcDial.tsx` — **NEW**. SVG arc + center glyph +
  win-tick marks. Pure presentational component. Animation via plain
  CSS (`stroke-dashoffset` transition + transform scale + keyframes for
  victory sweep). No animation library added.
- `src/components/game/Headline.tsx` — **NEW**. Replaces `TurnCapsule`.
  Encapsulates the 5 moment states; consumes `gs`, `role`, `myId`,
  `lastEvent`, `msLeft`. Hosts the `reveal-burst` particle layer.
- `src/components/game/VoiceStrand.tsx` — **NEW**. Replaces the in-place
  `PoeticCapsule` usage inside `TurnCapsule`. The existing phrase-pool
  logic is extracted from `PoeticCapsule.tsx` into a small hook
  (`src/lib/ui/usePoeticPhrase.ts`) that takes `{ gameId, moment,
  lastEvent, turn, teamNames }` and returns a deterministic phrase
  string. `VoiceStrand` consumes the hook + handles its own animation.
  `PoeticCapsule.tsx` is **deleted** after extraction.
- `src/components/game/TurnCapsule.tsx` — **DELETE** (replaced by
  `Headline.tsx` + `VoiceStrand.tsx`).
- `src/components/game/PoeticCapsule.tsx` — **DELETE** after phrase
  logic is extracted into `usePoeticPhrase` hook.
- `src/lib/ui/usePoeticPhrase.ts` — **NEW**. Extracted phrase picker
  (deterministic by `gameId + event index`, per existing pattern from
  commit `a6dd524`).
- `src/lib/ui/lastEvent.ts` — **NEW**. Pure `lastEventOf(log, turn)`
  extractor (§2.6). ~40 LOC with discriminated union return.
- `tests/lib/ui/lastEvent.test.ts` — **NEW**. Unit tests for each
  log-line kind → `LastEvent` variant mapping.
- `src/app/game.css` — primary CSS rewrite for the status zone.
  `.ss-score`, `.ss-dots`, `.tally-*`, `.turn-capsule` selectors and
  their responsive overrides removed. New selectors for `.arc-dial`,
  `.headline`, `.voice-strand`, plus moment-state modifiers.
- `src/components/screens/GameScreen.tsx` — minor: compute `lastEvent`
  via `lastEventOf(gs.log, gs.turn)` and pass to `StatusStrip`.

## 5. Out of scope (preserved intentionally)

- `server.js` + `public/index.html` — legacy parity reference per
  `CLAUDE.md`.
- Game logic in `src/lib/game/` — unchanged; server stays authoritative.
- Socket contracts in `src/lib/types/` — no new fields; everything
  derives from existing `PlayerView`.
- Sound engine + audio (`useGameSounds` still fires — particle burst is
  a purely visual layer; no new sounds).
- `BoardStage`, `ActionDock`, `HistoryTape`, `WinModal` — untouched.
- Onboarding flow (`CoachMarks`), settings screen, win/loss flow logic.
- `TeamGlyph` — already covers `▲` / `⬣`; no changes needed for the rail
  (the `●` / `☠` extensions from the Night Stage spec stay scoped to
  word cards).

## 6. Acceptance

- All five moment states render visibly distinct on desktop, mobile,
  and `prefers-reduced-motion`.
- Arc dials render correctly for full / partial / empty fills; win-tick
  count matches `winsRed` / `winsBlue` (with `+N` collapse beyond 5).
- Voice strand transitions smoothly between moments; never announces
  the same phrase twice in a row from unrelated re-renders.
- WCAG AA contrast verified on all headline states (axe check + manual).
- Mobile 390×844 game phase: no scroll; arc chips visible above
  headline.
- Arabic-first / RTL: all strings preserved; arcs positioned via logical
  inline properties.
- `npm run build` + `npm run lint` green.
- `arabic-rtl-reviewer` + `game-logic-reviewer` (for `lastEvent.ts`) +
  `code-reviewer` agents pass.
