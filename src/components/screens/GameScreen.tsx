"use client";

import StatusStrip from "@/components/game/StatusStrip";
import BoardStage from "@/components/game/BoardStage";
import ActionDock from "@/components/game/ActionDock";
import CoachMarks from "@/components/onboarding/CoachMarks";
import GameLog from "@/components/game/GameLog";
import { hLeader, myRole, myTurn } from "@/lib/ui/roles";
import { useGameStore } from "@/store/gameStore";
import WinModal from "./WinModal";

/**
 * In-game screen (`#s-game`) — three-zone stage architecture:
 *   Status Strip (top) · Board Stage (middle) · Action Dock (bottom)
 * Server, store, and game-logic are untouched; this composes the new
 * components defined in src/components/game/*.
 */
export default function GameScreen() {
  const gs = useGameStore((s) => s.gs);
  const myId = useGameStore((s) => s.myId);
  const isHost = useGameStore((s) => s.isHost);
  const winsData = useGameStore((s) => s.winsData);

  if (!gs || !gs.board || !gs.board.length) {
    return (
      <div
        className="screen on"
        style={{ display: "grid", placeItems: "center", minHeight: "60vh" }}
      >
        <div className="muted tc" role="status" aria-live="polite">
          <div style={{ fontSize: "2rem" }} aria-hidden="true">🍇</div>
          جارٍ التحميل…
        </div>
      </div>
    );
  }

  const role = myRole(gs, myId, isHost);
  const isMyTurn = myTurn(gs, myId);
  const myTeam = myId ? (gs.players[myId]?.team ?? null) : null;
  const leaderName = hLeader(gs);
  const leaderInitial = leaderName ? (Array.from(leaderName)[0] ?? null) : null;

  return (
    <div className="screen game-on" id="s-game">
      <CoachMarks />
      <div className="game-zones">
        <StatusStrip
          gs={gs}
          role={role}
          myId={myId}
          isHost={isHost}
          winsRed={winsData.red || 0}
          winsBlue={winsData.blue || 0}
        />
        <BoardStage
          gs={gs}
          role={role}
          myId={myId}
          myTeam={myTeam}
          isMyTurn={isMyTurn}
          leaderInitial={leaderInitial}
        />
        <ActionDock
          gs={gs}
          role={role}
          myId={myId}
          isHost={isHost}
          isMyTurn={isMyTurn}
        />
      </div>
      <GameLog log={gs.log ?? []} />
      {gs.phase === "ended" && <WinModal gs={gs} />}
    </div>
  );
}
