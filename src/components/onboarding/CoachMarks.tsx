"use client";

import { useEffect, useState } from "react";

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

  useEffect(() => {
    try {
      if (!window.localStorage.getItem(SEEN_KEY)) setShow(true);
    } catch {
      // ignore
    }
  }, []);

  if (!show) return null;

  const finish = () => {
    try {
      window.localStorage.setItem(SEEN_KEY, "1");
    } catch {
      // ignore
    }
    setShow(false);
  };

  const isLast = step === TIPS.length - 1;

  return (
    <div className="coach-wrap" role="dialog" aria-modal="true" aria-label="كيف تلعب">
      <div className="coach-card">
        <div className="coach-step">{step + 1} / {TIPS.length}</div>
        <p className="coach-text">{TIPS[step]}</p>
        <div className="coach-actions">
          <button className="btn btn-ghost btn-sm" onClick={finish}>
            تخطّي
          </button>
          <button
            className="btn btn-gold btn-sm"
            onClick={() => (isLast ? finish() : setStep((s) => s + 1))}
          >
            {isLast ? "فهمت 🍇" : "التالي ←"}
          </button>
        </div>
      </div>
    </div>
  );
}
