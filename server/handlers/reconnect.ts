import type { Server, Socket } from "socket.io";
import type {
  ClientToServerEvents,
  GameState,
  Player,
  ServerToClientEvents,
  Team,
} from "@/lib/types";
import { store } from "../rooms";
import { rejoinSchema } from "@/lib/schemas";
import { broadcastState } from "../emit";
import { cancelRemoval } from "../presence";

// Restores a player after a reconnect: remaps the old playerId → the new socket id,
// preserving team + leadership. If the grace window already expired (seat gone), the
// player is re-added fresh (online, no team).
export function registerReconnectHandlers(
  io: Server<ClientToServerEvents, ServerToClientEvents>,
  socket: Socket<ClientToServerEvents, ServerToClientEvents>,
): void {
  socket.on("rejoin", (payload) => {
    const parsed = rejoinSchema.safeParse(payload);
    if (!parsed.success) {
      socket.emit("error", "تعذّر إعادة الاتصال");
      return;
    }
    const { code, playerId, name } = parsed.data;

    const room = store.get(code);
    if (!room) {
      socket.emit("error", "الغرفة غير موجودة");
      return;
    }

    const old = room.players[playerId];
    // Security: a seat may only be reclaimed while its player is in the disconnected grace
    // window. An active (connected) seat must never be hijackable by another client that
    // learned the playerId from the shared room state (socket ids travel in the projected view).
    if (old && !old.disconnected) {
      socket.emit("error", "المقعد مشغول");
      return;
    }

    cancelRemoval(code, playerId);
    const newId = socket.id;

    let players: Record<string, Player>;
    let teams: Record<Team, string[]>;
    let leaders: Record<Team, string | null>;
    let hostSocketId = room.hostSocketId;

    if (old) {
      players = { ...room.players };
      delete players[playerId];
      players[newId] = { ...old, id: newId, disconnected: false };
      teams = {
        red: room.teams.red.map((i) => (i === playerId ? newId : i)),
        blue: room.teams.blue.map((i) => (i === playerId ? newId : i)),
      };
      leaders = {
        red: room.leaders.red === playerId ? newId : room.leaders.red,
        blue: room.leaders.blue === playerId ? newId : room.leaders.blue,
      };
      if (room.hostMode && room.hostSocketId === playerId) hostSocketId = newId;
    } else {
      players = { ...room.players, [newId]: { id: newId, name, team: null } };
      teams = room.teams;
      leaders = room.leaders;
    }

    const next: GameState = { ...room, players, teams, leaders, hostSocketId };
    store.set(code, next);
    socket.join(code);
    const isHost = Boolean(next.hostMode && next.hostSocketId === newId);
    socket.emit("joined", { code, myId: newId, isHost });
    void broadcastState(io, code);
  });
}
