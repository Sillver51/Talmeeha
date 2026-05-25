"use client";

import { useEffect, useRef, useState } from "react";
import type { PlayerView, Team } from "@/lib/types";
import type { Role } from "@/lib/ui/roles";
import { useGameStore } from "@/store/gameStore";
import WordCard from "./WordCard";

/** Duration of the one-time leader key-glow sweep (kept in sync with the
 *  `keySweep` keyframe in globals.css). */
const KEY_REVEAL_MS = 1000;

/**
 * Board grid — ports legacy `renderGame` board build loop (~1135–1162).
 * Maps `gs.board` to `<WordCard/>`, threading role/turn/doubt context.
 */
interface BoardProps {
  gs: PlayerView;
  role: Role;
  myId: string | null;
  myTeam: Team | null;
  isMyTurn: boolean;
}

export default function Board({ gs, role, myId, myTeam, isMyTurn }: BoardProps) {
  const hostViewLeader = useGameStore((s) => s.hostViewLeader);
  const peeking = useGameStore((s) => s.peeking);
  const doubtMode = useGameStore((s) => s.doubtMode);
  const guessCard = useGameStore((s) => s.guessCard);
  const toggleDoubt = useGameStore((s) => s.toggleDoubt);

  // Host hold-to-peek reveals the key only while the press is active (no persistent secret).
  const effectiveHostView = hostViewLeader || peeking;

  // One-time "you hold the key" sweep: when an online leader first enters the
  // playing phase for a given game, play a brief grape/gold shimmer across the
  // board, then remove it. Transient + client-only (never persisted). It resets
  // when the phase leaves "playing" (new game lobby/ended) so the next game's
  // playing transition can fire it again. Guessers/host never qualify.
  const playing = gs.phase === "playing";
  const isLeader = role === "leader";
  const [keyReveal, setKeyReveal] = useState(false);
  const firedThisGame = useRef(false);

  useEffect(() => {
    if (!playing) {
      // Left the playing phase — arm the trigger for the next game.
      firedThisGame.current = false;
      return;
    }
    if (!isLeader || firedThisGame.current) return;
    firedThisGame.current = true;
    setKeyReveal(true);
    const t = setTimeout(() => setKeyReveal(false), KEY_REVEAL_MS);
    return () => clearTimeout(t);
  }, [playing, isLeader]);

  return (
    <div className={keyReveal ? "board key-reveal" : "board"} id="board">
      {gs.board.map((card, i) => (
        <WordCard
          key={i}
          card={card}
          index={i}
          role={role}
          myId={myId}
          myTeam={myTeam}
          isMyTurn={isMyTurn}
          gphase={gs.gphase}
          phase={gs.phase}
          hostViewLeader={effectiveHostView}
          doubtMode={doubtMode}
          doubts={gs.doubts?.[i]}
          onGuess={guessCard}
          onToggleDoubt={toggleDoubt}
        />
      ))}
    </div>
  );
}
