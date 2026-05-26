import { describe, it, expect, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/react";
import StatusStrip from "@/components/game/StatusStrip";
import type { PlayerView } from "@/lib/types";

afterEach(() => cleanup());

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
    turnDeadlineAt: null,
    ...overrides,
  } as PlayerView;
}

describe("StatusStrip — Pulse composition", () => {
  it("renders two ArcDials (one per team) and a Headline", () => {
    const { container } = render(
      <StatusStrip
        gs={baseGs()} role="host" myId={null} isHost={true}
        winsRed={0} winsBlue={0} lastEvent={null}
      />,
    );
    expect(container.querySelectorAll(".arc-dial").length).toBe(2);
    expect(container.querySelector(".arc-dial.red")).not.toBeNull();
    expect(container.querySelector(".arc-dial.blue")).not.toBeNull();
    expect(container.querySelector(".headline")).not.toBeNull();
  });

  it("marks the active team's arc when phase=playing", () => {
    const { container } = render(
      <StatusStrip
        gs={baseGs({ turn: "red" })} role="host" myId={null} isHost={true}
        winsRed={0} winsBlue={0} lastEvent={null}
      />,
    );
    expect(container.querySelector(".arc-dial.red.active")).not.toBeNull();
    expect(container.querySelector(".arc-dial.blue.active")).toBeNull();
  });

  it("renders the voice strand below the rail", () => {
    const { container } = render(
      <StatusStrip
        gs={baseGs()} role="guesser" myId="g1" isHost={false}
        winsRed={0} winsBlue={0} lastEvent={null}
      />,
    );
    expect(container.querySelector(".voice-strand")).not.toBeNull();
  });

  it("shows host tray only when isHost=true", () => {
    const guest = render(
      <StatusStrip
        gs={baseGs()} role="guesser" myId="g1" isHost={false}
        winsRed={0} winsBlue={0} lastEvent={null}
      />,
    );
    expect(guest.container.querySelector(".host-tray")).toBeNull();
    cleanup();
    const host = render(
      <StatusStrip
        gs={baseGs()} role="host" myId={null} isHost={true}
        winsRed={0} winsBlue={0} lastEvent={null}
      />,
    );
    expect(host.container.querySelector(".host-tray")).not.toBeNull();
  });

  it("propagates wins to the right arc (overflow chip appears when wins > 5)", () => {
    const { container } = render(
      <StatusStrip
        gs={baseGs()} role="host" myId={null} isHost={true}
        winsRed={7} winsBlue={0} lastEvent={null}
      />,
    );
    const red = container.querySelector(".arc-dial.red");
    expect(red?.querySelector(".arc-overflow")?.textContent).toBe("+7");
  });
});
