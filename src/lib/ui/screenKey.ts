import type { Phase } from "@/lib/types";

/**
 * Stable identity of the currently-rendered screen, mirroring the orchestrator's
 * renderScreen() logic. Used to re-key the screen wrapper so the enter animation
 * replays on each screen change. Pure.
 */
export function screenKey(phase: Phase | null, clientScreen: "home" | "setup"): string {
  if (!phase) return clientScreen;       // pre-connection host home/setup
  if (clientScreen === "setup") return "setup"; // host gear opened setup mid-game
  return phase;                          // lobby | playing | ended (setup handled above)
}
