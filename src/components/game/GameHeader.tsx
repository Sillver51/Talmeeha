"use client";

import type { PlayerView } from "@/lib/types";
import { hGuesser, hLeader, type Role } from "@/lib/ui/roles";
import TeamGlyph from "@/components/brand/TeamGlyph";

/**
 * Game header (`.g-header`) — ports legacy markup (~759–771) + the score/wins/
 * turn-box render logic (~1070–1106). Red score / turn-box / blue score, team
 * names, per-team wins badges, and a role/phase-dependent turn-box message.
 */
interface GameHeaderProps {
  gs: PlayerView;
  role: Role;
  myId: string | null;
  doubtMode: boolean;
  winsRed: number;
  winsBlue: number;
}

/** Ports the turn-box text + class logic (legacy ~1098–1106). */
function turnBox(
  gs: PlayerView,
  role: Role,
  myId: string | null,
  doubtMode: boolean,
): { text: string; className: string } {
  const turn = gs.turn;
  const tn = gs.teamNames;

  if (gs.phase === "ended") {
    return { text: "🏁 انتهت اللعبة", className: "turn-box" };
  }

  const className = `turn-box ${turn === "red" ? "t-red" : "t-blue"}`;

  if (role === "host") {
    const text = gs.gphase
      ? `${hGuesser(gs)} — اختر كلمة`
      : `القائد: ${hLeader(gs)} 🎯`;
    return { text, className };
  }

  const isLeader = role === "leader";
  const isMyTurn = myId !== null && gs.players[myId]?.team === turn;

  if (gs.leaders[turn] === myId && !gs.gphase) {
    return {
      text: `دورك — أعطِ تلميحاً ${turn === "red" ? "🔴" : "🔵"}`,
      className,
    };
  }
  if (isMyTurn && !isLeader && gs.gphase) {
    return {
      text: doubtMode
        ? "وضع الشك 🤔 — انقر لتعليم"
        : `خمّن الآن! ${turn === "red" ? "🔴" : "🔵"}`,
      className,
    };
  }
  return {
    text: `دور ${turn === "red" ? tn.red : tn.blue} ${turn === "red" ? "🔴" : "🔵"}`,
    className,
  };
}

export default function GameHeader({
  gs,
  role,
  myId,
  doubtMode,
  winsRed,
  winsBlue,
}: GameHeaderProps) {
  const tb = turnBox(gs, role, myId, doubtMode);

  return (
    <div className="g-header">
      <div className="score-side">
        <div className="score-num score-num-red" id="sc-red">
          {gs.sRed ?? 9}
        </div>
        <div className="score-label" id="hdr-red-name">
          <TeamGlyph team="red" /> {gs.teamNames.red}
        </div>
        <div className="wins-badge wins-badge-red" id="wins-red-badge">
          {winsRed} انتصار
        </div>
      </div>
      <div className={tb.className} id="turn-box">
        {tb.text}
      </div>
      <div className="score-side">
        <div className="score-num score-num-blue" id="sc-blue">
          {gs.sBlue ?? 8}
        </div>
        <div className="score-label" id="hdr-blue-name">
          <TeamGlyph team="blue" /> {gs.teamNames.blue}
        </div>
        <div className="wins-badge wins-badge-blue" id="wins-blue-badge">
          {winsBlue} انتصار
        </div>
      </div>
    </div>
  );
}
