"use client";

import type { KeyboardEvent, MouseEvent } from "react";
import type { PlayerView, Team, ViewCard } from "@/lib/types";
import type { Role } from "@/lib/ui/roles";

const onKey = (e: KeyboardEvent, fn: () => void) => {
  if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fn(); }
};

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

export default function WordCard({
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

  if (card.rv) {
    return <div className={`wc rv rv-${card.t}`}>{card.w}</div>;
  }

  let className = "wc";
  if (isHost) {
    // Host (pass-and-play) receives the full key; client gates display via host-view / pre-guess.
    if ((hostViewLeader || !gphase) && card.t !== "hidden") className += ` hv-${card.t}`;
  } else if (isLeader) {
    // Online leader sees the full key: tint EVERY unrevealed card by its true type.
    if (card.t !== "hidden") className += ` h-${card.t}`;
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

  const isInteractive = onClick !== undefined;
  const handleKeyDown = isInteractive
    ? (e: KeyboardEvent<HTMLDivElement>) => {
        onKey(e, () => {
          // Synthesise a plain click (no modifier keys) for keyboard activation.
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
      style={style}
      title={hostActionable ? "انقر للتخمين" : undefined}
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
