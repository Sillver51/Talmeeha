import { describe, it, expect, vi } from "vitest";
import { fireEvent, render } from "@testing-library/react";
import LeaderInput from "@/components/game/dock/LeaderInput";

vi.mock("@/store/gameStore", () => {
  const submitClue = vi.fn(() => true);
  return {
    useGameStore: <T,>(sel: (s: { submitClue: typeof submitClue }) => T): T =>
      sel({ submitClue }),
  };
});

vi.mock("@/store/prefsStore", () => ({
  usePrefsStore: <T,>(sel: (s: { digits: "western" }) => T): T =>
    sel({ digits: "western" }),
}));

describe("LeaderInput — composer stepper", () => {
  it("renders the stepper at default 1, with the كلمة label", () => {
    const { container } = render(<LeaderInput />);
    const n = container.querySelector(".stepper .n");
    expect(n?.textContent?.trim()).toBe("1");
    expect(container.textContent).toContain("كلمة");
  });

  it("increments to 9 max and disables + at max", () => {
    const { container } = render(<LeaderInput />);
    const plus = container.querySelectorAll(".stepper button")[1] as HTMLButtonElement;
    for (let i = 0; i < 12; i++) fireEvent.click(plus);
    const n = container.querySelector(".stepper .n");
    expect(n?.textContent?.trim()).toBe("9");
    expect(plus.disabled).toBe(true);
  });

  it("decrements to 1 min and disables − at min", () => {
    const { container } = render(<LeaderInput />);
    const minus = container.querySelectorAll(".stepper button")[0] as HTMLButtonElement;
    fireEvent.click(minus);
    fireEvent.click(minus);
    const n = container.querySelector(".stepper .n");
    expect(n?.textContent?.trim()).toBe("1");
    expect(minus.disabled).toBe(true);
  });

  it("disables submit until a word is typed", () => {
    const { container } = render(<LeaderInput />);
    const cta = container.querySelector("button.cta-primary") as HTMLButtonElement;
    expect(cta.disabled).toBe(true);
    const inp = container.querySelector(".composer-input") as HTMLInputElement;
    fireEvent.change(inp, { target: { value: "بحر" } });
    expect(cta.disabled).toBe(false);
  });

  it("renders the correct Arabic plural for letter count: 1→حرف, 2→حرفين (counted-dual), 3-10→حروف, 11+→حرفاً", () => {
    const { container } = render(<LeaderInput />);
    const inp = container.querySelector(".composer-input") as HTMLInputElement;
    const hint = () => container.querySelector(".hint")!.textContent!;

    fireEvent.change(inp, { target: { value: "أ" } });
    expect(hint()).toContain("حرف");
    expect(hint()).not.toContain("حرفين");
    expect(hint()).not.toContain("حروف");

    fireEvent.change(inp, { target: { value: "أب" } });
    expect(hint()).toContain("حرفين");

    fireEvent.change(inp, { target: { value: "أبجد" } });
    expect(hint()).toContain("حروف");

    fireEvent.change(inp, { target: { value: "أبجدهوزحطيكل" } });
    expect(hint()).toContain("حرفاً");
  });
});
