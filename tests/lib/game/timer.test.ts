import { describe, it, expect } from "vitest";
import {
  PRESETS,
  DEFAULT_TIMER,
  applyTurnDeadline,
  clearTurnDeadline,
} from "@/lib/game/timer";

describe("PRESETS", () => {
  it("normal preset has durationMs 60000", () => {
    expect(PRESETS.normal.durationMs).toBe(60000);
  });

  it("relaxed preset has durationMs 90000", () => {
    expect(PRESETS.relaxed.durationMs).toBe(90000);
  });

  it("blitz preset has durationMs 30000", () => {
    expect(PRESETS.blitz.durationMs).toBe(30000);
  });

  it("all presets have exact Arabic labels", () => {
    expect(PRESETS.relaxed.label).toBe("مريح");
    expect(PRESETS.normal.label).toBe("عادي");
    expect(PRESETS.blitz.label).toBe("سريع");
  });
});

describe("DEFAULT_TIMER", () => {
  it("is disabled by default", () => {
    expect(DEFAULT_TIMER.enabled).toBe(false);
  });

  it("has preset 'normal'", () => {
    expect(DEFAULT_TIMER.preset).toBe("normal");
  });

  it("has durationMs 60000", () => {
    expect(DEFAULT_TIMER.durationMs).toBe(60000);
  });
});

describe("applyTurnDeadline", () => {
  it("sets a deadline when timer is enabled (blitz)", () => {
    const room = { timer: { enabled: true, preset: "blitz" as const, durationMs: 30000 } };
    expect(applyTurnDeadline(room, 1000).turnDeadlineAt).toBe(31000);
  });

  it("sets a deadline when timer is enabled (normal)", () => {
    const room = { timer: { enabled: true, preset: "normal" as const, durationMs: 60000 } };
    expect(applyTurnDeadline(room, 0).turnDeadlineAt).toBe(60000);
  });

  it("sets a deadline when timer is enabled (relaxed)", () => {
    const room = { timer: { enabled: true, preset: "relaxed" as const, durationMs: 90000 } };
    expect(applyTurnDeadline(room, 1000).turnDeadlineAt).toBe(91000);
  });

  it("sets turnDeadlineAt to null when timer is disabled", () => {
    const room = { timer: DEFAULT_TIMER };
    expect(applyTurnDeadline(room, 1000).turnDeadlineAt).toBeNull();
  });

  it("nulls the deadline when disabled and does not mutate the source", () => {
    const room = { timer: DEFAULT_TIMER, turnDeadlineAt: 999 };
    const out = applyTurnDeadline(room, 1000);
    expect(out.turnDeadlineAt).toBeNull();
    expect(room.turnDeadlineAt).toBe(999); // immutability
  });

  it("does not mutate the source room when enabled", () => {
    const room = { timer: { enabled: true, preset: "normal" as const, durationMs: 60000 } };
    const before = { ...room };
    applyTurnDeadline(room, 1000);
    expect(room).toEqual(before);
  });

  it("returns a new object (not same reference)", () => {
    const room = { timer: { enabled: true, preset: "normal" as const, durationMs: 60000 } };
    expect(applyTurnDeadline(room, 1000)).not.toBe(room);
  });

  it("handles missing timer field (no timer → null deadline)", () => {
    const room = {};
    expect(applyTurnDeadline(room, 1000).turnDeadlineAt).toBeNull();
  });
});

describe("clearTurnDeadline", () => {
  it("sets turnDeadlineAt to null", () => {
    const room: { turnDeadlineAt: number | null } = { turnDeadlineAt: 99999 };
    expect(clearTurnDeadline(room).turnDeadlineAt).toBeNull();
  });

  it("does not mutate the source room", () => {
    const room: { turnDeadlineAt: number | null } = { turnDeadlineAt: 12345 };
    clearTurnDeadline(room);
    expect(room.turnDeadlineAt).toBe(12345);
  });

  it("returns a new object (not same reference)", () => {
    const room: { turnDeadlineAt: number | null } = { turnDeadlineAt: 1 };
    expect(clearTurnDeadline(room)).not.toBe(room);
  });

  it("clearTurnDeadline preserves other room fields", () => {
    const room = { timer: DEFAULT_TIMER, turnDeadlineAt: 99999 as number | null, turn: "red" as const };
    const out = clearTurnDeadline(room);
    expect(out.turnDeadlineAt).toBeNull();
    expect(out.turn).toBe("red");
    expect(out.timer).toBe(DEFAULT_TIMER);
  });
});
