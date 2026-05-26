"use client";

import { useCallback } from "react";
import StatusStrip from "@/components/game/StatusStrip";
import BoardStage from "@/components/game/BoardStage";
import ActionDock from "@/components/game/ActionDock";
import CoachMarks from "@/components/onboarding/CoachMarks";
import GameLog from "@/components/game/GameLog";
import { hLeader, myRole, myTurn } from "@/lib/ui/roles";
import { useGameStore } from "@/store/gameStore";
import { usePrefsStore } from "@/store/prefsStore";
import { ensureEngine, useGameSounds } from "@/lib/audio";
import WinModal from "./WinModal";

/**
 * In-game screen (`#s-game`) — three-zone stage architecture:
 *   Status Strip (top) · Board Stage (middle) · Action Dock (bottom)
 * Server, store, and game-logic are untouched; this composes the new
 * components defined in src/components/game/*. Mounts the audio hook
 * (no-op when prefs.sound is false) and lazy-inits the AudioContext on
 * the first pointer down inside the screen (browser autoplay-policy clean).
 */
export default function GameScreen() {
  const gs = useGameStore((s) => s.gs);
  const myId = useGameStore((s) => s.myId);
  const isHost = useGameStore((s) => s.isHost);
  const winsData = useGameStore((s) => s.winsData);
  const sound = usePrefsStore((s) => s.sound);
  const volume = usePrefsStore((s) => s.volume);

  useGameSounds();
  const handleFirstGesture = useCallback(() => {
    ensureEngine({ sound, volume });
  }, [sound, volume]);

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
    <div
      className="screen game-on"
      id="s-game"
      onPointerDown={handleFirstGesture}
      onKeyDown={handleFirstGesture}
    >
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
