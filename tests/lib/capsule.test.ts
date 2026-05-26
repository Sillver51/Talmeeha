import { describe, it, expect } from "vitest";
import { resolveCapsulePhrase, type CapsuleState } from "@/lib/copy/capsule";

const base: CapsuleState = {
  phase: "playing",
  gphase: true,
  role: "guesser",
  isMyTurn: true,
  gameId: "ABCD",
};

describe("resolveCapsulePhrase — moment-aware buckets", () => {
  it("returns a praise phrase after own-team hit", () => {
    const out = resolveCapsulePhrase({
      ...base,
      lastEvent: { kind: "hit-own" },
    });
    expect(out).toMatch(/إصابة|موفّق|أحسنت/);
  });

  it("returns a pity phrase after wrong-color hit", () => {
    const out = resolveCapsulePhrase({
      ...base,
      lastEvent: { kind: "hit-wrong" },
    });
    expect(out.length).toBeGreaterThan(0);
    expect(out).not.toMatch(/إصابة موفّقة/);
  });

  it("returns a gravity phrase after assassin reveal", () => {
    const out = resolveCapsulePhrase({
      ...base,
      lastEvent: { kind: "assassin" },
    });
    expect(out).toMatch(/قاتل|نهاية/);
  });

  it("returns an urgency phrase when moment is 'urgency'", () => {
    const out = resolveCapsulePhrase({
      ...base,
      moment: "urgency",
    });
    expect(out).toMatch(/يضيق|ضاق|الوقت/);
  });

  it("returns a handoff phrase after end-turn", () => {
    const out = resolveCapsulePhrase({
      ...base,
      lastEvent: { kind: "turn-end", nextTeamName: "المحيط" },
    });
    expect(out).toMatch(/المحيط/);
  });

  it("is deterministic per gameId", () => {
    const a = resolveCapsulePhrase({ ...base, lastEvent: { kind: "hit-own" } });
    const b = resolveCapsulePhrase({ ...base, lastEvent: { kind: "hit-own" } });
    expect(a).toBe(b);
  });

  it("falls back to existing role/phase buckets when no moment/event is set", () => {
    // pre-clue leader on own turn — existing leaderMyTurnPreClue bucket
    const out = resolveCapsulePhrase({
      ...base,
      role: "leader",
      gphase: false,
      name: "حسن",
    });
    expect(out).toMatch(/حسن|دورك|قائد/);
  });
});
