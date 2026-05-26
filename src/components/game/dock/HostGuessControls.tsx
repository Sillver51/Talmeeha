"use client";

import { useGameStore } from "@/store/gameStore";
import { Button } from "@/components/ui/button";

export default function HostGuessControls() {
  const endTurn = useGameStore((s) => s.endTurn);
  return (
    <div className="row" style={{ justifyContent: "center" }}>
      <Button variant="danger" size="default" onClick={endTurn}>
        ⏭ إنهاء الدور
      </Button>
    </div>
  );
}
