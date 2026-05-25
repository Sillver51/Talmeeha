import { describe, it, expect } from "vitest";
import {
  summarizeDeps,
  formatBrokenReport,
  formatPortInUse,
} from "../../scripts/check-deps.mjs";

describe("summarizeDeps", () => {
  it("reports healthy when every probe resolved", () => {
    const out = summarizeDeps([
      { name: "zod", ok: true },
      { name: "next", ok: true },
    ]);
    expect(out).toEqual({ healthy: true, failed: [] });
  });

  it("collects the names of every failed probe", () => {
    const out = summarizeDeps([
      { name: "zod", ok: false },
      { name: "next", ok: true },
      { name: "socket.io", ok: false },
    ]);
    expect(out.healthy).toBe(false);
    expect(out.failed).toEqual(["zod", "socket.io"]);
  });

  it("treats an empty probe list as healthy", () => {
    expect(summarizeDeps([])).toEqual({ healthy: true, failed: [] });
  });
});

describe("formatBrokenReport", () => {
  it("names every broken package and points at the WSL root cause", () => {
    const msg = formatBrokenReport(["zod", "socket.io"], { willFix: false });
    expect(msg).toContain("zod");
    expect(msg).toContain("socket.io");
    expect(msg).toContain("/mnt/d"); // names the real environmental cause
  });

  it("tells the user to run npm ci when it will NOT auto-repair", () => {
    const msg = formatBrokenReport(["zod"], { willFix: false });
    expect(msg).toContain("npm ci");
  });

  it("announces the auto-repair when it WILL fix", () => {
    const msg = formatBrokenReport(["zod"], { willFix: true });
    // Arabic-first project: the repair notice must be in Arabic.
    expect(msg).toMatch(/[؀-ۿ]/);
  });
});

describe("formatPortInUse", () => {
  it("includes the port and a kill hint", () => {
    const msg = formatPortInUse(3000, 1539);
    expect(msg).toContain("3000");
    expect(msg).toContain("1539");
    expect(msg).toContain("kill");
  });

  it("handles an unknown pid gracefully", () => {
    const msg = formatPortInUse(3000, null);
    expect(msg).toContain("3000");
    expect(msg).not.toContain("null");
  });
});
