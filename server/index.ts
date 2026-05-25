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

httpServer.listen(port, () => {
  const mode = dev ? "التطوير" : "الإنتاج";
  console.log(`\n🍇 تلميحة جاهزة — وضع ${mode} · المنفذ ${port}`);
  console.log(`   http://localhost:${port}`);
  // On the WSL /mnt mount inotify is unreliable, so file watchers often miss
  // server edits — remind the developer to restart rather than chase stale code.
  if (dev && process.cwd().startsWith("/mnt/")) {
    console.log(
      "   ⓘ على /mnt: إعادة التحميل التلقائي قد لا تعمل — أعد تشغيل npm run dev بعد تعديل ملفات الخادم.\n",
    );
  } else {
    console.log("");
  }
});

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
