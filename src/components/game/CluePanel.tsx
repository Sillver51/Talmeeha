"use client";

import type { GameState } from "@/lib/types";

/**
 * Clue panel (`.clue-panel`) — ports legacy markup (~792–796) + render logic
 * (~1119–1125). Shows the clue word (big gradient) + number circle and the
 * "تبقّى N تخمينات" guesses-left line during the guess phase; otherwise the
 * "في انتظار القائد..." waiting state.
 */
interface CluePanelProps {
  gs: GameState;
}

export default function CluePanel({ gs }: CluePanelProps) {
  return (
    <div className="clue-panel">
      <span className="clue-label-sm">التلميح:</span>
      {gs.clue ? (
        <span id="clue-display">
          <span className="clue-word-big">{gs.clue.w}</span>
          &nbsp;
          <span className="clue-num-circle">{gs.clue.n}</span>
        </span>
      ) : (
        <span className="clue-wait" id="clue-display">
          في انتظار القائد...
        </span>
      )}
      <span className="guesses-left" id="g-left">
        {gs.clue && gs.gphase ? `تبقّى ${gs.gleft} تخمينات` : ""}
      </span>
    </div>
  );
}
