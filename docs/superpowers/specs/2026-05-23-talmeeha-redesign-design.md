# Design Spec — Talmeeha 2.0 Redesign (Neon Night)

- **Date:** 2026-05-23
- **Status:** Approved (brainstorming)
- **Builds on:** the working Next.js 16 + Socket.io app (engine `src/lib/game`, server `server/`, UI `src/components`). See [`2026-05-23-talmeeha-nextjs-design.md`](2026-05-23-talmeeha-nextjs-design.md).
- **Decisions locked:** Scope = reinvent experience + evolve mechanics · Mobile-first PWA · Broad casual audience · Aesthetic = **Neon Night** · Team colors = red/blue **+ shapes/icons + colorblind-safe toggle**.

---

## 1. Vision & Positioning

*"The Arabic word game your gathering can't stop playing."* A mobile-first PWA: instant to join, beautiful in **Neon Night**, fair by construction, accessible to everyone, and irresistibly shareable — built to become a majlis/diwaniya staple in Bahrain and travel worldwide.

## 2. Experience Principles (non-negotiable)

1. **<30s to playing** — zero install, nickname-only, join by link **or QR** with the code pre-filled; one tap into a lobby.
2. **Teach by doing** — no rules wall; an interactive first turn with inline coach-marks. The first card flip *is* the tutorial.
3. **Fair by construction** — the server sends **role-filtered state**; guessers never receive the key (fixes the current leak).
4. **Two device models, both first-class** — *own-phone* and *pass-the-phone* (handoff gate + **hold-to-peek**, no persistent secret on screen).
5. **Juice, responsibly** — 200–500ms microinteractions, haptics, count-ups, confetti; all **optimistic** (never block on network); all gated behind `prefers-reduced-motion`.
6. **Accessible to everyone** — team identity never relies on color alone (shape/icon + pattern, grayscale-safe) + colorblind palette toggle; WCAG AA contrast; Dynamic Type; ≥44pt targets; SR labels; Western digits default with Eastern-Arabic (٠١٢) toggle.
7. **Shareable by default** — spoiler-free Wordle-style result card, daily challenge hook, one-tap rematch.

## 3. Phased Roadmap (each phase = its own spec → plan → build → verify)

- **Phase 1 (THIS SPEC) — Neon Night experience foundation.** Rebuild all existing screens in Neon Night; zero-friction join (link + QR); teach-by-doing onboarding; redesigned in-game screen + win/share card; pass-the-phone handoff + hold-to-peek; **role-filtered server state (security fix)**; accessibility layer; motion system; PWA install. Outcome: the current game becomes world-class.
- **Phase 2 — Blitz & game feel.** Optional turn timers, sand-timer tension, sudden-death, sound design.
- **Phase 3 — Word packs.** Themed packs (Bahraini/Khaleeji, sports, movies, food, kids) + custom-pack creator + daily challenge.
- **Phase 4 — Solo & co-op vs AI.** Claude-powered clue-giver/guesser, difficulty tiers, "thinking" personality, personas.
- **Phase 5 — Progression & social.** Streaks, XP, friends leaderboards, richer share cards.

> Phases 2–5 are **out of scope for this spec** but the architecture below leaves seams for them (timer fields, pack abstraction, AI player interface, profile store).

---

## 4. Neon Night Design System

Evolves the current dark identity. The big visual change: unrevealed cards become **dark glass tiles** (not sand); team cards get **neon glow + a team glyph**.

### 4.1 Color tokens (canonical CSS vars)
| Token | Value | Role |
|---|---|---|
| `--bg` | `#0A0A0F` | Canvas base |
| `--bg-aurora` | radial `#1C1346`→`#0A0A0F` | Midnight-aurora backdrop |
| `--glass` | `rgba(255,255,255,.045)` | Glass tile/panel fill |
| `--glass-brd` | `rgba(255,255,255,.10)` | Glass border |
| `--red` / `--red2` | `#FF4D8D` / `#FF8FB6` | Team red (neon) + glow |
| `--blue` / `--blue2` | `#34A8FF` / `#9AD2FF` | Team blue (neon) + glow |
| `--grape` / `--grape2` | `#8B5CF6` / `#A78BFA` | Brand primary |
| `--cyan` | `#34E0E0` | Neon accent (signature gradient) |
| `--gold` / `--gold2` | `#E8A020` / `#FFD060` | Leadership / win |
| `--neutral` | `#B4A05A` / muted tan | Neutral card |
| `--assassin` | `#1A0808` / `#E0444A` | Assassin |
| `--text`/`--text2`/`--muted` | `#EAEAFF`/`#9B9BC2`/`#5A5A7E` | Text scale |
| **Signature gradient** | `grape → gold → cyan` | Logo, clue word, primary CTA (animated shimmer) |
| **Colorblind palette (toggle)** | red→`#E69F00` (orange), blue→`#0072B2` (Wong) | Accessibility theme |

### 4.2 Team identity (color-independent)
Each team is distinguishable in grayscale via a **glyph + corner pattern**, shown on team chips, scores, revealed cards, and leader hints:
- **Red:** glyph ▲ (triangle), solid corner notch.
- **Blue:** glyph ⬣ (hexagon), striped corner.
These render alongside (not instead of) color. Colorblind toggle swaps the palette; glyphs stay.

### 4.3 Card states (glass system)
| State | Treatment |
|---|---|
| Unrevealed (guesser) | dark glass tile, `--glass` + `--glass-brd`, word in `--text2` |
| Unrevealed — leader's own team | tinted glass + neon team border + team glyph badge |
| Unrevealed — assassin (leader) | dark-crimson glass + ☠ |
| Revealed red/blue | team neon fill + inner glow + glyph badge |
| Revealed neutral | muted tan glass |
| Revealed assassin | near-black crimson, ☠, dramatic |

### 4.4 Type & spacing
Tajawal (300–900), Arabic ~10–15% larger than Latin equivalents. Weight-driven hierarchy (600 body, 800–900 headings/actions/numbers). Keep current spacing/radius scale; tiles `--r` 10–12px, panels 14px, cards 22px.

## 5. Motion System

- **Timings:** micro 120–200ms; standard 200–350ms; celebratory 400–600ms. Spring `cubic-bezier(.34,1.56,.64,1)` for tactile elements.
- **Library:** Motion (Framer Motion successor) for React, or CSS where sufficient; one shared `motion` utility module.
- **Signature motions:** tile press (scale .96 + spring back), **flip-reveal** on guess, turn-pill glow pulse, clue-word shimmer, **score count-up**, **win confetti** + trophy pop, screen cross-fades/slide (RTL-aware), toast slide, mascot float.
- **Optimistic:** guesses/clues animate immediately; server reconciles. Never block UI on the socket round-trip.
- **Reduced motion:** `prefers-reduced-motion` (and an in-app toggle) replaces transforms with instant state changes + opacity; confetti disabled; mascot static.

## 6. Fairness: Role-Filtered State (security)

**Problem:** today `broadcast(room)` sends every card's true `t` to all clients — guessers can read the key from the socket payload.

**Solution:** a pure `projectStateFor(room, viewerId): PlayerView` in `src/lib/game/` (unit-tested). Visibility of each card's true `t`:
- **Revealed cards:** `t` included for everyone.
- **Unrevealed cards:** `t` included **only** for a viewer who is a **leader** of either team (sees the FULL key — all identities: red/blue/neutral/assassin) or the **host while host-view is on**. For everyone else (guessers, spectators, host with host-view off) the card's `t` is replaced with `"hidden"`.

> **Deliberate gameplay improvement (not pure parity):** the legacy app showed an online leader only their *own* team's cards + the assassin. Standard Codenames gives the spymaster the **full key** so they can steer guesses away from neutrals and the opponent — this is the better, expected experience, so the redesign adopts it. Host-view (pass-the-phone) already showed all identities; that stays.

Server change: replace the single room broadcast with **per-socket emit** of the projected view — on each state change, for each connected socket in the room emit `state = projectStateFor(room, socket.data.playerId)` (via `io.in(code).fetchSockets()`). Add a `PlayerView` type (unrevealed board cards typed `CardType | "hidden"`). All existing handler/engine logic stays; only the emit layer changes. New tests assert a guesser's projected view contains **no** unrevealed card with a real `t` (regression guard for the leak).

## 7. Device Models

- **Own-phone (default for online):** each device shows role-specific UI from its projected view. Leaders get the key; guessers don't (server-enforced per §6).
- **Pass-the-phone (shared device / host mode):** a full-screen **handoff gate** between roles ("مرّر الجهاز إلى قائد الأحمر ▲ — اضغط مطوّلاً لرؤية المفتاح"). The key is shown only while a **hold gesture** is active; releasing or blurring hides it. No secret persists on screen.

## 8. Phase 1 Screens

1. **Onboarding / first run** — brand splash (mascot float), one-line value prop, "العب الآن". First game triggers inline coach-marks (give clue → guess → reveal). Skippable; shown once (localStorage).
2. **Home / Join** — choose mode (host / online); nickname; create room (shows code + **QR** + share link) or join (code or deep-link auto-fill). 
3. **Lobby** — teams (with glyphs), join/become-leader, ready states, room code/QR/share, start gate; live presence.
4. **In-game** — the Neon Night screen (per approved mockup): header (scores + turn pill + glyphs), clue panel, glass board, action bar, log; role-aware (leader panel / guesser actions / host bar + hold-to-peek); doubt marks.
5. **Win / Share** — confetti + winner reveal, persistent scoreboard, **spoiler-free share card** (canvas image: final grid shapes + clue count + margin, branded), one-tap **rematch** + home.
6. **Settings / Accessibility** — colorblind palette toggle, reduced-motion toggle, digit style (Western/Eastern), sound toggle (Phase 2 wires audio).

## 9. Architecture (Phase 1)

- **Keep:** pure engine, Socket.io custom server, types, Zod, Vitest, the React component architecture we built.
- **Add/Change:**
  - `src/lib/game/projection.ts` — `projectStateFor` + `PlayerView` type (+ tests). Server emits projected views per socket.
  - `src/lib/design/tokens.css` (or `globals.css` section) — Neon Night tokens; remove sand, add glass.
  - `src/lib/a11y/` + a small Zustand `prefsStore` — palette, reduced-motion, digit style, sound; persisted; applied via `data-*` attributes on `<html>`.
  - `src/lib/motion/` — shared motion variants + reduced-motion guards.
  - `src/components/` — evolve existing components into Neon Night (glass tiles, glyphs, motion, a11y labels). New: `Onboarding`, `JoinByQR`, `HandoffGate`, `HoldToPeekKey`, `ShareCard`, `SettingsSheet`.
  - **PWA:** `manifest.webmanifest` (icons from the grape mark, theme `#0A0A0F`), service worker (offline shell + asset cache; rooms stay server-side), install prompt.
  - **Join/deep-link:** route `/?room=1234` (or `/r/1234`) pre-fills + connects; `qrcode` lib renders the join QR.
  - **Share card:** canvas renderer → PNG → Web Share API / download.
- **Reconnection:** on socket reconnect, client re-emits a `rejoin {code, playerId}`; server restores the player and re-projects. (Stabilizes mobile network drops.)

## 10. Data Flow

Client action → optimistic UI update + emit (typed, Zod-validated server-side) → server mutates room via pure engine → server **projects** per-socket view → each client reconciles its `PlayerView`. Server remains authoritative; clients render their projection.

## 11. Error Handling & Edge Cases

Room not found / full / already started (→ spectator) · duplicate nickname · player disconnect (remove, clear leadership, delete empty room, host-leave teardown — keep current behavior, add reconnection grace) · network drop (optimistic + reconcile; reconnect rejoin) · pass-the-phone peek only on hold/never persisted · invalid clue (one word, not on board) · QR/link to a dead room → friendly error + create option · reduced-motion / colorblind always honored · SSR-safe storage access only client-side.

## 12. Testing & Verification (continuous — re-analyze after every enhancement)

Per slice: `tsc` clean · Vitest unit/integration green, **including `projectStateFor` tests proving guessers never receive a hidden card's real `t`** (regression guard for the leak) · `npm run build` (Turbopack) passes · **Playwright** end-to-end: host round + online two-client round, at **mobile (390px) and desktop**, in **colorblind mode** and **reduced-motion mode**, asserting RTL + 0 console errors · screenshot check vs. the approved Neon Night look. Reviews: `arabic-rtl-reviewer` (UI), `socket-event-reviewer` (projection/security), `game-logic-reviewer` (engine).

## 13. Out of Scope (this spec)
Blitz/timers, sound assets, word-pack system + daily challenge, AI players, progression/leaderboards (Phases 2–5). Backend persistence/Redis (rooms stay in-memory). Native app wrappers.

## 14. Success Criteria
A stranger can open a link, be playing in <30s, on a phone, with motion + haptics that feel great, fully usable by a color-blind player, with no way to read the opponent's key from the network, and can share a spoiler-free result — all in beautiful Neon Night, with every quality gate green.
