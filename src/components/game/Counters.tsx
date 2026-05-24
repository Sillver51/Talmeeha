"use client";

import type { PlayerView } from "@/lib/types";
import TeamGlyph from "@/components/brand/TeamGlyph";

/**
 * Counter pills (`.counters`) — ports legacy markup (~784–790) + render logic
 * (~1085–1096). Remaining red/blue/neutral cards, the turn chip, and a doubt
 * pill shown only when doubts exist.
 */
interface CountersProps {
  gs: PlayerView;
}

export default function Counters({ gs }: CountersProps) {
  const remR = gs.counts.red;
  const remB = gs.counts.blue;
  const remN = gs.counts.neutral;
  const totalDoubts = gs.doubts ? Object.keys(gs.doubts).length : 0;
  const tn = gs.teamNames;

  const ended = gs.phase === "ended";
  const turnChipText = ended
    ? "انتهت"
    : gs.turn === "red"
      ? `🔴 ${tn.red}`
      : `🔵 ${tn.blue}`;
  const turnChipClass = ended
    ? "turn-chip"
    : `turn-chip ${gs.turn === "red" ? "tc-red" : "tc-blue"}`;

  return (
    <div className="counters">
      <div className="counter-pill cp-red">
        <span className="dot dot-red"></span>
        <TeamGlyph team="red" />
        <span id="rem-r">{remR}</span>
      </div>
      <div className="counter-pill cp-blue">
        <span className="dot dot-blue"></span>
        <TeamGlyph team="blue" />
        <span id="rem-b">{remB}</span>
      </div>
      <div className="counter-pill">
        <span className="dot dot-n"></span>
        <span id="rem-n">{remN}</span>
      </div>
      <div className={turnChipClass} id="turn-chip">
        {turnChipText}
      </div>
      {totalDoubts > 0 && (
        <div className="doubt-pill" id="doubt-pill" style={{ display: "flex" }}>
          🤔 <span id="doubt-pill-count">{totalDoubts}</span> مشكوك
        </div>
      )}
    </div>
  );
}
