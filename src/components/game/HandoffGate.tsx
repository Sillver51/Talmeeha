"use client";

import { useGameStore } from "@/store/gameStore";
import { hLeader } from "@/lib/ui/roles";
import TeamGlyph from "@/components/brand/TeamGlyph";
import type { PlayerView } from "@/lib/types";

interface HandoffGateProps {
  gs: PlayerView;
}

/**
 * Host-mode hold-to-peek: a press-and-hold control that reveals the key only while held,
 * so no secret persists on the shared screen. Shown to the host during the clue (pre-guess)
 * phase. Releasing or leaving the button hides the key immediately.
 */
export default function HandoffGate({ gs }: HandoffGateProps) {
  const setPeeking = useGameStore((s) => s.setPeeking);
  const peeking = useGameStore((s) => s.peeking);

  const hide = () => setPeeking(false);
  const show = () => setPeeking(true);

  return (
    <div className="handoff">
      <span className="handoff-label">
        مرّر الجهاز إلى القائد <TeamGlyph team={gs.turn} /> {hLeader(gs)}
      </span>
      <button
        className={peeking ? "btn btn-gold btn-sm peeking" : "btn btn-gold btn-sm"}
        onPointerDown={show}
        onPointerUp={hide}
        onPointerLeave={hide}
        onPointerCancel={hide}
        onContextMenu={(e) => e.preventDefault()}
      >
        {peeking ? "👁 المفتاح ظاهر" : "اضغط مطوّلاً لرؤية المفتاح"}
      </button>
    </div>
  );
}
