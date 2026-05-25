import type { Server } from "socket.io";
import type { ClientToServerEvents, ServerToClientEvents } from "@/lib/types";
import { projectStateFor } from "@/lib/game";
import { store } from "./rooms";

/**
 * Emit the role-filtered PlayerView to every socket in a room. Replaces the legacy
 * single `io.to(code).emit("state", room)` broadcast: each connected socket receives a
 * view projected for its own id (playerId === socket.id throughout this app), so guessers
 * never receive an unrevealed card's true type. Reads the freshest room from the store.
 */
export async function broadcastState(
  io: Server<ClientToServerEvents, ServerToClientEvents>,
  code: string,
): Promise<void> {
  const room = store.get(code);
  if (!room) return;
  const sockets = await io.in(code).fetchSockets();
  for (const s of sockets) {
    s.emit("state", projectStateFor(room, s.id));
  }
}
