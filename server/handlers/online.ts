import type { Server, Socket } from "socket.io";
import type { ClientToServerEvents, GameState, ServerToClientEvents } from "@/lib/types";
import { store } from "../rooms";
import { createOnlineSchema, joinOnlineSchema } from "@/lib/schemas";

// Ports legacy `create_online` (server.js:115-130) and `join_online` (server.js:133-142).
export function registerOnlineHandlers(
  io: Server<ClientToServerEvents, ServerToClientEvents>,
  socket: Socket<ClientToServerEvents, ServerToClientEvents>,
): void {
  socket.on("create_online", (payload) => {
    const parsed = createOnlineSchema.safeParse(payload);
    if (!parsed.success) {
      socket.emit("error", "الاسم غير صالح");
      return;
    }
    const { name } = parsed.data;

    const code = store.genCode();
    const room: GameState = {
      code,
      phase: "lobby",
      hostMode: false,
      players: { [socket.id]: { id: socket.id, name, team: null } },
      teams: { red: [], blue: [] },
      leaders: { red: null, blue: null },
      teamNames: { red: "الفريق الأحمر", blue: "الفريق الأزرق" },
      board: [],
      turn: "red",
      clue: null,
      gleft: 0,
      gphase: false,
      winner: null,
      doubts: {},
      wins: { red: 0, blue: 0 },
      log: ["تم إنشاء الغرفة! 🍇"],
      sRed: 0,
      sBlue: 0,
    };

    store.set(code, room);
    socket.join(code);
    socket.emit("joined", { code, myId: socket.id, isHost: false });
    io.to(code).emit("state", room);
  });

  socket.on("join_online", (payload) => {
    const parsed = joinOnlineSchema.safeParse(payload);
    if (!parsed.success) {
      socket.emit("error", "بيانات الانضمام غير صالحة");
      return;
    }
    const { code, name } = parsed.data;

    const room = store.get(code);
    if (!room) {
      socket.emit("error", "الغرفة غير موجودة");
      return;
    }

    const next: GameState = room.players[socket.id]
      ? room
      : {
          ...room,
          players: { ...room.players, [socket.id]: { id: socket.id, name, team: null } },
        };

    store.set(code, next);
    socket.join(code);
    socket.emit("joined", { code, myId: socket.id, isHost: false });
    io.to(code).emit("state", next);
  });
}
