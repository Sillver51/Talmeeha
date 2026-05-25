"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";

const SEEN_KEY = "talmeeha_onboarded";

/** One-time first-run splash: mascot + value prop + a single CTA. Shown until dismissed. */
export default function Onboarding() {
  const [show, setShow] = useState(false);
  const ctaRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    try {
      if (!window.localStorage.getItem(SEEN_KEY)) setShow(true);
    } catch {
      // ignore private-mode errors — just don't show
    }
  }, []);

  const dismiss = useCallback(() => {
    try {
      window.localStorage.setItem(SEEN_KEY, "1");
    } catch {
      // ignore
    }
    setShow(false);
  }, []);

  // Move focus into the dialog and allow Escape to dismiss it.
  useEffect(() => {
    if (!show) return;
    ctaRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") dismiss();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [show, dismiss]);

  if (!show) return null;

  return (
    <div className="onboard-wrap" role="dialog" aria-modal="true" aria-label="مرحباً بك في تلميحة">
      <div className="onboard-card">
        <div className="grape-emoji" aria-hidden="true">🍇</div>
        <div className="onboard-title">تلميحة</div>
        <p className="onboard-lead">
          لعبة الفرق والكلمات — القائد يعطي تلميحة، والفريق يخمّن. أول فريق يكشف كلماته يفوز.
        </p>
        <Button ref={ctaRef} variant="gold" className="w-full" onClick={dismiss}>
          العب الآن <bdi>←</bdi>
        </Button>
      </div>
    </div>
  );
}
