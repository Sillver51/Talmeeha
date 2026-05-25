"use client";

import { useGameStore } from "@/store/gameStore";
import type { ConnectionStatus } from "@/store/gameStore";

export interface BannerInfo {
  text: string;
  tone: "warn" | "error";
}

/** Pure: what the banner should show for a status, or null to hide. */
export function bannerForStatus(status: ConnectionStatus): BannerInfo | null {
  if (status === "reconnecting") return { text: "جارٍ إعادة الاتصال…", tone: "warn" };
  if (status === "offline") return { text: "انقطع الاتصال — تحقّق من الشبكة", tone: "error" };
  return null; // connecting + online show nothing
}

/**
 * Fixed top banner reflecting the socket connection lifecycle. Renders nothing
 * while connecting/online; shows a reconnecting (warn) or offline (error) strip
 * otherwise. Pure mapping lives in `bannerForStatus` for unit testing.
 */
export default function ConnectionBanner() {
  const status = useGameStore((s) => s.connectionStatus);
  const info = bannerForStatus(status);
  if (!info) return null;
  return (
    <div className={`conn-banner conn-${info.tone}`} role="status" aria-live="polite">
      {info.text}
    </div>
  );
}
