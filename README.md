# تلميحة (Talmeeha) 🍇

> A real-time, **Arabic-first**, RTL team word-deduction game — Codenames-style.

Two teams (red / blue) compete on a 5×5 board of Arabic words. Each team's **leader
(القائد)** gives a one-word **hint (تلميحة)** plus a number; teammates guess words on
the board. Hit your own color and keep going; hit a neutral (محايد) or enemy card and
your turn ends; hit the **assassin (القاتل)** and you lose instantly. The first team to
clear all of its words wins.

Two play modes:

- **Host (وضع المضيف)** — one device, pass-and-play.
- **Online (وضع أونلاين)** — 4-digit room codes, many devices, live over WebSockets.

---

## Stack

| Layer            | Technology                                                              |
| ---------------- | ----------------------------------------------------------------------- |
| Framework        | **Next.js 16** (App Router, Turbopack) + **React 19**                    |
| Language         | **TypeScript** (strict, `"type": "module"`, Node ≥ 20.9 — built on v22)  |
| Realtime server  | Custom **Node `http` server** + **Socket.io** (`server/index.ts`)        |
| Client state     | **Zustand**                                                             |
| Validation       | **Zod** (every inbound socket payload validated at the boundary)         |
| Styling / UI     | **Tailwind CSS v4** + **shadcn/ui** (Radix), single brand theme, RTL     |
| Fonts            | **Tajawal** only — hierarchy via weight                                  |
| Tests            | **Vitest** (unit + integration), Playwright (E2E)                        |

---

## Architecture

The architecture is **server-authoritative**: clients render whatever `state` the server
sends and never compute game truth locally.

```
server/                 # Custom Node + Socket.io server (thin transport layer)
  index.ts              #   http server, Next handler, Socket.io wiring, graceful shutdown
  socket.ts             #   registers all handler groups per connection
  rooms.ts              #   in-memory room store (Map<code, GameState>)
  presence.ts, emit.ts  #   presence tracking + per-viewer broadcast helpers
  handlers/             #   host / online / teams / play / lifecycle / reconnect
                        #   each handler: validate (Zod) → call pure fn → store → broadcast

src/lib/game/           # Pure game engine — deterministic, immutable, unit-tested
  board.ts, rules.ts    #   board generation + reveal/turn rules
  turn.ts, win.ts       #   turn transitions + win detection
  rng.ts                #   seeded RNG (deterministic boards)
  projection.ts         #   projectStateFor(room, viewerId) → role-filtered PlayerView

src/lib/types/          # Shared socket contract — imported by BOTH server and client
src/lib/schemas/        # Zod schemas for inbound payloads
src/app/                # Next.js App Router (RTL: dir="rtl" lang="ar")
src/components/          # UI (shadcn/ui + brand components)
src/store/              # Zustand client store
```

### Server-authoritative + role-filtered `PlayerView`

The full `GameState` (which holds the secret key — every card's true color) lives **only**
on the server. Before broadcasting, the server projects it through
`projectStateFor(room, viewerId)` into a per-viewer **`PlayerView`**: leaders see the full
key, regular players see only revealed cards (unrevealed cards are `"hidden"`). This means
the secret colors are never sent to a client that shouldn't see them — the filtering happens
on the server, not in the browser.

### Design principles

- **Arabic-first, RTL-native.** All UI copy is Arabic; the app is `dir="rtl" lang="ar"`.
  Use logical CSS properties; mirror directional icons.
- **Color = meaning** (never decorative): gold = leadership, grape = brand, purple = doubt,
  red/blue = teams, sand = unrevealed word.
- **Pure game logic** stays in `src/lib/game/` (deterministic, immutable, tested). Socket
  handlers stay thin: validate → pure fn → store → broadcast.
- **Immutability** everywhere — return new objects, don't mutate.
- **Type-safe end to end** — the socket contract in `src/lib/types/` is shared by server
  and client; no `any`.

---

## Getting started

```bash
npm install
npm run dev      # custom Next + Socket.io server (tsx watch) on http://localhost:3000
```

### Scripts

| Script             | What it does                                                          |
| ------------------ | -------------------------------------------------------------------- |
| `npm run dev`      | Dev server: `tsx watch server/index.ts` (Next + Socket.io) on `:3000` |
| `npm run build`    | `next build` then bundle the server with **tsup** → `dist/index.js`   |
| `npm start`        | Run the compiled production server: `node dist/index.js`              |
| `npm test`         | Vitest (unit + integration), single run                              |
| `npm run test:watch` | Vitest in watch mode                                                |
| `npm run test:cov` | Vitest with V8 coverage (80% thresholds on `src/lib`)                |
| `npm run lint`     | ESLint flat config (`eslint .`)                                      |
| `npm run typecheck`| `tsc --noEmit`                                                       |

### Environment variables

| Variable               | Default                 | Purpose                                            |
| ---------------------- | ----------------------- | -------------------------------------------------- |
| `PORT`                 | `3000`                  | Port the HTTP/Socket.io server listens on          |
| `NEXT_PUBLIC_SITE_URL` | `http://localhost:3000` | Canonical site URL for SEO metadata, robots, sitemap |

Copy `.env.example` to `.env` for local overrides (env files are gitignored).

---

## Deployment (Railway / Render)

The app runs as a **single custom Node process** (Next request handler + Socket.io on the
same HTTP server), so it cannot use serverless/edge targets.

```bash
npm run build    # next build + tsup → dist/index.js
npm start        # NODE_ENV=production node dist/index.js   (platform entrypoint)
```

- Requires **Node ≥ 20.9** (Turbopack is Next 16's default bundler).
- Set `PORT` (platforms inject this) and `NEXT_PUBLIC_SITE_URL` (your public origin).
- **Do NOT set `output: 'standalone'`** in `next.config.ts`. Standalone output is built for
  Next's own server entrypoint and is **incompatible with this custom server** — the server
  is bundled separately by tsup and serves the Next app via `next({ dev: false })`.
- The server exposes `GET /healthz` → `ok` for platform health checks.
- It handles `SIGTERM` / `SIGINT` with a graceful shutdown (closes Socket.io and the HTTP
  server, then exits), so rolling deploys drain cleanly.

---

## Project docs

- **Design system / UI tokens:** [`DESIGN.md`](DESIGN.md) — colors, type, components, RTL rules.
- **Brand / voice / naming:** [`docs/brand/BRAND.md`](docs/brand/BRAND.md) · tokens preview at `docs/brand/preview.html`.
- **Architecture specs:** [`docs/superpowers/specs/`](docs/superpowers/specs/).
- **Project guide for Claude Code:** [`CLAUDE.md`](CLAUDE.md).

### Canonical Arabic terms

تلميحة hint · القائد leader · القاتل assassin · محايد neutral · الفريق team · اللوحة board ·
علامة الشك doubt mark · وضع المضيف host mode · وضع أونلاين online mode · رمز الغرفة room code.
