import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import ActionDock from "@/components/game/ActionDock";
import type { PlayerView } from "@/lib/types";

// Stub gameStore so the dock children can mount without a real socket.
vi.mock("@/store/gameStore", () => {
  type Selector<T> = (s: {
    doubtMode: boolean;
    toggleDoubtMode: () => void;
    endTurn: () => void;
    submitClue: () => boolean;
    restart: () => void;
    setPeeking: () => void;
    peeking: boolean;
  }) => T;
  const state = {
    doubtMode: false,
    toggleDoubtMode: () => {},
    endTurn: () => {},
    submitClue: () => true,
    restart: () => {},
    setPeeking: () => {},
    peeking: false,
  };
  const useGameStore = <T,>(sel: Selector<T>): T => sel(state);
  useGameStore.setState = (..._args: unknown[]) => {};
  return { useGameStore };
});

function gsBase(overrides: Partial<PlayerView> = {}): PlayerView {
  return {
    code: "ABCD",
    phase: "playing",
    hostMode: false,
    board: [],
    counts: { red: 8, blue: 9, neutral: 7 },
    turn: "red",
    clue: null,
    gleft: 0,
    gphase: false,
    winner: null,
    teams: { red: [], blue: [] },
    leaders: { red: "أحمد", blue: "ليلى" },
    teamNames: { red: "الأحمر", blue: "الأزرق" },
    players: { ME: { id: "ME", name: "Me", team: "red" } },
    doubts: {},
    wins: { red: 0, blue: 0 },
    sRed: 8,
    sBlue: 9,
    log: [],
    ...overrides,
  };
}

describe("ActionDock router", () => {
  it("renders LeaderInput for online leader pre-clue on own turn", () => {
    const { container } = render(
      <ActionDock gs={gsBase()} role="leader" myId="ME" isHost={false} isMyTurn={true} />,
    );
    expect(container.querySelector('input[placeholder="كلمة واحدة"]')).not.toBeNull();
  });

  it("renders GuesserActions for online guesser on own turn during guess phase", () => {
    const { container } = render(
      <ActionDock
        gs={gsBase({ gphase: true, clue: { w: "بيت", n: 2 }, gleft: 2 })}
        role="guesser"
        myId="ME"
        isHost={false}
        isMyTurn={true}
      />,
    );
    expect(container.textContent).toMatch(/إنهاء الدور/);
  });

  it("renders OffTurnStrip when not my turn during playing", () => {
    const { container } = render(
      <ActionDock gs={gsBase()} role="guesser" myId="ME" isHost={false} isMyTurn={false} />,
    );
    expect(container.textContent).toMatch(/دور/);
    expect(container.querySelector(".action-dock.collapsed")).not.toBeNull();
  });

  it("renders EndedActions when phase=ended", () => {
    const { container } = render(
      <ActionDock
        gs={gsBase({ phase: "ended", winner: "red" })}
        role="guesser"
        myId="ME"
        isHost={false}
        isMyTurn={false}
      />,
    );
    expect(container.textContent).toMatch(/لعبة جديدة/);
  });

  it("renders HostHandoff for host during leader phase (pre-clue) with clue input", () => {
    const { container } = render(
      <ActionDock gs={gsBase()} role="host" myId={null} isHost={true} isMyTurn={false} />,
    );
    // Hand-pass message + peek button + embedded LeaderInput (clue word + count + send)
    expect(container.textContent).toMatch(/المفتاح/);
    expect(container.querySelector('input[placeholder="كلمة واحدة"]')).not.toBeNull();
    expect(container.textContent).toMatch(/إرسال/);
  });

  it("renders HostGuessControls for host during guess phase", () => {
    const { container } = render(
      <ActionDock
        gs={gsBase({ gphase: true, clue: { w: "بيت", n: 2 } })}
        role="host"
        myId={null}
        isHost={true}
        isMyTurn={false}
      />,
    );
    expect(container.textContent).toMatch(/إنهاء الدور/);
  });
});
