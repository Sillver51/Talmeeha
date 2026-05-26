"use client";

import type { ReactNode } from "react";
import type { PlayerView } from "@/lib/types";
import type { Role } from "@/lib/ui/roles";
import LeaderInput from "./dock/LeaderInput";
import GuesserActions from "./dock/GuesserActions";
import HostHandoff from "./dock/HostHandoff";
import HostGuessControls from "./dock/HostGuessControls";
import EndedActions from "./dock/EndedActions";
import OffTurnStrip from "./dock/OffTurnStrip";

interface ActionDockProps {
  gs: PlayerView;
  role: Role;
  myId: string | null;
  isHost: boolean;
  isMyTurn: boolean;
}

export default function ActionDock({ gs, role, myId, isHost, isMyTurn }: ActionDockProps) {
  void myId; // currently unused; kept for future role-specific shapes
  const ended = gs.phase === "ended";
  const playing = gs.phase === "playing";

  let body: ReactNode = null;
  let collapsed = false;

  if (ended) {
    body = <EndedActions />;
  } else if (isHost && playing) {
    body = gs.gphase ? <HostGuessControls /> : <HostHandoff gs={gs} />;
  } else if (role === "leader" && isMyTurn && !gs.gphase && playing) {
    body = <LeaderInput />;
  } else if (role === "guesser" && isMyTurn && gs.gphase && playing) {
    body = <GuesserActions />;
  } else if (playing) {
    body = <OffTurnStrip gs={gs} />;
    collapsed = true;
  }

  if (body == null) return null;

  return (
    <section className={collapsed ? "action-dock collapsed" : "action-dock"}>
      {body}
    </section>
  );
}
