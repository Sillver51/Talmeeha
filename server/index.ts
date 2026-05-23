import { createServer } from "node:http";
import next from "next";
import { Server } from "socket.io";
import { registerHandlers } from "./socket";
import type { ClientToServerEvents, ServerToClientEvents } from "@/lib/types";

const dev = process.env.NODE_ENV !== "production";
const port = Number(process.env.PORT ?? 3000);
const app = next({ dev });
const handle = app.getRequestHandler();

await app.prepare();
const httpServer = createServer((req, res) => {
  if (req.url === "/healthz") { res.statusCode = 200; res.end("ok"); return; }
  handle(req, res);
});

const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
  cors: { origin: dev ? "*" : false },
});
io.on("connection", (socket) => registerHandlers(io, socket));

httpServer.listen(port, () => console.log(`🍇 تلميحة على المنفذ ${port}`));
