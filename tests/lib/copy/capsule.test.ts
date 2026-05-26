import { describe, it, expect } from "vitest";
import { resolveCapsulePhrase, CAPSULE_HEADLINE_TASHKEEL, type CapsuleState } from "@/lib/copy/capsule";

const baseGameId = "ABCD";

describe("resolveCapsulePhrase", () => {
  it("renders leader pre-clue with name interpolated", () => {
    const state: CapsuleState = {
      phase: "playing", gphase: false, role: "leader", isMyTurn: true,
      gameId: baseGameId, name: "أحمد",
    };
    const text = resolveCapsulePhrase(state);
    expect(text).toMatch(/أحمد/);
  });

  it("renders guesser post-clue with clue + count interpolated", () => {
    const state: CapsuleState = {
      phase: "playing", gphase: true, role: "guesser", isMyTurn: true,
      gameId: baseGameId, clue: "بيت", count: 2,
    };
    const text = resolveCapsulePhrase(state);
    expect(text).toMatch(/بيت/);
    expect(text).toMatch(/2/);
  });

  it("renders ended winner state", () => {
    const state: CapsuleState = {
      phase: "ended", role: "guesser", isMyTurn: false,
      gameId: baseGameId, winnerName: "الأحمر",
    };
    const text = resolveCapsulePhrase(state);
    expect(text).toMatch(/الأحمر/);
  });

  it("is deterministic for the same (state-key, gameId)", () => {
    const s: CapsuleState = {
      phase: "playing", gphase: false, role: "leader", isMyTurn: true,
      gameId: baseGameId, name: "أحمد",
    };
    expect(resolveCapsulePhrase(s)).toBe(resolveCapsulePhrase(s));
  });

  it("may vary across gameIds", () => {
    const s = (gid: string): CapsuleState => ({
      phase: "playing", gphase: false, role: "leader", isMyTurn: true,
      gameId: gid, name: "أحمد",
    });
    const variations = new Set(["A", "B", "C", "D", "E", "F", "G", "H"].map((g) => resolveCapsulePhrase(s(g))));
    expect(variations.size).toBeGreaterThan(1);
  });

  it("never returns an empty string for any role × phase × gphase × isMyTurn combination", () => {
    const roles = ["leader", "guesser", "host", "spectator"] as const;
    const phases = ["playing", "ended"] as const;
    for (const role of roles) for (const phase of phases) for (const gphase of [false, true]) for (const isMyTurn of [false, true]) {
      const t = resolveCapsulePhrase({ phase, gphase, role, isMyTurn, gameId: "X", name: "ن", clue: "ك", count: 1, winnerName: "وي" });
      expect(t.length).toBeGreaterThan(0);
    }
  });

  it("exports a tashkeel-decorated brand headline", () => {
    expect(CAPSULE_HEADLINE_TASHKEEL).toBe("تَلْميحَة");
  });
});
