import type { Server, Socket } from "socket.io";
import type { ClientToServerEvents, ServerToClientEvents } from "@/lib/types";
import { registerHostHandlers } from "./handlers/host";
import { registerOnlineHandlers } from "./handlers/online";
import { registerTeamHandlers } from "./handlers/teams";
import { registerPlayHandlers } from "./handlers/play";
import { registerLifecycleHandlers } from "./handlers/lifecycle";
import { registerReconnectHandlers } from "./handlers/reconnect";

export function registerHandlers(
  io: Server<ClientToServerEvents, ServerToClientEvents>,
  socket: Socket<ClientToServerEvents, ServerToClientEvents>,
): void {
  registerHostHandlers(io, socket);
  registerOnlineHandlers(io, socket);
  registerReconnectHandlers(io, socket);
  registerTeamHandlers(io, socket);
  registerPlayHandlers(io, socket);
  registerLifecycleHandlers(io, socket);
}
