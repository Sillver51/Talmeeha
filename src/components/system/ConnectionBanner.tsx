"use client";

import { useGameStore } from "@/store/gameStore";
import type { ConnectionStatus } from "@/store/gameStore";

export interface BannerInfo {
  text: string;
  tone: "warn" | "error";
}

/** Pure: what the banner should show for a status, or null to hide. */
export function bannerForStatus(status: ConnectionStatus): BannerInfo | null {
  if (status === "connecting") return { text: "جارٍ الاتصال…", tone: "warn" };
  if (status === "reconnecting") return { text: "جارٍ إعادة الاتصال…", tone: "warn" };
  if (status === "offline") return { text: "انقطع الاتصال — تحقّق من الشبكة", tone: "error" };
  return null; // online shows nothing
}

/**
 * Fixed top banner reflecting the socket connection lifecycle. Renders nothing
 * while online; shows connecting/reconnecting (warn) or offline (error) strip
 * otherwise. Pure mapping lives in `bannerForStatus` for unit testing.
 * Hidden when roomLost is true (avoids z-index overlap with RoomLostModal).
 */
export default function ConnectionBanner() {
  const status = useGameStore((s) => s.connectionStatus);
  const roomLost = useGameStore((s) => s.roomLost);
  const info = bannerForStatus(status);
  if (roomLost || !info) return null;
  return (
    <div
      className={`conn-banner conn-${info.tone}`}
      role="status"
      aria-live={info.tone === "error" ? "assertive" : "polite"}
      aria-atomic="true"
    >
      {info.text}
    </div>
  );
}
