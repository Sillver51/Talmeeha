"use client";

import type { PlayerView, Team } from "@/lib/types";
import type { TimerPreset } from "@/lib/game";
import { PRESETS } from "@/lib/game";
import { useGameStore } from "@/store/gameStore";
import RoomShare from "@/components/share/RoomShare";
import { Button } from "@/components/ui/button";

/**
 * Lobby screen (online mode) — ports legacy `#s-lobby` (~721–755) +
 * `renderLobby` (~1039–1059). Room-code display (click to copy), red/blue team
 * cards listing players with leader badge, join-team + become-leader buttons,
 * spectators row, and a start button enabled per `canStart`.
 * Arabic copy preserved verbatim.
 */

/** Ported from legacy `canStart` (~941–944). */
function canStart(gs: PlayerView): boolean {
  return (
    gs.teams.red.length >= 2 &&
    Boolean(gs.leaders.red) &&
    gs.teams.blue.length >= 2 &&
    Boolean(gs.leaders.blue)
  );
}

const TEAM_STYLE: Record<Team, { bg: string; border: string; color: string }> = {
  red: {
    bg: "rgba(240,64,96,.08)",
    border: "2px solid rgba(240,64,96,.3)",
    color: "var(--red2)",
  },
  blue: {
    bg: "rgba(45,110,255,.08)",
    border: "2px solid rgba(45,110,255,.3)",
    color: "var(--blue2)",
  },
};

interface TeamCardProps {
  team: Team;
  gs: PlayerView;
}

function TeamCard({ team, gs }: TeamCardProps) {
  const joinTeam = useGameStore((s) => s.joinTeam);
  const becomeLeader = useGameStore((s) => s.becomeLeader);
  const ids = gs.teams[team];
  const style = TEAM_STYLE[team];
  const isRed = team === "red";

  return (
    <div
      style={{
        background: style.bg,
        border: style.border,
        borderRadius: "var(--r)",
        padding: ".8rem .65rem",
        textAlign: "center",
      }}
    >
      <div style={{ fontSize: "1.4rem", marginBottom: ".2rem" }}>
        {isRed ? "🔴" : "🔵"}
      </div>
      <div
        style={{ fontWeight: 800, color: style.color, fontSize: ".88rem" }}
        id={`lob-${team}-name`}
      >
        {gs.teamNames[team]}
      </div>
      <div
        className="muted"
        id={`cnt-${team}`}
        style={{ fontSize: ".7rem", margin: ".18rem 0 .32rem" }}
      >
        {ids.length} لاعبين
      </div>
      <ul style={{ listStyle: "none" }} id={`lst-${team}`}>
        {ids.map((id) => {
          const player = gs.players[id];
          const isLeader = gs.leaders[team] === id;
          const isDisconnected = Boolean(player?.disconnected);
          return (
            <li
              key={id}
              style={{
                fontSize: ".71rem",
                color: "var(--text2)",
                padding: ".11rem 0",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: ".24rem",
                opacity: isDisconnected ? 0.5 : 1,
              }}
            >
              {player?.name ?? "?"}
              {isLeader && (
                <span
                  style={{
                    background: "var(--gold)",
                    color: "#120A00",
                    fontSize: ".56rem",
                    fontWeight: 900,
                    padding: ".07rem .28rem",
                    borderRadius: "4px",
                  }}
                >
                  قائد
                </span>
              )}
              {isDisconnected && (
                <span className="disc-badge"><span aria-hidden="true">انقطع</span><span className="sr-only"> — انقطع الاتصال</span></span>
              )}
            </li>
          );
        })}
      </ul>
      <button
        className="btn btn-sm btn-outline mt"
        onClick={() => joinTeam(team)}
        aria-label={`الانضمام إلى ${gs.teamNames[team]}`}
      >
        انضمّ
      </button>
      <button
        className={isRed ? "btn btn-sm btn-red mt" : "btn btn-sm btn-blue mt"}
        aria-label={`أصبح قائداً لـ ${gs.teamNames[team]}`}
        onClick={() => becomeLeader(team)}
      >
        ⭐ قائداً
      </button>
    </div>
  );
}

const OPTIONS: { value: TimerPreset | "off"; label: string }[] = [
  { value: "off", label: "إيقاف" },
  { value: "relaxed", label: PRESETS.relaxed.label },
  { value: "normal", label: PRESETS.normal.label },
  { value: "blitz", label: PRESETS.blitz.label },
];

interface TimerPickerProps {
  gs: PlayerView;
}

function TimerPicker({ gs }: TimerPickerProps) {
  const myId = useGameStore((s) => s.myId);
  const setTimer = useGameStore((s) => s.setTimer);

  const isLeader =
    !!myId && (gs.leaders.red === myId || gs.leaders.blue === myId);
  const current: TimerPreset | "off" =
    gs.timer?.enabled ? gs.timer.preset : "off";

  return (
    <div
      style={{
        margin: ".7rem 0",
        padding: ".65rem .8rem",
        borderRadius: "var(--r)",
        background: "var(--glass)",
        border: "1px solid var(--border)",
      }}
    >
      <div
        className="muted"
        style={{
          fontSize: ".72rem",
          fontWeight: 700,
          marginBottom: ".5rem",
          textAlign: "center",
        }}
      >
        <span aria-hidden="true">⏱️</span> مؤقّت الدور
      </div>
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: ".35rem",
          justifyContent: "center",
        }}
      >
        {OPTIONS.map((opt) => (
          <Button
            key={opt.value}
            variant={current === opt.value ? "default" : "outline"}
            size="sm"
            disabled={!isLeader}
            onClick={() => setTimer(opt.value)}
            aria-describedby={!isLeader ? "timer-leader-hint" : undefined}
            style={{ fontWeight: 800, ...(current !== opt.value ? { opacity: isLeader ? 1 : 0.6 } : {}) }}
          >
            {opt.label}
          </Button>
        ))}
      </div>
      {!isLeader && (
        <div
          id="timer-leader-hint"
          className="muted"
          style={{ fontSize: ".65rem", textAlign: "center", marginTop: ".4rem" }}
        >
          القائد فقط يضبط المؤقّت
        </div>
      )}
    </div>
  );
}

export default function LobbyScreen() {
  const gs = useGameStore((s) => s.gs);
  const startGame = useGameStore((s) => s.startGame);

  if (!gs) return null;

  const code = gs.code || "----";
  const ok = canStart(gs);

  const specIds = Object.keys(gs.players).filter(
    (id) => !gs.teams.red.includes(id) && !gs.teams.blue.includes(id),
  );
  const specNames = specIds
    .map((id) => gs.players[id]?.name)
    .filter((n): n is string => Boolean(n));

  return (
    <div className="screen on" id="s-lobby">
      <div style={{ textAlign: "center", marginBottom: "1.2rem" }}>
        <div style={{ fontSize: "1.6rem", marginBottom: ".2rem" }}>🍇</div>
        <div className="logo" style={{ fontSize: "2.2rem" }}>
          تلميحة
        </div>
      </div>
      <div className="card" style={{ maxWidth: "520px" }}>
        <RoomShare code={code} />
        <div className="muted tc" style={{ margin: ".5rem 0 1rem" }}>
          شارك الرمز أو امسح رمز QR مع أصحابك
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: ".7rem",
            marginBottom: ".7rem",
          }}
        >
          <TeamCard team="red" gs={gs} />
          <TeamCard team="blue" gs={gs} />
        </div>
        <div className="muted tc" id="spec-row" style={{ marginBottom: ".7rem" }}>
          {specNames.length ? `👁 ${specNames.join("، ")}` : ""}
        </div>
        <TimerPicker gs={gs} />
        <div className="divider"></div>
        <button
          className="btn btn-gold"
          id="btn-start"
          disabled={!ok}
          onClick={startGame}
        >
          🚀 ابدأ اللعبة
        </button>
        <div
          className="muted tc"
          id="start-hint"
          style={{ display: ok ? "none" : "block" }}
        >
          يحتاج كل فريق لاعبَين + قائد واحد
        </div>
      </div>
    </div>
  );
}
