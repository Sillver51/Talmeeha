import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import ArcDial from "@/components/game/ArcDial";

afterEach(() => cleanup());

describe("ArcDial", () => {
  it("renders an SVG with correct aria-label for red team", () => {
    render(
      <ArcDial
        team="red" remaining={5} startingTotal={9} wins={2}
        teamName="الفريق الأحمر" active
      />,
    );
    const dial = screen.getByRole("img");
    expect(dial.getAttribute("aria-label")).toMatch(/الفريق الأحمر/);
    expect(dial.getAttribute("aria-label")).toMatch(/5/);
    expect(dial.getAttribute("aria-label")).toMatch(/9/);
    expect(dial.getAttribute("aria-label")).toMatch(/2/);
  });

  it("widens the denominator to remaining when remaining exceeds startingTotal", () => {
    // Blue starts at 8; if remaining is somehow 10, denominator widens to 10.
    render(
      <ArcDial
        team="blue" remaining={10} startingTotal={8} wins={0}
        teamName="الفريق الأزرق" active
      />,
    );
    expect(screen.getByRole("img").getAttribute("aria-label")).toMatch(/10/);
  });

  it("applies the active class when active and not when idle", () => {
    const { container, rerender } = render(
      <ArcDial team="red" remaining={5} startingTotal={9} wins={0} teamName="x" active />,
    );
    expect(container.querySelector(".arc-dial.active")).not.toBeNull();
    rerender(
      <ArcDial team="red" remaining={5} startingTotal={9} wins={0} teamName="x" active={false} />,
    );
    expect(container.querySelector(".arc-dial.active")).toBeNull();
  });

  it("renders up to 5 tick marks, then collapses to +N chip", () => {
    const { container, rerender } = render(
      <ArcDial team="red" remaining={5} startingTotal={9} wins={3} teamName="x" active />,
    );
    expect(container.querySelectorAll(".arc-tick.lit")).toHaveLength(3);

    rerender(
      <ArcDial team="red" remaining={5} startingTotal={9} wins={7} teamName="x" active />,
    );
    expect(container.querySelector(".arc-overflow")?.textContent).toBe("+7");
  });

  it("respects an 8-card startingTotal (when this team did not start)", () => {
    render(
      <ArcDial
        team="red" remaining={8} startingTotal={8} wins={0}
        teamName="الفريق الأحمر" active
      />,
    );
    expect(screen.getByRole("img").getAttribute("aria-label")).toMatch(/8 من 8/);
  });
});
