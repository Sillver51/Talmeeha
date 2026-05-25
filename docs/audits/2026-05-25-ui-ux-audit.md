# Talmeeha — UI/UX, Robustness & Design-System Audit (2026-05-25)

Synthesis of two deep audits (functionality/architecture + RTL/copy/design) plus a
Playwright walkthrough (Home, Lobby, Settings, /ui-catalog, desktop + mobile, 0 console
errors). Branch `main` @ `5221068`.

## TL;DR

The **visuals are genuinely good** (polished "Liquid Night" dark theme, RTL-correct, responsive
desktop + mobile). The "needs too much refactor" feeling comes from three real things:

1. **shadcn is installed but ~5% adopted.** The design system is correctly wired (`components.json`,
   brand tokens mapped to shadcn's oklch contract, Preflight coexistence handled, `/ui-catalog`
   renders cleanly) — but every actual screen still uses the legacy vanilla `.btn`/`.card` CSS and
   custom pill toggles. shadcn isn't "broken", it's **unused**.
2. **No client connection lifecycle / fallbacks.** The biggest robustness gap — no
   reconnecting/offline UI, disconnected players invisible, terminal errors are transient toasts.
3. **Two half-finished subsystems + code smells** (dead sudden-death, two toast systems, inline-style
   sprawl, 42 KB globals.css) that read as "unfinished".

None of this is a rewrite — it's **finishing work**, sliceable into PR-sized chunks.

---

## CRITICAL

| ID | Area | Issue | File |
|----|------|-------|------|
| C1 | Robustness | **No connection-state handling.** Store registers only `connect/joined/state/error` — no `disconnect`/`connect_error`/`reconnect`. Server down or mid-game drop = silent dead buttons / frozen board, no "connecting…/reconnecting…" UI. | `src/store/gameStore.ts:160-206` |
| C2 | Robustness | **Disconnected players invisible.** Server marks `player.disconnected` + 30s grace, but no component reads it. | `server/handlers/lifecycle.ts:99`, all screens |
| C3 | A11y | **WordCard not keyboard-accessible** — actionable `<div onClick>` with no `role`/`tabIndex`/`onKeyDown`. WCAG 4.1.2/2.1.1 fail. | `src/components/game/WordCard.tsx:97` |
| C4 | A11y | **Mode cards + Team cards not keyboard-accessible** (same pattern). | `HomeScreen.tsx:39`, `LobbyScreen.tsx:54` |
| C5 | Feature | **Sudden-death is dead code** — fully built + tested but never invoked; timer expiry only ever passes the turn, so a timed game can't end on the clock. Decide: wire it or remove it. | `src/lib/game/suddenDeath.ts`, `server/timers.ts:49` |

## HIGH

| ID | Area | Issue |
|----|------|-------|
| H1 | Integrity | **Mid-game team-switch / leader-steal unguarded** — `select_team`/`become_leader` don't check phase; stealing leadership mid-game leaks the board key (projection keys off `leaders`). `server/handlers/teams.ts` |
| H2 | Robustness | **Turn soft-lock** — if the on-turn team's only guesser drops and the timer is off (default), the turn never advances. |
| H3 | Robustness | **Missing empty/loading/error recovery** — `GameScreen` blanks (`return null`), no "room closed"/"connecting" screens, terminal errors are 2.6s toasts then a stranded board. |
| H4 | Design system | **shadcn adoption ~5%** — Home/Setup/Lobby/Win/Game bars/Settings all vanilla. Needs brand `Button` variants (gold/red/blue/doubt/danger) + weight-800 before screens can migrate. |
| H5 | Design system | **Two toast systems mounted** — sonner (`<Toaster>`) installed but unused; legacy `<Toast>` drives `store.toast()`. Dead system. |
| H6 | Copy | **Arabic grammatical-number bugs** (shown every session): `1 لاعبين`, `1 تخمينات`, `2 انتصار`. Need singular/dual/plural. `LobbyScreen:79`, `CluePanel:34`, `GameHeader:90/104`, `WinModal:45` |
| H7 | Copy | English loanword "السكور" → should be "النتيجة"; `/ui-catalog` placeholder "القائد (القائد)". |
| H8 | A11y | **No focus-visible** on vanilla `.btn`/`.mode-card`/`.wc`/`.room-code-display` (most of the app). WCAG 2.4.7. |
| H9 | Design tokens | `Confetti` hardcodes hex (ignores colorblind palette); `LobbyScreen` has 20 inline styles + raw rgba/`#120A00`. |
| H10 | Wins | Double source of truth (server `room.wins` vs localStorage) read inconsistently → drift after restart/reconnect. |

## MEDIUM (selected)

- M1 RTL: physical props instead of logical — `.toast left:50%`, `.turn-chip margin-right:auto` (+ `HostBar` inline `marginRight`), inputs `text-align:right`. Use `inset-inline-*`, `margin-inline-end`, `text-align:start`.
- M2 RTL: directional arrows `←`/`→` not bidi-isolated (`<bdi dir="ltr">` or mirrored icon).
- M3 Copy: "Shift+انقر" English + desktop-only hint shown on mobile; "للتعليم" wrong verb (→ تشكيك); Latin `...`→`…`; "قائداً"→"كن القائد"; `logo-tag` uppercase + 5px letter-spacing breaks Arabic letterforms.
- M4 Design system: `SettingsSheet` custom `.toggle` → shadcn `<Switch>`; `WinModal` → shadcn `<Dialog>`; shadcn Button needs `font-extrabold`.
- M5 React: `key={i}` on Board/GameLog (→ `key={card.w}`); `display:none` inline toggles → conditional render (+ `aria-live`); imperative `getState().toastMsg` sniffing in `LeaderPanel`.
- M6 Code: duplicated `hLeader/hGuesser/canStart` (server vs client); vestigial DOM `id`s (`id="clue-display"` duplicated); default team-name strings duplicated.

## LOW (selected)
Redundant `tajawal.variable` on `<body>`; team-name focus uses gold not grape; emoji-only buttons (⭐/✕) need `aria-label`; Onboarding/CoachMarks/Settings dialogs need `aria-describedby`; `WinModal` reset `<span role=button>` → `<button>`; QR `fgColor` → canonical token; `console.log` in server → logger.

## Assets / captions you asked about (placeholders to source)
BRAND.md §9 checklist still open — these want real assets or good placeholders:
- **Favicon** set (mono grape, maskable, multiple sizes) — `app/icon.svg` exists but not the full set.
- **OG / social share image** (`opengraph-image.tsx` with Tajawal in `ImageResponse`).
- **PWA manifest** (`/manifest.webmanifest` is referenced in `layout.tsx` but must exist with icon sizes + theme color).
- **Mascot illustration(s)** for Home/empty states (currently the 🍇 emoji stands in — fine as a placeholder, but a real "عنقود" mascot would lift the brand).
- Empty-state captions: lobby "no one here yet — share the code", spectator "the game already started", reconnecting banner copy.

---

## Proposed sliced roadmap (PR-sized, ordered by impact)

**Slice 1 — Connection lifecycle & recovery** (CRITICAL). C1, C2, H2(partial), H3, H10-adjacent. `connectionStatus` in store + reconnect handlers; global reconnecting/offline banner (first real sonner use); render `player.disconnected`; terminal errors → recovery screen.

**Slice 2 — shadcn foundation** (unblocks everything). H4, H5, M4. Add brand `Button` variants + weight-800; migrate toasts to sonner & delete vanilla `<Toast>`; `SettingsSheet` → `<Switch>`.

**Slice 3 — Critical a11y + RTL** . C3, C4, H8, M1, M2. Keyboard access for cards; focus rings on vanilla controls; logical properties; bidi-isolate arrows.

**Slice 4 — Arabic copy pass** . H6, H7, M3. Grammatical-number helper; loanword/verb fixes; `/ui-catalog` placeholder; logo-tag fix.

**Slice 5 — Integrity guards** . H1, H2. Phase-gate team/leader changes; reject leader-steal; auto-advance turn when on-turn team has no connected guesser.

**Slice 6 — Sudden-death decision** . C5. Wire timer-expiry → `endedOnClock` → `resolveSuddenDeath` → end, **or** remove the subsystem. (Needs a product decision.)

**Slice 7 — Screen-by-screen shadcn migration + token hygiene** . H4, H9, M5. One screen/PR (Home→Setup→Lobby→WinModal→game bars), swap `.btn*`→`<Button variant>`, kill inline styles/raw colors, strip vestigial `id`s, delete dead vanilla CSS per screen.

**Slice 8 — Empty/loading/spectator states + assets** . H3, assets. Empty lobby, spectator screen, loading gates; favicon/OG/manifest/mascot placeholders + empty-state captions.

**Slice 9 — Wins single-source-of-truth + structural cleanup** . H10, M6. Reconcile wins; split 42 KB `globals.css` into `tokens.css` + slim base; dedupe `hLeader/canStart`.

Full per-finding detail with file:line lives in the two audit transcripts; this doc is the canonical action list.
