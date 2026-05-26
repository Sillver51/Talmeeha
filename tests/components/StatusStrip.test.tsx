import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import StatusStrip from "@/components/game/StatusStrip";
import type { PlayerView } from "@/lib/types";

function baseGs(overrides: Partial<PlayerView> = {}): PlayerView {
  return {
    code: "ABCD",
    phase: "playing",
    hostMode: true,
    board: [],
    counts: { red: 9, blue: 8, neutral: 7 },
    turn: "red",
    clue: null,
    gleft: 0,
    gphase: false,
    winner: null,
    teams: { red: [], blue: [] },
    leaders: { red: "أحمد", blue: "ليلى" },
    teamNames: { red: "أحمر", blue: "أزرق" },
    players: {},
    doubts: {},
    wins: { red: 0, blue: 0 },
    sRed: 9,
    sBlue: 8,
    log: [],
    ...overrides,
  };
}

describe("StatusStrip — TallyStone", () => {
  it("renders both team scores and team names", () => {
    const { container } = render(
      <StatusStrip gs={baseGs()} role="host" myId={null} isHost={true} winsRed={0} winsBlue={0} />,
    );
    const stones = container.querySelectorAll(".ss-score");
    expect(stones.length).toBe(2);
    const red = container.querySelector(".ss-score.red");
    const blue = container.querySelector(".ss-score.blue");
    expect(red?.querySelector(".n")?.textContent).toBe("9");
    expect(blue?.querySelector(".n")?.textContent).toBe("8");
    expect(red?.textContent).toContain("أحمر");
    expect(blue?.textContent).toContain("أزرق");
  });

  it("marks only the active team's stone with .active", () => {
    const { container } = render(
      <StatusStrip gs={baseGs({ turn: "red" })} role="host" myId={null} isHost={true} winsRed={0} winsBlue={0} />,
    );
    expect(container.querySelector(".ss-score.red")?.classList.contains("active")).toBe(true);
    expect(container.querySelector(".ss-score.blue")?.classList.contains("active")).toBe(false);
  });

  it("shows a crown chip on the leading team's wins pill", () => {
    const { container } = render(
      <StatusStrip gs={baseGs()} role="host" myId={null} isHost={true} winsRed={3} winsBlue={1} />,
    );
    const redWins = container.querySelector(".ss-score.red .wins");
    const blueWins = container.querySelector(".ss-score.blue .wins");
    expect(redWins?.classList.contains("crown")).toBe(true);
    expect(blueWins?.classList.contains("crown")).toBe(false);
  });

  it("no crown when wins are tied (including 0-0)", () => {
    const { container } = render(
      <StatusStrip gs={baseGs()} role="host" myId={null} isHost={true} winsRed={0} winsBlue={0} />,
    );
    const wins = container.querySelectorAll(".wins.crown");
    expect(wins.length).toBe(0);
  });

  it("renders dot bar with `lit` count equal to remaining", () => {
    const { container } = render(
      <StatusStrip gs={baseGs()} role="host" myId={null} isHost={true} winsRed={0} winsBlue={0} />,
    );
    const redLit = container.querySelectorAll(".ss-score.red .ss-dots .d.lit");
    const blueLit = container.querySelectorAll(".ss-score.blue .ss-dots .d.lit");
    expect(redLit.length).toBe(9);
    expect(blueLit.length).toBe(8);
  });

  it("shows host actions only when isHost=true", () => {
    const guest = render(
      <StatusStrip gs={baseGs()} role="guesser" myId="g1" isHost={false} winsRed={0} winsBlue={0} />,
    );
    expect(guest.container.querySelector(".ss-actions")).toBeNull();
    const host = render(
      <StatusStrip gs={baseGs()} role="host" myId={null} isHost={true} winsRed={0} winsBlue={0} />,
    );
    expect(host.container.querySelector(".ss-actions")).not.toBeNull();
  });
});
