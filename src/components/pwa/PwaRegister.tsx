"use client";

import { useEffect } from "react";

/** Registers the service worker once on the client (production-safe; no-op if unsupported). */
export default function PwaRegister() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // registration failures are non-fatal
      });
    }
  }, []);
  return null;
}
