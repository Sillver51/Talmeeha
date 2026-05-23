import { describe, it, expect } from "vitest";
import { myRole, myTurn, hLeader, hGuesser } from "@/lib/ui/roles";
import type { GameState, HostTeam, Player, Team } from "@/lib/types";

// Minimal GameState factory — only the fields the role helpers read matter.
function gsFactory(overrides: Partial<GameState> = {}): GameState {
  return {
    code: "1234",
    phase: "playing",
    hostMode: false,
    board: [],
    turn: "red",
    clue: null,
    gleft: 0,
    gphase: false,
    winner: null,
    teams: { red: [], blue: [] },
    leaders: { red: null, blue: null },
    teamNames: { red: "الأحمر", blue: "الأزرق" },
    players: {},
    doubts: {},
    wins: { red: 0, blue: 0 },
    sRed: 9,
    sBlue: 8,
    log: [],
    ...overrides,
  };
}

function player(id: string, team: Team | null): Player {
  return { id, name: id, team };
}

function hostTeam(players: string[], leader: string, gIdx = 0): HostTeam {
  return { players, leader, gIdx };
}

describe("myRole", () => {
  it("returns spectator when there is no game state", () => {
    expect(myRole(null, "p1", false)).toBe("spectator");
  });

  it("returns host when the client is the host", () => {
    const gs = gsFactory();
    expect(myRole(gs, "p1", true)).toBe("host");
  });

  it("returns spectator when the player has no team", () => {
    const gs = gsFactory({ players: { p1: player("p1", null) } });
    expect(myRole(gs, "p1", false)).toBe("spectator");
  });

  it("returns spectator when the player id is unknown", () => {
    const gs = gsFactory({ players: { p1: player("p1", "red") } });
    expect(myRole(gs, "ghost", false)).toBe("spectator");
  });

  it("returns spectator when myId is null", () => {
    const gs = gsFactory({ players: { p1: player("p1", "red") } });
    expect(myRole(gs, null, false)).toBe("spectator");
  });

  it("returns leader when the player leads their team", () => {
    const gs = gsFactory({
      players: { p1: player("p1", "red") },
      leaders: { red: "p1", blue: null },
    });
    expect(myRole(gs, "p1", false)).toBe("leader");
  });

  it("returns guesser when the player is on a team but not its leader", () => {
    const gs = gsFactory({
      players: { p1: player("p1", "blue") },
      leaders: { red: null, blue: "p2" },
    });
    expect(myRole(gs, "p1", false)).toBe("guesser");
  });
});

describe("myTurn", () => {
  it("is true when the player's team matches the current turn", () => {
    const gs = gsFactory({ turn: "red", players: { p1: player("p1", "red") } });
    expect(myTurn(gs, "p1")).toBe(true);
  });

  it("is false when the player's team is not on turn", () => {
    const gs = gsFactory({ turn: "red", players: { p1: player("p1", "blue") } });
    expect(myTurn(gs, "p1")).toBe(false);
  });

  it("is false for an unknown player", () => {
    const gs = gsFactory({ turn: "red", players: {} });
    expect(myTurn(gs, "ghost")).toBe(false);
  });

  it("is false when game state is null", () => {
    expect(myTurn(null, "p1")).toBe(false);
  });

  it("is false when myId is null", () => {
    const gs = gsFactory({ turn: "red", players: { p1: player("p1", "red") } });
    expect(myTurn(gs, null)).toBe(false);
  });
});

describe("hLeader (host-mode current leader name)", () => {
  it("returns the leader of the on-turn team", () => {
    const gs = gsFactory({
      turn: "red",
      hRed: hostTeam(["Ali", "Sara"], "Ali"),
      hBlue: hostTeam(["Omar", "Lina"], "Omar"),
    });
    expect(hLeader(gs)).toBe("Ali");
  });

  it("follows the turn to the blue team", () => {
    const gs = gsFactory({
      turn: "blue",
      hRed: hostTeam(["Ali", "Sara"], "Ali"),
      hBlue: hostTeam(["Omar", "Lina"], "Omar"),
    });
    expect(hLeader(gs)).toBe("Omar");
  });

  it("returns empty string when host team data is missing", () => {
    const gs = gsFactory({ turn: "red" });
    expect(hLeader(gs)).toBe("");
  });
});

describe("hGuesser (host-mode current guesser name)", () => {
  it("returns the first non-leader guesser", () => {
    const gs = gsFactory({
      turn: "red",
      hRed: hostTeam(["Ali", "Sara", "Noor"], "Ali", 0),
    });
    expect(hGuesser(gs)).toBe("Sara");
  });

  it("rotates through guessers by gIdx", () => {
    const gs = gsFactory({
      turn: "red",
      hRed: hostTeam(["Ali", "Sara", "Noor"], "Ali", 1),
    });
    expect(hGuesser(gs)).toBe("Noor");
  });

  it("wraps around when gIdx exceeds the guesser count", () => {
    const gs = gsFactory({
      turn: "red",
      hRed: hostTeam(["Ali", "Sara", "Noor"], "Ali", 2),
    });
    expect(hGuesser(gs)).toBe("Sara");
  });

  it("falls back to the first player when everyone is the leader", () => {
    const gs = gsFactory({
      turn: "blue",
      hBlue: hostTeam(["Solo"], "Solo", 0),
    });
    expect(hGuesser(gs)).toBe("Solo");
  });

  it("returns empty string when host team data is missing", () => {
    const gs = gsFactory({ turn: "red" });
    expect(hGuesser(gs)).toBe("");
  });
});
