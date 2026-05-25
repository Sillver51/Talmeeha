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

// Graceful shutdown: drain Socket.io and the HTTP server before exiting so that
// rolling deploys (Railway/Render send SIGTERM) close connections cleanly.
let shuttingDown = false;
function shutdown(signal: NodeJS.Signals): void {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`↘️  ${signal} — إيقاف تدريجي…`);
  io.close(() => {
    httpServer.close(() => {
      console.log("✅ تم الإغلاق");
      process.exit(0);
    });
  });
}
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
