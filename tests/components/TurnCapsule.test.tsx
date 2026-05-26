import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import TurnCapsule from "@/components/game/TurnCapsule";
import type { PlayerView } from "@/lib/types";

function baseGs(overrides: Partial<PlayerView> = {}): PlayerView {
  return {
    code: "ABCD",
    phase: "playing",
    hostMode: true,
    board: [],
    counts: { red: 8, blue: 9, neutral: 7 },
    turn: "blue",
    clue: null,
    gleft: 0,
    gphase: false,
    winner: null,
    teams: { red: [], blue: [] },
    leaders: { red: "أحمد", blue: "ليلى" },
    teamNames: { red: "الأحمر", blue: "الأزرق" },
    players: {},
    doubts: {},
    wins: { red: 0, blue: 0 },
    sRed: 8,
    sBlue: 9,
    log: [],
    ...overrides,
  };
}

describe("TurnCapsule", () => {
  it("does not add red class when turn=blue", () => {
    const { container } = render(<TurnCapsule gs={baseGs({ turn: "blue" })} role="leader" myId="L" />);
    const cap = container.querySelector(".turn-capsule") as HTMLElement;
    expect(cap.classList.contains("red")).toBe(false);
  });

  it("adds red class when turn=red", () => {
    const { container } = render(<TurnCapsule gs={baseGs({ turn: "red" })} role="leader" myId="L" />);
    const cap = container.querySelector(".turn-capsule") as HTMLElement;
    expect(cap.classList.contains("red")).toBe(true);
  });

  it("renders the clue word inside a shimmer span when clue is set", () => {
    const { container } = render(
      <TurnCapsule
        gs={baseGs({ clue: { w: "بيت", n: 2 }, gphase: true, gleft: 3 })}
        role="guesser"
        myId="G"
      />,
    );
    const shimmer = container.querySelector(".clue-shimmer");
    expect(shimmer).not.toBeNull();
    expect(shimmer?.textContent).toBe("بيت");
  });

  it("shows the ended phase string when phase=ended", () => {
    const { container } = render(
      <TurnCapsule gs={baseGs({ phase: "ended", winner: "red" })} role="guesser" myId="G" />,
    );
    expect(container.textContent).toMatch(/انتهت اللعبة/);
  });
});
