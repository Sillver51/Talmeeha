"use client";

import type { PlayerView } from "@/lib/types";
import { hLeader } from "@/lib/ui/roles";
import { useGameStore } from "@/store/gameStore";
import TeamGlyph from "@/components/brand/TeamGlyph";
import { Button } from "@/components/ui/button";

interface HostHandoffProps {
  gs: PlayerView;
}

export default function HostHandoff({ gs }: HostHandoffProps) {
  const setPeeking = useGameStore((s) => s.setPeeking);
  const peeking = useGameStore((s) => s.peeking);
  const hide = () => setPeeking(false);
  const show = () => setPeeking(true);

  return (
    <>
      <div className="row" style={{ justifyContent: "center" }}>
        <span className="hand-pass" aria-hidden="true">🤲</span>
        <span>
          مرّر الجهاز إلى القائد <TeamGlyph team={gs.turn} /> {hLeader(gs)}
        </span>
      </div>
      <div className="row" style={{ justifyContent: "center", marginTop: ".4rem" }}>
        <Button
          variant="gold"
          size="default"
          aria-label="اضغط مطوّلاً لرؤية المفتاح"
          onPointerDown={show}
          onPointerUp={hide}
          onPointerLeave={hide}
          onPointerCancel={hide}
          onKeyDown={(e) => {
            if (e.key === " " || e.key === "Enter") {
              e.preventDefault();
              show();
            }
          }}
          onKeyUp={(e) => {
            if (e.key === " " || e.key === "Enter") hide();
          }}
          onBlur={hide}
          onContextMenu={(e) => e.preventDefault()}
        >
          {peeking ? "👁 المفتاح ظاهر" : "اضغط مطوّلاً لرؤية المفتاح"}
        </Button>
      </div>
    </>
  );
}
