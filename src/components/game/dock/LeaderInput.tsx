"use client";

import { useState } from "react";
import { useGameStore } from "@/store/gameStore";
import { Button } from "@/components/ui/button";

export default function LeaderInput() {
  const submitClue = useGameStore((s) => s.submitClue);
  const [word, setWord] = useState("");
  const [num, setNum] = useState("1");
  const [fire, setFire] = useState(0);

  const send = () => {
    const n = parseInt(num, 10);
    const ok = submitClue(word, Number.isNaN(n) ? 0 : n);
    if (ok) {
      setWord("");
      setNum("1");
      setFire((k) => k + 1);
    }
  };

  const letters = Array.from(word).filter((c) => c.trim().length > 0).length;

  return (
    <>
      <div className="row">
        <input
          type="text"
          placeholder="كلمة واحدة"
          maxLength={25}
          value={word}
          onChange={(e) => setWord(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") send(); }}
          style={{ flex: 1 }}
        />
        <input
          type="number"
          min={1}
          max={9}
          value={num}
          onChange={(e) => setNum(e.target.value)}
        />
        <Button
          key={fire}
          variant="gold"
          size="default"
          className={fire > 0 ? "cta-spark fire" : "cta-spark"}
          onClick={send}
        >
          إرسال ✨
        </Button>
      </div>
      <div className="hint">⚠ كلمة واحدة فقط · {letters > 0 ? `${letters} حروف` : "اكتب التلميحة"}</div>
    </>
  );
}
