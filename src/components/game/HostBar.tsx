"use client";

import { useGameStore } from "@/store/gameStore";

/**
 * Host control bar (`.host-bar`) — ports legacy markup (~773–778) + visibility
 * (~1108–1109). Host only: end-turn (during guess phase), toggle "عرض القائد",
 * and a gear that returns to setup. `gphase` toggles the end-turn button.
 */
interface HostBarProps {
  gphase: boolean;
}

export default function HostBar({ gphase }: HostBarProps) {
  const hostViewLeader = useGameStore((s) => s.hostViewLeader);
  const endTurn = useGameStore((s) => s.endTurn);
  const toggleHostView = useGameStore((s) => s.toggleHostView);

  return (
    <div className="host-bar" id="host-bar" style={{ display: "flex" }}>
      <span className="host-bar-label">🎛 تحكم:</span>
      {gphase && (
        <button
          className="btn btn-danger btn-sm"
          id="hb-end-turn"
          onClick={endTurn}
        >
          ⏭ إنهاء الدور
        </button>
      )}
      <button
        className="btn btn-ghost btn-sm"
        id="hb-toggle-view"
        onClick={toggleHostView}
      >
        {hostViewLeader ? "🙈 إخفاء" : "👁 عرض القائد"}
      </button>
      <button
        className="btn btn-ghost btn-sm"
        onClick={() => useGameStore.setState({ clientScreen: "setup" })}
        style={{ marginInlineEnd: "auto" }}
      >
        ⚙ الإعداد
      </button>
    </div>
  );
}
