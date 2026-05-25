// Dependency integrity guard for the Talmeeha dev/build/test workflow.
//
// WHY: this repo lives on a WSL `/mnt/d` (DrvFs) mount where `npm install`
// occasionally extracts a package incompletely — e.g. it once dropped the ESM
// file `node_modules/zod/v3/locales/en.js`, which made `npm run dev` crash with
// a cryptic `ERR_MODULE_NOT_FOUND` before the server could bind. See the project
// memory note "wsl-npm-mnt-d-flakiness".
//
// This script smoke-tests that the critical runtime deps actually resolve, and
// (with --fix) auto-repairs a corrupted install via a clean `npm ci` before the
// dev server boots. It also warns when port 3000 is already taken, because a
// stale dev server silently serves OLD code on this filesystem.
//
// IMPORTANT: this file must run on plain `node` with ZERO project dependencies
// (it has to work even when those deps are the broken thing). Node builtins only.

import net from "node:net";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

// Small, fast-to-import runtime deps that exercise the extraction surface. We
// deliberately avoid heavy packages like `next` here — these are enough to catch
// the partial-extraction corruption without slowing every `npm run dev`.
const CRITICAL_DEPS = [
  "zod",
  "socket.io",
  "socket.io-client",
  "react",
  "react-dom",
  "zustand",
  "clsx",
];

const PORT = Number(process.env.PORT ?? 3000);

// ── Pure helpers (unit-tested) ────────────────────────────────────────────────

/**
 * @param {{ name: string, ok: boolean }[]} results
 * @returns {{ healthy: boolean, failed: string[] }}
 */
export function summarizeDeps(results) {
  const failed = results.filter((r) => !r.ok).map((r) => r.name);
  return { healthy: failed.length === 0, failed };
}

/**
 * @param {string[]} failed
 * @param {{ willFix: boolean }} opts
 * @returns {string}
 */
export function formatBrokenReport(failed, { willFix }) {
  const list = failed.map((n) => `   • ${n}`).join("\n");
  const head =
    "🍇 تلميحة — تثبيت ناقص للحزم (الخطأ المتكرر على /mnt/d تحت WSL).\n" +
    "🍇 Talmeeha — incomplete dependency install detected on the /mnt/d WSL mount.\n" +
    "الحزم المتعطّلة / broken packages:\n" +
    list;
  const tail = willFix
    ? "\n\n🔧 جارٍ الإصلاح تلقائيًا عبر «npm ci» (قد يستغرق بضع دقائق)…"
    : "\n\nلإصلاحها شغّل / to repair, run:  npm ci";
  return `${head}${tail}`;
}

/**
 * @param {number} port
 * @param {number | string | null} pid
 * @returns {string}
 */
export function formatPortInUse(port, pid) {
  const who = pid == null ? `المنفذ ${port} مشغول` : `المنفذ ${port} مشغول (PID ${pid})`;
  const killHint = pid == null ? `kill the process on :${port}` : `kill ${pid}`;
  return (
    `⚠️  ${who} — قد يكون خادم تطوير قديم يخدم نسخة قديمة من الشيفرة.\n` +
    `⚠️  Port ${port} is busy — a stale dev server may be serving OLD code.\n` +
    `   ${killHint}   ثم أعد التشغيل / then restart`
  );
}

// ── I/O (not unit-tested; exercised by the verify step + real `npm run dev`) ───

async function probeDeps(names) {
  const results = [];
  for (const name of names) {
    try {
      await import(name);
      results.push({ name, ok: true });
    } catch {
      results.push({ name, ok: false });
    }
  }
  return results;
}

function portInUse(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once("error", (err) => resolve(err.code === "EADDRINUSE"));
    server.once("listening", () => server.close(() => resolve(false)));
    server.listen(port, "0.0.0.0");
  });
}

/** Best-effort: find the PID listening on `port` via `ss`/`lsof`. */
function pidOnPort(port) {
  for (const cmd of [["ss", ["-ltnpH", `sport = :${port}`]], ["lsof", ["-ti", `:${port}`]]]) {
    const res = spawnSync(cmd[0], cmd[1], { encoding: "utf8" });
    if (res.status === 0 && res.stdout) {
      const m = res.stdout.match(/pid=(\d+)/) ?? res.stdout.trim().match(/^(\d+)/);
      if (m) return Number(m[1]);
    }
  }
  return null;
}

function runNpmCi() {
  const res = spawnSync("npm", ["ci", "--no-audit", "--no-fund"], { stdio: "inherit" });
  return res.status === 0;
}

async function main() {
  const willFix = process.argv.includes("--fix");

  if (await portInUse(PORT)) {
    console.warn(`\n${formatPortInUse(PORT, pidOnPort(PORT))}\n`);
  }

  let { healthy, failed } = summarizeDeps(await probeDeps(CRITICAL_DEPS));
  if (healthy) process.exit(0);

  console.error(`\n${formatBrokenReport(failed, { willFix })}\n`);
  if (!willFix) process.exit(1);

  if (!runNpmCi()) {
    console.error("\n❌ فشل «npm ci». جرّب من صدفة جديدة، أو انقل المشروع خارج /mnt/d.");
    console.error("❌ `npm ci` failed. Try a fresh shell, or move the repo off /mnt/d.\n");
    process.exit(1);
  }

  ({ healthy, failed } = summarizeDeps(await probeDeps(CRITICAL_DEPS)));
  if (!healthy) {
    console.error(`\n❌ ما زالت الحزم متعطّلة بعد الإصلاح / still broken: ${failed.join(", ")}\n`);
    process.exit(1);
  }
  console.log("\n✅ تم إصلاح التثبيت / dependencies repaired.\n");
  process.exit(0);
}

// Only run when invoked directly (so importing the pure helpers in tests is safe).
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  await main();
}
