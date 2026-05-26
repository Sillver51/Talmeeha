"use client";

import { useEffect, useRef, useState } from "react";
import { useGameStore } from "@/store/gameStore";
import { Button } from "@/components/ui/button";

export default function GuesserActions() {
  const doubtMode = useGameStore((s) => s.doubtMode);
  const toggleDoubtMode = useGameStore((s) => s.toggleDoubtMode);
  const endTurn = useGameStore((s) => s.endTurn);
  const [auraKey, setAuraKey] = useState(0);
  const firstRender = useRef(true);

  // Emit a one-shot aura on toggle (skip the very first mount)
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    setAuraKey((k) => k + 1);
  }, [doubtMode]);

  return (
    <>
      {auraKey > 0 ? <div key={auraKey} className="doubt-aura" aria-hidden="true" /> : null}
      <div className="row" style={{ justifyContent: "center" }}>
        <Button
          variant="doubt"
          size="default"
          aria-pressed={doubtMode}
          onClick={toggleDoubtMode}
        >
          {doubtMode ? "✅ وضع الشك" : "🤔 علامة شك"}
        </Button>
        <Button variant="danger" size="default" onClick={endTurn}>
          ⏭ إنهاء الدور
        </Button>
      </div>
      <div className="hint">
        {doubtMode ? "انقر كلمة لوضع علامة شك (لن تخمّن)" : "اختر كلمة من اللوحة للتخمين"}
      </div>
    </>
  );
}
