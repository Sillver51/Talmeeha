"use client";

import { useEffect } from "react";

/**
 * Registers the PWA service worker in PRODUCTION only.
 *
 * A caching service worker is actively harmful in development: `public/sw.js` is
 * cache-first for `/_next/static/`, and dev chunk URLs are STABLE (not
 * content-hashed), so the worker pins the first CSS/JS it sees and serves it
 * forever — edits (and shadcn/Tailwind styling) silently stop appearing, which
 * looks exactly like "the design system is broken". In dev we therefore actively
 * unregister any previously installed worker and clear its caches so existing
 * browsers self-heal. (In production, asset URLs are content-hashed, so
 * cache-first is safe and the PWA works normally.)
 */
export default function PwaRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    if (process.env.NODE_ENV === "production") {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // registration failures are non-fatal
      });
      return;
    }

    // Development: tear down any SW + caches so dev never serves stale assets.
    navigator.serviceWorker
      .getRegistrations()
      .then((regs) => Promise.all(regs.map((r) => r.unregister())))
      .catch(() => {});
    if (typeof caches !== "undefined") {
      caches
        .keys()
        .then((keys) => Promise.all(keys.map((k) => caches.delete(k))))
        .catch(() => {});
    }
  }, []);
  return null;
}
