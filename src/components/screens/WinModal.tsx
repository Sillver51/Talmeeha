"use client";

import type { PlayerView, Team } from "@/lib/types";
import { useGameStore } from "@/store/gameStore";

/**
 * Win modal (`#win-modal`) — ports legacy markup (~817–828) + `showWin`/
 * `renderWinSB` (~1178–1193). Trophy, "فاز {teamName}! 🍇" title, subtitle, the
 * persistent two-card scoreboard (winner card gold), reset-wins link, and
 * "🔄 جولة جديدة" / "🏠 الرئيسية" actions. Rendered only when `phase==='ended'`.
 */
interface WinModalProps {
  gs: PlayerView;
}

interface ScoreboardCardProps {
  team: Team;
  name: string;
  wins: number;
  isWinner: boolean;
}

function ScoreboardCard({ team, name, wins, isWinner }: ScoreboardCardProps) {
  return (
    <div className={isWinner ? "wsb-card wsb-winner" : "wsb-card"}>
      <div
        className="wsb-name"
        style={{ color: team === "red" ? "var(--red2)" : "var(--blue2)" }}
      >
        {name}
      </div>
      <div className={isWinner ? "wsb-wins" : "wsb-wins wsb-wins-other"}>
        {wins}
      </div>
      <div className="wsb-label">انتصار</div>
    </div>
  );
}

export default function WinModal({ gs }: WinModalProps) {
  const winsData = useGameStore((s) => s.winsData);
  const restart = useGameStore((s) => s.restart);
  const goHome = useGameStore((s) => s.goHome);
  const resetWins = useGameStore((s) => s.resetWins);

  const winner: Team = gs.winner ?? "red";
  const tn = gs.teamNames;

  // Derive the ending cause from the board: if the assassin card was revealed,
  // the game ended on an assassin loss; otherwise a team cleared its cards.
  const assassinRevealed = gs.board.some((c) => c.t === "assassin" && c.rv);
  const subtitle = assassinRevealed
    ? "☠️ كُشف القاتل!"
    : "كشفوا جميع كلماتهم 🎉";

  return (
    <div className="modal-wrap" id="win-modal">
      <div className="modal">
        <div className="modal-trophy" id="win-trophy">
          🏆
        </div>
        <div
          className={`modal-title ${winner === "red" ? "w-red" : "w-blue"}`}
          id="win-title"
        >
          فاز {winner === "red" ? tn.red : tn.blue}! 🍇
        </div>
        <div className="modal-sub" id="win-sub">
          {subtitle}
        </div>
        <div className="win-scoreboard" id="win-scoreboard">
          <ScoreboardCard
            team="red"
            name={winsData.redName || "الأحمر"}
            wins={winsData.red || 0}
            isWinner={winner === "red"}
          />
          <ScoreboardCard
            team="blue"
            name={winsData.blueName || "الأزرق"}
            wins={winsData.blue || 0}
            isWinner={winner === "blue"}
          />
        </div>
        <span
          className="wsb-reset"
          role="button"
          tabIndex={0}
          onClick={resetWins}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              resetWins();
            }
          }}
        >
          تصفير السكور ↺
        </span>
        <button
          className="btn btn-gold w100"
          style={{ marginBottom: ".55rem" }}
          onClick={restart}
        >
          🔄 جولة جديدة
        </button>
        <button className="btn btn-outline" onClick={goHome}>
          🏠 الرئيسية
        </button>
      </div>
    </div>
  );
}
