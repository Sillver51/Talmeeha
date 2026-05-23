"use client";

import type { MouseEvent } from "react";
import type { Card, GameState, Team } from "@/lib/types";
import type { Role } from "@/lib/ui/roles";

/**
 * Single board cell — ports legacy `renderGame` board loop (~1138–1161).
 *
 * Class logic (MUST match legacy exactly):
 *  - revealed → `wc rv rv-{t}`, shows the word.
 *  - host & unrevealed → `hv-{t}` when `hostViewLeader || !gphase`.
 *  - online leader & unrevealed → `h-{myTeam}` for own-team cards, `h-assassin`
 *    for the assassin.
 *  - any doubts → `doubted` + a `🤔`/count badge.
 *  - click: host during guess phase → click=guess, shift/ctrl+click=toggle_doubt;
 *    online guesser on turn during guess phase → click=guess, or toggle_doubt
 *    when `doubtMode`. Non-actionable otherwise.
 */
interface WordCardProps {
  card: Card;
  index: number;
  role: Role;
  myId: string | null;
  myTeam: Team | null;
  isMyTurn: boolean;
  gphase: boolean;
  phase: GameState["phase"];
  hostViewLeader: boolean;
  doubtMode: boolean;
  doubts: string[] | undefined;
  onGuess: (i: number) => void;
  onToggleDoubt: (i: number) => void;
}

export default function WordCard({
  card,
  index,
  role,
  myId,
  myTeam,
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

  if (card.rv) {
    return <div className={`wc rv rv-${card.t}`}>{card.w}</div>;
  }

  let className = "wc";
  if (isHost) {
    if (hostViewLeader || !gphase) className += ` hv-${card.t}`;
  } else if (isLeader) {
    if (card.t === myTeam) className += ` h-${myTeam}`;
    else if (card.t === "assassin") className += " h-assassin";
  }
  if (dCount > 0) className += " doubted";

  const hostActionable = isHost && gphase && playing;
  const guesserActionable = !isHost && isMyTurn && gphase && playing;

  const onClick =
    hostActionable
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

  // Mirror legacy outline cue for online doubt-mode targeting.
  const style =
    guesserActionable && doubtMode
      ? {
          outline: myDoubtOn
            ? "2px solid var(--doubt2)"
            : "1px dashed rgba(168,85,247,.45)",
        }
      : undefined;

  return (
    <div
      className={className}
      onClick={onClick}
      style={style}
      title={hostActionable ? "انقر للتخمين | Shift+انقر للشك" : undefined}
    >
      <span>{card.w}</span>
      {dCount > 0 && (
        <span className="doubt-count-txt">
          {dCount > 1 ? `${dCount} ` : ""}🤔
        </span>
      )}
    </div>
  );
}
