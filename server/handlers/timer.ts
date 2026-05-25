import type { Server, Socket } from "socket.io";
import type { ClientToServerEvents, GameState, ServerToClientEvents } from "@/lib/types";
import type { TimerConfig } from "@/lib/game";
import { store } from "../rooms";
import { broadcastState } from "../emit";
import { setTimerSchema } from "@/lib/schemas";
import { PRESETS, DEFAULT_TIMER } from "@/lib/game";

export function registerTimerHandlers(
  io: Server<ClientToServerEvents, ServerToClientEvents>,
  socket: Socket<ClientToServerEvents, ServerToClientEvents>,
): void {
  socket.on("set_timer", (payload) => {
    const parsed = setTimerSchema.safeParse(payload);
    if (!parsed.success) {
      socket.emit("error", "طلب غير صالح");
      return;
    }
    const { code, preset } = parsed.data;

    const room = store.get(code);
    if (!room) return;
    // Timer config is locked once the game starts.
    if (room.phase !== "lobby" && room.phase !== "setup") return;

    const isHost = room.hostMode && room.hostSocketId === socket.id;
    const isLeader =
      !room.hostMode && (room.leaders.red === socket.id || room.leaders.blue === socket.id);
    if (!isHost && !isLeader) return;

    const timer: TimerConfig =
      preset === "off"
        ? { ...DEFAULT_TIMER, enabled: false }
        : { enabled: true, preset, durationMs: PRESETS[preset].durationMs };

    const next: GameState = { ...room, timer };
    store.set(code, next);
    void broadcastState(io, code);
  });
}
