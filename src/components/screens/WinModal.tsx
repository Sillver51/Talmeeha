"use client";

import type { PlayerView, Team } from "@/lib/types";
import { useGameStore } from "@/store/gameStore";
import { usePrefsStore } from "@/store/prefsStore";
import { formatNumber } from "@/lib/i18n/digits";
import { useCountUp } from "@/lib/ui/useCountUp";
import { shareResult } from "@/lib/share/renderShareCard";
import Confetti from "@/components/game/Confetti";
import { Button } from "@/components/ui/button";
import { Dialog as DialogPrimitive } from "radix-ui";

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
  const digits = usePrefsStore((s) => s.digits);
  // The winner's tally counts up on mount so the new win feels earned; the
  // loser's number is static. The hook jumps instantly under reduced motion.
  const winnerCount = useCountUp(wins);
  const displayed = isWinner ? winnerCount : wins;
  return (
    <div className={isWinner ? "wsb-card wsb-winner" : "wsb-card"}>
      <div
        className="wsb-name"
        style={{ color: team === "red" ? "var(--red2)" : "var(--blue2)" }}
      >
        {name}
      </div>
      <div className={isWinner ? "wsb-wins" : "wsb-wins wsb-wins-other"}>
        {formatNumber(displayed, digits)}
      </div>
      <div className="wsb-label">
        {displayed === 1 ? "انتصار واحد" : displayed === 2 ? "انتصاران" : "انتصارات"}
      </div>
    </div>
  );
}

export default function WinModal({ gs }: WinModalProps) {
  const winsData = useGameStore((s) => s.winsData);
  const restart = useGameStore((s) => s.restart);
  const goHome = useGameStore((s) => s.goHome);
  const resetWins = useGameStore((s) => s.resetWins);
  const toast = useGameStore((s) => s.toast);

  const onShare = async () => {
    try {
      await shareResult(gs);
    } catch {
      toast("تعذّرت مشاركة النتيجة");
    }
  };

  const winner: Team = gs.winner ?? "red";
  const tn = gs.teamNames;

  // Derive the ending cause from the board: if the assassin card was revealed,
  // the game ended on an assassin loss; otherwise a team cleared its cards.
  const assassinRevealed = gs.board.some((c) => c.t === "assassin" && c.rv);
  const subtitle = assassinRevealed
    ? "☠️ كُشف القاتل!"
    : "كشفوا جميع كلماتهم 🎉";

  return (
    <DialogPrimitive.Root open>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Content
          className="modal-wrap"
          id="win-modal"
          aria-labelledby="win-title"
          aria-describedby="win-sub"
          onEscapeKeyDown={(e) => e.preventDefault()}
          onInteractOutside={(e) => e.preventDefault()}
          onPointerDownOutside={(e) => e.preventDefault()}
        >
          <Confetti />
          <div className="modal">
            <div className="modal-trophy" id="win-trophy">
              🏆
            </div>
            <DialogPrimitive.Title asChild>
              <div
                className={`modal-title ${winner === "red" ? "w-red" : "w-blue"}`}
                id="win-title"
              >
                فاز {winner === "red" ? tn.red : tn.blue}! 🍇
              </div>
            </DialogPrimitive.Title>
            <DialogPrimitive.Description asChild>
              <div className="modal-sub" id="win-sub">
                {subtitle}
              </div>
            </DialogPrimitive.Description>
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
              تصفير النتيجة ↺
            </span>
            <Button
              variant="outline"
              className="w-full"
              style={{ marginBottom: ".55rem" }}
              onClick={onShare}
            >
              📤 شارك النتيجة
            </Button>
            <Button
              variant="gold"
              className="w-full"
              style={{ marginBottom: ".55rem" }}
              onClick={restart}
            >
              🔄 جولة جديدة
            </Button>
            <Button variant="outline" className="w-full" onClick={goHome}>
              🏠 الرئيسية
            </Button>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
