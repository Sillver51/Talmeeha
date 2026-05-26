"use client";

import { useEffect, useRef } from "react";
import { useGameStore } from "@/store/gameStore";
import { usePrefsStore } from "@/store/prefsStore";
import { playClueSubmit, playReveal, playTurnHandoff, playWin } from "./events";

/**
 * Mount once at the top of GameScreen. Watches game-store state for ritual
 * transitions and dispatches the matching synthesized sound. All dispatches
 * are no-ops when `prefs.sound` is false.
 *
 * Detected transitions:
 *  - clue went from null -> set            → playClueSubmit
 *  - a board card flipped from rv:false -> rv:true → playReveal(card.t)
 *  - turn flipped (red↔blue) while still playing → playTurnHandoff
 *  - phase entered "ended"                  → playWin(winner)
 *
 * Comparisons run against the previous snapshot held in a ref. The hook is
 * intentionally side-effect-only and renders nothing.
 */
export function useGameSounds(): void {
  const gs = useGameStore((s) => s.gs);
  const sound = usePrefsStore((s) => s.sound);
  const volume = usePrefsStore((s) => s.volume);
  const prev = useRef<typeof gs | null>(null);

  useEffect(() => {
    const before = prev.current;
    prev.current = gs;
    if (!gs) return;
    const settings = { sound, volume };

    // Clue submit
    if (!before?.clue && gs.clue) {
      playClueSubmit(settings);
    }

    // Card reveals — diff the board
    if (before && before.board?.length === gs.board.length) {
      for (let i = 0; i < gs.board.length; i++) {
        const a = before.board[i];
        const b = gs.board[i];
        if (a && b && !a.rv && b.rv && b.t !== "hidden") {
          playReveal(b.t, settings);
        }
      }
    }

    // Turn handoff (only when still playing)
    if (
      before &&
      before.turn !== gs.turn &&
      gs.phase === "playing" &&
      before.phase === "playing"
    ) {
      playTurnHandoff(gs.turn, settings);
    }

    // Game ended
    if (before && before.phase !== "ended" && gs.phase === "ended" && gs.winner) {
      playWin(gs.winner, settings);
    }
  }, [gs, sound, volume]);
}
