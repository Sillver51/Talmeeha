import type { Server, Socket } from "socket.io";
import type { ClientToServerEvents, GameState, ServerToClientEvents, Team } from "@/lib/types";
import { store } from "../rooms";
import { startGameSchema, restartSchema } from "@/lib/schemas";
import { buildBoard, remaining } from "@/lib/game";
import { WORDS } from "@/lib/words";

// Ports legacy start_game (172-186), restart (276-288), disconnect (291-308).
export function registerLifecycleHandlers(
  io: Server<ClientToServerEvents, ServerToClientEvents>,
  socket: Socket<ClientToServerEvents, ServerToClientEvents>,
): void {
  // ── START GAME (online) ──
  socket.on("start_game", (payload) => {
    const parsed = startGameSchema.safeParse(payload);
    if (!parsed.success) {
      socket.emit("error", "طلب غير صالح");
      return;
    }
    const { code } = parsed.data;

    const room = store.get(code);
    if (!room) return;

    const ok =
      room.teams.red.length >= 2 &&
      room.leaders.red &&
      room.teams.blue.length >= 2 &&
      room.leaders.blue;
    if (!ok) return;

    const { board, startTeam } = buildBoard(WORDS);
    const next: GameState = {
      ...room,
      board,
      phase: "playing",
      turn: startTeam,
      clue: null,
      gleft: 0,
      gphase: false,
      winner: null,
      doubts: {},
      sRed: remaining(board, "red"),
      sBlue: remaining(board, "blue"),
      log: [`بدأت اللعبة! يبدأ ${room.teamNames[startTeam]} 🍇`],
    };

    store.set(code, next);
    io.to(code).emit("state", next);
  });

  // ── RESTART ──
  socket.on("restart", (payload) => {
    const parsed = restartSchema.safeParse(payload);
    if (!parsed.success) {
      socket.emit("error", "طلب غير صالح");
      return;
    }
    const { code } = parsed.data;

    const room = store.get(code);
    if (!room) return;

    const next: GameState = room.hostMode
      ? { ...room, phase: "setup" }
      : {
          ...room,
          phase: "lobby",
          board: [],
          clue: null,
          gphase: false,
          winner: null,
          log: [],
          doubts: {},
        };

    store.set(code, next);
    io.to(code).emit("state", next);
  });

  // ── DISCONNECT ──
  socket.on("disconnect", () => {
    for (const [code, room] of [...store.all()]) {
      // Host-mode room is torn down when its host leaves (legacy server.js:304-306).
      if (room.hostMode && room.hostSocketId === socket.id) {
        store.delete(code);
        continue;
      }

      if (!room.players[socket.id]) continue;

      const players = { ...room.players };
      delete players[socket.id];

      const teams: Record<Team, string[]> = {
        red: room.teams.red.filter((i) => i !== socket.id),
        blue: room.teams.blue.filter((i) => i !== socket.id),
      };
      const leaders: Record<Team, string | null> = {
        red: room.leaders.red === socket.id ? null : room.leaders.red,
        blue: room.leaders.blue === socket.id ? null : room.leaders.blue,
      };

      if (Object.keys(players).length === 0) {
        store.delete(code);
        continue;
      }

      const next: GameState = { ...room, players, teams, leaders };
      store.set(code, next);
      io.to(code).emit("state", next);
    }
  });
}
