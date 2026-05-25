"use client";

import { useGameStore } from "@/store/gameStore";
import { Button } from "@/components/ui/button";

/**
 * Guesser action row (`.action-row`) — ports legacy markup (~808–811) +
 * visibility (~1133) + the doubt-mode toggle label logic (~981–986). Shown to
 * an online guesser on turn during the guess phase: end-turn + doubt-mode
 * toggle.
 */
export default function ActionRow() {
  const doubtMode = useGameStore((s) => s.doubtMode);
  const endTurn = useGameStore((s) => s.endTurn);
  const toggleDoubtMode = useGameStore((s) => s.toggleDoubtMode);

  return (
    <div className="action-row" id="action-row" style={{ display: "flex" }}>
      <Button variant="ghost" size="sm" onClick={endTurn}>
        ⏭ إنهاء الدور
      </Button>
      <Button
        variant="doubt"
        size="sm"
        aria-pressed={doubtMode}
        id="doubt-btn"
        onClick={toggleDoubtMode}
      >
        {doubtMode ? "✅ وضع الشك — انقر على كلمة للتشكيك" : "🤔 علامة شك"}
      </Button>
    </div>
  );
}
