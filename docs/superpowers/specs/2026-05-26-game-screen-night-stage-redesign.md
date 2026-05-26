# Night Stage — Game-screen redesign (Phase 2)

> Date: 2026-05-26 · Status: approved (user replied "go")
> Predecessor: [`2026-05-26-game-screen-stage-architecture-design.md`](2026-05-26-game-screen-stage-architecture-design.md)
> Canon overlay: [`DESIGN.md` §0 — Neon Night](../../../DESIGN.md)

## 1. Problem

Playwright audit of the live game screen (host mode, desktop + mobile) surfaced
seven concrete defects:

1. **Tinted word-card text fails WCAG AA contrast** on every `hv-*` / `h-*` state
   (red `#FFD0D8` on `rgba(240,64,96,.35)` ≈ 3:1; blue ≈ 3:1; neutral ≈ 3.5:1;
   assassin ≈ 3:1). Arabic words fade into the tile.
2. **Score numbers are dim & undersized** — `1.7rem` vs DESIGN.md §3 spec of
   `2.2rem 900`, palette uses pale `--red2 / --blue2` instead of live team color.
3. **Team-name + wins pills are `.55rem`** — illegible at any phone size.
4. **Turn-capsule poetic sub-line is buried** at `.62rem opacity .88`.
5. **Action dock doesn't read as a unified bar** — input dissolves into dock
   background, primary CTA is only `~36px` tall, hint text invisible.
6. **Background atmosphere is invisible** — body starfield ellipses at
   `0.04–0.06` alpha, grid at `0.015` alpha, stage glow at `rgba(*,.10)`.
7. **Responsive shrinks but doesn't recompose** — host action row wraps,
   long Arabic words overflow at 4 cols.

## 2. Direction — "Night Stage"

Keep Neon-Night glass language; treat the in-game screen as a **lit stage**:
the board is the hero, framed by a top status rail and a bottom action bar
that read as ribbons of light, not flat panels.

### 2.1 Score Tally Stones (replace `.ss-score`)

A pair of glass capsules at the top corners.

- **Numeral**: `clamp(2.4rem, 6vw, 3rem) 900` with conic-gradient halo in team
  neon color (`--red #FF4D8D` / `--blue #34A8FF`).
- **Dot bar** beneath, showing remaining unrevealed words for that team.
  Each dot is a team-glyph chip (`▲` red, `⬣` blue) — color-independent
  via shape, not only hue.
- **Team name**: `.78rem 800` (not `.55rem`).
- **Wins** moves to a tiny crown badge `👑` on the leading team's capsule.
- **Active team capsule** glows with team-colored ring; idle capsule is matte.

### 2.2 Turn Capsule → "Stage Light"

- **Turn line**: `clamp(.95rem, 2.6vw, 1.1rem) 900`.
- **Sub-line**: `.78rem 600 italic` at full opacity — the poetic phrase moves
  from buried to featured.
- **Clue mode**: `<word shimmer> · <count chip> · <remaining>`. Shimmer becomes
  a **continuous 8s loop** (slow, non-strobing) instead of one-shot.
- **Urgency**: ring becomes a thin gold `1px` pixel-stroke so it reads against
  the glass without strobing.

### 2.3 Word cards — "Glass Tablets v2"

**Unrevealed (glass)** — keeps glass material, adds:
- `1px` inset top highlight (`rgba(255,255,255,.10)`).
- `1px` inset bottom shadow (`rgba(0,0,0,.30)`).
- Outer `0 2px 6px rgba(0,0,0,.4)`.

**Leader / host tinted** — replace low-alpha tint + same-color text with a
**darker base + bright-white text + 2px team-color stroke + corner chip**:

| State | Background | Text | Stroke | Chip |
|---|---|---|---|---|
| `hv-red` / `h-red` | `oklch(0.20 0.14 16)` | `#FFFFFF` | `--red` | `▲` |
| `hv-blue` / `h-blue` | `oklch(0.20 0.13 250)` | `#FFFFFF` | `--blue` | `⬣` |
| `hv-neutral` / `h-neutral` | `oklch(0.24 0.04 80)` | `#F0E4C8` | `#A08040` | `●` |
| `hv-assassin` / `h-assassin` | `oklch(0.10 0.05 20)` | `#FF6680` | `#8B1020` | `☠` |

Contrast verified ≥ 4.5:1 in oklch.

**Revealed** — keep saturated team gradients (those work). Add chip + faint
particle glow on flip.

**Motion** — hover replaces `translateY + scale` (composite-friendly) with
`transform: translateY(-3px) scale(1.03)` and `filter: brightness(1.06)`.
Press uses `transform: scale(.96)` only — no layout shift.

### 2.4 Action Dock → "Composer Bar"

Two explicit rows (sticky bottom):

- **Row 1 (composer)**: glass input with visible `--border2` + focus-grape ring,
  count stepper `[− N +]` replacing free-typed number, and the primary CTA
  `h-44 / md:h-48` using `--grad-signature` (grape → gold → cyan).
- **Row 2 (meta)**: hint text at `.72rem opacity .9`, doubt / end-turn slots.

CTA on send: small confetti burst (existing `Confetti` component) and the
button reflects a 240ms white-veil. No radial pseudo-fire.

### 2.5 Atmosphere lifted to visible

- Body starfield ellipses: `0.10–0.14` alpha; add 24s drift via CSS vars.
- Grid: bump to `0.04` alpha, two overlaid grids (`48px` major + `12px` minor)
  for parallax depth (no JS).
- `.board-stage` glow: `inset:-25%` retained but `overflow:hidden` removed so
  glow can bleed past the board into the strip & dock; tint to `rgba(*,.16)`.

### 2.6 Responsive recomposition

| Width | Layout |
|---|---|
| `≥1024px` | Scores **flank** the capsule; dock 1-row |
| `640–1023px` | Scores top corners, capsule full-width; dock 1-row |
| `<640px` | Scores collapse to two **chips above** the capsule; dock 2-row |
| `<360px` | Wins crown hides; team name truncates to glyph |

Word cards size by `clamp(.78rem, 3vw, .95rem)` so long Arabic words fit.

## 3. Performance & accessibility

- **Transform-only animations**, no layout/paint thrash; all keyframes touch
  `transform` and `opacity` (filter only on momentary hover).
- `will-change: transform` only on actively animating elements (timer, capsule,
  flipping card) — applied via `.is-animating` class, removed on `animationend`.
- `content-visibility: auto` on `<GameLog/>` and the off-turn strip.
- `@media (prefers-reduced-motion: reduce)` and `[data-reduced-motion="on"]`
  kill all keyframes; existing global hook is preserved.
- Colorblind palette (`[data-palette="colorblind"]`) maps to oklch-equivalent
  Wong hues — glyphs already carry color-independent identity.
- Tap targets: word cards ≥ 54px, dock CTA ≥ 44px (Apple HIG floor).

## 4. Files touched

- `src/app/game.css` — primary rewrite (status, capsule, board-stage, dock).
- `src/app/globals.css` — atmosphere bump; `.wc.hv-*` / `.wc.h-*` recolor +
  chip; primary button signature gradient. Removes superseded class blocks.
- `src/components/game/StatusStrip.tsx` — restructured; host actions inline.
- `src/components/game/TurnCapsule.tsx` — typography & continuous shimmer.
- `src/components/game/WordCard.tsx` — emits chip glyph in corner.
- `src/components/game/ActionDock.tsx` — 2-row dock layout.
- `src/components/game/dock/LeaderInput.tsx` — count stepper, bigger CTA.
- `src/components/game/dock/HostHandoff.tsx` — consistent inline composer.
- `src/components/brand/TeamGlyph.tsx` — already covers ▲/⬣; add `●` & `☠`.

## 5. Out of scope (preserved intentionally)

- `server.js` + `public/index.html` — legacy parity reference per CLAUDE.md.
- Game logic in `src/lib/game/` — unchanged; server stays authoritative.
- Socket contracts in `src/lib/types/index.ts` — unchanged.
- Sound engine + audio assets.
- Onboarding flow.

## 6. Acceptance

- All Arabic UI strings preserved.
- WCAG AA passes on every word-card state (verified by hand + axe check).
- Single viewport on mobile 390×844 with no scroll on game phase.
- `npm run build` + `npm run lint` green.
- arabic-rtl-reviewer + code-reviewer agents pass.
