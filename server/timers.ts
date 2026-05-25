import type { Server } from "socket.io";
import type { ClientToServerEvents, ServerToClientEvents } from "@/lib/types";
import { addLog, applyTurnDeadline, nextTurn, needsSuddenDeath, endTimedGame } from "@/lib/game";
import { store } from "./rooms";
import { broadcastState } from "./emit";

type IO = Server<ClientToServerEvents, ServerToClientEvents>;

const SUDDEN_DEATH_AFTER_TIMEOUTS = 2;

/** One pending turn-deadline timeout per room, keyed by room code. */
const timers = new Map<string, ReturnType<typeof setTimeout>>();

/** Cancel a room's pending turn-deadline (turn change, game end, disconnect, timer off). */
export function cancelTurnDeadline(code: string): void {
  const t = timers.get(code);
  if (t) {
    clearTimeout(t);
    timers.delete(code);
  }
}

function schedule(io: IO, code: string, durationMs: number): void {
  cancelTurnDeadline(code);
  const t = setTimeout(() => void expire(io, code), durationMs);
  // Never let a pending turn timer keep the process alive during graceful shutdown.
  if (typeof t === "object" && typeof t.unref === "function") t.unref();
  timers.set(code, t);
}

/**
 * Arm (or refresh) the current turn's deadline for a room. Call this on turn start
 * and on every turn CHANGE. Sets `turnDeadlineAt` on the stored room and schedules
 * the single setTimeout that is the SOLE authority for ending a timed-out turn.
 * No-op (and cancels any pending timer) when the room isn't playing or the timer is off.
 */
export function armTurnDeadline(io: IO, code: string): void {
  const room = store.get(code);
  if (!room || room.phase !== "playing" || !room.timer?.enabled) {
    cancelTurnDeadline(code);
    return;
  }
  store.set(code, applyTurnDeadline(room, Date.now()));
  schedule(io, code, room.timer.durationMs);
}

/**
 * Fired ONLY by the scheduled setTimeout. Passes the turn — NEVER reveals a card,
 * never touches the board, never ends the game. Then re-arms for the next team.
 */
async function expire(io: IO, code: string): Promise<void> {
  timers.delete(code);
  const room = store.get(code);
  if (!room || room.phase !== "playing" || !room.timer?.enabled) return;

  const timeouts = (room.clockTimeouts ?? 0) + 1;

  // Both teams let the clock run out with words still on the board → resolve.
  if (
    timeouts >= SUDDEN_DEATH_AFTER_TIMEOUTS &&
    needsSuddenDeath({ ...room, endedOnClock: true })
  ) {
    store.set(code, endTimedGame(room));
    await broadcastState(io, code);
    return; // game over — do not re-arm
  }

  // Otherwise pass the turn (NEVER reveal), carrying the incremented timeout streak.
  const passed = applyTurnDeadline(
    nextTurn({ ...room, clockTimeouts: timeouts, log: addLog(room.log, "⏰ انتهى الوقت") }),
    Date.now(),
  );
  store.set(code, passed);
  await broadcastState(io, code);
  // Re-read: the room may have been deleted/ended during the async broadcast.
  const fresh = store.get(code);
  if (fresh?.phase === "playing" && fresh.timer?.enabled) {
    schedule(io, code, fresh.timer.durationMs);
  }
}
