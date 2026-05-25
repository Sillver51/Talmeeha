"use client";

import type { PlayerView, Team } from "@/lib/types";
import type { Role } from "@/lib/ui/roles";
import { useGameStore } from "@/store/gameStore";
import WordCard from "./WordCard";

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

  return (
    <div className="board" id="board">
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
