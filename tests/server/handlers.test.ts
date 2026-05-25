import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createServer, type Server as HttpServer } from "node:http";
import { Server } from "socket.io";
import { io as Client, type Socket } from "socket.io-client";
import type {
  ClientToServerEvents,
  PlayerView,
  ServerToClientEvents,
  Team,
} from "@/lib/types";
import { registerHandlers } from "../../server/socket";

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

const next = (s: Socket, ev: string): Promise<PlayerView> =>
  new Promise((res) => s.once(ev, res));

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
async function startOnlineGame(): Promise<{
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
});
