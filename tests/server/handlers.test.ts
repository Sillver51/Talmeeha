import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { createServer, type Server as HttpServer } from "node:http";
import { Server } from "socket.io";
import { io as Client, type Socket } from "socket.io-client";
import type {
  Card,
  ClientToServerEvents,
  GameState,
  PlayerView,
  ServerToClientEvents,
  Team,
} from "@/lib/types";
import { registerHandlers } from "../../server/socket";
import { store } from "../../server/rooms";
import { armTurnDeadline, cancelTurnDeadline } from "../../server/timers";

let http: HttpServer;
let url: string;

beforeAll(async () => {
  http = createServer();
  const ioServer = new Server<ClientToServerEvents, ServerToClientEvents>(http);
  ioServer.on("connection", (s) => registerHandlers(ioServer, s));
  await new Promise<void>((r) => http.listen(0, r));
  const addr = http.address();
  url = `http://localhost:${typeof addr === "object" && addr ? addr.port : 0}`;
});
afterAll(() => {
  http.close();
});

function connect(): Socket {
  return Client(url, { transports: ["websocket"], forceNew: true });
}

const nextJoined = (s: Socket): Promise<{ code: string; myId: string; isHost: boolean }> =>
  new Promise((res) => s.once("joined", res));

// Waits for a `state` broadcast that satisfies the predicate (events arrive across
// independent sockets with no cross-socket ordering guarantee, so we poll deterministically).
function waitForState(s: Socket, pred: (st: PlayerView) => boolean): Promise<PlayerView> {
  return new Promise((res) => {
    const handler = (st: PlayerView) => {
      if (pred(st)) {
        s.off("state", handler);
        res(st);
      }
    };
    s.on("state", handler);
  });
}

const teamsReady = (st: PlayerView): boolean =>
  st.teams.red.length >= 2 &&
  st.teams.blue.length >= 2 &&
  st.leaders.red !== null &&
  st.leaders.blue !== null;

// Drives create→join→teams→leaders into a ready lobby, then starts the game.
// Layout: red leader = host, blue leader = guest, red member = redMember, blue member = blueMember.
// Optionally enables a turn timer in the lobby (set_timer is rejected mid-game) before start.
async function startOnlineGame(
  timerPreset?: "relaxed" | "normal" | "blitz",
): Promise<{
  code: string;
  state: PlayerView;
  host: Socket;
  guest: Socket;
  redMember: Socket;
  blueMember: Socket;
}> {
  const host = connect();
  const guest = connect();
  host.emit("create_online", { name: "قائد أحمر" });
  const j = await nextJoined(host);
  const code = j.code;
  guest.emit("join_online", { code, name: "قائد أزرق" });
  await nextJoined(guest);

  host.emit("select_team", { code, team: "red" });
  host.emit("become_leader", { code, team: "red" });
  guest.emit("select_team", { code, team: "blue" });
  guest.emit("become_leader", { code, team: "blue" });

  const redMember = connect();
  redMember.emit("join_online", { code, name: "لاعب أحمر" });
  await nextJoined(redMember);
  redMember.emit("select_team", { code, team: "red" });

  const blueMember = connect();
  blueMember.emit("join_online", { code, name: "لاعب أزرق" });
  await nextJoined(blueMember);
  blueMember.emit("select_team", { code, team: "blue" });

  await waitForState(host, teamsReady);

  if (timerPreset) {
    host.emit("set_timer", { code, preset: timerPreset }); // host is the red leader → authorized
    await waitForState(
      host,
      (st) => st.timer?.enabled === true && st.timer.preset === timerPreset,
    );
  }

  host.emit("start_game", { code });
  const state = await waitForState(host, (st) => st.phase === "playing");
  return { code, state, host, guest, redMember, blueMember };
}

describe("online flow", () => {
  it("create → join → teams+leaders → start yields a 25-card board", async () => {
    const { state, host, guest, redMember, blueMember } = await startOnlineGame();
    expect(state.board).toHaveLength(25);
    [host, guest, redMember, blueMember].forEach((s) => s.close());
  });

  it("rejects a malformed clue payload with an error", async () => {
    const s = connect();
    s.emit("submit_clue", { code: "nope", word: "a b", num: 99 });
    const msg = await new Promise<string>((res) => s.once("error", res));
    expect(typeof msg).toBe("string");
    s.close();
  });
});

describe("play flow", () => {
  it("on-turn leader clue + own-color guess reveals the card and keeps the turn", async () => {
    const { code, state, host, guest, redMember, blueMember } = await startOnlineGame();
    const turn: Team = state.turn;
    const leader = turn === "red" ? host : guest;
    const guesser = turn === "red" ? redMember : blueMember;

    // Pick an own-color card that is NOT the team's last one, so the turn continues.
    const ownIdxs = state.board.flatMap((c, i) => (c.t === turn && !c.rv ? [i] : []));
    expect(ownIdxs.length).toBeGreaterThan(1);
    const idx = ownIdxs[0]!;

    leader.emit("submit_clue", { code, word: "تلميحة", num: 1 });
    const afterClue = await waitForState(host, (st) => st.gphase);
    expect(afterClue.gleft).toBe(2);

    guesser.emit("guess_card", { code, index: idx });
    const afterGuess = await waitForState(host, (st) => st.board[idx]!.rv);
    expect(afterGuess.turn).toBe(turn); // gleft 2 → 1, turn continues
    expect(afterGuess.gleft).toBe(1);

    [host, guest, redMember, blueMember].forEach((sock) => sock.close());
  });

  it("guessing the assassin ends the game for the other team", async () => {
    const { code, state, host, guest, redMember, blueMember } = await startOnlineGame();
    const turn: Team = state.turn;
    const other: Team = turn === "red" ? "blue" : "red";
    const leader = turn === "red" ? host : guest;
    const guesser = turn === "red" ? redMember : blueMember;

    const assassinIdx = state.board.findIndex((c) => c.t === "assassin");
    expect(assassinIdx).toBeGreaterThanOrEqual(0);

    leader.emit("submit_clue", { code, word: "تلميحة", num: 1 });
    await waitForState(host, (st) => st.gphase);
    guesser.emit("guess_card", { code, index: assassinIdx });
    const ended = await waitForState(host, (st) => st.phase === "ended");
    expect(ended.winner).toBe(other);

    [host, guest, redMember, blueMember].forEach((sock) => sock.close());
  });
});

describe("role-filtered state (security regression)", () => {
  it("never sends an unrevealed card's real type to a guesser", async () => {
    const { code, state, host, guest, redMember, blueMember } = await startOnlineGame();
    // redMember is a guesser (red team, not leader). Force a fresh broadcast it will
    // receive by having the on-turn leader submit a clue (avoids racing the initial
    // playing broadcast already consumed inside startOnlineGame).
    const leader = state.turn === "red" ? host : guest;
    leader.emit("submit_clue", { code, word: "تلميحة", num: 1 });
    const view = await waitForState(redMember, (st) => st.gphase && st.board.length === 25);
    const leaked = view.board.filter((c) => !c.rv && c.t !== "hidden");
    expect(leaked).toHaveLength(0);
    // Counts are still public so the UI can render remaining tallies.
    expect(view.counts.red + view.counts.blue + view.counts.neutral).toBeGreaterThan(0);
    [host, guest, redMember, blueMember].forEach((s) => s.close());
  });

  it("sends the full key (no hidden cards) to a leader", async () => {
    // `state` is the host's (red leader's) projected playing view from startOnlineGame.
    const { state, host, guest, redMember, blueMember } = await startOnlineGame();
    expect(state.board.some((c) => c.t === "hidden")).toBe(false);
    expect(state.board.some((c) => c.t === "assassin")).toBe(true);
    [host, guest, redMember, blueMember].forEach((s) => s.close());
  });
});

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

  it("rejects rejoin onto an active (connected) seat (anti-hijack)", async () => {
    const a = connect();
    a.emit("create_online", { name: "A" });
    const ja = await nextJoined(a);
    const code = ja.code;

    const b = connect();
    b.emit("join_online", { code, name: "B" });
    const jb = await nextJoined(b);
    await waitForState(a, (st) => Boolean(st.players[jb.myId]));

    // An attacker learns B's id from the shared room state, but B is still connected.
    const x = connect();
    x.emit("rejoin", { code, playerId: jb.myId, name: "X" });
    const err = await new Promise<string>((res) => x.once("error", res));
    expect(typeof err).toBe("string");

    [a, b, x].forEach((s) => s.close());
  });
});

describe("integrity guards", () => {
  it("become_leader mid-game is phase-gated: leaders stay unchanged", async () => {
    const { code, host, guest, redMember, blueMember } = await startOnlineGame();
    const before = store.get(code)!;
    const redLeaderBefore = before.leaders.red;

    // redMember tries to grab the red leader seat while phase === "playing".
    // The phase-gate (Fix 1) returns silently before any state change, so the
    // roster is locked: leaders are untouched.
    redMember.emit("become_leader", { code, team: "red" });
    // Give the server time to process (and ignore) the request before asserting.
    await new Promise<void>((res) => setTimeout(res, 100));

    const after = store.get(code)!;
    expect(after.leaders.red).toBe(redLeaderBefore);
    expect(after.phase).toBe("playing");

    [host, guest, redMember, blueMember].forEach((s) => s.close());
  });

  it("select_team mid-game is phase-gated: a member's team stays unchanged", async () => {
    const { code, host, guest, redMember, blueMember } = await startOnlineGame();
    const before = store.get(code)!;
    const redMemberId = redMember.id!;
    const teamBefore = before.players[redMemberId]?.team;
    expect(teamBefore).toBe("red");

    // redMember tries to switch to blue while phase === "playing".
    // The phase-gate returns silently before any state change, so the team is locked.
    redMember.emit("select_team", { code, team: "blue" });
    // Give the server time to process (and ignore) the request before asserting.
    await new Promise<void>((res) => setTimeout(res, 100));

    const after = store.get(code)!;
    expect(after.players[redMemberId]?.team).toBe("red");
    expect(after.teams.red).toContain(redMemberId);
    expect(after.teams.blue).not.toContain(redMemberId);
    expect(after.phase).toBe("playing");

    [host, guest, redMember, blueMember].forEach((s) => s.close());
  });

  it("anti-steal in lobby: a second member can't take a connected leader's seat", async () => {
    const a = connect();
    a.emit("create_online", { name: "A" });
    const ja = await nextJoined(a);
    const code = ja.code;

    const b = connect();
    b.emit("join_online", { code, name: "B" });
    await nextJoined(b);

    // A becomes red leader (still in lobby, phase !== playing).
    a.emit("select_team", { code, team: "red" });
    a.emit("become_leader", { code, team: "red" });
    await waitForState(a, (st) => st.leaders.red === ja.myId);

    // B joins red and tries to steal the leader seat — A is still connected → rejected.
    b.emit("select_team", { code, team: "red" });
    await waitForState(a, (st) => st.teams.red.length === 2);

    const errMsg = new Promise<string>((res) => b.once("error", res));
    b.emit("become_leader", { code, team: "red" });
    expect(typeof (await errMsg)).toBe("string");

    const after = store.get(code)!;
    expect(after.leaders.red).toBe(ja.myId);

    [a, b].forEach((s) => s.close());
  });

  it("auto-advances the turn when the on-turn team loses its only guesser", async () => {
    const { state, host, guest, redMember, blueMember } = await startOnlineGame();
    const turn: Team = state.turn;
    // The on-turn team's sole guesser (member, not leader).
    const guesser = turn === "red" ? redMember : blueMember;
    const other: Team = turn === "red" ? "blue" : "red";

    guesser.close(); // disconnect the lone guesser → server should pass the turn

    // Assert via a still-connected socket (host) that the turn flipped.
    const after = await waitForState(host, (st) => st.turn === other);
    expect(after.turn).toBe(other);

    [host, guest, blueMember, redMember].forEach((s) => s.close());
  });
});

describe("blitz timer", () => {
  it("enabling a timer in the lobby projects turnDeadlineAt once the game starts", async () => {
    const before = Date.now();
    const { state, host, guest, redMember, blueMember } = await startOnlineGame("blitz");
    expect(typeof state.turnDeadlineAt).toBe("number");
    // blitz = 30s ahead of when the turn started
    expect(state.turnDeadlineAt!).toBeGreaterThan(before);
    expect(state.turnDeadlineAt!).toBeLessThanOrEqual(Date.now() + 30000 + 1000);
    expect(state.timer?.enabled).toBe(true);
    [host, guest, redMember, blueMember].forEach((s) => s.close());
  });

  // Deterministic: drives the scheduler directly (no real sockets) so it's fast and stable.
  // The critical invariant — an expired turn PASSES but NEVER reveals a card — is asserted here.
  it("timer expiry passes the turn and never reveals a card", async () => {
    vi.useFakeTimers();
    try {
      const code = "0007";
      const card = (t: Card["t"]): Card => ({ w: "x", t, rv: false });
      const room: GameState = {
        code,
        phase: "playing",
        hostMode: false,
        board: [
          card("red"),
          card("red"),
          card("blue"),
          card("blue"),
          card("neutral"),
          card("assassin"),
        ],
        turn: "red",
        clue: null,
        gleft: 0,
        gphase: false,
        winner: null,
        teams: { red: [], blue: [] },
        leaders: { red: null, blue: null },
        teamNames: { red: "أحمر", blue: "أزرق" },
        players: {},
        doubts: {},
        wins: { red: 0, blue: 0 },
        sRed: 2,
        sBlue: 2,
        log: [],
        timer: { enabled: true, preset: "blitz", durationMs: 30 },
      };
      store.set(code, room);
      const revealedBefore = room.board.filter((c) => c.rv).length; // 0

      const stubIo = { in: () => ({ fetchSockets: async () => [] }) } as unknown as Server;
      armTurnDeadline(stubIo, code);

      // Fire exactly one expiry (30ms duration); the re-armed next one (at 60ms) must NOT fire.
      await vi.advanceTimersByTimeAsync(35);

      const after = store.get(code)!;
      expect(after.turn).toBe("blue"); // turn PASSED
      expect(after.board.filter((c) => c.rv).length).toBe(revealedBefore); // NEVER revealed
      expect(after.phase).toBe("playing"); // game NOT ended
      expect(after.log[0]).toContain("انتهى الوقت"); // went through expire()

      cancelTurnDeadline(code); // clear the re-armed timer
      store.delete(code);
    } finally {
      vi.useRealTimers();
    }
  });
});
