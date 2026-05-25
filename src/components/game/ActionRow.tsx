"use client";

import { useGameStore } from "@/store/gameStore";

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
      <button className="btn btn-ghost btn-sm" onClick={endTurn}>
        ⏭ إنهاء الدور
      </button>
      <button
        className={doubtMode ? "btn btn-doubt-active btn-sm" : "btn btn-doubt btn-sm"}
        id="doubt-btn"
        onClick={toggleDoubtMode}
      >
        {doubtMode ? "✅ وضع الشك — انقر على كلمة للتشكيك" : "🤔 علامة شك"}
      </button>
    </div>
  );
}
