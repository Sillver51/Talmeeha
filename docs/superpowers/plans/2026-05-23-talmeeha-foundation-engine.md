# Talmeeha — Plan 1: Foundation & Game Engine Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up the Next.js 16 + TypeScript project with a custom Socket.io server, and port the entire game rule-set out of the legacy `server.js` into a pure, fully unit-tested game engine plus thin, Zod-validated socket handlers — all without any UI.

**Architecture:** A custom Node server (`server/index.ts`) attaches Socket.io to the HTTP server and delegates everything else to the Next.js request handler. The custom-server programmatic API is unchanged in Next 16 (`next({ dev })` → `getRequestHandler()` → `app.prepare()`). All game truth is computed by pure, immutable functions in `src/lib/game/` (deterministic via an injectable RNG). Socket handlers validate inbound payloads with Zod, call the pure functions, store new room state in an in-memory `Map`, and broadcast typed `state`. Shared TypeScript types are imported by both server and (later) client.

**Tech Stack:** Next.js 16 (App Router; Turbopack is the default bundler), React 19, TypeScript 5.6 (strict), Socket.io 4, Zod, Vitest, tsx, Tailwind v4 (configured now, used in Plan 2). **Requires Node ≥ 20.9.0** (Next 16 dropped Node 18).

> **Next 16 best-practice notes:** Turbopack is default for `next build` — keep `next.config.ts`
> free of any `webpack` config or the build fails (use `--webpack` only as a deliberate opt-out).
> We don't call `next dev`/`next start` directly (we run the custom server), so the "remove
> `--turbopack` flag" upgrade step doesn't apply to our scripts.

**Source spec:** `docs/superpowers/specs/2026-05-23-talmeeha-nextjs-design.md`
**Legacy parity reference:** `server.js`, `public/index.html`

---

## File Structure (created by this plan)

```
package.json                     # rewritten: Next + custom server scripts
tsconfig.json                    # strict TS, path alias @/*
next.config.ts                   # minimal
vitest.config.ts                 # node env, coverage thresholds
tailwind.config.ts               # tokens registered (used in Plan 2)
.gitignore                       # node_modules, .next, .env*, coverage
.env.example                     # PORT
server/
  index.ts                       # custom server: Next handler + Socket.io
  socket.ts                      # io.on('connection') → register handlers
  rooms.ts                       # in-memory room store (Map) + lifecycle
  handlers/
    index.ts                     # registerHandlers(io, socket)
    host.ts        online.ts     # create_host / create_online + join_online
    teams.ts                     # select_team / become_leader
    play.ts                      # submit_clue / guess_card / end_turn / toggle_doubt
    lifecycle.ts                 # start_game / restart / disconnect
src/
  app/ (layout.tsx, page.tsx, globals.css)   # placeholder home (real UI = Plan 2)
  lib/
    types/index.ts               # Team, Card, GameState, socket event maps
    schemas/index.ts             # Zod schemas for every inbound payload
    words/index.ts               # Arabic word bank + helpers
    game/
      rng.ts                     # seedable RNG + shuffle
      board.ts                   # buildBoard
      win.ts                     # remaining, checkWin
      turn.ts                    # nextTurn (immutable)
      rules.ts                   # resolveGuess, submitClue, toggleDoubt (immutable)
      index.ts                   # re-exports
tests/
  lib/game/*.test.ts             # unit tests (Vitest)
  server/handlers.test.ts        # integration tests (in-memory io)
```

---

## Task 1: Project scaffold (Next 16 + TS + custom-server scripts)

**Files:**
- Modify: `package.json`
- Create: `tsconfig.json`, `next.config.ts`, `.gitignore`, `.env.example`

- [ ] **Step 1: Replace `package.json`**

```json
{
  "name": "talmeeha",
  "version": "2.0.0",
  "description": "تلميحة — لعبة الفرق والكلمات العربية",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "tsx watch server/index.ts",
    "build": "next build && tsc -p tsconfig.server.json",
    "start": "NODE_ENV=production node dist/server/index.js",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:cov": "vitest run --coverage",
    "lint": "next lint",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "next": "^16.2.6",
    "react": "^19.2.0",
    "react-dom": "^19.2.0",
    "socket.io": "^4.8.1",
    "socket.io-client": "^4.8.1",
    "zod": "^3.24.1",
    "zustand": "^5.0.2"
  },
  "devDependencies": {
    "@types/node": "^22.10.0",
    "@types/react": "^19.2.0",
    "@types/react-dom": "^19.2.0",
    "@vitejs/plugin-react": "^4.3.4",
    "@vitest/coverage-v8": "^2.1.8",
    "tailwindcss": "^4.0.0",
    "tsx": "^4.19.2",
    "typescript": "^5.6.3",
    "vitest": "^2.1.8"
  },
  "engines": { "node": ">=20.9.0" }
}
```

- [ ] **Step 2: Create `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./src/*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules", "dist"]
}
```

- [ ] **Step 3: Create `tsconfig.server.json`** (compiles the custom server for production)

```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "outDir": "dist",
    "noEmit": false,
    "jsx": "preserve"
  },
  "include": ["server/**/*.ts", "src/lib/**/*.ts"]
}
```

- [ ] **Step 4: Create `next.config.ts`**

```ts
import type { NextConfig } from "next";
// Next 16: Turbopack is the default bundler. Do NOT add a `webpack` key here or
// `next build` will fail. Turbopack options (if ever needed) go under `turbopack: {}`.
const nextConfig: NextConfig = { reactStrictMode: true };
export default nextConfig;
```

- [ ] **Step 5: Create `.gitignore`**

```
node_modules/
.next/
dist/
coverage/
.env
.env.*
!.env.example
*.log
```

- [ ] **Step 6: Create `.env.example`**

```
PORT=3000
```

- [ ] **Step 7: Install and verify toolchain**

Run: `npm install`
Expected: completes without peer-dependency errors.
Run: `npx tsc --noEmit`
Expected: no errors (no source files yet beyond config).

- [ ] **Step 8: Commit**

```bash
git add package.json tsconfig.json tsconfig.server.json next.config.ts .gitignore .env.example
git commit -m "chore: scaffold Next.js 16 + TS + custom-server toolchain"
```

---

## Task 2: Shared types

**Files:**
- Create: `src/lib/types/index.ts`

- [ ] **Step 1: Write the types** (mirrors the legacy room object + socket events)

```ts
export type Team = "red" | "blue";
export type CardType = Team | "neutral" | "assassin";
export type Phase = "lobby" | "setup" | "playing" | "ended";

export interface Card { w: string; t: CardType; rv: boolean; }
export interface Player { id: string; name: string; team: Team | null; }
export interface Clue { w: string; n: number; }
export interface HostTeam { players: string[]; leader: string; gIdx: number; }

export interface GameState {
  code: string;
  phase: Phase;
  hostMode: boolean;
  hostSocketId?: string;
  board: Card[];
  turn: Team;
  clue: Clue | null;
  gleft: number;
  gphase: boolean;
  winner: Team | null;
  teams: Record<Team, string[]>;
  leaders: Record<Team, string | null>;
  teamNames: Record<Team, string>;
  players: Record<string, Player>;
  doubts: Record<number, string[]>;
  wins: Record<Team, number>;
  sRed: number;
  sBlue: number;
  log: string[];
  hRed?: HostTeam;
  hBlue?: HostTeam;
}

export interface Joined { code: string; myId: string; isHost: boolean; }

export interface CreateHostPayload {
  hostName: string; redName: string; blueName: string;
  redPlayers: string[]; redLeader: string;
  bluePlayers: string[]; blueLeader: string;
}

export interface ClientToServerEvents {
  create_host: (p: CreateHostPayload) => void;
  create_online: (p: { name: string }) => void;
  join_online: (p: { code: string; name: string }) => void;
  select_team: (p: { code: string; team: Team }) => void;
  become_leader: (p: { code: string; team: Team }) => void;
  start_game: (p: { code: string }) => void;
  submit_clue: (p: { code: string; word: string; num: number }) => void;
  guess_card: (p: { code: string; index: number }) => void;
  toggle_doubt: (p: { code: string; index: number }) => void;
  end_turn: (p: { code: string }) => void;
  restart: (p: { code: string }) => void;
}

export interface ServerToClientEvents {
  state: (s: GameState) => void;
  joined: (p: Joined) => void;
  error: (msg: string) => void;
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/lib/types/index.ts
git commit -m "feat: shared game + socket types"
```

---

## Task 3: Word bank

**Files:**
- Create: `src/lib/words/index.ts`
- Test: `tests/lib/words.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from "vitest";
import { WORDS, BOARD_SIZE } from "@/lib/words";

describe("word bank", () => {
  it("has enough unique words for a board", () => {
    expect(WORDS.length).toBeGreaterThanOrEqual(BOARD_SIZE);
    expect(new Set(WORDS).size).toBe(WORDS.length);
  });
  it("contains only single Arabic words", () => {
    for (const w of WORDS) {
      expect(w).not.toContain(" ");
      expect(/[؀-ۿ]/.test(w)).toBe(true);
    }
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run tests/lib/words.test.ts`
Expected: FAIL — cannot resolve `@/lib/words`.

- [ ] **Step 3: Create `src/lib/words/index.ts`** (port `WB` verbatim from `server.js:16`)

```ts
export const BOARD_SIZE = 25;
// Ported verbatim from legacy server.js WB array (de-duplicated).
export const WORDS: readonly string[] = [
  "جبل","بحر","نهر","صحراء","غابة","سماء","شمس","قمر","نجوم","ريح","مطر","ثلج","رمل","صخرة","وادي",
  "جزيرة","بركان","بحيرة","شلال","سحاب","شاطئ","تلة","كهف","مرج","دلتا","أسد","نمر","فيل","حصان","ذئب",
  "ثعلب","نسر","دلفين","تمساح","أرنب","ببغاء","سلحفاة","عقرب","ثعبان","قرد","فهد","زرافة","دب","طاووس","صقر",
  "حوت","قنفذ","غزال","ضبع","قط","قاهرة","رياض","دبي","بغداد","بيروت","تونس","مكة","إسطنبول","طوكيو","باريس",
  "مطار","جسر","برج","قلعة","متحف","سوق","مسجد","معبد","قصر","ميناء","ملعب","حديقة","مكتبة","مستشفى","محطة",
  "تمر","عسل","زيتون","رمان","فراولة","برتقال","توت","تفاح","عنب","مشمش","خبز","أرز","كباب","حلوى","شاي",
  "قهوة","عصير","لبن","زبدة","جبن","شوكولا","فلافل","منسف","كنافة","حاسوب","هاتف","روبوت","طائرة","ليزر",
  "شاشة","كاميرا","برنامج","شبكة","كرة","سباحة","ملاكمة","جودو","ركض","قفز","رماية","فروسية","غوص","تسلق",
  "شعر","موسيقى","رسم","مسرح","رقص","نحت","تصوير","أدب","رواية","لحن","طبيب","مهندس","معلم","شاعر","قاضي",
  "طاهي","رسام","نجار","صياد","بناء","أحمر","أزرق","أصفر","أخضر","بنفسجي","مثلث","دائرة","مربع","نجمة","حب",
  "حرية","سلام","شجاعة","أمل","فرح","حزن","خيال","حقيقة","سر","مفتاح","كنز","خريطة","بوصلة","ساعة","مرآة",
  "كتاب","قلم","رسالة","عطر","سيف","درع","تاج","رداء","خيمة","سفينة","قارب","حبل","شمعة","لؤلؤة","صاروخ",
  "غواصة","دبابة","مروحية","فانوس","هرم","تلسكوب","ديناصور","تنين","عملاق","قزم","جن","مارد","ساحر","فارس",
  "ملك","أميرة","ثورة","حرب","اتفاق","برلمان","دستور","علم","عاصمة","بيانو","ناي","عود","طبل","كمان","قيثارة","ترومبيت",
];
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run tests/lib/words.test.ts`
Expected: PASS (both cases).

- [ ] **Step 5: Commit**

```bash
git add src/lib/words/index.ts tests/lib/words.test.ts
git commit -m "feat: port Arabic word bank with validation tests"
```

---

## Task 4: Seedable RNG + shuffle

**Files:**
- Create: `src/lib/game/rng.ts`
- Test: `tests/lib/game/rng.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from "vitest";
import { mulberry32, shuffle } from "@/lib/game/rng";

describe("rng", () => {
  it("is deterministic for a given seed", () => {
    const a = mulberry32(42); const b = mulberry32(42);
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
  });
  it("shuffle is a permutation (no loss, no dupes)", () => {
    const input = [1, 2, 3, 4, 5];
    const out = shuffle(input, mulberry32(7));
    expect([...out].sort()).toEqual([1, 2, 3, 4, 5]);
    expect(input).toEqual([1, 2, 3, 4, 5]); // input not mutated
  });
  it("same seed → same shuffle order", () => {
    const x = shuffle([1, 2, 3, 4, 5], mulberry32(7));
    const y = shuffle([1, 2, 3, 4, 5], mulberry32(7));
    expect(x).toEqual(y);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run tests/lib/game/rng.test.ts`
Expected: FAIL — cannot resolve module.

- [ ] **Step 3: Implement `src/lib/game/rng.ts`**

```ts
export type Rng = () => number; // returns [0,1)

export function mulberry32(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const systemRng: Rng = Math.random;

// Fisher–Yates; returns a NEW array, never mutates the input.
export function shuffle<T>(arr: readonly T[], rng: Rng = systemRng): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run tests/lib/game/rng.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/game/rng.ts tests/lib/game/rng.test.ts
git commit -m "feat: seedable RNG + immutable shuffle"
```

---

## Task 5: Board generation

**Files:**
- Create: `src/lib/game/board.ts`
- Test: `tests/lib/game/board.test.ts`

Legacy parity (`server.js:27-37`): 25 words; start team 9 cards, other team 8, neutral 7,
assassin 1; card types shuffled; `startTeam` chosen at random.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from "vitest";
import { buildBoard } from "@/lib/game/board";
import { mulberry32 } from "@/lib/game/rng";
import { WORDS, BOARD_SIZE } from "@/lib/words";

describe("buildBoard", () => {
  it("creates a 25-card board with correct type distribution", () => {
    const { board, startTeam } = buildBoard(WORDS, mulberry32(1));
    expect(board).toHaveLength(BOARD_SIZE);
    const other = startTeam === "red" ? "blue" : "red";
    const count = (t: string) => board.filter((c) => c.t === t).length;
    expect(count(startTeam)).toBe(9);
    expect(count(other)).toBe(8);
    expect(count("neutral")).toBe(7);
    expect(count("assassin")).toBe(1);
  });
  it("all cards start unrevealed with unique words", () => {
    const { board } = buildBoard(WORDS, mulberry32(2));
    expect(board.every((c) => c.rv === false)).toBe(true);
    expect(new Set(board.map((c) => c.w)).size).toBe(BOARD_SIZE);
  });
  it("is deterministic for a fixed seed", () => {
    const a = buildBoard(WORDS, mulberry32(99));
    const b = buildBoard(WORDS, mulberry32(99));
    expect(a).toEqual(b);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run tests/lib/game/board.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `src/lib/game/board.ts`**

```ts
import type { Card, CardType, Team } from "@/lib/types";
import { shuffle, type Rng, systemRng } from "./rng";
import { BOARD_SIZE } from "@/lib/words";

export function buildBoard(
  words: readonly string[],
  rng: Rng = systemRng,
): { board: Card[]; startTeam: Team } {
  const picked = shuffle(words, rng).slice(0, BOARD_SIZE);
  const startTeam: Team = rng() < 0.5 ? "red" : "blue";
  const other: Team = startTeam === "red" ? "blue" : "red";
  const types: CardType[] = [
    ...Array<CardType>(9).fill(startTeam),
    ...Array<CardType>(8).fill(other),
    ...Array<CardType>(7).fill("neutral"),
    "assassin",
  ];
  const shuffledTypes = shuffle(types, rng);
  const board: Card[] = picked.map((w, i) => ({ w, t: shuffledTypes[i]!, rv: false }));
  return { board, startTeam };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run tests/lib/game/board.test.ts`
Expected: PASS (all three).

- [ ] **Step 5: Commit**

```bash
git add src/lib/game/board.ts tests/lib/game/board.test.ts
git commit -m "feat: deterministic board generation with parity tests"
```

---

## Task 6: Win + remaining

**Files:**
- Create: `src/lib/game/win.ts`
- Test: `tests/lib/game/win.test.ts`

Legacy parity (`server.js:43-49`): a team wins when its unrevealed cards reach 0.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from "vitest";
import { remaining, checkWin } from "@/lib/game/win";
import type { Card } from "@/lib/types";

const c = (t: Card["t"], rv = false): Card => ({ w: "x", t, rv });

describe("win", () => {
  it("counts unrevealed cards of a team", () => {
    const board = [c("red"), c("red", true), c("blue")];
    expect(remaining(board, "red")).toBe(1);
    expect(remaining(board, "blue")).toBe(1);
  });
  it("returns winner when a team has 0 unrevealed", () => {
    const board = [c("red", true), c("red", true), c("blue")];
    expect(checkWin(board)).toBe("red");
  });
  it("returns null when both teams still have cards", () => {
    expect(checkWin([c("red"), c("blue")])).toBeNull();
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run tests/lib/game/win.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `src/lib/game/win.ts`**

```ts
import type { Card, Team } from "@/lib/types";

export function remaining(board: readonly Card[], team: Team): number {
  return board.filter((c) => c.t === team && !c.rv).length;
}

export function checkWin(board: readonly Card[]): Team | null {
  if (remaining(board, "red") === 0) return "red";
  if (remaining(board, "blue") === 0) return "blue";
  return null;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run tests/lib/game/win.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/game/win.ts tests/lib/game/win.test.ts
git commit -m "feat: win + remaining helpers"
```

---

## Task 7: Turn transitions (immutable)

**Files:**
- Create: `src/lib/game/turn.ts`
- Test: `tests/lib/game/turn.test.ts`

Legacy parity (`server.js:58-64`): flip team; clear clue; `gleft=0`; `gphase=false`; clear doubts.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from "vitest";
import { nextTurn } from "@/lib/game/turn";
import type { GameState } from "@/lib/types";

function base(): GameState {
  return {
    code: "1234", phase: "playing", hostMode: false, board: [], turn: "red",
    clue: { w: "بحر", n: 2 }, gleft: 3, gphase: true, winner: null,
    teams: { red: [], blue: [] }, leaders: { red: null, blue: null },
    teamNames: { red: "أحمر", blue: "أزرق" }, players: {},
    doubts: { 5: ["a"] }, wins: { red: 0, blue: 0 }, sRed: 9, sBlue: 8, log: [],
  };
}

describe("nextTurn", () => {
  it("flips the team and resets clue/guess/doubt state", () => {
    const next = nextTurn(base());
    expect(next.turn).toBe("blue");
    expect(next.clue).toBeNull();
    expect(next.gleft).toBe(0);
    expect(next.gphase).toBe(false);
    expect(next.doubts).toEqual({});
  });
  it("does not mutate the input", () => {
    const s = base(); nextTurn(s);
    expect(s.turn).toBe("red");
    expect(s.clue).not.toBeNull();
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run tests/lib/game/turn.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `src/lib/game/turn.ts`**

```ts
import type { GameState } from "@/lib/types";

export function nextTurn(state: GameState): GameState {
  return {
    ...state,
    turn: state.turn === "red" ? "blue" : "red",
    clue: null,
    gleft: 0,
    gphase: false,
    doubts: {},
  };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run tests/lib/game/turn.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/game/turn.ts tests/lib/game/turn.test.ts
git commit -m "feat: immutable nextTurn"
```

---

## Task 8: Guess / clue / doubt resolution (immutable core)

**Files:**
- Create: `src/lib/game/rules.ts`, `src/lib/game/index.ts`
- Test: `tests/lib/game/rules.test.ts`

Legacy parity (`server.js:188-261`): clue sets `gleft=num+1`, `gphase=true`. Guess reveals a
card; own color → decrement count, `gleft--`, continue, end turn if `gleft<=0`; neutral/enemy
→ end turn; assassin → other team wins; clearing all of a team's cards → that team wins.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from "vitest";
import { submitClue, resolveGuess, toggleDoubt } from "@/lib/game/rules";
import type { Card, GameState } from "@/lib/types";

const c = (w: string, t: Card["t"], rv = false): Card => ({ w, t, rv });

function state(board: Card[], over: Partial<GameState> = {}): GameState {
  return {
    code: "1234", phase: "playing", hostMode: false, board, turn: "red",
    clue: { w: "x", n: 1 }, gleft: 2, gphase: true, winner: null,
    teams: { red: [], blue: [] }, leaders: { red: null, blue: null },
    teamNames: { red: "أحمر", blue: "أزرق" }, players: {},
    doubts: {}, wins: { red: 0, blue: 0 }, sRed: 1, sBlue: 1, log: [], ...over,
  };
}

describe("submitClue", () => {
  it("opens the guess phase with gleft = num + 1", () => {
    const s = submitClue(state([c("بحر", "red")], { clue: null, gphase: false, gleft: 0 }),
      "بحر", 2, "القائد");
    expect(s.clue).toEqual({ w: "بحر", n: 2 });
    expect(s.gleft).toBe(3);
    expect(s.gphase).toBe(true);
  });
});

describe("resolveGuess", () => {
  it("own color: reveals, decrements gleft, stays this turn", () => {
    const s = state([c("بحر", "red"), c("قمر", "red")], { gleft: 2, sRed: 2 });
    const { state: n, outcome } = resolveGuess(s, 0, "لاعب");
    expect(outcome).toBe("hit");
    expect(n.board[0]!.rv).toBe(true);
    expect(n.gleft).toBe(1);
    expect(n.turn).toBe("red");
    expect(n.sRed).toBe(1);
  });
  it("own color with gleft hitting 0 ends the turn", () => {
    const s = state([c("بحر", "red"), c("قمر", "red")], { gleft: 1, sRed: 2 });
    const { state: n } = resolveGuess(s, 0, "لاعب");
    expect(n.turn).toBe("blue");
    expect(n.gphase).toBe(false);
  });
  it("enemy/neutral ends the turn", () => {
    const s = state([c("بحر", "blue"), c("قمر", "red")], { gleft: 2 });
    const { state: n, outcome } = resolveGuess(s, 0, "لاعب");
    expect(outcome).toBe("miss");
    expect(n.turn).toBe("blue");
  });
  it("assassin ends the game for the other team", () => {
    const s = state([c("بحر", "assassin"), c("قمر", "red")]);
    const { state: n, outcome } = resolveGuess(s, 0, "لاعب");
    expect(outcome).toBe("assassin");
    expect(n.phase).toBe("ended");
    expect(n.winner).toBe("blue");
    expect(n.wins.blue).toBe(1);
  });
  it("revealing a team's last card wins the game", () => {
    const s = state([c("بحر", "red"), c("قمر", "blue")], { gleft: 2, sRed: 1 });
    const { state: n, outcome } = resolveGuess(s, 0, "لاعب");
    expect(outcome).toBe("win");
    expect(n.phase).toBe("ended");
    expect(n.winner).toBe("red");
  });
  it("ignores an already-revealed card", () => {
    const s = state([c("بحر", "red", true)]);
    const { outcome } = resolveGuess(s, 0, "لاعب");
    expect(outcome).toBe("noop");
  });
  it("does not mutate the input board", () => {
    const s = state([c("بحر", "red"), c("قمر", "red")]);
    resolveGuess(s, 0, "لاعب");
    expect(s.board[0]!.rv).toBe(false);
  });
});

describe("toggleDoubt", () => {
  it("adds then removes a player's doubt on a card", () => {
    let s = toggleDoubt(state([c("بحر", "red")]), 0, "p1");
    expect(s.doubts[0]).toEqual(["p1"]);
    s = toggleDoubt(s, 0, "p1");
    expect(s.doubts[0]).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run tests/lib/game/rules.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `src/lib/game/rules.ts`**

```ts
import type { Card, GameState, Team } from "@/lib/types";
import { nextTurn } from "./turn";
import { checkWin, remaining } from "./win";

export type GuessOutcome = "hit" | "miss" | "assassin" | "win" | "noop";

function withCounts(state: GameState): GameState {
  return { ...state, sRed: remaining(state.board, "red"), sBlue: remaining(state.board, "blue") };
}

function endGame(state: GameState, winner: Team, logLine: string): GameState {
  return {
    ...state,
    winner,
    phase: "ended",
    wins: { ...state.wins, [winner]: state.wins[winner] + 1 },
    log: [logLine, ...state.log],
  };
}

export function submitClue(state: GameState, word: string, num: number, by: string): GameState {
  return {
    ...state,
    clue: { w: word, n: num },
    gleft: num + 1,
    gphase: true,
    log: [`💡 ${by}: "${word}" — ${num}`, ...state.log],
  };
}

export function resolveGuess(
  state: GameState,
  index: number,
  by: string,
): { state: GameState; outcome: GuessOutcome } {
  const card = state.board[index];
  if (!card || card.rv) return { state, outcome: "noop" };

  const board: Card[] = state.board.map((c, i) => (i === index ? { ...c, rv: true } : c));
  const doubts = { ...state.doubts };
  delete doubts[index];
  let s = withCounts({ ...state, board, doubts });

  if (card.t === "assassin") {
    const winner: Team = s.turn === "red" ? "blue" : "red";
    return {
      state: endGame({ ...s, log: [`☠️ ${by} كشف القاتل!`, ...s.log] }, winner,
        `🏆 فاز ${s.teamNames[winner]}! 🍇`),
      outcome: "assassin",
    };
  }

  const won = checkWin(board);
  if (won) {
    return {
      state: endGame(s, won, `🏆 فاز ${s.teamNames[won]}! 🍇`),
      outcome: "win",
    };
  }

  if (card.t === s.turn) {
    s = { ...s, gleft: s.gleft - 1, log: [`✅ ${by}: "${card.w}" — إصابة!`, ...s.log] };
    if (s.gleft <= 0) s = nextTurn(s);
    return { state: s, outcome: "hit" };
  }

  s = { ...s, log: [`❌ ${by}: "${card.w}"`, ...s.log] };
  return { state: nextTurn(s), outcome: "miss" };
}

export function toggleDoubt(state: GameState, index: number, key: string): GameState {
  const arr = state.doubts[index] ?? [];
  const has = arr.includes(key);
  const nextArr = has ? arr.filter((k) => k !== key) : [...arr, key];
  const doubts = { ...state.doubts };
  if (nextArr.length === 0) delete doubts[index];
  else doubts[index] = nextArr;
  return { ...state, doubts };
}
```

- [ ] **Step 4: Create `src/lib/game/index.ts`**

```ts
export * from "./rng";
export * from "./board";
export * from "./win";
export * from "./turn";
export * from "./rules";
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npx vitest run tests/lib/game/rules.test.ts`
Expected: PASS (all cases).

- [ ] **Step 6: Configure coverage gate in `vitest.config.ts`**

```ts
import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: { alias: { "@": path.resolve(__dirname, "src") } },
  test: {
    environment: "node",
    coverage: {
      provider: "v8",
      include: ["src/lib/**"],
      thresholds: { lines: 80, functions: 80, branches: 80, statements: 80 },
    },
  },
});
```

- [ ] **Step 7: Run full coverage to confirm ≥80% on the engine**

Run: `npx vitest run --coverage`
Expected: PASS, `src/lib/**` ≥ 80% across the board.

- [ ] **Step 8: Commit**

```bash
git add src/lib/game/rules.ts src/lib/game/index.ts tests/lib/game/rules.test.ts vitest.config.ts
git commit -m "feat: immutable guess/clue/doubt resolution with full unit coverage"
```

---

## Task 9: Zod schemas for inbound payloads

**Files:**
- Create: `src/lib/schemas/index.ts`
- Test: `tests/lib/schemas.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from "vitest";
import { submitClueSchema, joinOnlineSchema } from "@/lib/schemas";

describe("schemas", () => {
  it("accepts a valid clue payload", () => {
    expect(submitClueSchema.safeParse({ code: "1234", word: "بحر", num: 2 }).success).toBe(true);
  });
  it("rejects a multi-word clue", () => {
    expect(submitClueSchema.safeParse({ code: "1234", word: "بحر كبير", num: 2 }).success).toBe(false);
  });
  it("rejects a bad room code", () => {
    expect(joinOnlineSchema.safeParse({ code: "12", name: "أحمد" }).success).toBe(false);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run tests/lib/schemas.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `src/lib/schemas/index.ts`**

```ts
import { z } from "zod";

const code = z.string().regex(/^\d{4}$/);
const team = z.enum(["red", "blue"]);
const name = z.string().trim().min(1).max(18);
const oneWord = z.string().trim().min(1).max(25).refine((w) => !/\s/.test(w), "single word only");

export const createHostSchema = z.object({
  hostName: name,
  redName: z.string().trim().max(18), blueName: z.string().trim().max(18),
  redPlayers: z.array(name).min(2), redLeader: name,
  bluePlayers: z.array(name).min(2), blueLeader: name,
});
export const createOnlineSchema = z.object({ name });
export const joinOnlineSchema = z.object({ code, name });
export const selectTeamSchema = z.object({ code, team });
export const becomeLeaderSchema = z.object({ code, team });
export const startGameSchema = z.object({ code });
export const submitClueSchema = z.object({ code, word: oneWord, num: z.number().int().min(1).max(9) });
export const guessCardSchema = z.object({ code, index: z.number().int().min(0).max(24) });
export const toggleDoubtSchema = z.object({ code, index: z.number().int().min(0).max(24) });
export const endTurnSchema = z.object({ code });
export const restartSchema = z.object({ code });
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run tests/lib/schemas.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/schemas/index.ts tests/lib/schemas.test.ts
git commit -m "feat: Zod schemas for all inbound socket payloads"
```

---

## Task 10: Room store

**Files:**
- Create: `server/rooms.ts`
- Test: `tests/server/rooms.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from "vitest";
import { createStore } from "../../server/rooms";

describe("room store", () => {
  it("generates unique 4-digit codes and stores rooms", () => {
    const store = createStore();
    const code = store.genCode();
    expect(code).toMatch(/^\d{4}$/);
    store.set(code, { code } as any);
    expect(store.get(code)).toBeDefined();
    expect(store.genCode()).not.toBe(code);
  });
  it("deletes rooms", () => {
    const store = createStore();
    store.set("1111", { code: "1111" } as any);
    store.delete("1111");
    expect(store.get("1111")).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run tests/server/rooms.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `server/rooms.ts`**

```ts
import type { GameState } from "@/lib/types";

export interface RoomStore {
  get(code: string): GameState | undefined;
  set(code: string, room: GameState): void;
  delete(code: string): void;
  all(): IterableIterator<[string, GameState]>;
  genCode(): string;
}

export function createStore(): RoomStore {
  const rooms = new Map<string, GameState>();
  return {
    get: (c) => rooms.get(c),
    set: (c, r) => { rooms.set(c, r); },
    delete: (c) => { rooms.delete(c); },
    all: () => rooms.entries(),
    genCode: () => {
      let code: string;
      do { code = String(Math.floor(1000 + Math.random() * 9000)); } while (rooms.has(code));
      return code;
    },
  };
}

export const store = createStore();
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run tests/server/rooms.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add server/rooms.ts tests/server/rooms.test.ts
git commit -m "feat: in-memory room store with unique codes"
```

---

## Task 11: Socket handlers (thin: validate → pure fn → store → broadcast)

**Files:**
- Create: `server/handlers/index.ts`, `host.ts`, `online.ts`, `teams.ts`, `play.ts`, `lifecycle.ts`
- Create: `server/socket.ts`
- Test: `tests/server/handlers.test.ts`

> Port every event from `server.js` (`create_host`, `create_online`, `join_online`,
> `select_team`, `become_leader`, `start_game`, `submit_clue`, `guess_card`, `toggle_doubt`,
> `end_turn`, `restart`, `disconnect`). Each handler: parse with the matching Zod schema
> (emit `error` + return on failure) → authorize the sender (port legacy checks) → compute
> new state via `src/lib/game` → `store.set` → `io.to(code).emit("state", room)`.

- [ ] **Step 1: Write the failing integration test** (drives two clients through a full round)

```ts
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createServer, type Server as HttpServer } from "node:http";
import { Server } from "socket.io";
import { io as Client, type Socket } from "socket.io-client";
import { registerHandlers } from "../../server/socket";

let http: HttpServer; let url: string;

beforeAll(async () => {
  http = createServer();
  const ioServer = new Server(http);
  ioServer.on("connection", (s) => registerHandlers(ioServer, s));
  await new Promise<void>((r) => http.listen(0, r));
  const addr = http.address();
  url = `http://localhost:${typeof addr === "object" && addr ? addr.port : 0}`;
});
afterAll(() => { http.close(); });

function connect(): Socket { return Client(url, { transports: ["websocket"], forceNew: true }); }
const next = (s: Socket, ev: string) => new Promise<any>((res) => s.once(ev, res));

describe("online flow", () => {
  it("create → join → teams+leaders → start yields a 25-card board", async () => {
    const host = connect(); const guest = connect();
    host.emit("create_online", { name: "أحمد" });
    const j = await next(host, "joined");
    const code = j.code;
    guest.emit("join_online", { code, name: "سارة" });
    await next(guest, "joined");

    host.emit("select_team", { code, team: "red" });
    host.emit("become_leader", { code, team: "red" });
    guest.emit("select_team", { code, team: "blue" });
    guest.emit("become_leader", { code, team: "blue" });
    // need ≥2 per team — add two more
    const r2 = connect(); r2.emit("join_online", { code, name: "خالد" });
    await next(r2, "joined"); r2.emit("select_team", { code, team: "red" });
    const b2 = connect(); b2.emit("join_online", { code, name: "ليان" });
    await next(b2, "joined"); b2.emit("select_team", { code, team: "blue" });

    host.emit("start_game", { code });
    let state: any;
    do { state = await next(host, "state"); } while (state.phase !== "playing");
    expect(state.board).toHaveLength(25);
    [host, guest, r2, b2].forEach((s) => s.close());
  });

  it("rejects a malformed clue payload with an error", async () => {
    const s = connect();
    s.emit("submit_clue", { code: "nope", word: "a b", num: 99 });
    const msg = await next(s, "error");
    expect(typeof msg).toBe("string");
    s.close();
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run tests/server/handlers.test.ts`
Expected: FAIL — `registerHandlers` not found.

- [ ] **Step 3: Implement the handlers.** Create `server/handlers/*` porting each legacy event,
then `server/socket.ts`:

```ts
// server/socket.ts
import type { Server, Socket } from "socket.io";
import { registerHostHandlers } from "./handlers/host";
import { registerOnlineHandlers } from "./handlers/online";
import { registerTeamHandlers } from "./handlers/teams";
import { registerPlayHandlers } from "./handlers/play";
import { registerLifecycleHandlers } from "./handlers/lifecycle";

export function registerHandlers(io: Server, socket: Socket): void {
  registerHostHandlers(io, socket);
  registerOnlineHandlers(io, socket);
  registerTeamHandlers(io, socket);
  registerPlayHandlers(io, socket);
  registerLifecycleHandlers(io, socket);
}
```

Implement each handler file following the legacy logic in `server.js` for the matching events,
using the Zod schemas (Task 9), the pure engine (Task 8), and the store (Task 10). Example
shape for the play handlers (port `submit_clue`, `guess_card`, `toggle_doubt`, `end_turn`):

```ts
// server/handlers/play.ts (excerpt — submit_clue)
import type { Server, Socket } from "socket.io";
import { store } from "../rooms";
import { submitClueSchema } from "@/lib/schemas";
import { submitClue } from "@/lib/game";

export function registerPlayHandlers(io: Server, socket: Socket): void {
  socket.on("submit_clue", (payload) => {
    const parsed = submitClueSchema.safeParse(payload);
    if (!parsed.success) { socket.emit("error", "تلميح غير صالح"); return; }
    const { code, word, num } = parsed.data;
    const room = store.get(code);
    if (!room || room.phase !== "playing" || room.gphase) return;
    const isHostLeader = room.hostMode && room.hostSocketId === socket.id;
    const isOnlineLeader = !room.hostMode && room.leaders[room.turn] === socket.id;
    if (!isHostLeader && !isOnlineLeader) return;
    if (room.board.some((c) => c.w === word && !c.rv)) return; // legacy: don't clue a live word
    const by = room.hostMode ? room.hRed && room.hBlue ? leaderName(room) : "القائد"
                             : room.players[socket.id]?.name ?? "القائد";
    const next = submitClue(room, word, num, by);
    store.set(code, next);
    io.to(code).emit("state", next);
  });
  // …guess_card → resolveGuess, toggle_doubt → toggleDoubt, end_turn → nextTurn
}

function leaderName(room: any): string {
  const td = room.turn === "red" ? room.hRed : room.hBlue;
  return td?.leader ?? "القائد";
}
```

> Repeat the validate→authorize→compute→store→broadcast pattern for all events. Port the
> host-mode synthetic-player rotation (`hRed/hBlue`, `gIdx`) and the `disconnect` cleanup
> (remove player, clear leadership, delete empty rooms, tear down host-mode room on host exit)
> exactly as in `server.js:291-308`.

- [ ] **Step 4: Run the integration test to verify it passes**

Run: `npx vitest run tests/server/handlers.test.ts`
Expected: PASS (both cases).

- [ ] **Step 5: Run the full suite + coverage**

Run: `npx vitest run --coverage`
Expected: all green; `src/lib/**` ≥ 80%.

- [ ] **Step 6: Commit**

```bash
git add server/socket.ts server/handlers tests/server/handlers.test.ts
git commit -m "feat: port all socket handlers onto the pure engine with Zod validation"
```

---

## Task 12: Custom Next.js server + health check

**Files:**
- Create: `server/index.ts`, `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/globals.css`

- [ ] **Step 1: Implement `server/index.ts`**

```ts
import { createServer } from "node:http";
import next from "next";
import { Server } from "socket.io";
import { registerHandlers } from "./socket";
import type { ClientToServerEvents, ServerToClientEvents } from "@/lib/types";

const dev = process.env.NODE_ENV !== "production";
const port = Number(process.env.PORT ?? 3000);
const app = next({ dev });
const handle = app.getRequestHandler();

await app.prepare();
const httpServer = createServer((req, res) => {
  if (req.url === "/healthz") { res.statusCode = 200; res.end("ok"); return; }
  handle(req, res);
});

const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
  cors: { origin: dev ? "*" : false },
});
io.on("connection", (socket) => registerHandlers(io, socket));

httpServer.listen(port, () => console.log(`🍇 تلميحة على المنفذ ${port}`));
```

- [ ] **Step 2: Minimal app shell** — `src/app/layout.tsx` (RTL + Tajawal), `src/app/page.tsx`
(placeholder "تلميحة" home; full UI is Plan 2), `src/app/globals.css` (paste the `:root` token
block from `public/index.html:11-65` so tokens exist for Plan 2).

```tsx
// src/app/layout.tsx
import "./globals.css";
import type { Metadata } from "next";
export const metadata: Metadata = { title: "تلميحة 🍇", description: "لعبة الفرق والكلمات" };
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl">
      <body>{children}</body>
    </html>
  );
}
```

```tsx
// src/app/page.tsx
export default function Home() {
  return <main style={{ display: "grid", placeItems: "center", minHeight: "100vh" }}>
    <h1 style={{ fontSize: "4rem", fontWeight: 900 }}>🍇 تلميحة</h1>
  </main>;
}
```

- [ ] **Step 3: Smoke-test dev server**

Run: `npm run dev` (background), then `curl -s localhost:3000/healthz`
Expected: `ok`. Open `localhost:3000` → shows "🍇 تلميحة". Stop the server.

- [ ] **Step 4: Verify production build**

Run: `npm run build`
Expected: `next build` succeeds and `tsc -p tsconfig.server.json` emits `dist/server/index.js`.

- [ ] **Step 5: Commit**

```bash
git add server/index.ts src/app
git commit -m "feat: custom Next.js server with Socket.io + /healthz"
```

---

## Task 13: Engine parity audit vs. legacy

**Files:** (no new code — verification + notes)

- [ ] **Step 1:** Re-read `server.js` event-by-event and tick each against its handler/test.
- [ ] **Step 2:** Confirm these specific parity points have a test or are explicitly handled:
  last-card win, assassin instant-loss, `gleft` bonus guess (num+1), turn flip on miss,
  host-mode guesser rotation (`gIdx`), doubt add/remove, disconnect room teardown.
- [ ] **Step 3:** Record any intentional differences (e.g., Zod now rejects malformed payloads
  the legacy silently ignored) at the bottom of the architecture spec under "Migration notes".
- [ ] **Step 4: Commit**

```bash
git add docs/superpowers/specs/2026-05-23-talmeeha-nextjs-design.md
git commit -m "docs: record engine parity audit + migration notes"
```

---

## Self-Review (completed by plan author)

- **Spec coverage:** Spec §3.1 (custom server) → Task 12; §3.2 (structure) → all; §3.3 (types)
  → Task 2; §3.4 (pure logic) → Tasks 4–8; §3.5 (Zustand) → deferred to Plan 2 (client);
  §3.6 (styling) → tokens stubbed in Task 12, full system in Plan 2; §5 (errors/Zod) → Task 9 +
  Task 11; §6 (testing: unit+integration) → Tasks 3–11; §7 (deploy/healthz) → Task 12 + Plan 3.
- **Placeholders:** none — every code step has complete code; the only "repeat the pattern"
  notes in Task 11 are accompanied by a concrete worked example and an exact legacy line
  reference, which is the intended boundary for parity porting.
- **Type consistency:** `GameState`/`Card`/`Team` used identically across Tasks 2/5/6/7/8/10/12;
  `resolveGuess` returns `{ state, outcome }` everywhere it's referenced.

---

## Subsequent plans (roadmap — generate after Plan 1 lands)

- **Plan 2 — Design system + UI** (spec phases 5–6): `globals.css` tokens + Tailwind map;
  `<Logo/>`, `<Anqood/>`; Zustand socket store; screens (Home → Setup → Lobby → Game →
  WinModal) and game components, all faithful to `DESIGN.md`. Reviewed by `arabic-rtl-reviewer`.
- **Plan 3 — E2E + deploy** (spec phases 7–8): Playwright journeys (host round; online two-
  client round) + responsive/RTL pass + parity audit vs. legacy; Railway deploy + smoke test.

---

## Execution note

This plan is self-contained and produces a typed, fully unit/integration-tested game engine and
realtime server with **no UI dependency** — runnable and verifiable via `npm test` and a
`/healthz` smoke check before any frontend work begins.
