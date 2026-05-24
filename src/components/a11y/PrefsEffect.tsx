"use client";

import { useEffect } from "react";
import { usePrefsStore } from "@/store/prefsStore";

/** Hydrates persisted prefs and applies them to <html> on first client mount. */
export default function PrefsEffect() {
  const hydrate = usePrefsStore((s) => s.hydrate);
  useEffect(() => {
    hydrate();
  }, [hydrate]);
  return null;
}
