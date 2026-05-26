import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import Headline from "@/components/game/Headline";
import type { PlayerView } from "@/lib/types";
import type { LogEvent } from "@/lib/game/logParser";

afterEach(() => cleanup());

function baseGs(): PlayerView {
  return {
    code: "ABCD",
    phase: "playing",
    turn: "red",
    gphase: false,
    gleft: 0,
    clue: null,
    players: {},
    teamNames: { red: "النار", blue: "المحيط" },
    leaders: { red: null, blue: null },
    // Headline resolves the leader via hLeader → hRed/hBlue.leader (host mode).
    hRed:  { players: ["حسن"],  leader: "حسن",  gIdx: 0 },
    hBlue: { players: ["ليلى"], leader: "ليلى", gIdx: 0 },
    log: [],
    sRed: 9,
    sBlue: 8,
    board: [],
    turnDeadlineAt: null,
  } as unknown as PlayerView;
}

describe("Headline", () => {
  it("awaiting-clue: shows leader's name", () => {
    const gs = baseGs();
    render(<Headline gs={gs} lastEvent={null} msLeft={Infinity} />);
    expect(screen.getByText(/حسن/)).toBeTruthy();
  });

  it("clue-given: shows the clue word and remaining count", () => {
    const gs = baseGs();
    gs.gphase = true;
    gs.clue = { w: "محيط", n: 3 };
    gs.gleft = 2;
    render(<Headline gs={gs} lastEvent={null} msLeft={Infinity} />);
    expect(screen.getByText(/محيط/)).toBeTruthy();
    expect(screen.getByText(/تبقّى/)).toBeTruthy();
  });

  it("ended: shows the winning team", () => {
    const gs = baseGs();
    gs.phase = "ended";
    (gs as PlayerView & { winner: "blue" }).winner = "blue";
    render(<Headline gs={gs} lastEvent={null} msLeft={Infinity} />);
    expect(screen.getByText(/المحيط/)).toBeTruthy();
  });

  it("urgency: applies the urgency class when msLeft <= 10s", () => {
    const gs = baseGs();
    gs.gphase = true;
    gs.clue = { w: "بحر", n: 1 };
    gs.gleft = 1;
    gs.turnDeadlineAt = Date.now() + 9_000;
    const { container } = render(
      <Headline gs={gs} lastEvent={null} msLeft={9_000} />,
    );
    expect(container.querySelector(".headline.urgency")).not.toBeNull();
  });

  it("assassin: applies the shake class when last event is assassin", () => {
    const gs = baseGs();
    const lastEvent: LogEvent = { kind: "assassin", raw: "☠️ جود كشف القاتل!", by: "جود" };
    const { container } = render(
      <Headline gs={gs} lastEvent={lastEvent} msLeft={Infinity} />,
    );
    expect(container.querySelector(".headline.shake")).not.toBeNull();
  });
});
