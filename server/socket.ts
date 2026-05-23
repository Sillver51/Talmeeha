import type { Server, Socket } from "socket.io";
import { registerHostHandlers } from "./handlers/host";
import { registerOnlineHandlers } from "./handlers/online";
import { registerTeamHandlers } from "./handlers/teams";
import { registerPlayHandlers } from "./handlers/play";
import { registerLifecycleHandlers } from "./handlers/lifecycle";

export function registerHandlers(io: Server, socket: Socket): void {
  registerHostHandlers(io, socket);
  registerOnlineHandlers(io, socket);
  registerTeamHandlers(io, socket);
  registerPlayHandlers(io, socket);
  registerLifecycleHandlers(io, socket);
}
