import type { Server, Socket } from "socket.io";
import type { GameState } from "@/lib/types";
import { store } from "../rooms";
import {
  submitClueSchema,
  guessCardSchema,
  toggleDoubtSchema,
  endTurnSchema,
} from "@/lib/schemas";
import { submitClue, resolveGuess, toggleDoubt, nextTurn } from "@/lib/game";
import { hLeader, hGuesser, rotateGuesser } from "./hostNames";

// Ports the four play events from server.js (submit_clue 189-203, guess_card 206-248,
// toggle_doubt 251-261, end_turn 264-273). Handlers stay thin: validate → authorize →
// call a pure engine function → store → broadcast.
export function registerPlayHandlers(io: Server, socket: Socket): void {
  // ── SUBMIT CLUE ──
  socket.on("submit_clue", (payload) => {
    const parsed = submitClueSchema.safeParse(payload);
    if (!parsed.success) {
      socket.emit("error", "تلميح غير صالح");
      return;
    }
    const { code, word, num } = parsed.data;

    const room = store.get(code);
    if (!room || room.phase !== "playing" || room.gphase) return;

    const isHostLeader = room.hostMode && room.hostSocketId === socket.id;
    const isOnlineLeader = !room.hostMode && room.leaders[room.turn] === socket.id;
    if (!isHostLeader && !isOnlineLeader) return;

    // Legacy: don't allow a clue that matches a still-live board word.
    if (room.board.some((c) => c.w === word && !c.rv)) return;

    const by = room.hostMode ? hLeader(room) : (room.players[socket.id]?.name ?? "القائد");
    const next = submitClue(room, word, num, by);

    store.set(code, next);
    io.to(code).emit("state", next);
  });

  // ── GUESS CARD ──
  socket.on("guess_card", (payload) => {
    const parsed = guessCardSchema.safeParse(payload);
    if (!parsed.success) {
      socket.emit("error", "محاولة غير صالحة");
      return;
    }
    const { code, index } = parsed.data;

    const room = store.get(code);
    if (!room || room.phase !== "playing" || !room.gphase || room.gleft <= 0) return;

    const card = room.board[index];
    if (!card || card.rv) return;

    const isHostGuess = room.hostMode && room.hostSocketId === socket.id;
    const playerTeam = room.players[socket.id]?.team;
    const isOnlineGuesser =
      !room.hostMode && playerTeam === room.turn && room.leaders[room.turn] !== socket.id;
    if (!isHostGuess && !isOnlineGuesser) return;

    const by = room.hostMode ? hGuesser(room) : (room.players[socket.id]?.name ?? "اللاعب");
    const wasTurn = room.turn;
    const { state: resolved, outcome } = resolveGuess(room, index, by);

    // Host-mode: rotate the on-turn team's guesser when they miss (legacy gIdx++ on miss),
    // before the turn flips. resolveGuess already flipped the turn, so apply rotation to the
    // team that just guessed (wasTurn).
    let next: GameState = resolved;
    if (outcome === "miss" && room.hostMode) {
      next = rotateGuesserOnTeam(resolved, wasTurn);
    }

    store.set(code, next);
    io.to(code).emit("state", next);
  });

  // ── TOGGLE DOUBT ──
  socket.on("toggle_doubt", (payload) => {
    const parsed = toggleDoubtSchema.safeParse(payload);
    if (!parsed.success) {
      socket.emit("error", "طلب غير صالح");
      return;
    }
    const { code, index } = parsed.data;

    const room = store.get(code);
    if (!room || !room.gphase) return;

    const key = room.hostMode ? "host" : socket.id;
    const next = toggleDoubt(room, index, key);

    store.set(code, next);
    io.to(code).emit("state", next);
  });

  // ── END TURN ──
  socket.on("end_turn", (payload) => {
    const parsed = endTurnSchema.safeParse(payload);
    if (!parsed.success) {
      socket.emit("error", "طلب غير صالح");
      return;
    }
    const { code } = parsed.data;

    const room = store.get(code);
    if (!room || room.phase !== "playing") return;

    const isHost = room.hostMode && room.hostSocketId === socket.id;
    const isGuesser =
      !room.hostMode &&
      room.players[socket.id]?.team === room.turn &&
      room.leaders[room.turn] !== socket.id;
    if (!isHost && !isGuesser) return;

    const next = nextTurn({ ...room, log: ["⏭ انتهى الدور", ...room.log] });

    store.set(code, next);
    io.to(code).emit("state", next);
  });
}

// Rotate a specific team's gIdx (used after the turn has already flipped).
function rotateGuesserOnTeam(room: GameState, team: GameState["turn"]): GameState {
  // Temporarily view `team` as the current turn so rotateGuesser advances the right roster.
  const rotated = rotateGuesser({ ...room, turn: team });
  return { ...rotated, turn: room.turn };
}
