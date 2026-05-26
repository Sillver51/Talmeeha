import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import CalligraphyText from "@/components/game/CalligraphyText";

describe("CalligraphyText", () => {
  it("wraps each character in a span with an --i index", () => {
    const { container } = render(<CalligraphyText word="بيت" />);
    const root = container.querySelector(".calligraphy") as HTMLElement;
    expect(root).not.toBeNull();
    const spans = root.querySelectorAll(":scope > span");
    expect(spans.length).toBe(3);
    expect((spans[0] as HTMLElement).style.getPropertyValue("--i")).toBe("0");
    expect((spans[2] as HTMLElement).style.getPropertyValue("--i")).toBe("2");
  });

  it("renders empty without crashing", () => {
    const { container } = render(<CalligraphyText word="" />);
    const root = container.querySelector(".calligraphy") as HTMLElement;
    expect(root.querySelectorAll(":scope > span").length).toBe(0);
  });
});
