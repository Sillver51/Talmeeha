import type { Server, Socket } from "socket.io";
import type { ClientToServerEvents, GameState, ServerToClientEvents, Team } from "@/lib/types";
import { store } from "../rooms";
import { broadcastState } from "../emit";
import { scheduleRemoval } from "../presence";
import { armTurnDeadline, cancelTurnDeadline } from "../timers";
import { startGameSchema, restartSchema } from "@/lib/schemas";
import { buildBoard, remaining, nextTurn, addLog, teamHasActiveGuesser } from "@/lib/game";
import { WORDS } from "@/lib/words";

/**
 * If the on-turn team has no connected guesser (only its leader / all disconnected),
 * pass the turn so the game can't soft-lock — but ONLY if the other team CAN act
 * (otherwise a flip is pointless and we leave the game paused until someone rejoins).
 * Returns true if it advanced (and broadcast); false if it did nothing.
 */
function passTurnIfStuck(
  io: Server<ClientToServerEvents, ServerToClientEvents>,
  code: string,
): boolean {
  const room = store.get(code);
  if (!room || room.phase !== "playing" || room.hostMode) return false;
  const other: Team = room.turn === "red" ? "blue" : "red";
  if (teamHasActiveGuesser(room, room.turn)) return false; // current team can act
  if (!teamHasActiveGuesser(room, other)) return false; // neither can act → don't flip
  const advanced = nextTurn({
    ...room,
    log: addLog(room.log, "⏭ تم تمرير الدور — لا يوجد لاعب متصل"),
  });
  store.set(code, advanced);
  armTurnDeadline(io, code); // set fresh deadline BEFORE broadcasting
  void broadcastState(io, code);
  return true;
}

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
      wrongGuesses: { red: 0, blue: 0 },
      clockTimeouts: 0,
      endedOnClock: false,
      log: [`بدأت اللعبة! يبدأ ${room.teamNames[startTeam]} 🍇`],
    };

    store.set(code, next);
    armTurnDeadline(io, code); // sets turnDeadlineAt + schedules if the room's timer is enabled
    void broadcastState(io, code);
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
    cancelTurnDeadline(code); // game reset → no active turn
    void broadcastState(io, code);
  });

  // ── DISCONNECT ──
  socket.on("disconnect", () => {
    for (const [code, room] of [...store.all()]) {
      // Host-mode room is torn down when its host leaves (legacy parity).
      if (room.hostMode && room.hostSocketId === socket.id) {
        cancelTurnDeadline(code);
        store.delete(code);
        continue;
      }

      if (!room.players[socket.id]) continue;

      // Online: keep the seat, mark disconnected, broadcast, and remove only after the grace window.
      const marked: GameState = {
        ...room,
        players: {
          ...room.players,
          [socket.id]: { ...room.players[socket.id]!, disconnected: true },
        },
      };
      store.set(code, marked);
      // Single broadcast: only emit the `marked` state if the turn wasn't passed
      // (passTurnIfStuck broadcasts the advanced state itself → avoids flicker).
      if (!passTurnIfStuck(io, code)) {
        void broadcastState(io, code);
      }

      const removedId = socket.id;
      scheduleRemoval(code, removedId, () => {
        const current = store.get(code);
        if (!current || !current.players[removedId]) return;

        const players = { ...current.players };
        delete players[removedId];

        const teams: Record<Team, string[]> = {
          red: current.teams.red.filter((i) => i !== removedId),
          blue: current.teams.blue.filter((i) => i !== removedId),
        };
        const leaders: Record<Team, string | null> = {
          red: current.leaders.red === removedId ? null : current.leaders.red,
          blue: current.leaders.blue === removedId ? null : current.leaders.blue,
        };

        if (Object.keys(players).length === 0) {
          cancelTurnDeadline(code);
          store.delete(code);
          return;
        }

        store.set(code, { ...current, players, teams, leaders });
        void broadcastState(io, code);
        // A permanent removal that empties the on-turn team must also advance so the
        // game can't soft-lock. No-op if the room was already deleted (store.get guard).
        passTurnIfStuck(io, code);
      });
    }
  });
}
