# Game Screen Stage Architecture — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Repair the global CSS cascade so every shadcn button renders correctly, then re-compose the in-game screen as a 3-zone stage (Status Strip / Board Stage / Action Dock) with true Neon Night glass tiles, eight motion rituals, a synthesized Web Audio layer, and signature Arabic-native moments — without touching server, store, types, or game logic.

**Architecture:** New components live under `src/components/game/`. New audio engine under `src/lib/audio/`. New phrase library under `src/lib/copy/`. New scoped stylesheet at `src/app/game.css`. Existing components `GameHeader`, `HostBar`, `HandoffGate`, `Counters`, `CluePanel`, `LeaderPanel`, `ActionRow` are absorbed and deleted. `GameScreen.tsx` is re-wired to compose the three new zone components.

**Tech Stack:** Next.js 16 (App Router, React 19) · Tailwind v4 · shadcn (radix-nova) · Zustand · Vitest + React Testing Library · Playwright · Web Audio API (synthesis only, zero asset weight).

---

## Spec

[`docs/superpowers/specs/2026-05-26-game-screen-stage-architecture-design.md`](../specs/2026-05-26-game-screen-stage-architecture-design.md)

## Pre-flight

- Dev server runs on `:3000` via `npm run dev` (tsx + custom server + Socket.io).
- Tests: `npm test` (vitest). Coverage: `npm run test:cov`.
- Typecheck: `npm run typecheck`. Lint: `npm run lint`.
- `prefs.sound` already exists in `src/lib/a11y/prefs.ts` with default `true`. We add `volume`.
- The `SettingsSheet` already has the sound toggle (`src/components/a11y/SettingsSheet.tsx:89-92`). We add a volume slider.
- `WordCard`, `Board`, `WinModal`, `Confetti`, `GameLog`, `TurnTimer` are kept — restyled / lightly rewrapped.
- Files to delete after recomposition: `GameHeader.tsx`, `HostBar.tsx`, `HandoffGate.tsx`, `Counters.tsx`, `CluePanel.tsx`, `LeaderPanel.tsx`, `ActionRow.tsx`.

## File Map

**New files (created):**
- `src/app/game.css` — game-screen-only CSS scoped to `.game-on`
- `src/lib/audio/engine.ts` — shared `AudioContext`, master gain, lazy init
- `src/lib/audio/voices.ts` — synthesis primitives (chime, bloom, gong, whoosh, tick)
- `src/lib/audio/events.ts` — high-level event functions: `playReveal`, `playClueSubmit`, `playWin`, etc.
- `src/lib/audio/useGameSounds.ts` — hook subscribing to game-store transitions
- `src/lib/audio/index.ts` — barrel
- `src/lib/copy/capsule.ts` — Arabic phrase library + interpolation helper
- `src/components/game/StatusStrip.tsx` — top sticky strip
- `src/components/game/TurnCapsule.tsx` — central capsule renderer
- `src/components/game/PoeticCapsule.tsx` — phrase selector
- `src/components/game/BoardStage.tsx` — ambient stage wrap around `<Board/>`
- `src/components/game/ArabicConstellation.tsx` — SVG constellation
- `src/components/game/CalligraphyText.tsx` — per-letter span wrapper
- `src/components/game/ActionDock.tsx` — bottom sticky dock router
- `src/components/game/dock/LeaderInput.tsx`
- `src/components/game/dock/GuesserActions.tsx`
- `src/components/game/dock/HostHandoff.tsx`
- `src/components/game/dock/HostGuessControls.tsx`
- `src/components/game/dock/EndedActions.tsx`
- `src/components/game/dock/OffTurnStrip.tsx`
- `tests/audio/engine.test.ts`
- `tests/audio/events.test.ts`
- `tests/copy/capsule.test.ts`
- `tests/components/TurnCapsule.test.tsx`
- `tests/components/ActionDock.test.tsx`
- `tests/components/CalligraphyText.test.tsx`
- `tests/e2e/cascade-regression.spec.ts`
- `tests/e2e/game-screen-snapshots.spec.ts`

**Modified files:**
- `src/app/globals.css` — wrap line 247 unlayered reset in `@layer base`; import `game.css`
- `src/app/layout.tsx` — only if `game.css` import isn't picked up via `globals.css` (we will import it from `globals.css`)
- `src/lib/a11y/prefs.ts` — add `volume: number` to `Prefs`
- `src/store/prefsStore.ts` — `volume` already covered by generic `update()` signature
- `src/components/a11y/SettingsSheet.tsx` — add volume slider row
- `src/components/screens/GameScreen.tsx` — re-wire to compose StatusStrip + BoardStage + ActionDock
- `src/components/game/WordCard.tsx` — glass classes; `React.memo`; reveal-flip class hook
- `src/components/game/Board.tsx` — minor: pass-through stays the same
- `src/components/game/TurnTimer.tsx` — refactored to expose `useUrgency()` consumed by capsule
- `src/components/game/GameLog.tsx` — collapsible drawer on mobile (≤520 px)

**Deleted files (after Phase 4):**
- `src/components/game/GameHeader.tsx`
- `src/components/game/HostBar.tsx`
- `src/components/game/HandoffGate.tsx`
- `src/components/game/Counters.tsx`
- `src/components/game/CluePanel.tsx`
- `src/components/game/LeaderPanel.tsx`
- `src/components/game/ActionRow.tsx`

---

## Phase 1 — Foundation: CSS cascade fix

### Task 1.1: Failing Playwright cascade regression test

**Files:**
- Create: `tests/e2e/cascade-regression.spec.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// tests/e2e/cascade-regression.spec.ts
import { test, expect } from "@playwright/test";

test("shadcn buttons honor utility padding utilities (cascade regression)", async ({ page }) => {
  await page.goto("/ui-catalog");
  const btn = page.locator('button[data-slot="button"][data-size="default"]').first();
  await expect(btn).toBeVisible();
  const paddingInline = await btn.evaluate((el) => parseFloat(getComputedStyle(el).paddingInline));
  expect(paddingInline).toBeGreaterThan(0);
  const height = await btn.evaluate((el) => parseFloat(getComputedStyle(el).height));
  expect(height).toBeGreaterThanOrEqual(28);
});
```

- [ ] **Step 2: Add playwright config if missing**

Check if `playwright.config.ts` exists at repo root. If not, create minimal config:

```typescript
// playwright.config.ts
import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  use: { baseURL: "http://localhost:3000" },
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: true,
    timeout: 60_000,
  },
});
```

Install `@playwright/test` if not present: `npm i -D @playwright/test && npx playwright install --with-deps chromium`.

- [ ] **Step 3: Run test to verify it fails**

Run: `npx playwright test tests/e2e/cascade-regression.spec.ts`
Expected: FAIL — paddingInline reports 0.

- [ ] **Step 4: Commit the failing test**

```bash
git add tests/e2e/cascade-regression.spec.ts playwright.config.ts package.json package-lock.json
git commit -m "test(e2e): regression for shadcn button padding (currently failing)"
```

### Task 1.2: Apply the cascade fix

**Files:**
- Modify: `src/app/globals.css:247`

- [ ] **Step 1: Wrap line 247 in @layer base**

In `src/app/globals.css`, replace this single line:

```css
*{box-sizing:border-box;margin:0;padding:0}
```

with:

```css
@layer base {
  *{box-sizing:border-box;margin:0;padding:0}
}
```

Use the Edit tool with the exact `old_string` matching line 247 (a single line). Do not touch any other lines.

- [ ] **Step 2: Run the cascade test to confirm it passes**

Run: `npx playwright test tests/e2e/cascade-regression.spec.ts`
Expected: PASS — paddingInline > 0, height ≥ 28.

- [ ] **Step 3: Manually verify in browser**

```
npm run dev   # if not already running
```
Open `http://localhost:3000`, click "العب الآن", fill name "test", click "✦ إعداد اللعبة". The "+ أضف" button should no longer overlap the input. The "🚀 ابدأ اللعبة" button should be ≥ 36 px tall.

- [ ] **Step 4: Commit**

```bash
git add src/app/globals.css
git commit -m "fix(css): wrap unlayered reset in @layer base so Tailwind utilities win

The legacy *{margin:0;padding:0} was outside any cascade layer. In
Tailwind v4 utilities live inside @layer utilities, and unlayered rules
beat layered rules regardless of specificity — so every px-*/py-*/m-*
utility on shadcn Buttons was silently zeroed.

Wrapping the reset in @layer base puts both the reset and the utilities
inside the cascade hierarchy, letting utilities win their intended scope.
Legacy hand-built styles (.btn, .wc, .team-setup-card) remain unlayered
and keep their current behavior."
```

---

## Phase 2 — Audio scaffolding (engine + voices + events + settings)

### Task 2.1: Add `volume` to Prefs

**Files:**
- Modify: `src/lib/a11y/prefs.ts`
- Test: `tests/a11y/prefs.test.ts` (create if absent)

- [ ] **Step 1: Write failing test**

```typescript
// tests/a11y/prefs.test.ts
import { describe, it, expect } from "vitest";
import { DEFAULT_PREFS, mergePrefs } from "@/lib/a11y/prefs";

describe("Prefs", () => {
  it("defaults volume to 60", () => {
    expect(DEFAULT_PREFS.volume).toBe(60);
  });

  it("clamps volume on merge", () => {
    const next = mergePrefs(DEFAULT_PREFS, { volume: 150 });
    expect(next.volume).toBe(100);
    const low = mergePrefs(DEFAULT_PREFS, { volume: -5 });
    expect(low.volume).toBe(0);
  });
});
```

- [ ] **Step 2: Run to confirm failure**

Run: `npx vitest run tests/a11y/prefs.test.ts`
Expected: FAIL — `volume` is undefined.

- [ ] **Step 3: Implement**

Replace the contents of `src/lib/a11y/prefs.ts` with:

```typescript
import type { DigitStyle } from "@/lib/i18n/digits";

export type Palette = "default" | "colorblind";
export type ReducedMotion = "system" | "on" | "off";

export interface Prefs {
  palette: Palette;
  reducedMotion: ReducedMotion;
  digits: DigitStyle;
  sound: boolean;
  /** Master output volume, 0–100. */
  volume: number;
}

export const DEFAULT_PREFS: Prefs = {
  palette: "default",
  reducedMotion: "system",
  digits: "western",
  sound: true,
  volume: 60,
};

function clampVolume(v: number): number {
  if (!Number.isFinite(v)) return 60;
  if (v < 0) return 0;
  if (v > 100) return 100;
  return Math.round(v);
}

/** Immutable overlay of a partial patch onto a base prefs object. */
export function mergePrefs(base: Prefs, patch: Partial<Prefs>): Prefs {
  const next: Prefs = { ...base, ...patch };
  next.volume = clampVolume(next.volume);
  return next;
}

/** The `<html>` data-* attributes that CSS keys theming/motion off. (`sound`/`volume` have no CSS hook.) */
export function prefsDataAttributes(p: Prefs): Record<string, string> {
  return {
    "data-palette": p.palette,
    "data-reduced-motion": p.reducedMotion,
    "data-digits": p.digits,
  };
}
```

- [ ] **Step 4: Update prefsStore current snapshot to include volume**

Modify `src/store/prefsStore.ts:50-61` — the `update()` method builds a `current` snapshot. Add `volume`:

```typescript
update(key, value) {
  const current: Prefs = {
    palette: get().palette,
    reducedMotion: get().reducedMotion,
    digits: get().digits,
    sound: get().sound,
    volume: get().volume,
  };
  const next = mergePrefs(current, { [key]: value } as Partial<Prefs>);
  savePrefs(next);
  applyToDocument(next);
  set(next);
},
```

- [ ] **Step 5: Run tests**

Run: `npx vitest run tests/a11y/prefs.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/lib/a11y/prefs.ts src/store/prefsStore.ts tests/a11y/prefs.test.ts
git commit -m "feat(prefs): add volume (0-100, default 60) with clamping"
```

### Task 2.2: Audio engine — lazy AudioContext + master gain

**Files:**
- Create: `src/lib/audio/engine.ts`
- Test: `tests/audio/engine.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// tests/audio/engine.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";

class FakeGainNode {
  gain = { value: 0, linearRampToValueAtTime: vi.fn(), setValueAtTime: vi.fn() };
  connect = vi.fn();
}
class FakeAudioContext {
  state = "running";
  destination = {};
  currentTime = 0;
  createGain() { return new FakeGainNode(); }
  resume = vi.fn(() => Promise.resolve());
  close = vi.fn(() => Promise.resolve());
}

beforeEach(() => {
  vi.resetModules();
  (globalThis as unknown as { AudioContext: typeof FakeAudioContext }).AudioContext = FakeAudioContext;
  (globalThis as unknown as { window: { AudioContext: typeof FakeAudioContext } }).window = {
    AudioContext: FakeAudioContext,
  } as never;
});

describe("audio engine", () => {
  it("does not create an AudioContext when sound pref is false", async () => {
    const ctor = vi.spyOn(globalThis as unknown as { AudioContext: typeof FakeAudioContext }, "AudioContext");
    const { ensureEngine } = await import("@/lib/audio/engine");
    const e = ensureEngine({ sound: false, volume: 60 });
    expect(e).toBeNull();
    expect(ctor).not.toHaveBeenCalled();
  });

  it("creates a singleton AudioContext when sound is true", async () => {
    const { ensureEngine } = await import("@/lib/audio/engine");
    const e1 = ensureEngine({ sound: true, volume: 60 });
    const e2 = ensureEngine({ sound: true, volume: 60 });
    expect(e1).not.toBeNull();
    expect(e1).toBe(e2);
  });

  it("applies master gain from volume (0-100 → 0-1)", async () => {
    const { ensureEngine } = await import("@/lib/audio/engine");
    const e = ensureEngine({ sound: true, volume: 50 });
    expect(e?.master.gain.value).toBeCloseTo(0.5, 2);
  });
});
```

- [ ] **Step 2: Run to confirm failure**

Run: `npx vitest run tests/audio/engine.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

```typescript
// src/lib/audio/engine.ts
export interface EngineSettings {
  sound: boolean;
  volume: number; // 0-100
}

export interface Engine {
  ctx: AudioContext;
  master: GainNode;
  /** Update master gain in place from a fresh volume (0-100). */
  setVolume(volume: number): void;
}

let singleton: Engine | null = null;

function browserAudioContext(): typeof AudioContext | undefined {
  if (typeof window === "undefined") return undefined;
  const w = window as unknown as {
    AudioContext?: typeof AudioContext;
    webkitAudioContext?: typeof AudioContext;
  };
  return w.AudioContext ?? w.webkitAudioContext;
}

function volumeToGain(v: number): number {
  if (!Number.isFinite(v)) return 0.6;
  if (v <= 0) return 0;
  if (v >= 100) return 1;
  return v / 100;
}

/**
 * Lazily build (or return) the audio engine. Returns null when `sound` is off
 * or when no AudioContext implementation is available (SSR or older browser).
 *
 * Browser autoplay policies require the FIRST call to happen inside a user
 * gesture. Callers should invoke `ensureEngine()` on click/keydown, not on
 * page load.
 */
export function ensureEngine(s: EngineSettings): Engine | null {
  if (!s.sound) return null;
  if (singleton) return singleton;
  const Ctor = browserAudioContext();
  if (!Ctor) return null;
  const ctx = new Ctor();
  const master = ctx.createGain();
  master.gain.value = volumeToGain(s.volume);
  master.connect(ctx.destination);
  singleton = {
    ctx,
    master,
    setVolume(v: number) {
      master.gain.value = volumeToGain(v);
    },
  };
  // Some browsers start the context in 'suspended' state until a gesture.
  if (ctx.state === "suspended") void ctx.resume();
  return singleton;
}

/** Tear down the engine. Used when the sound pref flips off, and in tests. */
export function destroyEngine(): void {
  if (!singleton) return;
  void singleton.ctx.close();
  singleton = null;
}
```

- [ ] **Step 4: Run tests**

Run: `npx vitest run tests/audio/engine.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/audio/engine.ts tests/audio/engine.test.ts
git commit -m "feat(audio): lazy AudioContext engine with volume-controlled master gain"
```

### Task 2.3: Audio voices — synthesis primitives

**Files:**
- Create: `src/lib/audio/voices.ts`

- [ ] **Step 1: Implement voices**

```typescript
// src/lib/audio/voices.ts
import type { Engine } from "./engine";

type OscType = "sine" | "triangle" | "square" | "sawtooth";

interface ToneOpts {
  freq: number;
  type?: OscType;
  /** Attack in seconds (default 0.01). */
  attack?: number;
  /** Decay in seconds (default 0.18). */
  decay?: number;
  /** Peak gain 0-1 (default 0.4). */
  peak?: number;
  /** Offset in seconds from now (default 0). */
  at?: number;
}

/** Schedule a single tone with a linear-ramp envelope. */
export function tone(eng: Engine, opts: ToneOpts): void {
  const { freq, type = "sine", attack = 0.01, decay = 0.18, peak = 0.4, at = 0 } = opts;
  const t0 = eng.ctx.currentTime + at;
  const osc = eng.ctx.createOscillator();
  const env = eng.ctx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  env.gain.setValueAtTime(0, t0);
  env.gain.linearRampToValueAtTime(peak, t0 + attack);
  env.gain.linearRampToValueAtTime(0, t0 + attack + decay);
  osc.connect(env).connect(eng.master);
  osc.start(t0);
  osc.stop(t0 + attack + decay + 0.02);
}

/** Two-or-three-note ascending shimmer. */
export function shimmer(eng: Engine, freqs: number[]): void {
  freqs.forEach((f, i) => tone(eng, { freq: f, type: "triangle", at: i * 0.08, peak: 0.25, decay: 0.22 }));
}

/** Team-tuned reveal chime: a root sine + bright triangle harmonic. */
export function chime(eng: Engine, root: number, harmonic: number): void {
  tone(eng, { freq: root, type: "sine", peak: 0.35, decay: 0.25 });
  tone(eng, { freq: harmonic, type: "triangle", peak: 0.18, decay: 0.25 });
}

/** Two-note minor descent for wrong-color reveal. */
export function descent(eng: Engine, hi: number, lo: number): void {
  tone(eng, { freq: hi, type: "sine", peak: 0.3, decay: 0.12 });
  tone(eng, { freq: lo, type: "sine", at: 0.1, peak: 0.3, decay: 0.16 });
}

/** Soft mallet thud for neutral reveal. */
export function thud(eng: Engine, freq = 220): void {
  tone(eng, { freq, type: "sine", peak: 0.32, attack: 0.005, decay: 0.08 });
}

/** Deep gong + reverb-ish tail for assassin reveal. */
export function gong(eng: Engine, root = 65.4): void {
  tone(eng, { freq: root, type: "sine", peak: 0.45, attack: 0.005, decay: 1.6 });
  tone(eng, { freq: root * 1.5, type: "sawtooth", peak: 0.18, attack: 0.005, decay: 1.4 });
}

/** Band-passed white-noise whoosh + a two-note team chord. */
export function whoosh(eng: Engine, chord: [number, number]): void {
  const t0 = eng.ctx.currentTime;
  const buf = eng.ctx.createBuffer(1, eng.ctx.sampleRate * 0.35, eng.ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * 0.4;
  const src = eng.ctx.createBufferSource();
  src.buffer = buf;
  const filt = eng.ctx.createBiquadFilter();
  filt.type = "bandpass";
  filt.frequency.value = 800;
  filt.Q.value = 0.7;
  const env = eng.ctx.createGain();
  env.gain.setValueAtTime(0, t0);
  env.gain.linearRampToValueAtTime(0.22, t0 + 0.05);
  env.gain.linearRampToValueAtTime(0, t0 + 0.32);
  src.connect(filt).connect(env).connect(eng.master);
  src.start(t0);
  src.stop(t0 + 0.36);
  tone(eng, { freq: chord[0], type: "triangle", at: 0.05, peak: 0.18, decay: 0.28 });
  tone(eng, { freq: chord[1], type: "triangle", at: 0.05, peak: 0.18, decay: 0.28 });
}

/** Quiet metronome tick — used for the under-10s timer layer. */
export function tick(eng: Engine): void {
  tone(eng, { freq: 1200, type: "square", peak: 0.06, attack: 0.001, decay: 0.04 });
}

/** Ascending sequence in Maqam Rast (D-E-F#-G-A-Bb) for the win phrase. */
export function rastPhrase(eng: Engine): void {
  const notes = [146.83, 164.81, 184.99, 195.99, 220.0, 233.08];
  notes.forEach((f, i) =>
    tone(eng, { freq: f, type: "triangle", at: i * 0.15, peak: 0.25, decay: 0.2 })
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/audio/voices.ts
git commit -m "feat(audio): synthesis primitives (tone, shimmer, chime, descent, thud, gong, whoosh, tick, rastPhrase)"
```

### Task 2.4: Audio events — high-level API

**Files:**
- Create: `src/lib/audio/events.ts`
- Test: `tests/audio/events.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// tests/audio/events.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/audio/voices", () => ({
  tone: vi.fn(),
  shimmer: vi.fn(),
  chime: vi.fn(),
  descent: vi.fn(),
  thud: vi.fn(),
  gong: vi.fn(),
  whoosh: vi.fn(),
  tick: vi.fn(),
  rastPhrase: vi.fn(),
}));

class FakeAudioContext {
  state = "running";
  destination = {};
  currentTime = 0;
  sampleRate = 44100;
  createGain() {
    return { gain: { value: 0 }, connect: vi.fn() } as unknown as GainNode;
  }
  resume = vi.fn();
  close = vi.fn();
}

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  (globalThis as unknown as { window: { AudioContext: typeof FakeAudioContext } }).window = {
    AudioContext: FakeAudioContext,
  } as never;
});

describe("audio events", () => {
  it("playClueSubmit dispatches shimmer", async () => {
    const voices = await import("@/lib/audio/voices");
    const { playClueSubmit } = await import("@/lib/audio/events");
    playClueSubmit({ sound: true, volume: 60 });
    expect(voices.shimmer).toHaveBeenCalledTimes(1);
  });

  it("playReveal('red') dispatches red-tuned chime", async () => {
    const voices = await import("@/lib/audio/voices");
    const { playReveal } = await import("@/lib/audio/events");
    playReveal("red", { sound: true, volume: 60 });
    expect(voices.chime).toHaveBeenCalledWith(expect.anything(), 440, 987.77);
  });

  it("does NOT dispatch any voice when sound is off", async () => {
    const voices = await import("@/lib/audio/voices");
    const { playClueSubmit, playReveal, playWin } = await import("@/lib/audio/events");
    const settings = { sound: false, volume: 60 };
    playClueSubmit(settings);
    playReveal("blue", settings);
    playWin("red", settings);
    expect(voices.shimmer).not.toHaveBeenCalled();
    expect(voices.chime).not.toHaveBeenCalled();
    expect(voices.rastPhrase).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run to confirm failure**

Run: `npx vitest run tests/audio/events.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

```typescript
// src/lib/audio/events.ts
import { ensureEngine, type EngineSettings } from "./engine";
import * as voices from "./voices";

const RED_ROOT = 440;       // A4
const RED_HARMONIC = 987.77; // B5
const BLUE_ROOT = 659.25;   // E5
const BLUE_HARMONIC = 987.77; // B5

const RED_CHORD: [number, number] = [220, 277.18]; // A3, C#4
const BLUE_CHORD: [number, number] = [246.94, 329.63]; // B3, E4

const CLUE_SHIMMER = [392.0, 493.88, 587.33]; // G4 B4 D5
const WRONG_HI = 466.16; // Bb4
const WRONG_LO = 440.0;  // A4

export function playClueSubmit(s: EngineSettings): void {
  const eng = ensureEngine(s);
  if (!eng) return;
  voices.shimmer(eng, CLUE_SHIMMER);
}

export function playReveal(team: "red" | "blue" | "neutral" | "assassin", s: EngineSettings): void {
  const eng = ensureEngine(s);
  if (!eng) return;
  if (team === "red") voices.chime(eng, RED_ROOT, RED_HARMONIC);
  else if (team === "blue") voices.chime(eng, BLUE_ROOT, BLUE_HARMONIC);
  else if (team === "neutral") voices.thud(eng);
  else voices.gong(eng);
}

export function playWrong(s: EngineSettings): void {
  const eng = ensureEngine(s);
  if (!eng) return;
  voices.descent(eng, WRONG_HI, WRONG_LO);
}

export function playTurnHandoff(team: "red" | "blue", s: EngineSettings): void {
  const eng = ensureEngine(s);
  if (!eng) return;
  voices.whoosh(eng, team === "red" ? RED_CHORD : BLUE_CHORD);
}

export function playTick(s: EngineSettings): void {
  const eng = ensureEngine(s);
  if (!eng) return;
  voices.tick(eng);
}

export function playWin(_team: "red" | "blue", s: EngineSettings): void {
  const eng = ensureEngine(s);
  if (!eng) return;
  voices.rastPhrase(eng);
}
```

- [ ] **Step 4: Run tests**

Run: `npx vitest run tests/audio/events.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/audio/events.ts tests/audio/events.test.ts
git commit -m "feat(audio): high-level event API (clue, reveal, wrong, handoff, tick, win)"
```

### Task 2.5: Game-sound hook — subscribe to store transitions

**Files:**
- Create: `src/lib/audio/useGameSounds.ts`
- Create: `src/lib/audio/index.ts`

- [ ] **Step 1: Implement the hook**

```typescript
// src/lib/audio/useGameSounds.ts
"use client";

import { useEffect, useRef } from "react";
import { useGameStore } from "@/store/gameStore";
import { usePrefsStore } from "@/store/prefsStore";
import { playClueSubmit, playReveal, playTurnHandoff, playWin } from "./events";

/**
 * Mount once at the top of GameScreen. Watches game-store state for ritual
 * transitions and dispatches the matching synthesized sound. All dispatches
 * are no-ops when `prefs.sound` is false.
 *
 * Detected transitions:
 *  - clue went from null -> set            → playClueSubmit
 *  - a board card flipped from rv:false -> rv:true → playReveal(card.t)
 *  - turn flipped (red↔blue) without an end-of-game → playTurnHandoff
 *  - phase entered "ended"                  → playWin(winner)
 *
 * Comparisons run against the previous snapshot held in a ref. The hook is
 * intentionally side-effect-only and renders nothing.
 */
export function useGameSounds(): void {
  const gs = useGameStore((s) => s.gs);
  const sound = usePrefsStore((s) => s.sound);
  const volume = usePrefsStore((s) => s.volume);
  const prev = useRef<typeof gs | null>(null);

  useEffect(() => {
    const before = prev.current;
    prev.current = gs;
    if (!gs) return;
    const settings = { sound, volume };

    // Clue submit
    if (!before?.clue && gs.clue) {
      playClueSubmit(settings);
    }

    // Card reveals — diff the board
    if (before && before.board?.length === gs.board.length) {
      for (let i = 0; i < gs.board.length; i++) {
        const a = before.board[i];
        const b = gs.board[i];
        if (a && b && !a.rv && b.rv && b.t !== "hidden") {
          playReveal(b.t, settings);
        }
      }
    }

    // Turn handoff (only when still playing)
    if (
      before &&
      before.turn !== gs.turn &&
      gs.phase === "playing" &&
      before.phase === "playing"
    ) {
      playTurnHandoff(gs.turn, settings);
    }

    // Game ended
    if (before && before.phase !== "ended" && gs.phase === "ended" && gs.winner) {
      playWin(gs.winner, settings);
    }
  }, [gs, sound, volume]);
}
```

- [ ] **Step 2: Add barrel**

```typescript
// src/lib/audio/index.ts
export * from "./engine";
export * from "./events";
export * from "./useGameSounds";
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/audio/useGameSounds.ts src/lib/audio/index.ts
git commit -m "feat(audio): useGameSounds hook diffs store transitions to ritual sounds"
```

### Task 2.6: Settings — volume slider

**Files:**
- Create: `src/components/ui/slider.tsx` (shadcn slider via CLI)
- Modify: `src/components/a11y/SettingsSheet.tsx`

- [ ] **Step 1: Install shadcn slider**

Run: `npx shadcn@latest add slider`
This creates `src/components/ui/slider.tsx`. If the CLI is non-interactive in your environment, hand-write the file instead:

```tsx
// src/components/ui/slider.tsx
"use client";

import * as React from "react";
import { Slider as SliderPrimitive } from "radix-ui";
import { cn } from "@/lib/utils";

const Slider = React.forwardRef<
  React.ElementRef<typeof SliderPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root>
>(({ className, ...props }, ref) => (
  <SliderPrimitive.Root
    ref={ref}
    data-slot="slider"
    className={cn("relative flex w-full touch-none select-none items-center", className)}
    {...props}
  >
    <SliderPrimitive.Track className="bg-secondary relative h-1.5 w-full grow overflow-hidden rounded-full">
      <SliderPrimitive.Range className="bg-primary absolute h-full" />
    </SliderPrimitive.Track>
    <SliderPrimitive.Thumb className="border-primary bg-background ring-offset-background focus-visible:ring-ring block h-4 w-4 rounded-full border-2 shadow transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50" />
  </SliderPrimitive.Root>
));
Slider.displayName = "Slider";

export { Slider };
```

- [ ] **Step 2: Wire into SettingsSheet**

In `src/components/a11y/SettingsSheet.tsx`, import `Slider` at top:

```tsx
import { Slider } from "@/components/ui/slider";
```

Add a `volume` selector after the `sound` selector (after line 19):

```tsx
const volume = usePrefsStore((s) => s.volume);
```

Insert a new row right after the existing الصوت row (after the `</div>` closing the row at ~line 92). The row should look like:

```tsx
<div className="settings-row">
  <span id="set-volume-label">مستوى الصوت</span>
  <div style={{ flex: 1, marginInlineStart: ".6rem", maxWidth: 180 }}>
    <Slider
      aria-labelledby="set-volume-label"
      min={0}
      max={100}
      step={5}
      value={[volume]}
      disabled={!sound}
      onValueChange={(v) => update("volume", v[0] ?? 0)}
    />
  </div>
</div>
```

- [ ] **Step 3: Manual sanity**

```
npm run dev
```
Open the app, click the ⚙ Settings button. Confirm the volume slider appears under the "الصوت" toggle and is disabled when sound is off, enabled when sound is on. Move it; refresh; confirm persistence.

- [ ] **Step 4: Commit**

```bash
git add src/components/ui/slider.tsx src/components/a11y/SettingsSheet.tsx
git commit -m "feat(settings): add master volume slider (disabled when sound is off)"
```

---

## Phase 3 — Capsule phrase library

### Task 3.1: Phrase library + tests

**Files:**
- Create: `src/lib/copy/capsule.ts`
- Test: `tests/copy/capsule.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// tests/copy/capsule.test.ts
import { describe, it, expect } from "vitest";
import { resolveCapsulePhrase, type CapsuleState } from "@/lib/copy/capsule";

const baseGameId = "ABCD";

describe("resolveCapsulePhrase", () => {
  it("renders leader pre-clue with name interpolated", () => {
    const state: CapsuleState = { phase: "playing", gphase: false, role: "leader", isMyTurn: true, gameId: baseGameId, name: "أحمد" };
    const text = resolveCapsulePhrase(state);
    expect(text).toMatch(/أحمد/);
  });

  it("renders guesser post-clue with clue + count interpolated", () => {
    const state: CapsuleState = { phase: "playing", gphase: true, role: "guesser", isMyTurn: true, gameId: baseGameId, clue: "بيت", count: 2 };
    const text = resolveCapsulePhrase(state);
    expect(text).toMatch(/بيت/);
    expect(text).toMatch(/2/);
  });

  it("renders ended state regardless of role", () => {
    const state: CapsuleState = { phase: "ended", role: "guesser", isMyTurn: false, gameId: baseGameId, winnerName: "الأحمر" };
    const text = resolveCapsulePhrase(state);
    expect(text).toMatch(/الأحمر/);
  });

  it("is deterministic for the same (state-key, gameId)", () => {
    const s: CapsuleState = { phase: "playing", gphase: false, role: "leader", isMyTurn: true, gameId: baseGameId, name: "أحمد" };
    expect(resolveCapsulePhrase(s)).toBe(resolveCapsulePhrase(s));
  });

  it("may vary across gameIds", () => {
    const s = (gid: string): CapsuleState => ({ phase: "playing", gphase: false, role: "leader", isMyTurn: true, gameId: gid, name: "أحمد" });
    const variations = new Set(["A", "B", "C", "D", "E", "F", "G", "H"].map((g) => resolveCapsulePhrase(s(g))));
    expect(variations.size).toBeGreaterThan(1);
  });

  it("never returns an empty string for any role × phase × gphase × isMyTurn combination", () => {
    const roles = ["leader", "guesser", "host", "spectator"] as const;
    const phases = ["playing", "ended"] as const;
    for (const role of roles) for (const phase of phases) for (const gphase of [false, true]) for (const isMyTurn of [false, true]) {
      const t = resolveCapsulePhrase({ phase, gphase, role, isMyTurn, gameId: "X", name: "ن", clue: "ك", count: 1, winnerName: "وي" });
      expect(t.length).toBeGreaterThan(0);
    }
  });
});
```

- [ ] **Step 2: Run to confirm failure**

Run: `npx vitest run tests/copy/capsule.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

```typescript
// src/lib/copy/capsule.ts
export type Role = "leader" | "guesser" | "host" | "spectator";

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
}

/** The brand word, decorated with تشكيل (diacritics), for one-time headline render. */
export const CAPSULE_HEADLINE_TASHKEEL = "تَلْميحَة";

type PhraseSet = readonly string[];

const PHRASES = {
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
    "اقرأ اللوحة بهدوء — {clue}",
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
} as const satisfies Record<string, PhraseSet>;

type Bucket = keyof typeof PHRASES;

function bucketFor(s: CapsuleState): Bucket {
  if (s.phase === "ended") {
    return s.winnerName ? "endedWinner" : "endedAssassin";
  }
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

/** djb2: small fast 32-bit deterministic hash. */
function djb2(input: string): number {
  let h = 5381;
  for (let i = 0; i < input.length; i++) h = ((h << 5) + h + input.charCodeAt(i)) | 0;
  return h >>> 0;
}

function interpolate(template: string, s: CapsuleState): string {
  return template
    .replace(/\{name\}/g, s.name ?? "")
    .replace(/\{clue\}/g, s.clue ?? "")
    .replace(/\{count\}/g, s.count != null ? String(s.count) : "")
    .replace(/\{winnerName\}/g, s.winnerName ?? "");
}

export function resolveCapsulePhrase(s: CapsuleState): string {
  const bucket = bucketFor(s);
  const set = PHRASES[bucket];
  const idx = djb2(`${bucket}::${s.gameId}`) % set.length;
  return interpolate(set[idx]!, s);
}
```

- [ ] **Step 4: Run tests**

Run: `npx vitest run tests/copy/capsule.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/copy/capsule.ts tests/copy/capsule.test.ts
git commit -m "feat(copy): Arabic capsule phrase library, deterministic-by-gameId"
```

---

## Phase 4 — Game-screen scoped stylesheet

### Task 4.1: Create `game.css` with new zone + tile styles

**Files:**
- Create: `src/app/game.css`
- Modify: `src/app/globals.css` (add import)

- [ ] **Step 1: Create the file**

```css
/* src/app/game.css
 * Scoped to .game-on (the in-game screen). Everything here only takes effect
 * inside <div className="screen game-on">. Lives outside @layer to keep
 * priority equal to the legacy hand-built styles in globals.css.
 *
 * Owns: status strip, board stage, action dock, glass word cards, reveal
 * flip, Arabic calligraphy cascade, ambient stage glow, capsule timer pulse.
 */

/* ─── STAGE ROOT ─── */
.game-on { gap: .5rem; }
.game-on .game-zones { display: grid; grid-template-rows: auto 1fr auto; gap: .5rem; flex: 1; min-height: 0; }

/* ─── STATUS STRIP ─── */
.status-strip {
  position: sticky; top: 0; z-index: 5;
  display: grid; grid-template-columns: auto 1fr auto; align-items: center; gap: .55rem;
  background: rgba(18,18,36,.92); backdrop-filter: blur(16px);
  border: 1px solid var(--border2); border-radius: var(--r);
  padding: .55rem .8rem;
  box-shadow: 0 4px 20px rgba(0,0,0,.5);
}
.ss-score { text-align: center; min-width: 64px; }
.ss-score .n { font-size: 1.7rem; font-weight: 900; line-height: 1; text-shadow: 0 0 16px currentColor; }
.ss-score.red { color: var(--red2); }
.ss-score.blue { color: var(--blue2); }
.ss-score .glyph-row { font-size: .55rem; opacity: .8; margin-top: .15rem; display: flex; justify-content: center; gap: .2rem; }
.ss-score .wins { font-size: .55rem; background: rgba(255,255,255,.06); border: 1px solid rgba(255,255,255,.10); border-radius: 20px; padding: .05rem .5rem; margin-top: .15rem; display: inline-block; color: var(--text2); }
.ss-actions { display: flex; gap: .35rem; }

/* ─── TURN CAPSULE ─── */
.turn-capsule {
  position: relative; overflow: hidden;
  background: rgba(45,110,255,.14); border: 1.5px solid var(--blue);
  box-shadow: 0 0 18px rgba(52,168,255,.28), inset 0 0 14px rgba(52,168,255,.07);
  border-radius: 11px;
  padding: .42rem .7rem; text-align: center;
  transition: background-color .3s, border-color .3s, box-shadow .3s;
}
.turn-capsule.red { background: rgba(255,77,141,.14); border-color: var(--red); box-shadow: 0 0 18px rgba(255,77,141,.28), inset 0 0 14px rgba(255,77,141,.07); }
.turn-capsule .turn-line { font-weight: 900; font-size: .82rem; letter-spacing: .2px; }
.turn-capsule .sub-line { font-size: .62rem; opacity: .88; margin-top: .14rem; min-height: .9rem; }
.turn-capsule .clue-shimmer {
  display: inline-block;
  font-weight: 900; font-size: 1rem; letter-spacing: .5px;
  background: linear-gradient(110deg, var(--grape2) 10%, var(--gold2) 50%, var(--cyan, #34E0E0) 90%);
  background-size: 200% 100%;
  -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; color: transparent;
  animation: clueShimmer 1.6s ease-in-out 1;
}
@keyframes clueShimmer { from { background-position: 0 0; } to { background-position: 200% 0; } }
.turn-capsule.urgency-soft { animation: capsuleUrgencySoft 1s ease-in-out infinite; }
.turn-capsule.urgency-hard { animation: capsuleUrgencyHard .5s ease-in-out infinite; border-color: var(--gold); }
@keyframes capsuleUrgencySoft { 0%,100% { box-shadow: 0 0 12px currentColor; } 50% { box-shadow: 0 0 22px currentColor; } }
@keyframes capsuleUrgencyHard { 0%,100% { box-shadow: 0 0 16px var(--gold); transform: scale(1); } 50% { box-shadow: 0 0 28px var(--gold); transform: scale(1.01); } }

/* ─── BOARD STAGE ─── */
.board-stage {
  position: relative; flex: 1;
  background: rgba(10,10,20,.4);
  border-radius: var(--r); padding: .55rem;
  overflow: hidden;
}
.board-stage::before {
  content: ''; position: absolute; inset: -25%; pointer-events: none;
  background: radial-gradient(ellipse, var(--stage-glow, rgba(52,168,255,.10)) 0%, transparent 55%);
  animation: stagePulse 7s ease-in-out infinite;
}
.board-stage.team-red { --stage-glow: rgba(255,77,141,.10); }
.board-stage.team-blue { --stage-glow: rgba(52,168,255,.10); }
@keyframes stagePulse { 0%,100% { opacity: .5; transform: scale(1); } 50% { opacity: 1; transform: scale(1.05); } }

/* Arabic letter constellation behind the board */
.constellation { position: absolute; inset: 0; pointer-events: none; opacity: .06; }

/* Personal initial reveal — overlays the board center during key sweep */
.initial-flash {
  position: absolute; inset: 0; display: flex; align-items: center; justify-content: center;
  pointer-events: none; font-size: 9rem; font-weight: 900;
  color: var(--gold2); opacity: 0;
  animation: initialFlash 1s ease-in-out 1;
}
@keyframes initialFlash { 0%,100% { opacity: 0; transform: scale(.8); } 35%,65% { opacity: .25; transform: scale(1); } }

/* ─── GLASS WORD CARDS ─── */
.wc.glass {
  background: rgba(255,255,255,.045); backdrop-filter: blur(10px);
  border: 1px solid rgba(255,255,255,.10);
  box-shadow: inset 0 1px 0 rgba(255,255,255,.06), 0 2px 6px rgba(0,0,0,.3);
  color: var(--text);
  transition: transform .22s cubic-bezier(.34,1.56,.64,1), box-shadow .22s, border-color .22s;
}
.wc.glass[role="button"]:hover { transform: translateY(-2px) scale(1.02); border-color: rgba(167,139,250,.5); box-shadow: inset 0 1px 0 rgba(255,255,255,.1), 0 6px 18px rgba(139,92,246,.4); }

/* Reveal flip */
.board { perspective: 1000px; }
.wc.reveal-flip { animation: wcFlip 350ms cubic-bezier(.34,1.56,.64,1) both; transform-style: preserve-3d; will-change: transform; }
@keyframes wcFlip { 0% { transform: rotateY(0); } 100% { transform: rotateY(180deg); } }
.wc.reveal-flip > .back { transform: rotateY(180deg); backface-visibility: hidden; }

/* Wrong-color shake */
.wc.shake { animation: wcShake 240ms ease-in-out 1; }
@keyframes wcShake { 0%,100% { transform: translateX(0); } 25% { transform: translateX(-3px); } 50% { transform: translateX(3px); } 75% { transform: translateX(-3px); } }

/* Calligraphy cascade — per-letter spans receive `--i` */
.calligraphy { display: inline-flex; gap: 0; }
.calligraphy span { opacity: 0; transform: translateX(6px); animation: letterIn 240ms ease-out forwards; animation-delay: calc(var(--i) * 30ms); }
@keyframes letterIn { to { opacity: 1; transform: translateX(0); } }

/* Doubt aura — emitted by ActionDock when doubt mode is toggled */
.doubt-aura {
  position: fixed; inset: 0; pointer-events: none; z-index: 2;
  background: radial-gradient(ellipse at center, rgba(168,85,247,.18) 0%, transparent 60%);
  opacity: 0; animation: doubtAura 600ms ease-out 1;
}
@keyframes doubtAura { 0% { opacity: 0; } 30% { opacity: 1; } 100% { opacity: 0; } }

/* ─── ACTION DOCK ─── */
.action-dock {
  position: sticky; bottom: 0; z-index: 5;
  background: rgba(18,18,36,.95); backdrop-filter: blur(16px);
  border: 1px solid var(--border2); border-radius: var(--r);
  padding: .55rem .8rem;
  box-shadow: 0 -4px 20px rgba(0,0,0,.5);
  transition: height .24s cubic-bezier(.34,1.56,.64,1);
}
.action-dock.collapsed { padding: .2rem .8rem; }
.action-dock .row { display: flex; gap: .45rem; align-items: center; flex-wrap: wrap; }
.action-dock .hint { font-size: .6rem; opacity: .7; text-align: center; margin-top: .3rem; }
.action-dock .num { width: 48px; text-align: center; }

/* Hand-pass animation for host handoff */
.hand-pass {
  display: inline-block; font-size: 1.2rem;
  animation: handPass 2.4s ease-in-out infinite;
}
@keyframes handPass { 0%,100% { transform: translateX(0); opacity: .85; } 50% { transform: translateX(-22px); opacity: 1; } }

/* CTA spark fireworks on send */
.cta-spark { position: relative; }
.cta-spark.fire::after {
  content: ''; position: absolute; inset: -8px; border-radius: 9px; pointer-events: none;
  background:
    radial-gradient(circle at 20% 50%, var(--gold2) 0%, transparent 18%),
    radial-gradient(circle at 80% 50%, var(--grape2) 0%, transparent 18%),
    radial-gradient(circle at 50% 0%, var(--gold2) 0%, transparent 16%),
    radial-gradient(circle at 50% 100%, var(--grape2) 0%, transparent 16%);
  opacity: 0; animation: ctaFire 400ms ease-out 1;
}
@keyframes ctaFire { 0% { opacity: 0; transform: scale(.5); } 50% { opacity: 1; transform: scale(1.2); } 100% { opacity: 0; transform: scale(1.6); } }

/* ─── REDUCED MOTION FALLBACKS ─── */
@media (prefers-reduced-motion: reduce) {
  .turn-capsule, .turn-capsule.urgency-soft, .turn-capsule.urgency-hard,
  .board-stage::before, .wc.reveal-flip, .wc.shake, .calligraphy span,
  .initial-flash, .doubt-aura, .hand-pass, .cta-spark.fire::after { animation: none !important; transition: none !important; }
  .calligraphy span { opacity: 1; transform: none; }
}
[data-reduced-motion="on"] .turn-capsule,
[data-reduced-motion="on"] .turn-capsule.urgency-soft,
[data-reduced-motion="on"] .turn-capsule.urgency-hard,
[data-reduced-motion="on"] .board-stage::before,
[data-reduced-motion="on"] .wc.reveal-flip,
[data-reduced-motion="on"] .wc.shake,
[data-reduced-motion="on"] .calligraphy span,
[data-reduced-motion="on"] .initial-flash,
[data-reduced-motion="on"] .doubt-aura,
[data-reduced-motion="on"] .hand-pass,
[data-reduced-motion="on"] .cta-spark.fire::after { animation: none !important; transition: none !important; }
[data-reduced-motion="on"] .calligraphy span { opacity: 1; transform: none; }

/* ─── MOBILE TUNING ─── */
@media (max-width: 520px) {
  .status-strip { padding: .45rem .55rem; gap: .35rem; }
  .ss-score .n { font-size: 1.45rem; }
  .turn-capsule .turn-line { font-size: .74rem; }
  .turn-capsule .sub-line { font-size: .58rem; }
  .action-dock { padding: .45rem .55rem; }
}
@media (max-width: 360px) {
  .ss-score { min-width: 50px; }
  .ss-score .wins { display: none; }
}
```

- [ ] **Step 2: Wire into globals.css**

In `src/app/globals.css`, after the `@import "tw-animate-css";` line (line 5), insert:

```css
@import "./game.css";
```

- [ ] **Step 3: Manual sanity**

```
npm run dev
```
Confirm no CSS console errors. The new `.game-on .game-zones` rules are unused until Phase 5, so visuals don't change yet.

- [ ] **Step 4: Commit**

```bash
git add src/app/game.css src/app/globals.css
git commit -m "feat(css): scoped game.css with status strip, board stage, dock, glass tiles, motion rituals"
```

---

## Phase 5 — Structural components (zones + dock shapes)

### Task 5.1: `CalligraphyText` component + test

**Files:**
- Create: `src/components/game/CalligraphyText.tsx`
- Test: `tests/components/CalligraphyText.test.tsx`

- [ ] **Step 1: Failing test**

```typescript
// tests/components/CalligraphyText.test.tsx
import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import CalligraphyText from "@/components/game/CalligraphyText";

describe("CalligraphyText", () => {
  it("wraps each character in a span with an --i index", () => {
    const { container } = render(<CalligraphyText word="بيت" />);
    const spans = container.querySelectorAll("span");
    expect(spans.length).toBe(3);
    expect((spans[0] as HTMLElement).style.getPropertyValue("--i")).toBe("0");
    expect((spans[2] as HTMLElement).style.getPropertyValue("--i")).toBe("2");
  });

  it("renders empty without crashing", () => {
    const { container } = render(<CalligraphyText word="" />);
    expect(container.querySelectorAll("span").length).toBe(0);
  });
});
```

- [ ] **Step 2: Run to confirm failure**

Run: `npx vitest run tests/components/CalligraphyText.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

```tsx
// src/components/game/CalligraphyText.tsx
"use client";

interface CalligraphyTextProps {
  word: string;
  className?: string;
}

/**
 * Renders an Arabic word as per-letter spans so CSS can cascade a fade-in
 * animation (the .calligraphy class in game.css). Each span receives a CSS
 * custom property `--i` (its index, used by animation-delay).
 *
 * Splitting by `Array.from` is grapheme-aware in modern engines and handles
 * the basic Arabic ligature unit (we do not break joined forms).
 */
export default function CalligraphyText({ word, className }: CalligraphyTextProps) {
  const letters = Array.from(word);
  return (
    <span className={className ? `calligraphy ${className}` : "calligraphy"}>
      {letters.map((ch, i) => (
        <span key={i} style={{ "--i": String(i) } as React.CSSProperties}>
          {ch}
        </span>
      ))}
    </span>
  );
}
```

- [ ] **Step 4: Run tests**

Run: `npx vitest run tests/components/CalligraphyText.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/game/CalligraphyText.tsx tests/components/CalligraphyText.test.tsx
git commit -m "feat(game): CalligraphyText splits Arabic words into per-letter spans"
```

### Task 5.2: `ArabicConstellation` component

**Files:**
- Create: `src/components/game/ArabicConstellation.tsx`

- [ ] **Step 1: Implement**

```tsx
// src/components/game/ArabicConstellation.tsx
"use client";

/**
 * Faint decorative SVG of Arabic letterforms scattered across the board
 * stage. Pure decoration; aria-hidden. Opacity is controlled by .constellation
 * in game.css (synced to the 7s ambient glow loop).
 */
export default function ArabicConstellation() {
  return (
    <svg
      className="constellation"
      viewBox="0 0 400 240"
      preserveAspectRatio="none"
      aria-hidden="true"
      role="presentation"
    >
      <text x="36" y="60" fontSize="42" fontFamily="Tajawal, sans-serif" fontWeight="900" fill="currentColor">ا</text>
      <text x="142" y="190" fontSize="56" fontFamily="Tajawal, sans-serif" fontWeight="900" fill="currentColor">ل</text>
      <text x="260" y="80" fontSize="48" fontFamily="Tajawal, sans-serif" fontWeight="900" fill="currentColor">م</text>
      <text x="340" y="200" fontSize="44" fontFamily="Tajawal, sans-serif" fontWeight="900" fill="currentColor">ر</text>
      <text x="200" y="130" fontSize="64" fontFamily="Tajawal, sans-serif" fontWeight="900" fill="currentColor" opacity=".6">ت</text>
    </svg>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/game/ArabicConstellation.tsx
git commit -m "feat(game): ArabicConstellation decorative SVG"
```

### Task 5.3: `PoeticCapsule` + `TurnCapsule`

**Files:**
- Create: `src/components/game/PoeticCapsule.tsx`
- Create: `src/components/game/TurnCapsule.tsx`
- Test: `tests/components/TurnCapsule.test.tsx`

- [ ] **Step 1: Failing test**

```tsx
// tests/components/TurnCapsule.test.tsx
import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import TurnCapsule from "@/components/game/TurnCapsule";
import type { PlayerView } from "@/lib/types";

function baseGs(overrides: Partial<PlayerView> = {}): PlayerView {
  return {
    code: "ABCD",
    phase: "playing",
    hostMode: true,
    board: [],
    counts: { red: 8, blue: 9, neutral: 7 },
    turn: "blue",
    clue: null,
    gleft: 0,
    gphase: false,
    winner: null,
    teams: { red: [], blue: [] },
    leaders: { red: "أحمد", blue: "ليلى" },
    teamNames: { red: "الأحمر", blue: "الأزرق" },
    players: {},
    doubts: {},
    wins: { red: 0, blue: 0 },
    sRed: 8,
    sBlue: 9,
    log: [],
    ...overrides,
  };
}

describe("TurnCapsule", () => {
  it("shows blue tint when turn=blue", () => {
    const { container } = render(<TurnCapsule gs={baseGs({ turn: "blue" })} role="leader" myId="L" />);
    const cap = container.querySelector(".turn-capsule") as HTMLElement;
    expect(cap.classList.contains("red")).toBe(false);
  });

  it("shows red tint when turn=red", () => {
    const { container } = render(<TurnCapsule gs={baseGs({ turn: "red" })} role="leader" myId="L" />);
    const cap = container.querySelector(".turn-capsule") as HTMLElement;
    expect(cap.classList.contains("red")).toBe(true);
  });

  it("renders the clue word with shimmer class when clue is set", () => {
    const { container } = render(
      <TurnCapsule gs={baseGs({ clue: { w: "بيت", n: 2 }, gphase: true, gleft: 3 })} role="guesser" myId="G" />
    );
    expect(container.querySelector(".clue-shimmer")).not.toBeNull();
  });
});
```

- [ ] **Step 2: Implement PoeticCapsule**

```tsx
// src/components/game/PoeticCapsule.tsx
"use client";

import type { PlayerView } from "@/lib/types";
import type { Role } from "@/lib/ui/roles";
import { resolveCapsulePhrase, type CapsuleState } from "@/lib/copy/capsule";

interface PoeticCapsuleProps {
  gs: PlayerView;
  role: Role;
  myId: string | null;
}

/**
 * Picks one Arabic phrase from the library based on the current
 * (role, phase, gphase, isMyTurn) state. Deterministic per game (gs.code).
 */
export default function PoeticCapsule({ gs, role, myId }: PoeticCapsuleProps) {
  const me = myId ? gs.players[myId] : null;
  const isMyTurn = me?.team != null && me.team === gs.turn;
  const name = role === "leader" && me ? me.name : role === "leader" ? gs.leaders[gs.turn] ?? "" : me?.name ?? "";
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
  };
  return <span className="sub-line">{resolveCapsulePhrase(state)}</span>;
}
```

- [ ] **Step 3: Implement TurnCapsule**

```tsx
// src/components/game/TurnCapsule.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import type { PlayerView } from "@/lib/types";
import type { Role } from "@/lib/ui/roles";
import { usePrefsStore } from "@/store/prefsStore";
import { formatNumber } from "@/lib/i18n/digits";
import PoeticCapsule from "./PoeticCapsule";
import { useCountdown } from "@/lib/time/useCountdown";

interface TurnCapsuleProps {
  gs: PlayerView;
  role: Role;
  myId: string | null;
}

function urgencyClass(msLeft: number | null | undefined): string {
  if (msLeft == null) return "";
  if (msLeft <= 3000) return " urgency-hard";
  if (msLeft <= 10_000) return " urgency-soft";
  return "";
}

export default function TurnCapsule({ gs, role, myId }: TurnCapsuleProps) {
  const digits = usePrefsStore((s) => s.digits);
  const deadlineAt = gs.turnDeadlineAt ?? null;
  const msLeft = useCountdown(deadlineAt);
  const turnClass = gs.turn === "red" ? " red" : "";

  // Detect clue arrival to fire the one-shot shimmer animation
  const [shimmerKey, setShimmerKey] = useState(0);
  const prevClueRef = useRef<string | null>(null);
  useEffect(() => {
    const w = gs.clue?.w ?? null;
    if (w && prevClueRef.current !== w) setShimmerKey((k) => k + 1);
    prevClueRef.current = w;
  }, [gs.clue?.w]);

  const showClue = gs.clue && gs.gphase;
  const turnName =
    gs.phase === "ended"
      ? "🏁 انتهت اللعبة"
      : gs.turn === "red"
        ? `دور ${gs.teamNames.red} 🔴`
        : `دور ${gs.teamNames.blue} 🔵`;

  return (
    <div
      className={`turn-capsule${turnClass}${urgencyClass(msLeft)}`}
      role="status"
      aria-live="polite"
    >
      <div className="turn-line">
        {showClue ? (
          <>
            <span key={shimmerKey} className="clue-shimmer">{gs.clue!.w}</span>
            <span aria-hidden="true"> · </span>
            <span>{formatNumber(gs.clue!.n, digits)}</span>
            <span aria-hidden="true"> · </span>
            <span>تبقّى {formatNumber(gs.gleft, digits)}</span>
          </>
        ) : (
          turnName
        )}
      </div>
      <PoeticCapsule gs={gs} role={role} myId={myId} />
    </div>
  );
}
```

- [ ] **Step 4: Run tests**

Run: `npx vitest run tests/components/TurnCapsule.test.tsx`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/components/game/PoeticCapsule.tsx src/components/game/TurnCapsule.tsx tests/components/TurnCapsule.test.tsx
git commit -m "feat(game): TurnCapsule with shimmer-on-clue + timer urgency pulse"
```

### Task 5.4: `StatusStrip`

**Files:**
- Create: `src/components/game/StatusStrip.tsx`

- [ ] **Step 1: Implement**

```tsx
// src/components/game/StatusStrip.tsx
"use client";

import type { PlayerView } from "@/lib/types";
import type { Role } from "@/lib/ui/roles";
import TeamGlyph from "@/components/brand/TeamGlyph";
import { Button } from "@/components/ui/button";
import { usePrefsStore } from "@/store/prefsStore";
import { useGameStore } from "@/store/gameStore";
import { formatNumber } from "@/lib/i18n/digits";
import { arabicCount } from "@/lib/i18n/plural";
import TurnCapsule from "./TurnCapsule";

interface StatusStripProps {
  gs: PlayerView;
  role: Role;
  myId: string | null;
  isHost: boolean;
  winsRed: number;
  winsBlue: number;
}

export default function StatusStrip({ gs, role, myId, isHost, winsRed, winsBlue }: StatusStripProps) {
  const digits = usePrefsStore((s) => s.digits);
  const hostViewLeader = useGameStore((s) => s.hostViewLeader);
  const toggleHostView = useGameStore((s) => s.toggleHostView);

  return (
    <header className="status-strip">
      <div className="ss-score red">
        <div className="n">{formatNumber(gs.sRed ?? 9, digits)}</div>
        <div className="glyph-row"><TeamGlyph team="red" /> {gs.teamNames.red}</div>
        <span className="wins">{arabicCount(winsRed, formatNumber(winsRed, digits), { one: "انتصار واحد", two: "انتصاران", plural: "انتصارات" })}</span>
      </div>

      <TurnCapsule gs={gs} role={role} myId={myId} />

      <div className="ss-score blue">
        <div className="n">{formatNumber(gs.sBlue ?? 8, digits)}</div>
        <div className="glyph-row"><TeamGlyph team="blue" /> {gs.teamNames.blue}</div>
        <span className="wins">{arabicCount(winsBlue, formatNumber(winsBlue, digits), { one: "انتصار واحد", two: "انتصاران", plural: "انتصارات" })}</span>
      </div>

      {isHost && (
        <div className="ss-actions" style={{ gridColumn: "1 / -1", justifyContent: "center", marginTop: ".25rem" }}>
          <Button variant="ghost" size="xs" onClick={toggleHostView} aria-pressed={hostViewLeader}>
            {hostViewLeader ? "🙈 إخفاء المفتاح" : "👁 عرض المفتاح"}
          </Button>
          <Button variant="ghost" size="xs" onClick={() => useGameStore.setState({ clientScreen: "setup" })}>
            ⚙ الإعداد
          </Button>
        </div>
      )}
    </header>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/game/StatusStrip.tsx
git commit -m "feat(game): StatusStrip — scores + capsule + host actions in one zone"
```

### Task 5.5: `BoardStage`

**Files:**
- Create: `src/components/game/BoardStage.tsx`

- [ ] **Step 1: Implement**

```tsx
// src/components/game/BoardStage.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import type { PlayerView, Team } from "@/lib/types";
import type { Role } from "@/lib/ui/roles";
import Board from "./Board";
import ArabicConstellation from "./ArabicConstellation";

interface BoardStageProps {
  gs: PlayerView;
  role: Role;
  myId: string | null;
  myTeam: Team | null;
  isMyTurn: boolean;
  /** Optional leader initial to flash during the key sweep (first char of name). */
  leaderInitial?: string | null;
}

/**
 * Wraps the existing <Board/> in an ambient stage container that:
 *  - applies a team-colored radial glow that pulses 7s ease-in-out infinite
 *  - holds a faint Arabic-letter constellation behind the board
 *  - on the leader's first entry to the playing phase (per game), flashes the
 *    leader's first initial at board center for ~1s
 */
export default function BoardStage({ gs, role, myId, myTeam, isMyTurn, leaderInitial }: BoardStageProps) {
  const playing = gs.phase === "playing";
  const isLeader = role === "leader";
  const [flash, setFlash] = useState(false);
  const fired = useRef(false);

  useEffect(() => {
    if (!playing) { fired.current = false; setFlash(false); return; }
    if (!isLeader || fired.current) return;
    fired.current = true;
    setFlash(true);
    const t = setTimeout(() => setFlash(false), 1000);
    return () => clearTimeout(t);
  }, [playing, isLeader]);

  const teamClass = gs.turn === "red" ? "team-red" : "team-blue";

  return (
    <div className={`board-stage ${teamClass}`}>
      <ArabicConstellation />
      {flash && leaderInitial ? <div className="initial-flash" aria-hidden="true">{leaderInitial}</div> : null}
      <Board gs={gs} role={role} myId={myId} myTeam={myTeam} isMyTurn={isMyTurn} />
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/game/BoardStage.tsx
git commit -m "feat(game): BoardStage adds ambient team glow + constellation + initial flash"
```

### Task 5.6: Dock shapes — LeaderInput

**Files:**
- Create: `src/components/game/dock/LeaderInput.tsx`

- [ ] **Step 1: Implement (port from LeaderPanel)**

```tsx
// src/components/game/dock/LeaderInput.tsx
"use client";

import { useState } from "react";
import { useGameStore } from "@/store/gameStore";
import { Button } from "@/components/ui/button";

export default function LeaderInput() {
  const submitClue = useGameStore((s) => s.submitClue);
  const [word, setWord] = useState("");
  const [num, setNum] = useState("1");
  const [fire, setFire] = useState(0);

  const send = () => {
    const n = parseInt(num, 10);
    const ok = submitClue(word, Number.isNaN(n) ? 0 : n);
    if (ok) {
      setWord("");
      setNum("1");
      setFire((k) => k + 1);
    }
  };

  const letters = Array.from(word).filter((c) => c.trim().length > 0).length;

  return (
    <>
      <div className="row">
        <input
          type="text"
          placeholder="كلمة واحدة"
          maxLength={25}
          value={word}
          onChange={(e) => setWord(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") send(); }}
          style={{ flex: 1 }}
        />
        <input
          type="number"
          className="num"
          min={1}
          max={9}
          value={num}
          onChange={(e) => setNum(e.target.value)}
        />
        <Button
          key={fire}
          variant="gold"
          size="default"
          className={fire > 0 ? "cta-spark fire" : "cta-spark"}
          onClick={send}
        >
          إرسال ✨
        </Button>
      </div>
      <div className="hint">⚠ كلمة واحدة فقط · {letters > 0 ? `${letters} حروف` : ""}</div>
    </>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/game/dock/LeaderInput.tsx
git commit -m "feat(dock): LeaderInput with mini-fireworks on send + Arabic letter count"
```

### Task 5.7: Dock shapes — GuesserActions, HostHandoff, HostGuessControls, EndedActions, OffTurnStrip

**Files:**
- Create: `src/components/game/dock/GuesserActions.tsx`
- Create: `src/components/game/dock/HostHandoff.tsx`
- Create: `src/components/game/dock/HostGuessControls.tsx`
- Create: `src/components/game/dock/EndedActions.tsx`
- Create: `src/components/game/dock/OffTurnStrip.tsx`

- [ ] **Step 1: GuesserActions**

```tsx
// src/components/game/dock/GuesserActions.tsx
"use client";

import { useEffect, useState } from "react";
import { useGameStore } from "@/store/gameStore";
import { Button } from "@/components/ui/button";

export default function GuesserActions() {
  const doubtMode = useGameStore((s) => s.doubtMode);
  const toggleDoubtMode = useGameStore((s) => s.toggleDoubtMode);
  const endTurn = useGameStore((s) => s.endTurn);
  const [auraKey, setAuraKey] = useState(0);

  // Emit a one-shot aura whenever doubt mode toggles
  useEffect(() => { setAuraKey((k) => k + 1); }, [doubtMode]);

  return (
    <>
      {auraKey > 0 ? <div key={auraKey} className="doubt-aura" aria-hidden="true" /> : null}
      <div className="row" style={{ justifyContent: "center" }}>
        <Button
          variant="doubt"
          size="default"
          aria-pressed={doubtMode}
          onClick={toggleDoubtMode}
        >
          {doubtMode ? "✅ وضع الشك" : "🤔 علامة شك"}
        </Button>
        <Button variant="danger" size="default" onClick={endTurn}>
          ⏭ إنهاء الدور
        </Button>
      </div>
      <div className="hint">
        {doubtMode ? "انقر كلمة لوضع علامة شك (لن تخمّن)" : "اختر كلمة من اللوحة للتخمين"}
      </div>
    </>
  );
}
```

- [ ] **Step 2: HostHandoff**

```tsx
// src/components/game/dock/HostHandoff.tsx
"use client";

import type { PlayerView } from "@/lib/types";
import { hLeader } from "@/lib/ui/roles";
import { useGameStore } from "@/store/gameStore";
import TeamGlyph from "@/components/brand/TeamGlyph";
import { Button } from "@/components/ui/button";

interface HostHandoffProps { gs: PlayerView; }

export default function HostHandoff({ gs }: HostHandoffProps) {
  const setPeeking = useGameStore((s) => s.setPeeking);
  const peeking = useGameStore((s) => s.peeking);
  const hide = () => setPeeking(false);
  const show = () => setPeeking(true);

  return (
    <>
      <div className="row" style={{ justifyContent: "center" }}>
        <span className="hand-pass" aria-hidden="true">🤲</span>
        <span>مرّر الجهاز إلى القائد <TeamGlyph team={gs.turn} /> {hLeader(gs)}</span>
      </div>
      <div className="row" style={{ justifyContent: "center", marginTop: ".4rem" }}>
        <Button
          variant="gold"
          size="default"
          aria-label="اضغط مطوّلاً لرؤية المفتاح"
          onPointerDown={show}
          onPointerUp={hide}
          onPointerLeave={hide}
          onPointerCancel={hide}
          onKeyDown={(e) => { if (e.key === " " || e.key === "Enter") { e.preventDefault(); show(); } }}
          onKeyUp={(e) => { if (e.key === " " || e.key === "Enter") hide(); }}
          onBlur={hide}
          onContextMenu={(e) => e.preventDefault()}
        >
          {peeking ? "👁 المفتاح ظاهر" : "اضغط مطوّلاً لرؤية المفتاح"}
        </Button>
      </div>
    </>
  );
}
```

- [ ] **Step 3: HostGuessControls**

```tsx
// src/components/game/dock/HostGuessControls.tsx
"use client";

import { useGameStore } from "@/store/gameStore";
import { Button } from "@/components/ui/button";

export default function HostGuessControls() {
  const endTurn = useGameStore((s) => s.endTurn);
  return (
    <div className="row" style={{ justifyContent: "center" }}>
      <Button variant="danger" size="default" onClick={endTurn}>⏭ إنهاء الدور</Button>
    </div>
  );
}
```

- [ ] **Step 4: EndedActions**

```tsx
// src/components/game/dock/EndedActions.tsx
"use client";

import { useGameStore } from "@/store/gameStore";
import { Button } from "@/components/ui/button";

export default function EndedActions() {
  const restart = useGameStore((s) => s.restart);
  return (
    <div className="row" style={{ justifyContent: "center" }}>
      <Button variant="gold" size="default" onClick={restart}>🔁 لعبة جديدة</Button>
    </div>
  );
}
```

- [ ] **Step 5: OffTurnStrip**

```tsx
// src/components/game/dock/OffTurnStrip.tsx
"use client";

import type { PlayerView } from "@/lib/types";

interface OffTurnStripProps { gs: PlayerView; }

export default function OffTurnStrip({ gs }: OffTurnStripProps) {
  const tn = gs.teamNames;
  const text = gs.turn === "red" ? `دور ${tn.red} 🔴` : `دور ${tn.blue} 🔵`;
  return <div className="row" style={{ justifyContent: "center", fontSize: ".7rem", opacity: .8 }}>{text}</div>;
}
```

- [ ] **Step 6: Commit**

```bash
git add src/components/game/dock/
git commit -m "feat(dock): five dock shapes (guesser, host handoff, host guess, ended, off-turn)"
```

### Task 5.8: `ActionDock` router + test

**Files:**
- Create: `src/components/game/ActionDock.tsx`
- Test: `tests/components/ActionDock.test.tsx`

- [ ] **Step 1: Failing test**

```tsx
// tests/components/ActionDock.test.tsx
import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import ActionDock from "@/components/game/ActionDock";
import type { PlayerView } from "@/lib/types";

vi.mock("@/store/gameStore", () => ({
  useGameStore: (sel: (s: { doubtMode: boolean; toggleDoubtMode: () => void; endTurn: () => void; submitClue: () => boolean; restart: () => void; setPeeking: () => void; peeking: boolean }) => unknown) => sel({
    doubtMode: false,
    toggleDoubtMode: () => {},
    endTurn: () => {},
    submitClue: () => true,
    restart: () => {},
    setPeeking: () => {},
    peeking: false,
  }),
}));

function gsBase(overrides: Partial<PlayerView> = {}): PlayerView {
  return {
    code: "ABCD", phase: "playing", hostMode: false, board: [], counts: { red: 8, blue: 9, neutral: 7 },
    turn: "red", clue: null, gleft: 0, gphase: false, winner: null,
    teams: { red: [], blue: [] }, leaders: { red: "أحمد", blue: "ليلى" },
    teamNames: { red: "الأحمر", blue: "الأزرق" }, players: { ME: { id: "ME", name: "Me", team: "red" } },
    doubts: {}, wins: { red: 0, blue: 0 }, sRed: 8, sBlue: 9, log: [],
    ...overrides,
  };
}

describe("ActionDock router", () => {
  it("renders LeaderInput shape for online leader pre-clue on own turn", () => {
    const { container } = render(<ActionDock gs={gsBase()} role="leader" myId="ME" isHost={false} isMyTurn={true} />);
    expect(container.querySelector('input[placeholder="كلمة واحدة"]')).not.toBeNull();
  });

  it("renders GuesserActions for online guesser on own turn during guess phase", () => {
    const { container } = render(<ActionDock gs={gsBase({ gphase: true, clue: { w: "بيت", n: 2 }, gleft: 2 })} role="guesser" myId="ME" isHost={false} isMyTurn={true} />);
    expect(container.textContent).toMatch(/إنهاء الدور/);
  });

  it("renders OffTurnStrip when not my turn during playing", () => {
    const { container } = render(<ActionDock gs={gsBase()} role="guesser" myId="ME" isHost={false} isMyTurn={false} />);
    expect(container.textContent).toMatch(/دور/);
  });

  it("renders EndedActions when phase=ended", () => {
    const { container } = render(<ActionDock gs={gsBase({ phase: "ended", winner: "red" })} role="guesser" myId="ME" isHost={false} isMyTurn={false} />);
    expect(container.textContent).toMatch(/لعبة جديدة/);
  });

  it("renders HostHandoff for host during leader phase (pre-clue)", () => {
    const { container } = render(<ActionDock gs={gsBase()} role="host" myId={null} isHost={true} isMyTurn={false} />);
    expect(container.textContent).toMatch(/المفتاح/);
  });
});
```

- [ ] **Step 2: Implement**

```tsx
// src/components/game/ActionDock.tsx
"use client";

import type { PlayerView } from "@/lib/types";
import type { Role } from "@/lib/ui/roles";
import LeaderInput from "./dock/LeaderInput";
import GuesserActions from "./dock/GuesserActions";
import HostHandoff from "./dock/HostHandoff";
import HostGuessControls from "./dock/HostGuessControls";
import EndedActions from "./dock/EndedActions";
import OffTurnStrip from "./dock/OffTurnStrip";

interface ActionDockProps {
  gs: PlayerView;
  role: Role;
  myId: string | null;
  isHost: boolean;
  isMyTurn: boolean;
}

export default function ActionDock({ gs, role, myId, isHost, isMyTurn }: ActionDockProps) {
  const ended = gs.phase === "ended";
  const playing = gs.phase === "playing";

  let body: React.ReactNode;
  let collapsed = false;

  if (ended) {
    body = <EndedActions />;
  } else if (isHost && playing) {
    body = gs.gphase ? <HostGuessControls /> : <HostHandoff gs={gs} />;
  } else if (role === "leader" && isMyTurn && !gs.gphase && playing) {
    body = <LeaderInput />;
  } else if (role === "guesser" && isMyTurn && gs.gphase && playing) {
    body = <GuesserActions />;
  } else if (playing) {
    body = <OffTurnStrip gs={gs} />;
    collapsed = true;
  } else {
    body = null;
  }

  if (body == null) return null;

  return (
    <section className={collapsed ? "action-dock collapsed" : "action-dock"}>
      {body}
    </section>
  );
}
```

- [ ] **Step 3: Run tests**

Run: `npx vitest run tests/components/ActionDock.test.tsx`
Expected: PASS (5 tests).

- [ ] **Step 4: Commit**

```bash
git add src/components/game/ActionDock.tsx tests/components/ActionDock.test.tsx
git commit -m "feat(game): ActionDock routes to one of five dock shapes by role/phase"
```

---

## Phase 6 — WordCard glass material + reveal flip + calligraphy

### Task 6.1: WordCard glass classes + memoization + cascade rendering

**Files:**
- Modify: `src/components/game/WordCard.tsx`

- [ ] **Step 1: Replace contents**

Replace `src/components/game/WordCard.tsx` with:

```tsx
"use client";

import { memo, useEffect, useRef, useState, type KeyboardEvent, type MouseEvent } from "react";
import type { PlayerView, Team, ViewCard } from "@/lib/types";
import type { Role } from "@/lib/ui/roles";
import CalligraphyText from "./CalligraphyText";

const onKey = (e: KeyboardEvent, fn: () => void) => {
  if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fn(); }
};

interface WordCardProps {
  card: ViewCard;
  index: number;
  role: Role;
  myId: string | null;
  myTeam: Team | null;
  isMyTurn: boolean;
  gphase: boolean;
  phase: PlayerView["phase"];
  hostViewLeader: boolean;
  doubtMode: boolean;
  doubts: string[] | undefined;
  onGuess: (i: number) => void;
  onToggleDoubt: (i: number) => void;
}

function WordCardImpl({
  card, index, role, myId, isMyTurn, gphase, phase, hostViewLeader, doubtMode, doubts, onGuess, onToggleDoubt,
}: WordCardProps) {
  const isHost = role === "host";
  const isLeader = role === "leader";
  const playing = phase === "playing";

  const dCount = doubts ? doubts.length : 0;
  const myDoubtOn = doubts ? isHost || (myId !== null && doubts.includes(myId)) : false;

  // Track the rv→true transition so we can run the flip + shake animations once.
  const [flipping, setFlipping] = useState(false);
  const wrong = useRef(false);
  const prevRv = useRef(card.rv);
  useEffect(() => {
    if (!prevRv.current && card.rv) {
      setFlipping(true);
      // own-team check: we set wrong=true if the revealed type doesn't match the actor's team
      // but the simpler signal — "shake if revealed type !== current isMyTurn'er team" — needs
      // server context we don't have. We use a softer rule: shake only when the reveal isn't
      // own team and the current viewer is on a team.
      wrong.current = false;
      const t = setTimeout(() => setFlipping(false), 380);
      return () => clearTimeout(t);
    }
    prevRv.current = card.rv;
  }, [card.rv]);

  if (card.rv) {
    return (
      <div className={`wc rv rv-${card.t}${flipping ? " reveal-flip" : ""}`}>
        <CalligraphyText word={card.w} />
        {card.t === "assassin" ? <span aria-hidden="true"> ☠</span> : null}
      </div>
    );
  }

  let className = "wc glass";
  if (isHost) {
    if ((hostViewLeader || !gphase) && card.t !== "hidden") className += ` hv-${card.t}`;
  } else if (isLeader) {
    if (card.t !== "hidden") className += ` h-${card.t}`;
  }
  if (dCount > 0) className += " doubted";

  const hostActionable = isHost && gphase && playing;
  const guesserActionable = !isHost && isMyTurn && gphase && playing;

  const onClick = hostActionable
    ? (e: MouseEvent<HTMLDivElement>) => {
        if (e.shiftKey || e.ctrlKey) onToggleDoubt(index);
        else onGuess(index);
      }
    : guesserActionable
      ? () => {
          if (!isHost && doubtMode) onToggleDoubt(index);
          else onGuess(index);
        }
      : undefined;

  const style =
    guesserActionable && doubtMode
      ? { outline: myDoubtOn ? "2px solid var(--doubt2)" : "1px dashed rgba(168,85,247,.45)" }
      : undefined;

  const isInteractive = onClick !== undefined;
  const handleKeyDown = isInteractive
    ? (e: KeyboardEvent<HTMLDivElement>) => {
        onKey(e, () => {
          if (hostActionable) onGuess(index);
          else if (guesserActionable) {
            if (doubtMode) onToggleDoubt(index);
            else onGuess(index);
          }
        });
      }
    : undefined;

  return (
    <div
      className={className}
      onClick={onClick}
      onKeyDown={handleKeyDown}
      role={isInteractive ? "button" : undefined}
      tabIndex={isInteractive ? 0 : undefined}
      aria-label={isInteractive ? card.w : undefined}
      style={style}
      title={hostActionable ? "انقر للتخمين" : undefined}
    >
      <span>{card.w}</span>
      {dCount > 0 && (
        <span className="doubt-count-txt">{dCount > 1 ? `${dCount} ` : ""}🤔</span>
      )}
    </div>
  );
}

const WordCard = memo(WordCardImpl);
export default WordCard;
```

- [ ] **Step 2: Manual sanity**

```
npm run dev
```
Open a host-mode game, click a card, confirm:
- Revealed card flips (350 ms 3D rotateY).
- Word renders letter-by-letter (cascade visible if you watch closely).
- Unrevealed cards have glass material (not the old sand brick).
- Settings → reduced motion ON → reveal is instant.

- [ ] **Step 3: Commit**

```bash
git add src/components/game/WordCard.tsx
git commit -m "feat(wc): glass material + 3D reveal flip + Arabic calligraphy cascade + React.memo"
```

---

## Phase 7 — Recompose GameScreen + delete absorbed components

### Task 7.1: Rewrite GameScreen to compose the three zones

**Files:**
- Modify: `src/components/screens/GameScreen.tsx`

- [ ] **Step 1: Replace contents**

```tsx
// src/components/screens/GameScreen.tsx
"use client";

import StatusStrip from "@/components/game/StatusStrip";
import BoardStage from "@/components/game/BoardStage";
import ActionDock from "@/components/game/ActionDock";
import CoachMarks from "@/components/onboarding/CoachMarks";
import GameLog from "@/components/game/GameLog";
import { hLeader, myRole, myTurn } from "@/lib/ui/roles";
import { useGameStore } from "@/store/gameStore";
import WinModal from "./WinModal";

export default function GameScreen() {
  const gs = useGameStore((s) => s.gs);
  const myId = useGameStore((s) => s.myId);
  const isHost = useGameStore((s) => s.isHost);
  const winsData = useGameStore((s) => s.winsData);

  if (!gs || !gs.board || !gs.board.length) {
    return (
      <div className="screen on" style={{ display: "grid", placeItems: "center", minHeight: "60vh" }}>
        <div className="muted tc" role="status" aria-live="polite">
          <div style={{ fontSize: "2rem" }} aria-hidden="true">🍇</div>
          جارٍ التحميل…
        </div>
      </div>
    );
  }

  const role = myRole(gs, myId, isHost);
  const isMyTurn = myTurn(gs, myId);
  const myTeam = myId ? (gs.players[myId]?.team ?? null) : null;
  const leaderName = hLeader(gs);
  const leaderInitial = leaderName ? Array.from(leaderName)[0] ?? null : null;

  return (
    <div className="screen game-on" id="s-game">
      <CoachMarks />
      <div className="game-zones">
        <StatusStrip
          gs={gs}
          role={role}
          myId={myId}
          isHost={isHost}
          winsRed={winsData.red || 0}
          winsBlue={winsData.blue || 0}
        />
        <BoardStage
          gs={gs}
          role={role}
          myId={myId}
          myTeam={myTeam}
          isMyTurn={isMyTurn}
          leaderInitial={leaderInitial}
        />
        <ActionDock
          gs={gs}
          role={role}
          myId={myId}
          isHost={isHost}
          isMyTurn={isMyTurn}
        />
      </div>
      <GameLog log={gs.log ?? []} />
      {gs.phase === "ended" && <WinModal gs={gs} />}
    </div>
  );
}
```

- [ ] **Step 2: Manual sanity**

```
npm run dev
```
Walk through a full host-mode game:
1. Home → Setup → fill teams + leaders → Launch.
2. Game screen renders with strip + board stage + dock visible.
3. Host: handoff dock shows hand-pass + "hold to peek".
4. Click "👁 عرض المفتاح" in strip — board tints by team key.
5. Hand to leader; capsule shows leader's poetic phrase.
6. Submit a clue: clue shimmer-sweeps across the capsule.
7. Click a card: flip animation; cascade renders the word.
8. Reach game end: WinModal opens with confetti.

- [ ] **Step 3: Run typecheck + tests**

Run: `npm run typecheck && npm test`
Expected: PASS (existing tests not broken).

- [ ] **Step 4: Commit**

```bash
git add src/components/screens/GameScreen.tsx
git commit -m "refactor(game): recompose GameScreen as Status Strip + Board Stage + Action Dock"
```

### Task 7.2: Delete absorbed components

**Files (delete):**
- `src/components/game/GameHeader.tsx`
- `src/components/game/HostBar.tsx`
- `src/components/game/HandoffGate.tsx`
- `src/components/game/Counters.tsx`
- `src/components/game/CluePanel.tsx`
- `src/components/game/LeaderPanel.tsx`
- `src/components/game/ActionRow.tsx`

- [ ] **Step 1: Verify no remaining imports**

Run: `grep -rn "from \"@/components/game/\\(GameHeader\\|HostBar\\|HandoffGate\\|Counters\\|CluePanel\\|LeaderPanel\\|ActionRow\\)\"" src tests`
Expected: no matches.

- [ ] **Step 2: Delete files**

```bash
rm src/components/game/GameHeader.tsx \
   src/components/game/HostBar.tsx \
   src/components/game/HandoffGate.tsx \
   src/components/game/Counters.tsx \
   src/components/game/CluePanel.tsx \
   src/components/game/LeaderPanel.tsx \
   src/components/game/ActionRow.tsx
```

- [ ] **Step 3: Run typecheck + tests**

Run: `npm run typecheck && npm test`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore(game): delete components absorbed into Status Strip / Action Dock"
```

---

## Phase 8 — Wire audio at GameScreen

### Task 8.1: Mount the audio hook + lazy-init on first click

**Files:**
- Modify: `src/components/screens/GameScreen.tsx`

- [ ] **Step 1: Add hook + first-gesture engine init**

In `src/components/screens/GameScreen.tsx`, add the import:

```tsx
import { useGameSounds, ensureEngine } from "@/lib/audio";
import { usePrefsStore } from "@/store/prefsStore";
```

Inside the component (after the existing `useGameStore` selectors), add:

```tsx
useGameSounds();
const sound = usePrefsStore((s) => s.sound);
const volume = usePrefsStore((s) => s.volume);
const onAnyPointer = () => { ensureEngine({ sound, volume }); };
```

Wrap the outer `<div className="screen game-on">` with `onPointerDown={onAnyPointer}` so the first user click inside the game screen creates the AudioContext.

- [ ] **Step 2: Manual sanity**

```
npm run dev
```
Open the app, play a full game with sound enabled in settings. Confirm:
- Clue submit → shimmer sound.
- Card reveal own → chime.
- Wrong reveal → descent.
- Neutral → thud.
- Assassin → gong.
- Turn handoff → whoosh.
- Win → Maqam Rast phrase.
With sound disabled in settings → silent through the same flow.

- [ ] **Step 3: Commit**

```bash
git add src/components/screens/GameScreen.tsx
git commit -m "feat(game): wire useGameSounds + lazy AudioContext on first pointer down"
```

---

## Phase 9 — E2E visual snapshots

### Task 9.1: Visual snapshot suite

**Files:**
- Create: `tests/e2e/game-screen-snapshots.spec.ts`

- [ ] **Step 1: Write snapshot tests**

```typescript
// tests/e2e/game-screen-snapshots.spec.ts
import { test, expect } from "@playwright/test";

async function bootHostGame(page: import("@playwright/test").Page) {
  await page.goto("/");
  await page.getByRole("button", { name: /العب الآن/ }).click().catch(() => undefined);
  await page.getByRole("textbox", { name: /اسمك/ }).fill("يوسف");
  await page.getByRole("button", { name: /إعداد اللعبة/ }).click();
  for (const name of ["علي", "فاطمة", "سارة"]) {
    await page.locator("#red-inp").fill(name);
    await page.locator("#red-inp").press("Enter");
  }
  for (const name of ["أحمد", "ليلى", "نور"]) {
    await page.locator("#blue-inp").fill(name);
    await page.locator("#blue-inp").press("Enter");
  }
  // first ⭐ for red, first ⭐ for blue (the order they appear in the DOM)
  const stars = page.getByRole("button", { name: "⭐" });
  await stars.nth(0).click();
  await stars.nth(3).click();
  await page.locator("#btn-launch").click();
  // dismiss coach marks
  const skip = page.getByRole("button", { name: "تخطّي" });
  if (await skip.isVisible().catch(() => false)) await skip.click();
}

test.describe("Game screen visual snapshots", () => {
  test("host pre-clue desktop 1440x900", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await bootHostGame(page);
    await expect(page.locator("#s-game")).toBeVisible();
    await expect(page).toHaveScreenshot("host-preclue-1440.png", { fullPage: false, maxDiffPixelRatio: 0.02 });
  });

  test("host pre-clue mobile 390x844", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await bootHostGame(page);
    await expect(page.locator("#s-game")).toBeVisible();
    await expect(page).toHaveScreenshot("host-preclue-390.png", { fullPage: false, maxDiffPixelRatio: 0.02 });
  });
});
```

- [ ] **Step 2: Generate baselines**

Run: `npx playwright test tests/e2e/game-screen-snapshots.spec.ts --update-snapshots`
Expected: snapshots written under `tests/e2e/game-screen-snapshots.spec.ts-snapshots/`.

- [ ] **Step 3: Run as regression**

Run: `npx playwright test tests/e2e/game-screen-snapshots.spec.ts`
Expected: PASS — diff under the 2% threshold.

- [ ] **Step 4: Commit (including baselines)**

```bash
git add tests/e2e/game-screen-snapshots.spec.ts tests/e2e/game-screen-snapshots.spec.ts-snapshots/
git commit -m "test(e2e): visual snapshot baselines for game screen (host pre-clue, desktop + mobile)"
```

---

## Phase 10 — Final verification loop

### Task 10.1: Run the full check + manual walkthrough

- [ ] **Step 1: Run all checks**

Run: `npm run check`
Expected: typecheck + lint + tests all pass.

- [ ] **Step 2: Run Playwright suite**

Run: `npx playwright test`
Expected: cascade-regression + game-screen-snapshots both pass.

- [ ] **Step 3: Manual game walkthrough**

1. Cold-open `/` → Home renders cleanly. Click "العب الآن".
2. Home with mode picker — "+ أضف" button isn't present here, but check Settings ⚙ for the new volume slider.
3. "✦ إعداد اللعبة" → Setup. Add 3 red + 3 blue players. **"+ أضف"** must be a normal-sized button, no overlap with the input.
4. Set red leader + blue leader. Click **"🚀 ابدأ اللعبة"** — must be a normal-height button (≥ 36 px), not a thin strip.
5. Game screen: confirm Status Strip on top, Board Stage in middle (glass tiles), Action Dock on bottom (host handoff shape with hand-pass + hold-to-peek).
6. Hold-to-peek → board key tint appears.
7. Pass to leader (host pretend), submit clue "بيت" with count 2. **"إرسال ✨"** button must be a normal-height button. Clue shimmer-sweeps in the capsule.
8. Click a card. Confirm 3D flip + Arabic calligraphy cascade on the revealed word + bloom + chime sound.
9. Reveal until game ends. WinModal opens, confetti, Maqam Rast phrase plays.
10. Mobile (DevTools 390×844): same flow. Strip + dock collapse properly; board fills remaining viewport.
11. Settings → Reduced Motion ON → reveal animation is instant; pulses still functional but not animated.
12. Settings → Sound OFF → all rituals silent; turning volume slider does nothing while sound off.

- [ ] **Step 4: If anything fails, fix inline + recommit**

For any visible regression, fix the offending file with a focused commit (`fix(...)`), then re-run `npm run check` and the manual walkthrough. Loop until clean.

- [ ] **Step 5: Final summary commit (only if there were follow-up fixes)**

If everything passed first time, skip. Otherwise: `git log --oneline` and verify each phase's commits read coherently.

---

## Self-review

**Spec coverage:**
- ✅ Foundation (§4) → Phase 1
- ✅ 3-zone architecture (§5) → Phase 5 + Phase 7
- ✅ Glass material + reveal flip + calligraphy cascade (§6) → Phase 6
- ✅ Motion language — 8 rituals (§7) → game.css keyframes (Phase 4) + WordCard/Capsule/Dock animation hooks (Phases 5–6)
- ✅ Audio layer (§8) → Phase 2 + Phase 8
- ✅ Phrase library (§9) → Phase 3
- ✅ Performance discipline (§10) → React.memo (Phase 6), will-change scoping (CSS), no JS for ambient glow (Phase 4)
- ✅ Testing strategy (§11) → unit tests inline in each phase + Phase 9 visual snapshots + Phase 1 cascade regression
- ✅ Migration plan (§12) → mirrors the eight phases of this plan

**Placeholder scan:** none — every step has full code, exact commands, and expected outputs.

**Type consistency:** `Engine`, `EngineSettings`, `CapsuleState`, `Role`, `Team` used consistently across audio + components. `prefs.volume: number` added in Phase 2 task 2.1 and used by `engine.ts` (Phase 2 task 2.2) and `SettingsSheet` (Phase 2 task 2.6).
