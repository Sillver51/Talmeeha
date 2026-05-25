"use client";

import ActionRow from "@/components/game/ActionRow";
import Board from "@/components/game/Board";
import CluePanel from "@/components/game/CluePanel";
import Counters from "@/components/game/Counters";
import GameHeader from "@/components/game/GameHeader";
import GameLog from "@/components/game/GameLog";
import HostBar from "@/components/game/HostBar";
import LeaderPanel from "@/components/game/LeaderPanel";
import HandoffGate from "@/components/game/HandoffGate";
import TurnTimer from "@/components/game/TurnTimer";
import CoachMarks from "@/components/onboarding/CoachMarks";
import { hGuesser, hLeader, myRole, myTurn } from "@/lib/ui/roles";
import { useGameStore } from "@/store/gameStore";
import WinModal from "./WinModal";

/**
 * In-game screen (`#s-game`) — composes the game components and ports the
 * role/phase-based visibility from legacy `renderGame` (~1061–1176). Renders the
 * win modal when `phase==='ended'`.
 */
export default function GameScreen() {
  const gs = useGameStore((s) => s.gs);
  const myId = useGameStore((s) => s.myId);
  const isHost = useGameStore((s) => s.isHost);
  const doubtMode = useGameStore((s) => s.doubtMode);
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
  const isLeader = role === "leader";
  const isMyTurn = myTurn(gs, myId);
  const playing = gs.phase === "playing";
  const myTeam = myId ? (gs.players[myId]?.team ?? null) : null;

  const showCpb = isHost && playing;
  const showLP =
    (isHost && !gs.gphase && playing) ||
    (isLeader && isMyTurn && !gs.gphase && playing);
  const showActionRow = !isHost && !isLeader && isMyTurn && gs.gphase && playing;

  const cpbText = gs.gphase
    ? `يخمّن: ${hGuesser(gs)} — انقر الكلمة 🤔`
    : `القائد: ${hLeader(gs)} — أدخل التلميح`;

  return (
    <div className="screen game-on" id="s-game">
      <CoachMarks />
      <GameHeader
        gs={gs}
        role={role}
        myId={myId}
        doubtMode={doubtMode}
        winsRed={winsData.red || 0}
        winsBlue={winsData.blue || 0}
      />

      {playing && gs.turnDeadlineAt != null && (
        <TurnTimer deadlineAt={gs.turnDeadlineAt} durationMs={gs.timer?.durationMs} />
      )}

      {playing && role === "spectator" && (
        <div className="spectator-notice" role="status">
          👁️ أنت تُشاهد — اللعبة جارية. انضمّ إلى فريق في الجولة القادمة.
        </div>
      )}

      {isHost && <HostBar gphase={gs.gphase} />}
      {isHost && !gs.gphase && playing && <HandoffGate gs={gs} />}

      {showCpb && (
        <div
          className="current-player-badge"
          id="current-player-badge"
          style={{ display: "flex" }}
        >
          <span>👤</span>
          <span id="cpb-text">{cpbText}</span>
        </div>
      )}

      <Counters gs={gs} />
      <CluePanel gs={gs} />

      {showLP && <LeaderPanel gs={gs} isHost={isHost} />}
      {showActionRow && <ActionRow />}

      <Board
        gs={gs}
        role={role}
        myId={myId}
        myTeam={myTeam}
        isMyTurn={isMyTurn}
      />
      <GameLog log={gs.log ?? []} />

      {gs.phase === "ended" && <WinModal gs={gs} />}
    </div>
  );
}
