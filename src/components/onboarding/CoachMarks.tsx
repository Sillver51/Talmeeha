"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePrefsStore } from "@/store/prefsStore";
import { formatDigits } from "@/lib/i18n/digits";
import { Button } from "@/components/ui/button";

const SEEN_KEY = "talmeeha_coached";

const TIPS = [
  "القائد يكتب تلميحة (كلمة واحدة) + رقم عدد الكلمات المقصودة.",
  "بقية الفريق يضغطون على الكلمة التي يظنّونها لهم.",
  "تُكشف الكلمة بلونها: لونكم = استمروا، غيره = ينتهي دوركم. احذروا القاتل ☠️!",
] as const;

/** Three sequential tips shown once during the first in-game session. */
export default function CoachMarks() {
  const [show, setShow] = useState(false);
  const [step, setStep] = useState(0);
  const nextRef = useRef<HTMLButtonElement>(null);
  const digits = usePrefsStore((s) => s.digits);

  useEffect(() => {
    try {
      if (!window.localStorage.getItem(SEEN_KEY)) setShow(true);
    } catch {
      // ignore
    }
  }, []);

  const finish = useCallback(() => {
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
    nextRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") finish();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [show, finish]);

  if (!show) return null;

  const isLast = step === TIPS.length - 1;

  return (
    <div className="coach-wrap" role="dialog" aria-modal="true" aria-label="كيف تلعب">
      <div className="coach-card">
        <div className="coach-step">
          {formatDigits(String(step + 1), digits)} / {formatDigits(String(TIPS.length), digits)}
        </div>
        <p className="coach-text">{TIPS[step]}</p>
        <div className="coach-actions">
          <Button variant="ghost" size="sm" onClick={finish}>
            تخطّي
          </Button>
          <Button
            ref={nextRef}
            variant="gold"
            size="sm"
            onClick={() => (isLast ? finish() : setStep((s) => s + 1))}
          >
            {isLast ? "فهمت 🍇" : <>التالي <bdi>←</bdi></>}
          </Button>
        </div>
      </div>
    </div>
  );
}
