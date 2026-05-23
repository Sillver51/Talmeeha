"use client";

import { useEffect } from "react";
import Toast from "@/components/brand/Toast";
import HomeScreen from "@/components/screens/HomeScreen";
import LobbyScreen from "@/components/screens/LobbyScreen";
import SetupScreen from "@/components/screens/SetupScreen";
import type { Phase } from "@/lib/types";
import { useGameStore } from "@/store/gameStore";

/**
 * Thin client orchestrator (ports legacy `show()` / `render()` switch).
 * Opens the socket once on mount, then renders the active screen:
 *  - no `gs`            → host-mode `clientScreen` (home | setup)
 *  - `gs.phase`         → setup | lobby | game (playing/ended placeholder)
 * The `<Toast/>` overlay is always mounted; `<html dir="rtl">` lives in layout.
 */
export default function Home() {
  const connect = useGameStore((s) => s.connect);
  const gs = useGameStore((s) => s.gs);
  const clientScreen = useGameStore((s) => s.clientScreen);

  useEffect(() => {
    connect();
  }, [connect]);

  return (
    <>
      {renderScreen(gs?.phase ?? null, clientScreen)}
      <Toast />
    </>
  );
}

function renderScreen(phase: Phase | null, clientScreen: "home" | "setup") {
  // No server state yet: host-mode home/setup transition (pre-connection).
  if (!phase) {
    return clientScreen === "setup" ? <SetupScreen /> : <HomeScreen />;
  }
  switch (phase) {
    case "setup":
      return <SetupScreen />;
    case "lobby":
      return <LobbyScreen />;
    case "playing":
    case "ended":
      // GameScreen arrives in Group C.
      return (
        <div className="screen on">
          <div>اللعبة قيد الإنشاء…</div>
        </div>
      );
    default:
      return <HomeScreen />;
  }
}
