"use client";

import { useGameStore } from "@/store/gameStore";
import { Button } from "@/components/ui/button";

export default function EndedActions() {
  const restart = useGameStore((s) => s.restart);
  return (
    <div className="row" style={{ justifyContent: "center" }}>
      <Button variant="gold" size="default" onClick={restart}>
        🔁 لعبة جديدة
      </Button>
    </div>
  );
}
