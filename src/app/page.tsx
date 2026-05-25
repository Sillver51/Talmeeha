"use client";

import { useEffect, useState } from "react";
import PrefsEffect from "@/components/a11y/PrefsEffect";
import SettingsSheet from "@/components/a11y/SettingsSheet";
import Onboarding from "@/components/onboarding/Onboarding";
import PwaRegister from "@/components/pwa/PwaRegister";
import GameScreen from "@/components/screens/GameScreen";
import HomeScreen from "@/components/screens/HomeScreen";
import LobbyScreen from "@/components/screens/LobbyScreen";
import SetupScreen from "@/components/screens/SetupScreen";
import ConnectionBanner from "@/components/system/ConnectionBanner";
import RoomLostModal from "@/components/system/RoomLostModal";
import type { Phase } from "@/lib/types";
import { screenKey } from "@/lib/ui/screenKey";
import { useGameStore } from "@/store/gameStore";

/**
 * Thin client orchestrator (ports legacy `show()` / `render()` switch).
 * Opens the socket once on mount, then renders the active screen:
 *  - no `gs`            → host-mode `clientScreen` (home | setup)
 *  - `gs.phase`         → setup | lobby | game (playing/ended placeholder)
 * Toasts are rendered by the sonner `<Toaster/>` in layout; `<html dir="rtl">`
 * also lives in layout.
 */
export default function Home() {
  const connect = useGameStore((s) => s.connect);
  const gs = useGameStore((s) => s.gs);
  const clientScreen = useGameStore((s) => s.clientScreen);
  const selectMode = useGameStore((s) => s.selectMode);
  const setPendingJoinCode = useGameStore((s) => s.setPendingJoinCode);
  const [settingsOpen, setSettingsOpen] = useState(false);

  useEffect(() => {
    connect();
    const params = new URLSearchParams(window.location.search);
    const room = params.get("room");
    if (room && /^\d{4}$/.test(room)) {
      selectMode("online");
      setPendingJoinCode(room);
    }
  }, [connect, selectMode, setPendingJoinCode]);

  return (
    <>
      <PrefsEffect />
      <PwaRegister />
      <Onboarding />
      <button
        className="settings-gear"
        aria-label="الإعدادات"
        onClick={() => setSettingsOpen(true)}
      >
        ⚙
      </button>
      <div className="screen-enter" key={screenKey(gs?.phase ?? null, clientScreen)}>
        {renderScreen(gs?.phase ?? null, clientScreen)}
      </div>
      <SettingsSheet open={settingsOpen} onClose={() => setSettingsOpen(false)} />
      <ConnectionBanner />
      <RoomLostModal />
    </>
  );
}

function renderScreen(phase: Phase | null, clientScreen: "home" | "setup") {
  // No server state yet: host-mode home/setup transition (pre-connection).
  if (!phase) {
    return clientScreen === "setup" ? <SetupScreen /> : <HomeScreen />;
  }
  // Host gear during a game (legacy `show('setup')`): reconfigure mid-round.
  if (clientScreen === "setup") {
    return <SetupScreen />;
  }
  switch (phase) {
    case "setup":
      return <SetupScreen />;
    case "lobby":
      return <LobbyScreen />;
    case "playing":
    case "ended":
      return <GameScreen />;
    default:
      return <HomeScreen />;
  }
}
