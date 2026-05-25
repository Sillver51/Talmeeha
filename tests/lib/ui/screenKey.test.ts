import { describe, it, expect } from "vitest";
import { screenKey } from "@/lib/ui/screenKey";

describe("screenKey", () => {
  it("returns the host-mode client screen when there is no game state", () => {
    expect(screenKey(null, "home")).toBe("home");
    expect(screenKey(null, "setup")).toBe("setup");
  });
  it("returns the client screen when it overrides (host gear mid-game)", () => {
    expect(screenKey("playing", "setup")).toBe("setup");
  });
  it("returns the phase when a game state is present", () => {
    expect(screenKey("lobby", "home")).toBe("lobby");
    expect(screenKey("playing", "home")).toBe("playing");
    expect(screenKey("ended", "home")).toBe("ended");
  });
});
