"use client";

import type { PlayerView } from "@/lib/types";
import type { Role } from "@/lib/ui/roles";
import TeamGlyph from "@/components/brand/TeamGlyph";
import { Button } from "@/components/ui/button";
import { usePrefsStore } from "@/store/prefsStore";
import { useGameStore } from "@/store/gameStore";
import { formatNumber } from "@/lib/i18n/digits";
import { arabicCount } from "@/lib/i18n/plural";
import TurnCapsule from "./TurnCapsule";

interface StatusStripProps {
  gs: PlayerView;
  role: Role;
  myId: string | null;
  isHost: boolean;
  winsRed: number;
  winsBlue: number;
}

export default function StatusStrip({ gs, role, myId, isHost, winsRed, winsBlue }: StatusStripProps) {
  const digits = usePrefsStore((s) => s.digits);
  const hostViewLeader = useGameStore((s) => s.hostViewLeader);
  const toggleHostView = useGameStore((s) => s.toggleHostView);
  const goToSetup = () => useGameStore.setState({ clientScreen: "setup" });

  return (
    <header className="status-strip">
      <div className="ss-score red">
        <div className="n">{formatNumber(gs.sRed ?? 9, digits)}</div>
        <div className="glyph-row"><TeamGlyph team="red" /> {gs.teamNames.red}</div>
        <span className="wins">
          {arabicCount(winsRed, formatNumber(winsRed, digits), {
            one: "انتصار واحد",
            two: "انتصاران",
            plural: "انتصارات",
          })}
        </span>
      </div>

      <TurnCapsule gs={gs} role={role} myId={myId} />

      <div className="ss-score blue">
        <div className="n">{formatNumber(gs.sBlue ?? 8, digits)}</div>
        <div className="glyph-row"><TeamGlyph team="blue" /> {gs.teamNames.blue}</div>
        <span className="wins">
          {arabicCount(winsBlue, formatNumber(winsBlue, digits), {
            one: "انتصار واحد",
            two: "انتصاران",
            plural: "انتصارات",
          })}
        </span>
      </div>

      {isHost && (
        <div
          className="ss-actions"
          style={{ gridColumn: "1 / -1", justifyContent: "center", marginTop: ".25rem" }}
        >
          <Button variant="ghost" size="xs" onClick={toggleHostView} aria-pressed={hostViewLeader}>
            {hostViewLeader ? "🙈 إخفاء المفتاح" : "👁 عرض المفتاح"}
          </Button>
          <Button variant="ghost" size="xs" onClick={goToSetup}>
            ⚙ الإعداد
          </Button>
        </div>
      )}
    </header>
  );
}
