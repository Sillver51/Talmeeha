"use client";

import type { PlayerView } from "@/lib/types";

interface OffTurnStripProps {
  gs: PlayerView;
}

export default function OffTurnStrip({ gs }: OffTurnStripProps) {
  const tn = gs.teamNames;
  const text = gs.turn === "red" ? `دور ${tn.red} 🔴` : `دور ${tn.blue} 🔵`;
  return (
    <div className="row" style={{ justifyContent: "center", fontSize: ".7rem", opacity: 0.8 }}>
      {text}
    </div>
  );
}
