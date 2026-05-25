// Client estimate of the server's clock. The server stamps `turnDeadlineAt` in its
// own time and the client renders the countdown against this estimate. For Slice 5
// the offset is 0 — the server's setTimeout is the sole expiry authority and
// sub-second client drift is acceptable. `setClockOffset` is the seam for a future
// ping-based estimate; call sites won't change.
let offset = 0;

export function setClockOffset(ms: number): void {
  offset = ms;
}

export function getClockOffset(): number {
  return offset;
}

export function estimatedServerNow(): number {
  return Date.now() + offset;
}
