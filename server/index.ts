import { createServer } from "node:http";
import { createRequire } from "node:module";
import next from "next";
import { Server } from "socket.io";
import { registerHandlers } from "./socket";
import type { ClientToServerEvents, ServerToClientEvents } from "@/lib/types";

const dev = process.env.NODE_ENV !== "production";
const port = Number(process.env.PORT ?? 3000);
const nextVersion = (createRequire(import.meta.url)("next/package.json") as { version: string })
  .version;

const app = next({ dev });
const handle = app.getRequestHandler();

// A custom (programmatic) server does NOT print Next's CLI banner and compiles
// lazily, so without these logs there's a silent gap during prepare that looks
// like a hang — especially the slow first compile on the WSL /mnt mount. Announce
// each stage so `npm run dev` gives the same "starting → ready" feedback as the
// default `next dev`, while still hosting Socket.io on the same HTTP server.
const startedAt = Date.now();
console.log(`\n▲ Next.js ${nextVersion} — وضع ${dev ? "التطوير" : "الإنتاج"}`);
console.log("🍇 تلميحة — جارٍ التجهيز… (قد يستغرق لحظات على /mnt)\n");

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
  const readyIn = ((Date.now() - startedAt) / 1000).toFixed(1);
  console.log(`🍇 تلميحة جاهزة في ${readyIn}s · المنفذ ${port}`);
  console.log(`   ▲ http://localhost:${port}`);
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
