# Talmeeha 2.0 — Neon Night Phase 1 (Part 2: Frictionless & Shareable) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **Prerequisite:** Part 1 (`2026-05-23-talmeeha-neon-night-phase1.md`) is merged — the client renders a `PlayerView`, the prefs store + Neon Night tokens exist, and the per-socket `broadcastState` helper is in `server/emit.ts`. This part builds on those.

**Goal:** Make Talmeeha join-in-under-30-seconds (link + QR + deep-link), resilient to mobile network drops (reconnection with grace), teachable by doing (first-run onboarding), fair on a shared device (pass-the-phone handoff + hold-to-peek), shareable (spoiler-free result card), and installable (PWA).

**Architecture:** A new `rejoin` socket event + a server-side presence grace window preserves a player's team/leadership across a brief disconnect. Deep-link `/?room=1234` pre-fills the join code. A `qrcode.react` QR encodes the share URL. Onboarding + coach-marks gate on `localStorage` flags. Pass-the-phone uses a transient "peeking" store flag (no secret persists on screen). The share card is a pure summary + a client-only canvas renderer → PNG via the Web Share API (download fallback). PWA = `manifest.webmanifest` + a `public/sw.js` service worker + a `beforeinstallprompt` install button.

**Tech Stack:** Same as Part 1, plus runtime dep **`qrcode.react`** and devDep **`sharp`** (icon generation only).

**Environment gotchas:** identical to Part 1 — prefer `node_modules/.bin/<tool>`; `npm install` restores missing `.bin` symlinks; the dev server does **not** hot-reload on `/mnt/d` (restart `npm run dev` before Playwright); never stage `server.js` / `public/index.html`.

---

## File Structure

| File | Responsibility | Action |
|---|---|---|
| `package.json` | deps | Modify (add `qrcode.react`, devDep `sharp`) |
| `src/components/share/RoomShare.tsx` | Room code + QR + share-link | Create |
| `src/components/screens/LobbyScreen.tsx` | Lobby | Modify (mount `RoomShare`) |
| `src/store/gameStore.ts` | Client store | Modify (`pendingJoinCode`, rejoin wiring) |
| `src/components/screens/HomeScreen.tsx` | Home/Join | Modify (consume `pendingJoinCode`) |
| `src/app/page.tsx` | Orchestrator | Modify (deep-link read; mount onboarding, PWA register) |
| `src/lib/types/index.ts` | Types | Modify (`Player.disconnected?`, `rejoin` event) |
| `src/lib/schemas/index.ts` | Zod | Modify (add `rejoinSchema`) |
| `server/presence.ts` | Disconnect grace timers | Create |
| `server/handlers/reconnect.ts` | `rejoin` handler | Create |
| `server/handlers/lifecycle.ts` | Disconnect | Modify (grace instead of immediate removal for online) |
| `server/socket.ts` | Handler registrar | Modify (register reconnect) |
| `tests/server/handlers.test.ts` | Integration | Modify (rejoin test) |
| `src/components/onboarding/Onboarding.tsx` | First-run splash | Create |
| `src/components/onboarding/CoachMarks.tsx` | Teach-by-doing tips | Create |
| `src/components/game/HandoffGate.tsx` | Pass-the-phone gate + hold-to-peek | Create |
| `src/components/game/Board.tsx` | Board | Modify (respect `peeking`) |
| `src/lib/share/summary.ts` | Pure share summary | Create |
| `tests/lib/share/summary.test.ts` | Summary tests | Create |
| `src/lib/share/renderShareCard.ts` | Canvas → PNG | Create |
| `src/components/screens/WinModal.tsx` | Win modal | Modify (share button) |
| `public/manifest.webmanifest` | PWA manifest | Create |
| `scripts/gen-icons.mjs` | Icon raster generation | Create |
| `public/icon-192.png`, `public/icon-512.png`, `public/maskable-512.png` | PWA icons | Create (generated) |
| `src/app/layout.tsx` | Metadata/viewport | Modify (manifest, theme color) |
| `public/sw.js` | Service worker | Create |
| `src/components/pwa/PwaRegister.tsx` | SW registration | Create |
| `src/components/pwa/InstallButton.tsx` | Install prompt | Create |
| `src/components/a11y/SettingsSheet.tsx` | Settings | Modify (mount install button) |
| `src/app/globals.css` | Styles | Modify (share/onboarding/handoff styles) |

---

## GROUP F — Zero-friction join & reconnection

### Task 1: Room share — code + QR + share link

**Files:**
- Modify: `package.json`
- Create: `src/components/share/RoomShare.tsx`
- Modify: `src/components/screens/LobbyScreen.tsx`
- Modify: `src/app/globals.css`

- [ ] **Step 1: Install the QR dependency.**

Run: `npm install qrcode.react@^4.2.0`
Expected: `qrcode.react` added to `dependencies`. (If `.bin` symlinks break afterward, run `npm install` again and verify `ls node_modules/.bin/tsc`.)

- [ ] **Step 2: Create the RoomShare component.**

Create `src/components/share/RoomShare.tsx`:

```tsx
"use client";

import { QRCodeSVG } from "qrcode.react";
import { usePrefsStore } from "@/store/prefsStore";
import { formatDigits } from "@/lib/i18n/digits";
import { useGameStore } from "@/store/gameStore";

interface RoomShareProps {
  code: string;
}

/** Shows the room code, a QR that deep-links to join, and a copy/share-link action. */
export default function RoomShare({ code }: RoomShareProps) {
  const toast = useGameStore((s) => s.toast);
  const digits = usePrefsStore((s) => s.digits);

  // SSR-safe: only build an absolute URL in the browser.
  const joinUrl =
    typeof window !== "undefined" ? `${window.location.origin}/?room=${code}` : `/?room=${code}`;

  const share = async () => {
    try {
      if (typeof navigator !== "undefined" && navigator.share) {
        await navigator.share({ title: "تلميحة 🍇", text: `انضم لغرفتي: ${code}`, url: joinUrl });
        return;
      }
      await navigator.clipboard.writeText(joinUrl);
      toast("تم نسخ الرابط 🍇");
    } catch {
      toast("تعذّر المشاركة");
    }
  };

  return (
    <div className="room-share">
      <div className="room-code-display" aria-label={`رمز الغرفة ${code}`}>
        {formatDigits(code, digits)}
      </div>
      <div className="room-qr" aria-hidden="true">
        <QRCodeSVG value={joinUrl} size={132} bgColor="transparent" fgColor="#EAEAFF" level="M" />
      </div>
      <button className="btn btn-outline w100" onClick={share}>
        🔗 مشاركة الرابط
      </button>
    </div>
  );
}
```

- [ ] **Step 3: Mount RoomShare in the lobby** (replacing the bespoke room-code display).

In `src/components/screens/LobbyScreen.tsx`:
- Add `import RoomShare from "@/components/share/RoomShare";`
- Replace the room-code header block — the `<div style={{ display: "flex", ... }}>...رمز الغرفة...</div>` through the closing `</div>` of the `room-code-display` and its "شارك الرمز مع أصحابك" hint — with:
```tsx
        <RoomShare code={code} />
        <div className="muted tc" style={{ margin: ".5rem 0 1rem" }}>
          شارك الرمز أو امسح الكود مع أصحابك
        </div>
```
(The old `copyCode` handler can be removed if now unused — verify with tsc and delete the dead function + the now-unused `roomCode`/`toast` selectors only if tsc flags them.)

- [ ] **Step 4: Style it.**

Append to `src/app/globals.css`:
```css
/* ─── ROOM SHARE (code + QR) ─── */
.room-share{display:flex;flex-direction:column;align-items:center;gap:.7rem;}
.room-qr{
  background:var(--glass);
  border:1px solid var(--glass-brd);
  border-radius:var(--r);
  padding:.7rem;line-height:0;
}
```

- [ ] **Step 5: Type-check + build.**

Run: `node_modules/.bin/tsc --noEmit && npm run build`
Expected: tsc exit 0; build succeeds.

- [ ] **Step 6: Commit.**

```bash
git add package.json package-lock.json src/components/share/RoomShare.tsx src/components/screens/LobbyScreen.tsx src/app/globals.css
git commit -m "feat(join): room code + QR + share link"
```

---

### Task 2: Deep-link `/?room=1234` pre-fills the join code

**Files:**
- Modify: `src/store/gameStore.ts`
- Modify: `src/app/page.tsx`
- Modify: `src/components/screens/HomeScreen.tsx`

- [ ] **Step 1: Add `pendingJoinCode` to the store.**

In `src/store/gameStore.ts`:
- Add to the `GameStore` interface: `pendingJoinCode: string | null;` and an action `setPendingJoinCode(code: string | null): void;`
- Add to the initial state object: `pendingJoinCode: null,`
- Add the action implementation near `selectMode`:
```typescript
  setPendingJoinCode(code) {
    set({ pendingJoinCode: code });
  },
```

- [ ] **Step 2: Read the deep-link param on mount.**

In `src/app/page.tsx`, inside the existing mount `useEffect` (the one calling `connect()`), extend it:
```tsx
  const selectMode = useGameStore((s) => s.selectMode);
  const setPendingJoinCode = useGameStore((s) => s.setPendingJoinCode);

  useEffect(() => {
    connect();
    const params = new URLSearchParams(window.location.search);
    const room = params.get("room");
    if (room && /^\d{4}$/.test(room)) {
      selectMode("online");
      setPendingJoinCode(room);
    }
  }, [connect, selectMode, setPendingJoinCode]);
```

- [ ] **Step 3: Consume `pendingJoinCode` in the home form.**

In `src/components/screens/HomeScreen.tsx`:
- Add `import { useEffect } from "react";` (extend the existing React import).
- Read the pending code:
```tsx
  const pendingJoinCode = useGameStore((s) => s.pendingJoinCode);
  const setPendingJoinCode = useGameStore((s) => s.setPendingJoinCode);
```
- Pre-fill the code input once when a pending code arrives:
```tsx
  useEffect(() => {
    if (pendingJoinCode) {
      setCode(pendingJoinCode);
      setPendingJoinCode(null);
    }
  }, [pendingJoinCode, setPendingJoinCode]);
```

- [ ] **Step 4: Type-check + build.**

Run: `node_modules/.bin/tsc --noEmit && npm run build`
Expected: tsc exit 0; build succeeds.

- [ ] **Step 5: Commit.**

```bash
git add src/store/gameStore.ts src/app/page.tsx src/components/screens/HomeScreen.tsx
git commit -m "feat(join): deep-link /?room=1234 pre-fills the join code"
```

---

### Task 3: Reconnection — server `rejoin` event + presence grace

**Files:**
- Modify: `src/lib/types/index.ts`
- Modify: `src/lib/schemas/index.ts`
- Create: `server/presence.ts`
- Create: `server/handlers/reconnect.ts`
- Modify: `server/handlers/lifecycle.ts`
- Modify: `server/socket.ts`

- [ ] **Step 1: Add the disconnected flag + rejoin event to the contract.**

In `src/lib/types/index.ts`:
- Add `disconnected?: boolean;` to `Player`:
```typescript
export interface Player { id: string; name: string; team: Team | null; disconnected?: boolean; }
```
- Add `rejoin` to `ClientToServerEvents` (after `join_online`):
```typescript
  rejoin: (p: { code: string; playerId: string; name: string }) => void;
```

- [ ] **Step 2: Add the rejoin schema.**

In `src/lib/schemas/index.ts`, after `joinOnlineSchema`:
```typescript
export const rejoinSchema = z.object({ code, playerId: z.string().trim().min(1).max(40), name });
```

- [ ] **Step 3: Create the presence grace module.**

Create `server/presence.ts`:

```typescript
/** Pending player-removal timers, so a brief disconnect doesn't drop a player's seat. */
const GRACE_MS = 30_000;
const timers = new Map<string, ReturnType<typeof setTimeout>>();
const key = (code: string, id: string): string => `${code}::${id}`;

/** Schedule a player's removal after the grace window (cancels any prior timer for the pair). */
export function scheduleRemoval(code: string, id: string, run: () => void): void {
  cancelRemoval(code, id);
  timers.set(
    key(code, id),
    setTimeout(() => {
      timers.delete(key(code, id));
      run();
    }, GRACE_MS),
  );
}

/** Cancel a pending removal (called when the player rejoins in time). */
export function cancelRemoval(code: string, id: string): void {
  const t = timers.get(key(code, id));
  if (t) {
    clearTimeout(t);
    timers.delete(key(code, id));
  }
}

export { GRACE_MS };
```

- [ ] **Step 4: Refactor the disconnect handler to use the grace window.**

In `server/handlers/lifecycle.ts`:
- Add imports:
```typescript
import { broadcastState } from "../emit";
import { scheduleRemoval } from "../presence";
```
(`broadcastState` may already be imported from Part 1 — do not duplicate.)
- Replace the entire `socket.on("disconnect", () => { ... })` body with:
```typescript
  socket.on("disconnect", () => {
    for (const [code, room] of [...store.all()]) {
      // Host-mode room is torn down when its host leaves (legacy parity).
      if (room.hostMode && room.hostSocketId === socket.id) {
        store.delete(code);
        continue;
      }

      if (!room.players[socket.id]) continue;

      // Online: keep the seat, mark disconnected, broadcast, and remove only after the grace window.
      const marked: GameState = {
        ...room,
        players: {
          ...room.players,
          [socket.id]: { ...room.players[socket.id]!, disconnected: true },
        },
      };
      store.set(code, marked);
      void broadcastState(io, code);

      const removedId = socket.id;
      scheduleRemoval(code, removedId, () => {
        const current = store.get(code);
        if (!current || !current.players[removedId]) return;

        const players = { ...current.players };
        delete players[removedId];

        const teams: Record<Team, string[]> = {
          red: current.teams.red.filter((i) => i !== removedId),
          blue: current.teams.blue.filter((i) => i !== removedId),
        };
        const leaders: Record<Team, string | null> = {
          red: current.leaders.red === removedId ? null : current.leaders.red,
          blue: current.leaders.blue === removedId ? null : current.leaders.blue,
        };

        if (Object.keys(players).length === 0) {
          store.delete(code);
          return;
        }

        store.set(code, { ...current, players, teams, leaders });
        void broadcastState(io, code);
      });
    }
  });
```

- [ ] **Step 5: Create the rejoin handler.**

Create `server/handlers/reconnect.ts`:

```typescript
import type { Server, Socket } from "socket.io";
import type {
  ClientToServerEvents,
  GameState,
  Player,
  ServerToClientEvents,
  Team,
} from "@/lib/types";
import { store } from "../rooms";
import { rejoinSchema } from "@/lib/schemas";
import { broadcastState } from "../emit";
import { cancelRemoval } from "../presence";

// Restores a player after a reconnect: remaps the old playerId → the new socket id,
// preserving team + leadership. If the grace window already expired (seat gone), the
// player is re-added fresh (online, no team).
export function registerReconnectHandlers(
  io: Server<ClientToServerEvents, ServerToClientEvents>,
  socket: Socket<ClientToServerEvents, ServerToClientEvents>,
): void {
  socket.on("rejoin", (payload) => {
    const parsed = rejoinSchema.safeParse(payload);
    if (!parsed.success) {
      socket.emit("error", "تعذّر إعادة الاتصال");
      return;
    }
    const { code, playerId, name } = parsed.data;

    const room = store.get(code);
    if (!room) {
      socket.emit("error", "الغرفة غير موجودة");
      return;
    }

    cancelRemoval(code, playerId);
    const newId = socket.id;
    const old = room.players[playerId];

    let players: Record<string, Player>;
    let teams: Record<Team, string[]>;
    let leaders: Record<Team, string | null>;
    let hostSocketId = room.hostSocketId;

    if (old) {
      players = { ...room.players };
      delete players[playerId];
      players[newId] = { ...old, id: newId, disconnected: false };
      teams = {
        red: room.teams.red.map((i) => (i === playerId ? newId : i)),
        blue: room.teams.blue.map((i) => (i === playerId ? newId : i)),
      };
      leaders = {
        red: room.leaders.red === playerId ? newId : room.leaders.red,
        blue: room.leaders.blue === playerId ? newId : room.leaders.blue,
      };
      if (room.hostMode && room.hostSocketId === playerId) hostSocketId = newId;
    } else {
      players = { ...room.players, [newId]: { id: newId, name, team: null } };
      teams = room.teams;
      leaders = room.leaders;
    }

    const next: GameState = { ...room, players, teams, leaders, hostSocketId };
    store.set(code, next);
    socket.join(code);
    const isHost = Boolean(next.hostMode && next.hostSocketId === newId);
    socket.emit("joined", { code, myId: newId, isHost });
    void broadcastState(io, code);
  });
}
```

- [ ] **Step 6: Register the reconnect handlers.**

In `server/socket.ts`:
- Add `import { registerReconnectHandlers } from "./handlers/reconnect";`
- Call it inside `registerHandlers`, after `registerOnlineHandlers(io, socket);`:
```typescript
  registerReconnectHandlers(io, socket);
```

- [ ] **Step 7: Type-check.**

Run: `node_modules/.bin/tsc --noEmit`
Expected: exit 0.

- [ ] **Step 8: Commit.**

```bash
git add src/lib/types/index.ts src/lib/schemas/index.ts server/presence.ts server/handlers/reconnect.ts server/handlers/lifecycle.ts server/socket.ts
git commit -m "feat(server): reconnection via rejoin + presence grace window"
```

---

### Task 4: Reconnection — client wiring + rejoin integration test

**Files:**
- Modify: `src/store/gameStore.ts`
- Modify: `tests/server/handlers.test.ts`

- [ ] **Step 1: Emit `rejoin` on (re)connect when we already hold a seat.**

In `src/store/gameStore.ts`, inside `connect()`, after `const socket: GameSocket = io();` and before the existing `socket.on("joined", ...)`, add:

```typescript
    // On every (re)connect: if we already hold a room seat, ask the server to restore it.
    // First connect is a no-op (roomCode/myId are null). After a network drop, the store
    // still holds the prior code + playerId, so the server remaps us to the new socket id.
    socket.on("connect", () => {
      const { roomCode, myId, myName } = get();
      if (roomCode && myId) {
        socket.emit("rejoin", { code: roomCode, playerId: myId, name: myName });
      }
    });
```

- [ ] **Step 2: Write the rejoin integration test.**

In `tests/server/handlers.test.ts`, append:

```typescript
describe("reconnection", () => {
  it("rejoin within the grace window keeps the player on their team", async () => {
    const a = connect();
    a.emit("create_online", { name: "A" });
    const ja = await nextJoined(a);
    const code = ja.code;

    const b = connect();
    b.emit("join_online", { code, name: "B" });
    const jb = await nextJoined(b);
    b.emit("select_team", { code, team: "red" });
    await waitForState(a, (st) => st.teams.red.includes(jb.myId));

    const oldId = jb.myId;
    b.close();
    // server marks B disconnected (grace timer running, not yet removed)
    await waitForState(a, (st) => st.players[oldId]?.disconnected === true);

    const b2 = connect();
    b2.emit("rejoin", { code, playerId: oldId, name: "B" });
    const jb2 = await nextJoined(b2);

    const st = await waitForState(a, (s) => s.teams.red.includes(jb2.myId));
    expect(st.players[jb2.myId]?.team).toBe("red");
    expect(st.players[jb2.myId]?.disconnected).toBeFalsy();
    expect(st.teams.red).not.toContain(oldId);

    [a, b2].forEach((s) => s.close());
  });
});
```

- [ ] **Step 3: Run — verify PASS.**

Run: `node_modules/.bin/vitest run tests/server/handlers.test.ts`
Expected: all PASS (existing + the rejoin test).

- [ ] **Step 4: Commit.**

```bash
git add src/store/gameStore.ts tests/server/handlers.test.ts
git commit -m "feat(client): auto-rejoin on reconnect + integration test"
```

---

## GROUP G — Teach-by-doing onboarding

### Task 5: First-run splash overlay

**Files:**
- Create: `src/components/onboarding/Onboarding.tsx`
- Modify: `src/app/page.tsx`
- Modify: `src/app/globals.css`

- [ ] **Step 1: Build the splash.**

Create `src/components/onboarding/Onboarding.tsx`:

```tsx
"use client";

import { useEffect, useState } from "react";

const SEEN_KEY = "talmeeha_onboarded";

/** One-time first-run splash: mascot + value prop + a single CTA. Shown until dismissed. */
export default function Onboarding() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    try {
      if (!window.localStorage.getItem(SEEN_KEY)) setShow(true);
    } catch {
      // ignore private-mode errors — just don't show
    }
  }, []);

  if (!show) return null;

  const dismiss = () => {
    try {
      window.localStorage.setItem(SEEN_KEY, "1");
    } catch {
      // ignore
    }
    setShow(false);
  };

  return (
    <div className="onboard-wrap" role="dialog" aria-modal="true" aria-label="مرحباً بك في تلميحة">
      <div className="onboard-card">
        <div className="grape-emoji" aria-hidden="true">🍇</div>
        <div className="onboard-title">تلميحة</div>
        <p className="onboard-lead">
          لعبة الفرق والكلمات — القائد يعطي تلميحة، والفريق يخمّن. أول فريق يكشف كلماته يفوز.
        </p>
        <button className="btn btn-gold w100" onClick={dismiss}>
          العب الآن ←
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Mount on the home/orchestrator.**

In `src/app/page.tsx`:
- Add `import Onboarding from "@/components/onboarding/Onboarding";`
- Render `<Onboarding />` inside the fragment (after `<PrefsEffect />`).

- [ ] **Step 3: Style it.**

Append to `src/app/globals.css`:
```css
/* ─── ONBOARDING ─── */
.onboard-wrap{
  position:fixed;inset:0;z-index:70;
  background:var(--bg);
  background-image:radial-gradient(ellipse at 50% 25%, #1C1346 0%, var(--bg) 60%);
  display:flex;align-items:center;justify-content:center;padding:1.5rem;
}
.onboard-card{
  max-width:420px;width:100%;text-align:center;
  display:flex;flex-direction:column;align-items:center;gap:.8rem;
}
.onboard-card .grape-emoji{font-size:4.5rem;}
.onboard-title{
  font-size:3rem;font-weight:900;
  background:var(--grad-signature);-webkit-background-clip:text;background-clip:text;color:transparent;
}
.onboard-lead{color:var(--text2);font-weight:600;line-height:1.7;font-size:1rem;}
```

- [ ] **Step 4: Build + commit.**

Run: `node_modules/.bin/tsc --noEmit && npm run build`
```bash
git add src/components/onboarding/Onboarding.tsx src/app/page.tsx src/app/globals.css
git commit -m "feat(onboarding): one-time first-run splash"
```

---

### Task 6: Teach-by-doing coach-marks (first game)

**Files:**
- Create: `src/components/onboarding/CoachMarks.tsx`
- Modify: `src/components/screens/GameScreen.tsx`
- Modify: `src/app/globals.css`

- [ ] **Step 1: Build the coach-marks sequence.**

Create `src/components/onboarding/CoachMarks.tsx`:

```tsx
"use client";

import { useEffect, useState } from "react";

const SEEN_KEY = "talmeeha_coached";

const TIPS = [
  "القائد يكتب تلميحة (كلمة واحدة) + رقم عدد الكلمات المقصودة.",
  "بقية الفريق يضغطون على الكلمة التي يظنّونها لهم.",
  "تُكشف الكلمة بلونها: لونكم = استمروا، غيره = ينتهي دوركم. احذروا القاتل ☠️!",
] as const;

/** Three sequential tips shown once during the first in-game session. */
export default function CoachMarks() {
  const [show, setShow] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    try {
      if (!window.localStorage.getItem(SEEN_KEY)) setShow(true);
    } catch {
      // ignore
    }
  }, []);

  if (!show) return null;

  const finish = () => {
    try {
      window.localStorage.setItem(SEEN_KEY, "1");
    } catch {
      // ignore
    }
    setShow(false);
  };

  const isLast = step === TIPS.length - 1;

  return (
    <div className="coach-wrap" role="dialog" aria-modal="true" aria-label="كيف تلعب">
      <div className="coach-card">
        <div className="coach-step">{step + 1} / {TIPS.length}</div>
        <p className="coach-text">{TIPS[step]}</p>
        <div className="coach-actions">
          <button className="btn btn-ghost btn-sm" onClick={finish}>
            تخطّي
          </button>
          <button
            className="btn btn-gold btn-sm"
            onClick={() => (isLast ? finish() : setStep((s) => s + 1))}
          >
            {isLast ? "فهمت 🍇" : "التالي ←"}
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Render it during play.**

In `src/components/screens/GameScreen.tsx`:
- Add `import CoachMarks from "@/components/onboarding/CoachMarks";`
- Render `<CoachMarks />` just inside the returned `<div className="screen game-on" ...>` (before `<GameHeader .../>`).

- [ ] **Step 3: Style it.**

Append to `src/app/globals.css`:
```css
/* ─── COACH MARKS ─── */
.coach-wrap{
  position:fixed;inset-inline:0;bottom:0;z-index:55;
  display:flex;justify-content:center;padding:1rem;
  pointer-events:none;
}
.coach-card{
  pointer-events:auto;
  max-width:460px;width:100%;
  background:var(--surface);
  border:1px solid var(--grape);
  border-radius:var(--r);
  padding:.9rem 1rem;
  box-shadow:0 0 24px rgba(139,92,246,.25), var(--shadow);
}
.coach-step{color:var(--grape2);font-weight:900;font-size:.72rem;margin-bottom:.3rem;}
.coach-text{color:var(--text);font-weight:700;line-height:1.7;margin-bottom:.7rem;}
.coach-actions{display:flex;justify-content:space-between;align-items:center;gap:.5rem;}
```

- [ ] **Step 4: Build + commit.**

Run: `node_modules/.bin/tsc --noEmit && npm run build`
```bash
git add src/components/onboarding/CoachMarks.tsx src/components/screens/GameScreen.tsx src/app/globals.css
git commit -m "feat(onboarding): teach-by-doing coach-marks"
```

---

## GROUP H — Pass-the-phone (handoff + hold-to-peek)

### Task 7: Handoff gate + hold-to-peek key (host mode)

**Files:**
- Modify: `src/store/gameStore.ts`
- Create: `src/components/game/HandoffGate.tsx`
- Modify: `src/components/game/Board.tsx`
- Modify: `src/components/screens/GameScreen.tsx`
- Modify: `src/app/globals.css`

> Host (pass-and-play) is the shared-device case. Today the host toggles a persistent "عرض القائد" view. This adds a **hold-to-peek** key that reveals only while pressed (no secret persists), and a between-roles **handoff gate**.

- [ ] **Step 1: Add a transient `peeking` flag to the store.**

In `src/store/gameStore.ts`:
- Add to `GameStore` interface: `peeking: boolean;` and `setPeeking(on: boolean): void;`
- Add to initial state: `peeking: false,`
- Add the action (near `toggleHostView`):
```typescript
  setPeeking(on) {
    set({ peeking: on });
  },
```

- [ ] **Step 2: Board reveals the key while peeking (host only).**

In `src/components/game/Board.tsx`:
- Read peeking: `const peeking = useGameStore((s) => s.peeking);`
- Compute an effective host-view and pass it as `hostViewLeader`:
```tsx
  const effectiveHostView = hostViewLeader || peeking;
```
- In the `<WordCard ... hostViewLeader={hostViewLeader} ... />` prop, pass `hostViewLeader={effectiveHostView}` instead.

- [ ] **Step 3: Build the handoff + hold-to-peek component.**

Create `src/components/game/HandoffGate.tsx`:

```tsx
"use client";

import { useGameStore } from "@/store/gameStore";
import { hLeader } from "@/lib/ui/roles";
import TeamGlyph from "@/components/brand/TeamGlyph";
import type { PlayerView } from "@/lib/types";

interface HandoffGateProps {
  gs: PlayerView;
}

/**
 * Host-mode hold-to-peek: a press-and-hold control that reveals the key only while held,
 * so no secret persists on the shared screen. Shown to the host during the clue (pre-guess)
 * phase. Releasing or leaving the button hides the key immediately.
 */
export default function HandoffGate({ gs }: HandoffGateProps) {
  const setPeeking = useGameStore((s) => s.setPeeking);
  const peeking = useGameStore((s) => s.peeking);

  const hide = () => setPeeking(false);
  const show = () => setPeeking(true);

  return (
    <div className="handoff">
      <span className="handoff-label">
        مرّر الجهاز إلى القائد <TeamGlyph team={gs.turn} /> {hLeader(gs)}
      </span>
      <button
        className={peeking ? "btn btn-gold btn-sm peeking" : "btn btn-gold btn-sm"}
        onPointerDown={show}
        onPointerUp={hide}
        onPointerLeave={hide}
        onPointerCancel={hide}
        onContextMenu={(e) => e.preventDefault()}
      >
        {peeking ? "👁 المفتاح ظاهر" : "اضغط مطوّلاً لرؤية المفتاح"}
      </button>
    </div>
  );
}
```

- [ ] **Step 4: Show the gate in host mode during the clue phase.**

In `src/components/screens/GameScreen.tsx`:
- Add `import HandoffGate from "@/components/game/HandoffGate";`
- After the `<HostBar .../>` line, add:
```tsx
      {isHost && !gs.gphase && playing && <HandoffGate gs={gs} />}
```

- [ ] **Step 5: Style it.**

Append to `src/app/globals.css`:
```css
/* ─── PASS-THE-PHONE HANDOFF ─── */
.handoff{
  display:flex;flex-direction:column;align-items:center;gap:.4rem;
  background:var(--glass);border:1px solid var(--glass-brd);
  border-radius:var(--r);padding:.6rem;margin-bottom:.4rem;
}
.handoff-label{font-weight:800;font-size:.85rem;color:var(--text2);}
.btn.peeking{box-shadow:0 0 0 2px var(--gold2), 0 0 18px rgba(232,160,32,.4);}
```

- [ ] **Step 6: Type-check + build + commit.**

Run: `node_modules/.bin/tsc --noEmit && npm run build`
```bash
git add src/store/gameStore.ts src/components/game/HandoffGate.tsx src/components/game/Board.tsx src/components/screens/GameScreen.tsx src/app/globals.css
git commit -m "feat(host): pass-the-phone handoff + hold-to-peek key"
```

---

## GROUP I — Win / share card

### Task 8: Pure share summary

**Files:**
- Create: `src/lib/share/summary.ts`
- Test: `tests/lib/share/summary.test.ts`

- [ ] **Step 1: Write the failing test.**

Create `tests/lib/share/summary.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { shareCardSummary } from "@/lib/share/summary";
import type { PlayerView, ViewCard } from "@/lib/types";

function view(overrides: Partial<PlayerView> = {}): PlayerView {
  const board: ViewCard[] = [
    { w: "أ", t: "red", rv: true },
    { w: "ب", t: "blue", rv: false },
    { w: "ج", t: "neutral", rv: true },
  ];
  return {
    code: "1234", phase: "ended", hostMode: false,
    board, counts: { red: 0, blue: 3, neutral: 1 },
    turn: "red", clue: null, gleft: 0, gphase: false, winner: "red",
    teams: { red: [], blue: [] }, leaders: { red: null, blue: null },
    teamNames: { red: "الصقور", blue: "النمور" },
    players: {}, doubts: {}, wins: { red: 1, blue: 0 }, sRed: 0, sBlue: 3, log: [],
    ...overrides,
  };
}

describe("shareCardSummary", () => {
  it("names the winner and loser from teamNames", () => {
    const s = shareCardSummary(view());
    expect(s.winnerName).toBe("الصقور");
    expect(s.loserName).toBe("النمور");
  });
  it("computes the margin as the loser's remaining cards", () => {
    expect(shareCardSummary(view()).margin).toBe(3); // blue still had 3
  });
  it("flags an assassin ending", () => {
    const v = view({ board: [{ w: "ق", t: "assassin", rv: true }], winner: "blue" });
    const s = shareCardSummary(v);
    expect(s.assassin).toBe(true);
    expect(s.winnerName).toBe("النمور");
  });
  it("defaults a null winner to red without throwing", () => {
    expect(shareCardSummary(view({ winner: null })).winnerName).toBe("الصقور");
  });
});
```

- [ ] **Step 2: Run — verify it FAILS.**

Run: `node_modules/.bin/vitest run tests/lib/share/summary.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement.**

Create `src/lib/share/summary.ts`:

```typescript
import type { PlayerView, Team } from "@/lib/types";

export interface ShareSummary {
  winner: Team;
  winnerName: string;
  loserName: string;
  /** Cards the losing team still had unrevealed — the victory margin. */
  margin: number;
  assassin: boolean;
}

/** Pure, spoiler-free summary of a finished game for the share card. */
export function shareCardSummary(view: PlayerView): ShareSummary {
  const winner: Team = view.winner ?? "red";
  const loser: Team = winner === "red" ? "blue" : "red";
  const assassin = view.board.some((c) => c.t === "assassin" && c.rv);
  return {
    winner,
    winnerName: view.teamNames[winner],
    loserName: view.teamNames[loser],
    margin: view.counts[loser],
    assassin,
  };
}
```

- [ ] **Step 4: Run — verify PASS.**

Run: `node_modules/.bin/vitest run tests/lib/share/summary.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit.**

```bash
git add src/lib/share/summary.ts tests/lib/share/summary.test.ts
git commit -m "feat(share): pure spoiler-free result summary"
```

---

### Task 9: Canvas share card + share button

**Files:**
- Create: `src/lib/share/renderShareCard.ts`
- Modify: `src/components/screens/WinModal.tsx`

- [ ] **Step 1: Build the canvas renderer (client-only).**

Create `src/lib/share/renderShareCard.ts`:

```typescript
import type { PlayerView } from "@/lib/types";
import { shareCardSummary } from "./summary";

const SIZE = 1080;
const COLORS: Record<string, string> = {
  red: "#FF4D8D",
  blue: "#34A8FF",
  neutral: "#B4A05A",
  assassin: "#E0444A",
  hidden: "rgba(255,255,255,0.06)",
};

/**
 * Render a spoiler-free 1080×1080 result card to a PNG Blob. Only REVEALED cards show
 * their colour; unrevealed cards render as neutral glass, so no key is leaked. Client-only.
 */
export async function renderShareCard(view: PlayerView): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = SIZE;
  canvas.height = SIZE;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas 2d context unavailable");

  // background
  ctx.fillStyle = "#0A0A0F";
  ctx.fillRect(0, 0, SIZE, SIZE);

  const s = shareCardSummary(view);

  // title
  ctx.textAlign = "center";
  ctx.fillStyle = "#FFD060";
  ctx.font = "900 84px Tajawal, sans-serif";
  ctx.fillText(`🏆 فاز ${s.winnerName}`, SIZE / 2, 150);

  ctx.fillStyle = "#9B9BC2";
  ctx.font = "700 44px Tajawal, sans-serif";
  const sub = s.assassin ? "☠️ كُشف القاتل" : `بفارق ${s.margin}`;
  ctx.fillText(sub, SIZE / 2, 220);

  // 5×5 grid (spoiler-free)
  const grid = 5;
  const pad = 90;
  const gap = 18;
  const cell = (SIZE - pad * 2 - gap * (grid - 1)) / grid;
  const top = 300;
  view.board.slice(0, 25).forEach((c, i) => {
    const r = Math.floor(i / grid);
    const col = i % grid;
    const x = pad + col * (cell + gap);
    const y = top + r * (cell + gap);
    const fill = c.rv ? (COLORS[c.t] ?? COLORS.hidden) : COLORS.hidden;
    ctx.fillStyle = fill!;
    ctx.beginPath();
    ctx.roundRect(x, y, cell, cell, 18);
    ctx.fill();
  });

  // brand footer
  ctx.fillStyle = "#A78BFA";
  ctx.font = "900 56px Tajawal, sans-serif";
  ctx.fillText("🍇 تلميحة", SIZE / 2, SIZE - 70);

  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("toBlob failed"))), "image/png");
  });
}

/** Share the card via the Web Share API, falling back to a download. */
export async function shareResult(view: PlayerView): Promise<void> {
  const blob = await renderShareCard(view);
  const file = new File([blob], "talmeeha.png", { type: "image/png" });
  const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
  if (nav.canShare?.({ files: [file] }) && navigator.share) {
    await navigator.share({ files: [file], title: "تلميحة 🍇", text: "نتيجتنا في تلميحة!" });
    return;
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "talmeeha.png";
  a.click();
  URL.revokeObjectURL(url);
}
```

- [ ] **Step 2: Add the share button to the win modal.**

In `src/components/screens/WinModal.tsx` (its `gs` prop is already `PlayerView` from Part 1 Task 5):
- Add `import { shareResult } from "@/lib/share/renderShareCard";` (`useGameStore` is already imported — reuse it).
- Inside the component, add a handler:
```tsx
  const toast = useGameStore((s) => s.toast);
  const onShare = async () => {
    try {
      await shareResult(gs);
    } catch {
      toast("تعذّرت مشاركة النتيجة");
    }
  };
```
- Add a share button above "🔄 جولة جديدة":
```tsx
        <button
          className="btn btn-outline w100"
          style={{ marginBottom: ".55rem" }}
          onClick={onShare}
        >
          📤 شارك النتيجة
        </button>
```

- [ ] **Step 3: Exclude the canvas renderer from coverage** (it is DOM/canvas, verified via Playwright, not unit tests — keep `test:cov` above its 80% threshold).

In `vitest.config.ts`, add an `exclude` to the `coverage` block:
```typescript
    coverage: {
      provider: "v8",
      include: ["src/lib/**"],
      exclude: ["src/lib/share/renderShareCard.ts"],
      thresholds: { lines: 80, functions: 80, branches: 80, statements: 80 },
    },
```

- [ ] **Step 4: Type-check + build + coverage.**

Run: `node_modules/.bin/tsc --noEmit && npm run build && node_modules/.bin/vitest run --coverage`
Expected: tsc exit 0; build succeeds; coverage on `src/lib/**` stays ≥ 80%. (`CanvasRenderingContext2D.roundRect` is in the DOM lib included by tsconfig.)

- [ ] **Step 5: Commit.**

```bash
git add src/lib/share/renderShareCard.ts src/components/screens/WinModal.tsx vitest.config.ts
git commit -m "feat(share): spoiler-free canvas result card + share button"
```

---

## GROUP J — PWA (installable + offline shell)

### Task 10: Manifest + icons + metadata

**Files:**
- Modify: `package.json`
- Create: `scripts/gen-icons.mjs`, `public/manifest.webmanifest`
- Create (generated): `public/icon-192.png`, `public/icon-512.png`, `public/maskable-512.png`
- Modify: `src/app/layout.tsx`

- [ ] **Step 1: Add sharp (devDep) for icon rasterization.**

Run: `npm install -D sharp@^0.33.5`
Expected: `sharp` in `devDependencies`.

- [ ] **Step 2: Create the icon generation script.**

Create `scripts/gen-icons.mjs`:

```javascript
import sharp from "sharp";
import { readFileSync } from "node:fs";

const svg = readFileSync("src/app/icon.svg");

await sharp(svg).resize(192, 192).png().toFile("public/icon-192.png");
await sharp(svg).resize(512, 512).png().toFile("public/icon-512.png");

// maskable: centre the mark on a solid Neon Night background with safe padding
const inner = await sharp(svg).resize(360, 360).png().toBuffer();
await sharp({ create: { width: 512, height: 512, channels: 4, background: "#0A0A0F" } })
  .composite([{ input: inner, gravity: "center" }])
  .png()
  .toFile("public/maskable-512.png");

console.log("icons generated");
```

- [ ] **Step 3: Generate the icons.**

Run: `node scripts/gen-icons.mjs && ls -la public/icon-192.png public/icon-512.png public/maskable-512.png`
Expected: three PNG files created. (If sharp fails to rasterize the SVG — e.g. it references an external font — simplify `src/app/icon.svg` to pure vector shapes/`<text>` removed, or replace the script's input with an inline grape SVG string, then re-run.)

- [ ] **Step 4: Create the manifest.**

Create `public/manifest.webmanifest`:

```json
{
  "name": "تلميحة",
  "short_name": "تلميحة",
  "description": "لعبة الفرق والكلمات العربية",
  "lang": "ar",
  "dir": "rtl",
  "start_url": "/",
  "scope": "/",
  "display": "standalone",
  "orientation": "portrait",
  "background_color": "#0A0A0F",
  "theme_color": "#0A0A0F",
  "icons": [
    { "src": "/icon.svg", "sizes": "any", "type": "image/svg+xml", "purpose": "any" },
    { "src": "/icon-192.png", "sizes": "192x192", "type": "image/png", "purpose": "any" },
    { "src": "/icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "any" },
    { "src": "/maskable-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
  ]
}
```

- [ ] **Step 5: Wire manifest + theme color in the layout.**

In `src/app/layout.tsx`:
- Change the type import: `import type { Metadata, Viewport } from "next";`
- Extend `metadata`:
```typescript
export const metadata: Metadata = {
  title: "تلميحة 🍇",
  description: "لعبة الفرق والكلمات",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "تلميحة", statusBarStyle: "black-translucent" },
};
```
- Add a `viewport` export:
```typescript
export const viewport: Viewport = {
  themeColor: "#0A0A0F",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};
```

- [ ] **Step 6: Build + commit.**

Run: `node_modules/.bin/tsc --noEmit && npm run build`
```bash
git add package.json package-lock.json scripts/gen-icons.mjs public/manifest.webmanifest public/icon-192.png public/icon-512.png public/maskable-512.png src/app/layout.tsx
git commit -m "feat(pwa): manifest, icons, theme color"
```

---

### Task 11: Service worker + registration (offline shell)

**Files:**
- Create: `public/sw.js`
- Create: `src/components/pwa/PwaRegister.tsx`
- Modify: `src/app/page.tsx`

- [ ] **Step 1: Create the service worker.**

Create `public/sw.js`:

```javascript
const CACHE = "talmeeha-v1";
const SHELL = ["/", "/manifest.webmanifest", "/icon.svg"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);

  // Never intercept realtime / health endpoints.
  if (url.pathname.startsWith("/socket.io") || url.pathname.startsWith("/healthz")) return;

  // Cache-first for hashed static assets.
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((res) => {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(request, copy));
            return res;
          }),
      ),
    );
    return;
  }

  // Network-first for navigations, fall back to the cached app shell offline.
  if (request.mode === "navigate") {
    event.respondWith(fetch(request).catch(() => caches.match("/")));
  }
});
```

- [ ] **Step 2: Create the registration component.**

Create `src/components/pwa/PwaRegister.tsx`:

```tsx
"use client";

import { useEffect } from "react";

/** Registers the service worker once on the client (production-safe; no-op if unsupported). */
export default function PwaRegister() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // registration failures are non-fatal
      });
    }
  }, []);
  return null;
}
```

- [ ] **Step 3: Mount it.**

In `src/app/page.tsx`: add `import PwaRegister from "@/components/pwa/PwaRegister";` and render `<PwaRegister />` in the fragment (next to `<PrefsEffect />`).

- [ ] **Step 4: Build + commit.**

Run: `node_modules/.bin/tsc --noEmit && npm run build`
```bash
git add public/sw.js src/components/pwa/PwaRegister.tsx src/app/page.tsx
git commit -m "feat(pwa): service worker + offline app shell"
```

---

### Task 12: Install prompt button

**Files:**
- Create: `src/components/pwa/InstallButton.tsx`
- Modify: `src/components/a11y/SettingsSheet.tsx`

- [ ] **Step 1: Build the install button.**

Create `src/components/pwa/InstallButton.tsx`:

```tsx
"use client";

import { useEffect, useState } from "react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

/** Shows an install action only when the browser offers a beforeinstallprompt. */
export default function InstallButton() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setDeferred(null);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (installed || !deferred) return null;

  return (
    <button
      className="toggle on"
      onClick={async () => {
        await deferred.prompt();
        setDeferred(null);
      }}
    >
      📲 تثبيت
    </button>
  );
}
```

- [ ] **Step 2: Add an install row to the settings sheet.**

In `src/components/a11y/SettingsSheet.tsx`:
- Add `import InstallButton from "@/components/pwa/InstallButton";`
- Add a row at the end of the sheet (after the sound row):
```tsx
        <div className="settings-row">
          <span>تثبيت التطبيق</span>
          <InstallButton />
        </div>
```

- [ ] **Step 3: Build + commit.**

Run: `node_modules/.bin/tsc --noEmit && npm run build`
```bash
git add src/components/pwa/InstallButton.tsx src/components/a11y/SettingsSheet.tsx
git commit -m "feat(pwa): install prompt button in settings"
```

---

## GROUP K — Verification

### Task 13: Full verification + reviewer agents

**Files:** none (verification only)

- [ ] **Step 1: Static gates.**

Run:
```bash
node_modules/.bin/tsc --noEmit
node_modules/.bin/vitest run
npm run build
```
Expected: tsc exit 0; **all** Vitest green (Part 1 suite + share summary + rejoin integration test); Turbopack build succeeds.

- [ ] **Step 2: Start a clean dev server.**

```bash
pkill -f "tsx watch server/index.ts" 2>/dev/null; sleep 1
nohup npm run dev > /tmp/talmeeha-dev.log 2>&1 &
for i in $(seq 1 40); do curl -fs localhost:3000/healthz && break; sleep 2; done
```
Expected: `ok`.

- [ ] **Step 3: Playwright — zero-friction join.**

- Create an online room; confirm the lobby shows the code + a QR + a "مشاركة الرابط" button.
- Copy the join URL (`/?room=<code>`), open it in a second context; confirm the home screen is in **online** mode with the code **pre-filled**. Join; confirm both clients land in the lobby.

- [ ] **Step 4: Playwright — reconnection.**

- In an online game, note the guesser's seat. Simulate a drop: in the guesser context, `window.dispatchEvent` is not enough — instead toggle offline via the browser context (`context.setOffline(true)` then `false`) so socket.io reconnects. Confirm after reconnect the guesser keeps their team (no re-pick), and the board still renders their projected (hidden) view.

- [ ] **Step 5: Playwright — onboarding, pass-the-phone, share, PWA.**

- **Onboarding:** clear `localStorage`, reload → splash appears; "العب الآن" dismisses and does not reappear on reload. Start a host game → coach-marks appear once.
- **Pass-the-phone:** in a host game pre-clue, press-and-hold "اضغط مطوّلاً لرؤية المفتاح" → board reveals the key while held; release → key hidden again.
- **Share:** finish a game → "📤 شارك النتيجة" present; clicking it produces a PNG (Web Share unavailable in headless → it downloads `talmeeha.png`). Verify a non-empty blob/file.
- **PWA:** confirm `/manifest.webmanifest` and `/sw.js` are served (HTTP 200); `navigator.serviceWorker.controller` becomes non-null after a reload; Lighthouse/Application panel lists the manifest. Confirm **0 console errors** across these flows.

- [ ] **Step 6: Reviewer agents.**

- `socket-event-reviewer` — `reconnect.ts`, `presence.ts`, the disconnect grace refactor, rejoin payload validation (Zod), server authority.
- `arabic-rtl-reviewer` — RoomShare, Onboarding, CoachMarks, HandoffGate, SettingsSheet install row, WinModal share button, share-card Arabic text, RTL + copy/voice.
- `game-logic-reviewer` — `share/summary.ts` purity; confirm no rules touched.

Address CRITICAL/HIGH findings before finishing.

- [ ] **Step 7: Stop the dev server.**

```bash
pkill -f "tsx watch server/index.ts" 2>/dev/null
```

---

## Self-Review Notes (spec → plan coverage for Part 2)

- **§2.1 / §8.2 zero-friction join (link + QR + deep-link)** → Tasks 1–2.
- **§9 reconnection (rejoin) / §11 network-drop grace** → Tasks 3–4.
- **§2.2 / §8.1 teach-by-doing onboarding** → Tasks 5–6.
- **§7 pass-the-phone + hold-to-peek (no persistent secret)** → Task 7.
- **§2.7 / §8.5 spoiler-free share card + rematch** → Tasks 8–9 (rematch already exists in WinModal from Part 0).
- **§9 PWA (manifest + service worker + install)** → Tasks 10–12.
- **§12 verification (mobile/desktop, console-clean, reviewers)** → Task 13.

**Already delivered in Part 1:** role-filtered state (security), Neon Night design system, glass tiles, team glyphs, colorblind palette, reduced-motion, digit style, settings sheet, in-game redesign.

**Out of scope (Phases 2–5, future specs):** blitz/timers, sound assets, word packs + daily challenge, AI solo/co-op, progression/social, Redis persistence.
