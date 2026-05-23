"use client";

import { useEffect, useRef, useState } from "react";
import { useGameStore } from "@/store/gameStore";

/**
 * Toast notification — reads `toastMsg` from the store and shows the legacy
 * `.toast.show` slide-in. The store's `toast()` action clears `toastMsg` after
 * 2.6s; we keep the last message mounted briefly so the slide-out animates
 * instead of snapping to empty.
 */
const HIDE_MS = 2600;

export default function Toast() {
  const toastMsg = useGameStore((s) => s.toastMsg);
  const [text, setText] = useState("");
  const [show, setShow] = useState(false);
  const clearTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!toastMsg) return;
    setText(toastMsg);
    setShow(true);
    if (clearTimer.current) clearTimeout(clearTimer.current);
    clearTimer.current = setTimeout(() => setShow(false), HIDE_MS);
    return () => {
      if (clearTimer.current) clearTimeout(clearTimer.current);
    };
  }, [toastMsg]);

  return (
    <div className={show ? "toast show" : "toast"} role="status" aria-live="polite">
      {text}
    </div>
  );
}
