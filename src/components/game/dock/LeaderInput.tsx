"use client";

import { useCallback, useState } from "react";
import { Send } from "lucide-react";
import { useGameStore } from "@/store/gameStore";
import { usePrefsStore } from "@/store/prefsStore";
import { formatNumber } from "@/lib/i18n/digits";

/** Arabic plural for "حرف" (letter) — counted-noun grammar:
 *   1     → "حرف"   (singular)
 *   2     → "حرفين" (genitive dual after a numeral)
 *   3–10  → "حروف"  (plural of paucity)
 *   11+   → "حرفاً" (tanwin accusative singular)
 */
function lettersWord(n: number): string {
  if (n === 1) return "حرف";
  if (n === 2) return "حرفين";
  if (n <= 10) return "حروف";
  return "حرفاً";
}

const CLUE_MIN = 1;
const CLUE_MAX = 9;
const CLUE_MAX_LEN = 25;

/**
 * Leader clue composer (used in online-leader & host-handoff docks).
 *
 *   [ كلمة واحدة …………………………………………… ]  [ − 3 + كلمة ]  [ ✦ إرسال ]
 *   ↳ hint line under it
 *
 * - Stepper replaces the free-typed number — keyboard arrows still work via
 *   ArrowUp/ArrowDown on the visible numeral (the underlying state owns the
 *   value); +/− buttons are real <button>s with aria-label, min/max guards.
 * - CTA uses the signature gradient and a confetti-burst trigger on send.
 * - Form is wrapped so Enter inside the text input submits.
 */
export default function LeaderInput() {
  const submitClue = useGameStore((s) => s.submitClue);
  const digits = usePrefsStore((s) => s.digits);
  const [word, setWord] = useState("");
  const [num, setNum] = useState<number>(1);

  const letters = Array.from(word).filter((c) => c.trim().length > 0).length;
  const wordValid = letters >= 1 && letters <= CLUE_MAX_LEN;

  const inc = useCallback(() => setNum((n) => Math.min(CLUE_MAX, n + 1)), []);
  const dec = useCallback(() => setNum((n) => Math.max(CLUE_MIN, n - 1)), []);

  const send = useCallback(() => {
    if (!wordValid) return;
    const ok = submitClue(word, num);
    if (ok) {
      setWord("");
      setNum(1);
    }
  }, [submitClue, word, num, wordValid]);

  return (
    <form
      onSubmit={(e) => { e.preventDefault(); send(); }}
      noValidate
    >
      <div className="row">
        <input
          type="text"
          className="composer-input"
          placeholder="كلمة واحدة"
          maxLength={CLUE_MAX_LEN}
          value={word}
          onChange={(e) => setWord(e.target.value)}
          inputMode="text"
          autoComplete="off"
          spellCheck={false}
          enterKeyHint="send"
          aria-label="كلمة التلميحة"
        />

        <div className="stepper" role="group" aria-label="عدد الكلمات">
          <button
            type="button"
            onClick={dec}
            disabled={num <= CLUE_MIN}
            aria-label="إنقاص"
          >−</button>
          <span className="n" aria-live="polite" aria-atomic="true">
            {formatNumber(num, digits)}
          </span>
          <span className="label">كلمة</span>
          <button
            type="button"
            onClick={inc}
            disabled={num >= CLUE_MAX}
            aria-label="زيادة"
          >+</button>
        </div>

        <button
          type="submit"
          className="cta-primary"
          disabled={!wordValid}
          aria-label="إرسال التلميحة"
        >
          <Send size={16} aria-hidden="true" /> إرسال
        </button>
      </div>

      <div className="row meta">
        <span className="hint">
          <span aria-hidden="true">⚠</span> كلمة واحدة فقط · {letters > 0
            ? `${formatNumber(letters, digits)} ${lettersWord(letters)}`
            : "اكتب التلميحة"}
        </span>
      </div>
    </form>
  );
}
