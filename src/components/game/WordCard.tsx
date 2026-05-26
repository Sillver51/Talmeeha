"use client";

import { memo, useEffect, useRef, useState, type KeyboardEvent, type MouseEvent } from "react";
import { HelpCircle } from "lucide-react";
import type { PlayerView, Team, ViewCard, VisibleCardType } from "@/lib/types";
import type { Role } from "@/lib/ui/roles";
import CalligraphyText from "./CalligraphyText";

const onKey = (e: KeyboardEvent, fn: () => void) => {
  if (e.key === "Enter" || e.key === " ") {
    e.preventDefault();
    fn();
  }
};

/** Color-independent identity chip per card type. Used by key-holders (host
 * with peek and online leader) so palette changes (colorblind) keep working. */
const CHIP: Record<VisibleCardType, string | null> = {
  red: "▲",
  blue: "⬣",
  neutral: "●",
  assassin: "☠",
  hidden: null,
};

/**
 * Single board cell. Class logic must match legacy exactly:
 *  - revealed         → `wc rv rv-{t}` + word.
 *  - host & unrevealed → `hv-{t}` when `hostViewLeader || !gphase`.
 *  - online leader & unrevealed → `h-{myTeam}` for own-team cards, `h-assassin`
 *    for the assassin (tinted by true type).
 *  - any doubts        → `doubted` + `🤔`/count badge.
 *  - click semantics unchanged.
 *
 * Visual upgrades for the stage architecture:
 *  - Unrevealed cards use the `glass` class for Neon Night glass material.
 *  - The first reveal of a card adds `reveal-flip` for a 350ms spring pop.
 *  - Revealed word renders via <CalligraphyText/> for the per-letter cascade.
 *  - `React.memo` prevents re-render unless props change (turn-tick safe).
 */
interface WordCardProps {
  card: ViewCard;
  index: number;
  role: Role;
  myId: string | null;
  myTeam: Team | null;
  isMyTurn: boolean;
  gphase: boolean;
  phase: PlayerView["phase"];
  hostViewLeader: boolean;
  doubtMode: boolean;
  doubts: string[] | undefined;
  onGuess: (i: number) => void;
  onToggleDoubt: (i: number) => void;
}

function WordCardImpl({
  card,
  index,
  role,
  myId,
  isMyTurn,
  gphase,
  phase,
  hostViewLeader,
  doubtMode,
  doubts,
  onGuess,
  onToggleDoubt,
}: WordCardProps) {
  const isHost = role === "host";
  const isLeader = role === "leader";
  const playing = phase === "playing";

  const dCount = doubts ? doubts.length : 0;
  const myDoubtOn = doubts ? isHost || (myId !== null && doubts.includes(myId)) : false;

  // One-shot reveal-flip on the rv:false → rv:true transition.
  const [flipping, setFlipping] = useState(false);
  const prevRv = useRef(card.rv);
  useEffect(() => {
    if (!prevRv.current && card.rv) {
      setFlipping(true);
      const t = setTimeout(() => setFlipping(false), 380);
      prevRv.current = card.rv;
      return () => clearTimeout(t);
    }
    prevRv.current = card.rv;
  }, [card.rv]);

  if (card.rv) {
    const cls = `wc rv rv-${card.t}${flipping ? " reveal-flip" : ""}`;
    const chip = CHIP[card.t];
    return (
      <div className={cls} data-chip={chip ?? undefined}>
        <CalligraphyText word={card.w} />
      </div>
    );
  }

  let className = "wc glass";
  let chip: string | null = null;
  if (isHost) {
    if ((hostViewLeader || !gphase) && card.t !== "hidden") {
      className += ` hv-${card.t}`;
      chip = CHIP[card.t];
    }
  } else if (isLeader) {
    if (card.t !== "hidden") {
      className += ` h-${card.t}`;
      chip = CHIP[card.t];
    }
  }
  if (dCount > 0) className += " doubted";

  const hostActionable = isHost && gphase && playing;
  const guesserActionable = !isHost && isMyTurn && gphase && playing;

  const onClick = hostActionable
    ? (e: MouseEvent<HTMLDivElement>) => {
        if (e.shiftKey || e.ctrlKey) onToggleDoubt(index);
        else onGuess(index);
      }
    : guesserActionable
      ? () => {
          if (!isHost && doubtMode) onToggleDoubt(index);
          else onGuess(index);
        }
      : undefined;

  const style =
    guesserActionable && doubtMode
      ? {
          outline: myDoubtOn
            ? "2px solid var(--doubt2)"
            : "1px dashed rgba(168,85,247,.45)",
        }
      : undefined;

  const isInteractive = onClick !== undefined;
  const handleKeyDown = isInteractive
    ? (e: KeyboardEvent<HTMLDivElement>) => {
        onKey(e, () => {
          if (hostActionable) onGuess(index);
          else if (guesserActionable) {
            if (doubtMode) onToggleDoubt(index);
            else onGuess(index);
          }
        });
      }
    : undefined;

  return (
    <div
      className={className}
      onClick={onClick}
      onKeyDown={handleKeyDown}
      role={isInteractive ? "button" : undefined}
      tabIndex={isInteractive ? 0 : undefined}
      aria-label={isInteractive ? card.w : undefined}
      data-chip={chip ?? undefined}
      style={style}
      title={hostActionable ? "انقر للتخمين" : undefined}
    >
      <span>{card.w}</span>
      {dCount > 0 && (
        <span className="doubt-count-txt" aria-label={`${dCount} علامات شك`}>
          {dCount > 1 ? `${dCount} ` : ""}
          <HelpCircle size={11} aria-hidden="true" strokeWidth={2.5} />
        </span>
      )}
    </div>
  );
}

const WordCard = memo(WordCardImpl);
export default WordCard;
