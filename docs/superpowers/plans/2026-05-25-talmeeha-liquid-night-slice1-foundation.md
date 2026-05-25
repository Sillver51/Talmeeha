# Talmeeha 2.0 "Liquid Night" — Slice 1: Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Lay the visible, low-risk visual foundation for Talmeeha 2.0 — a motion-token system, refined "liquid glass" material, fluid type, and smooth RTL-aware screen transitions — with **zero behavior change** and every quality gate green. This unblocks the tactile-board, signature-moments, sound, and blitz slices.

**Architecture:** Pure CSS + one tiny client wrapper. Add a `--motion-scale` token (1 normally; 0 under reduced-motion) that all new animations multiply by, so reduced-motion is a single knob, not scattered `!important`. Upgrade existing glass surfaces (`.card`, panels, `.wc`) to refractive liquid glass. Convert hero text to `clamp()` fluid sizing. Add a keyed screen-enter animation in the orchestrator so home→setup→lobby→game→win cross-fade/slide (RTL-aware), gated by the motion token. **No new npm dependencies** (Motion/confetti/sound arrive in their own slices). Base color tokens stay as-is (oklch migration + container queries are deferred to the slice that touches the board, to avoid color-shift/regression risk now).

**Tech Stack:** Next.js 16 (App Router, Turbopack), React 19, TypeScript (strict), plain `globals.css` with CSS variables. No Tailwind. Source of truth for visual values: `DESIGN.md`.

**Environment gotchas (this repo, WSL `/mnt/d`):**
- Prefer `node_modules/.bin/<tool>` over `npx`. If a tool reports "Cannot find module", run `npm install` to restore `.bin` symlinks, then retry.
- The dev server does **not** hot-reload on `/mnt/d`. Restart `npm run dev` before any Playwright check. **Confirm the new server actually bound** — look for `🍇 تلميحة على المنفذ 3000` in its log, NOT `Another next dev server is already running. PID: N`. If a stale server holds :3000, `kill <PID>` it first (a stale server serves old code + masks changes).
- `server.js` / `public/index.html` show as git-modified from CRLF noise — **never stage them**.
- Authority for type-correctness is `node_modules/.bin/tsc --noEmit` (exit 0). Ignore editor/LSP `@/...` "Cannot find module" lag.

**Verification commands (used throughout):**
```bash
node_modules/.bin/tsc --noEmit            # types (exit 0)
node_modules/.bin/vitest run              # existing 89 tests stay green (no logic changed)
npm run build                             # Turbopack production build succeeds
```

**Branch:** create `feat/liquid-night-slice1` off `main` before Task 1 (never implement on `main`).

---

## File Structure

| File | Responsibility | Action |
|---|---|---|
| `src/app/globals.css` | Motion tokens, liquid-glass material, fluid type, screen-enter keyframes | Modify |
| `src/app/page.tsx` | Orchestrator — wrap active screen in a keyed `screen-enter` container | Modify |
| `src/lib/ui/screenKey.ts` | Pure helper: derive a stable screen key from phase + clientScreen (re-keys the wrapper so the enter animation replays on screen change) | Create |
| `tests/lib/ui/screenKey.test.ts` | Unit test for `screenKey` | Create |

---

## Task 1: Motion-token system

**Files:**
- Modify: `src/app/globals.css`

> All new animations in every future slice will reference these tokens. `--motion-scale` is the single reduced-motion knob: durations multiply by it, so `0` = instant.

- [ ] **Step 1: Add motion tokens to `:root`.** In `src/app/globals.css`, inside the existing `:root{ … }` block, after the `--grad-signature` line (the last of the Phase 1 "Neon Night additions"), add:

```css
  /* Motion tokens (Liquid Night) */
  --ease-spring: cubic-bezier(.34,1.56,.64,1);
  --ease-out:    cubic-bezier(.22,1,.36,1);
  --dur-fast:    140ms;
  --dur-base:    240ms;
  --dur-slow:    420ms;
  --motion-scale: 1;            /* reduced-motion sets this to 0 */
```

- [ ] **Step 2: Make reduced-motion flip the knob.** In `src/app/globals.css`, find the existing in-app kill rule `html[data-reduced-motion="on"] * { … }` and the `@media (prefers-reduced-motion: reduce)` blocks. Add `--motion-scale` overrides so both paths zero it out. Immediately AFTER the existing `html[data-reduced-motion="on"] *,` kill block, add:

```css
html[data-reduced-motion="on"]{ --motion-scale: 0; }
@media (prefers-reduced-motion: reduce){
  html:not([data-reduced-motion="off"]){ --motion-scale: 0; }
}
```

(Note: `[data-reduced-motion="off"]` is the explicit "keep motion" choice from the prefs model — it must win over the OS query, hence the `:not()`.)

- [ ] **Step 3: Build to confirm CSS compiles.** Run: `npm run build` — Expected: succeeds, no CSS parse error.

- [ ] **Step 4: Commit.**
```bash
git add src/app/globals.css
git commit -m "feat(design): motion-token system (--motion-scale reduced-motion knob)"
```

---

## Task 2: Liquid-glass material

**Files:**
- Modify: `src/app/globals.css`

> Upgrade existing glass surfaces to refractive "liquid glass": stronger layered blur, a 1px top edge-highlight, and a faint specular sheen. Purely cosmetic; class names unchanged.

- [ ] **Step 1: Add a reusable liquid-glass layer.** Append to `src/app/globals.css`:

```css
/* ─── LIQUID GLASS MATERIAL ─── */
/* Edge highlight + specular sheen applied to glass surfaces via ::before.
   Surfaces opt in with .lg (added alongside existing classes) or are mapped below. */
.card, .clue-panel, .leader-panel, .host-bar, .counter-pill, .turn-chip,
.settings-sheet, .g-header{
  position: relative;
}
.card::before, .clue-panel::before, .g-header::before{
  content:"";
  position:absolute; inset:0; pointer-events:none; border-radius:inherit;
  background:
    linear-gradient(180deg, rgba(255,255,255,.10), rgba(255,255,255,0) 28%),
    radial-gradient(120% 60% at 50% -10%, rgba(255,255,255,.08), transparent 60%);
  mix-blend-mode: screen;
  opacity:.7;
}
.card, .clue-panel, .g-header{
  border:1px solid var(--glass-brd);
  box-shadow:
    0 8px 32px rgba(0,0,0,.5),
    inset 0 1px 0 rgba(255,255,255,.12),
    inset 0 -1px 0 rgba(0,0,0,.35);
  backdrop-filter: blur(18px) saturate(1.2);
}
```

- [ ] **Step 2: Strengthen the unrevealed tile's glass refraction.** In `src/app/globals.css`, locate the base `.wc{ … }` rule. Replace its `backdrop-filter:blur(6px);` line with:

```css
  backdrop-filter: blur(8px) saturate(1.15);
```

and replace its existing `box-shadow:…` line with:

```css
  box-shadow:
    0 4px 14px rgba(0,0,0,.45),
    inset 0 1px 0 rgba(255,255,255,.10),
    inset 0 -2px 4px rgba(0,0,0,.30);
```

- [ ] **Step 3: Type-check + build.** Run: `node_modules/.bin/tsc --noEmit && npm run build` — Expected: tsc exit 0; build succeeds.

- [ ] **Step 4: Commit.**
```bash
git add src/app/globals.css
git commit -m "feat(design): refractive liquid-glass material on panels + tiles"
```

---

## Task 3: Fluid type for hero text

**Files:**
- Modify: `src/app/globals.css`

> Replace fixed hero sizes with `clamp()` so the logo and clue word scale fluidly phone→tablet without breakpoint ladders. Body/labels unchanged.

- [ ] **Step 1: Fluid logo.** In `src/app/globals.css`, in the `.logo{ … }` rule, replace `font-size:4.2rem;` with `font-size:clamp(2.6rem, 11vw, 4.2rem);`.

- [ ] **Step 2: Fluid clue word.** In the `.clue-word-big{ … }` rule, replace `font-size:1.5rem;` with `font-size:clamp(1.25rem, 5.5vw, 1.7rem);`.

- [ ] **Step 3: Fluid onboarding title.** In the `.onboard-title{ … }` rule, replace `font-size:3rem;` with `font-size:clamp(2.1rem, 9vw, 3rem);`.

- [ ] **Step 4: Build.** Run: `npm run build` — Expected: succeeds.

- [ ] **Step 5: Commit.**
```bash
git add src/app/globals.css
git commit -m "feat(design): fluid clamp() sizing for hero text"
```

---

## Task 4: Screen key helper (pure, tested)

**Files:**
- Create: `src/lib/ui/screenKey.ts`
- Test: `tests/lib/ui/screenKey.test.ts`

> The orchestrator re-keys its screen wrapper with this value so the CSS enter animation replays whenever the active screen changes. Pure + deterministic.

- [ ] **Step 1: Write the failing test.** Create `tests/lib/ui/screenKey.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { screenKey } from "@/lib/ui/screenKey";

describe("screenKey", () => {
  it("returns the host-mode client screen when there is no game state", () => {
    expect(screenKey(null, "home")).toBe("home");
    expect(screenKey(null, "setup")).toBe("setup");
  });
  it("returns the client screen when it overrides (host gear mid-game)", () => {
    expect(screenKey("playing", "setup")).toBe("setup");
  });
  it("returns the phase when a game state is present", () => {
    expect(screenKey("lobby", "home")).toBe("lobby");
    expect(screenKey("playing", "home")).toBe("playing");
    expect(screenKey("ended", "home")).toBe("ended");
  });
});
```

- [ ] **Step 2: Run — verify FAIL.** Run: `node_modules/.bin/vitest run tests/lib/ui/screenKey.test.ts` — Expected: FAIL (module not found).

- [ ] **Step 3: Implement.** Create `src/lib/ui/screenKey.ts`:

```typescript
import type { Phase } from "@/lib/types";

/**
 * Stable identity of the currently-rendered screen, mirroring the orchestrator's
 * renderScreen() logic. Used to re-key the screen wrapper so the enter animation
 * replays on each screen change. Pure.
 */
export function screenKey(phase: Phase | null, clientScreen: "home" | "setup"): string {
  if (!phase) return clientScreen;       // pre-connection host home/setup
  if (clientScreen === "setup") return "setup"; // host gear opened setup mid-game
  return phase;                          // lobby | playing | ended (setup handled above)
}
```

- [ ] **Step 4: Run — verify PASS + types.** Run: `node_modules/.bin/vitest run tests/lib/ui/screenKey.test.ts && node_modules/.bin/tsc --noEmit` — Expected: PASS; tsc exit 0.

- [ ] **Step 5: Commit.**
```bash
git add src/lib/ui/screenKey.ts tests/lib/ui/screenKey.test.ts
git commit -m "feat(ui): pure screenKey helper for screen-enter transitions"
```

---

## Task 5: Screen-enter transition

**Files:**
- Modify: `src/app/page.tsx`
- Modify: `src/app/globals.css`

> Wrap the active screen in a keyed container; when the key (from Task 4) changes, the wrapper remounts and a CSS enter animation plays — fade + a small RTL-aware rise — scaled by `--motion-scale` (so reduced-motion = instant).

- [ ] **Step 1: Add the enter keyframes + class.** Append to `src/app/globals.css`:

```css
/* ─── SCREEN ENTER TRANSITION ─── */
@keyframes screenEnter{
  from{ opacity:0; transform: translateY(calc(10px * var(--motion-scale))) scale(calc(1 - .01 * var(--motion-scale))); }
  to  { opacity:1; transform: none; }
}
.screen-enter{
  animation: screenEnter calc(var(--dur-base) * var(--motion-scale)) var(--ease-out);
}
```

(When `--motion-scale` is 0 the duration is `0ms` → no visible animation; the transform offsets also collapse to 0.)

- [ ] **Step 2: Wrap the rendered screen with the keyed container.** In `src/app/page.tsx`:
  - Add the import: `import { screenKey } from "@/lib/ui/screenKey";`
  - Replace the line `{renderScreen(gs?.phase ?? null, clientScreen)}` with:

```tsx
      <div className="screen-enter" key={screenKey(gs?.phase ?? null, clientScreen)}>
        {renderScreen(gs?.phase ?? null, clientScreen)}
      </div>
```

- [ ] **Step 3: Type-check + build.** Run: `node_modules/.bin/tsc --noEmit && npm run build` — Expected: tsc exit 0; build succeeds.

- [ ] **Step 4: Commit.**
```bash
git add src/app/page.tsx src/app/globals.css
git commit -m "feat(ui): RTL-aware screen-enter transition (motion-scale gated)"
```

---

## Task 6: Verification

**Files:** none (verification only)

- [ ] **Step 1: Static gates.** Run:
```bash
node_modules/.bin/tsc --noEmit
node_modules/.bin/vitest run
npm run build
```
Expected: tsc exit 0; **all 90 tests green** (existing 89 + the new `screenKey` test); build succeeds.

- [ ] **Step 2: Start a clean dev server.**
```bash
pkill -f "tsx watch server/index.ts" 2>/dev/null; sleep 1
nohup npm run dev > /tmp/talmeeha-dev.log 2>&1 &
for i in $(seq 1 50); do curl -fs localhost:3000/healthz >/dev/null 2>&1 && break; sleep 3; done
grep -q "المنفذ 3000" /tmp/talmeeha-dev.log && echo "server bound OK" || echo "CHECK: stale server?"
```
Expected: `server bound OK` (if not, `kill` the stale PID printed in the log and retry).

- [ ] **Step 3: Playwright smoke — visual + no regressions.**
  - Mobile (390×844) and desktop (1280×800): load `/`, dismiss onboarding (set `localStorage.talmeeha_onboarded='1'` + reload), screenshot home — confirm refined glass + fluid logo, layout intact (RTL).
  - Toggle settings (⚙) → reduced-motion ON → reload a screen change; confirm `screenEnter` does not visibly animate (instant). Toggle OFF → confirm it animates.
  - Drive an online create→lobby (or host setup) and confirm screen change cross-fades; board tiles still render (25), counters work.
  - Assert **0 console errors** on each screen.

- [ ] **Step 4: Reviewer.** Run the `arabic-rtl-reviewer` agent over the diff (`git diff main...HEAD`): focus on RTL correctness of the new CSS (logical properties), motion-token reduced-motion behavior, and that no word-card state class was recolored. Address CRITICAL/HIGH.

- [ ] **Step 5: Stop the dev server.** `pkill -f "tsx watch server/index.ts" 2>/dev/null`

- [ ] **Step 6: Finish the branch** (superpowers:finishing-a-development-branch) — verify tests, then push + PR (or merge) per user choice.

---

## Self-Review (spec → plan coverage for Slice 1)

- **Spec §3 motion tokens (`--ease-spring`, `--dur-*`, `--motion-scale`)** → Task 1.
- **Spec §3 fluid type (clamp)** → Task 3.
- **Spec §4 liquid-glass material (refraction, edge highlight, sheen)** → Task 2.
- **Spec §11 Slice 1 "View Transitions for screen changes"** → Task 4–5 implement this as a **CSS keyed screen-enter** (0-dep, robust for a state-driven SPA; native route View Transitions don't apply to this single-route app). Deliberate, documented substitution.
- **Spec §9 accessibility (reduced-motion parity)** → Task 1 Step 2 (`--motion-scale` zeroed on both the in-app toggle and the OS query) + Task 5 (animation collapses to 0ms) + Task 6 Playwright check.
- **Deferred to later slices (documented):** oklch base-token migration + `color-mix()` derivation + container-query board sizing → fold into Slice 2 (tactile board), where the board files are already being touched, to avoid color-shift/regression risk in this foundation slice. New deps (`motion`, `auto-animate`, `canvas-confetti`, sound) → their own slices.
- **No behavior change:** no game logic, types, or socket contract touched; existing 89 tests remain valid; only `screenKey` test added.

**Placeholder scan:** none. **Type consistency:** `screenKey(phase, clientScreen)` signature identical in test, impl, and page.tsx usage; `Phase` imported from `@/lib/types` (existing).
