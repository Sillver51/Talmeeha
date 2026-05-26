"use client";

import { Eye, EyeOff, HandHelping } from "lucide-react";
import type { PlayerView } from "@/lib/types";
import { hLeader } from "@/lib/ui/roles";
import { useGameStore } from "@/store/gameStore";
import TeamGlyph from "@/components/brand/TeamGlyph";
import { Button } from "@/components/ui/button";
import LeaderInput from "./LeaderInput";

interface HostHandoffProps {
  gs: PlayerView;
}

/**
 * Host pass-and-play dock for the leader phase. The host is the de-facto
 * leader on a shared device:
 *  1. Pass the phone to the on-turn leader (hand-pass animation + name).
 *  2. Press-and-hold to reveal the key (no persistent secret).
 *  3. Type and send the clue inline (LeaderInput shape embedded).
 */
export default function HostHandoff({ gs }: HostHandoffProps) {
  const setPeeking = useGameStore((s) => s.setPeeking);
  const peeking = useGameStore((s) => s.peeking);
  const hide = () => setPeeking(false);
  const show = () => setPeeking(true);

  return (
    <>
      <div className="row" style={{ justifyContent: "center", gap: ".5rem" }}>
        <span className="hand-pass" aria-hidden="true">
          <HandHelping size={20} strokeWidth={1.8} />
        </span>
        <span style={{ fontSize: ".82rem", fontWeight: 800 }}>
          مرّر الجهاز إلى القائد <TeamGlyph team={gs.turn} /> {hLeader(gs)}
        </span>
        <Button
          variant="gold"
          size="sm"
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
          {peeking
            ? <><EyeOff size={14} aria-hidden="true" /> ظاهر</>
            : <><Eye size={14} aria-hidden="true" /> المفتاح</>}
        </Button>
      </div>
      <div style={{ marginTop: ".4rem" }}>
        <LeaderInput />
      </div>
    </>
  );
}
