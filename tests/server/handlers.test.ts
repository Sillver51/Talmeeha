import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createServer, type Server as HttpServer } from "node:http";
import { Server } from "socket.io";
import { io as Client, type Socket } from "socket.io-client";
import type { GameState, Team } from "@/lib/types";
import { registerHandlers } from "../../server/socket";

let http: HttpServer;
let url: string;

beforeAll(async () => {
  http = createServer();
  const ioServer = new Server(http);
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

const next = (s: Socket, ev: string): Promise<GameState> =>
  new Promise((res) => s.once(ev, res));

const nextJoined = (s: Socket): Promise<{ code: string; myId: string; isHost: boolean }> =>
  new Promise((res) => s.once("joined", res));

// Waits for a `state` broadcast that satisfies the predicate (events arrive across
// independent sockets with no cross-socket ordering guarantee, so we poll deterministically).
function waitForState(s: Socket, pred: (st: GameState) => boolean): Promise<GameState> {
  return new Promise((res) => {
    const handler = (st: GameState) => {
      if (pred(st)) {
        s.off("state", handler);
        res(st);
      }
    };
    s.on("state", handler);
  });
}

const teamsReady = (st: GameState): boolean =>
  st.teams.red.length >= 2 &&
  st.teams.blue.length >= 2 &&
  st.leaders.red !== null &&
  st.leaders.blue !== null;

// Drives create→join→teams→leaders into a ready lobby, then starts the game.
// Layout: red leader = host, blue leader = guest, red member = redMember, blue member = blueMember.
async function startOnlineGame(): Promise<{
  code: string;
  state: GameState;
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
