"use client";

import { useState } from "react";
import type { Team } from "@/lib/types";
import { useGameStore } from "@/store/gameStore";
import { Button } from "@/components/ui/button";

/**
 * Setup screen (host mode) — ports legacy `#s-setup` (~679–719) + `renderSetup`
 * (~890–904). Two team cards with editable names, add/remove players, set
 * leader, and a launch button enabled once each team has ≥2 players + a leader.
 * Driven by `hSetup` in the store. Arabic copy preserved verbatim.
 */
const DEFAULT_RED_NAME = "الفريق الأحمر";
const DEFAULT_BLUE_NAME = "الفريق الأزرق";

interface TeamSetupCardProps {
  team: Team;
  teamName: string;
  onTeamNameChange: (value: string) => void;
}

function TeamSetupCard({ team, teamName, onTeamNameChange }: TeamSetupCardProps) {
  const setup = useGameStore((s) => s.hSetup[team]);
  const addPlayer = useGameStore((s) => s.addPlayer);
  const removePlayer = useGameStore((s) => s.removePlayer);
  const setLeader = useGameStore((s) => s.setLeader);
  const [playerName, setPlayerName] = useState("");

  const isRed = team === "red";
  const submit = () => {
    addPlayer(team, playerName);
    setPlayerName("");
  };

  return (
    <div className={isRed ? "team-setup-card tsc-red" : "team-setup-card tsc-blue"}>
      <div className="tsc-header">
        <span className="tsc-icon">{isRed ? "🔴" : "🔵"}</span>
        <input
          className="team-name-inp"
          id={`${team}-team-name`}
          value={teamName}
          maxLength={18}
          onChange={(e) => onTeamNameChange(e.target.value)}
          style={
            isRed
              ? { color: "var(--red2)", borderColor: "rgba(240,64,96,.28)" }
              : { color: "var(--blue2)", borderColor: "rgba(45,110,255,.28)" }
          }
        />
      </div>
      <div className="add-player-row">
        <input
          type="text"
          id={`${team}-inp`}
          placeholder="اسم اللاعب"
          maxLength={16}
          value={playerName}
          onChange={(e) => setPlayerName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") submit();
          }}
        />
        <Button
          variant={isRed ? "red" : "blue"}
          size="sm"
          onClick={submit}
        >
          + أضف
        </Button>
      </div>
      <div className="players-tags" id={`${team}-tags`}>
        {setup.players.map((name) => {
          const isLeader = setup.leader === name;
          return (
            <span
              key={name}
              className={isLeader ? "player-tag is-leader" : "player-tag"}
            >
              {isLeader && <span>⭐</span>}
              <span className="pt-name">{name}</span>
              <button
                className="pt-set-leader"
                onClick={() => setLeader(team, name)}
              >
                ⭐
              </button>
              <button
                className="pt-remove"
                onClick={() => removePlayer(team, name)}
              >
                ✕
              </button>
            </span>
          );
        })}
      </div>
      <div
        className="leader-hint"
        id={`${team}-leader-hint`}
        style={{ color: setup.leader ? "var(--gold2)" : "var(--muted)" }}
      >
        {setup.leader ? `القائد: ${setup.leader} ⭐` : "اضغط ⭐ لتعيين القائد"}
      </div>
    </div>
  );
}

export default function SetupScreen() {
  const red = useGameStore((s) => s.hSetup.red);
  const blue = useGameStore((s) => s.hSetup.blue);
  const launchHostGame = useGameStore((s) => s.launchHostGame);
  const goHome = useGameStore((s) => s.goHome);

  const [redName, setRedName] = useState(DEFAULT_RED_NAME);
  const [blueName, setBlueName] = useState(DEFAULT_BLUE_NAME);

  const ok =
    red.players.length >= 2 &&
    Boolean(red.leader) &&
    blue.players.length >= 2 &&
    Boolean(blue.leader);

  return (
    <div className="screen on" id="s-setup">
      <div className="setup-wrap">
        <div style={{ textAlign: "center", marginBottom: "1.4rem" }}>
          <div style={{ fontSize: "2rem", marginBottom: ".3rem" }}>🍇</div>
          <div className="logo" style={{ fontSize: "2.2rem" }}>
            تلميحة
          </div>
          <div className="logo-tag">إعداد اللاعبين</div>
        </div>
        <div className="teams-setup">
          <TeamSetupCard
            team="red"
            teamName={redName}
            onTeamNameChange={setRedName}
          />
          <TeamSetupCard
            team="blue"
            teamName={blueName}
            onTeamNameChange={setBlueName}
          />
        </div>
        <div className="setup-footer">
          <Button
            variant="gold"
            className="w-full"
            id="btn-launch"
            disabled={!ok}
            onClick={() => launchHostGame(redName, blueName)}
          >
            🚀 ابدأ اللعبة
          </Button>
          <div
            className="can-start-hint"
            id="launch-hint"
            style={{ display: ok ? "none" : "block" }}
          >
            يحتاج كل فريق لاعبَين على الأقل + قائد واحد
          </div>
          <Button variant="outline" className="w-full mt" onClick={goHome}>
            <bdi>←</bdi> رجوع
          </Button>
        </div>
      </div>
    </div>
  );
}
