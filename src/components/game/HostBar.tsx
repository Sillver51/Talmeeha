"use client";

import { useGameStore } from "@/store/gameStore";
import { Button } from "@/components/ui/button";

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
        <Button
          variant="danger"
          size="sm"
          id="hb-end-turn"
          onClick={endTurn}
        >
          ⏭ إنهاء الدور
        </Button>
      )}
      <Button
        variant="ghost"
        size="sm"
        id="hb-toggle-view"
        onClick={toggleHostView}
      >
        {hostViewLeader ? "🙈 إخفاء" : "👁 عرض القائد"}
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => useGameStore.setState({ clientScreen: "setup" })}
        style={{ marginInlineEnd: "auto" }}
      >
        ⚙ الإعداد
      </Button>
    </div>
  );
}
