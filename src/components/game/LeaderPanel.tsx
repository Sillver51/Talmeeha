"use client";

import { useState } from "react";
import type { GameState } from "@/lib/types";
import { hLeader } from "@/lib/ui/roles";
import { useGameStore } from "@/store/gameStore";

/**
 * Leader clue form (`.leader-panel`) — ports legacy markup (~798–806) +
 * visibility/title logic (~1127–1132). Visible to the on-turn leader pre-clue,
 * or to the host pre-clue. Word + number inputs feed `submitClue` (validation
 * lives in the store). Resets inputs on a successful submit (mirrors legacy
 * clearing of `#ci-word`/`#ci-num`).
 */
interface LeaderPanelProps {
  gs: GameState;
  isHost: boolean;
}

export default function LeaderPanel({ gs, isHost }: LeaderPanelProps) {
  const submitClue = useGameStore((s) => s.submitClue);
  const [word, setWord] = useState("");
  const [num, setNum] = useState("1");

  const title = isHost
    ? `🎯 القائد ${hLeader(gs)} — أدخل التلميح`
    : "🎯 القائد — أدخل التلميح";

  const send = () => {
    const before = useGameStore.getState().toastMsg;
    const n = parseInt(num, 10);
    submitClue(word, Number.isNaN(n) ? 0 : n);
    // Clear only when the emit was valid (no new validation toast surfaced).
    if (useGameStore.getState().toastMsg === before) {
      setWord("");
      setNum("1");
    }
  };

  return (
    <div className="leader-panel" id="leader-panel" style={{ display: "block" }}>
      <div className="leader-panel-title" id="leader-panel-title">
        {title}
      </div>
      <div className="clue-form">
        <input
          type="text"
          id="ci-word"
          placeholder="كلمة واحدة"
          maxLength={25}
          value={word}
          onChange={(e) => setWord(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") send();
          }}
        />
        <input
          type="number"
          id="ci-num"
          min={1}
          max={9}
          value={num}
          onChange={(e) => setNum(e.target.value)}
        />
        <button className="btn btn-gold btn-sm" onClick={send}>
          إرسال
        </button>
      </div>
      <div
        className="muted"
        style={{ marginTop: ".24rem", fontSize: ".66rem" }}
      >
        ⚠ كلمة واحدة فقط — لا تذكر كلمات اللوحة
      </div>
    </div>
  );
}
