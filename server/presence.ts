/** Pending player-removal timers, so a brief disconnect doesn't drop a player's seat. */
const GRACE_MS = 30_000;
const timers = new Map<string, ReturnType<typeof setTimeout>>();
const key = (code: string, id: string): string => `${code}::${id}`;

/** Schedule a player's removal after the grace window (cancels any prior timer for the pair). */
export function scheduleRemoval(code: string, id: string, run: () => void): void {
  cancelRemoval(code, id);
  const t = setTimeout(() => {
    timers.delete(key(code, id));
    run();
  }, GRACE_MS);
  // Don't let a pending grace timer keep the Node process alive during graceful shutdown.
  if (typeof t === "object" && typeof t.unref === "function") t.unref();
  timers.set(key(code, id), t);
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
