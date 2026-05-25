"use client";

import { QRCodeSVG } from "qrcode.react";
import { usePrefsStore } from "@/store/prefsStore";
import { formatDigits } from "@/lib/i18n/digits";
import { useGameStore } from "@/store/gameStore";

interface RoomShareProps {
  code: string;
}

/** Shows the room code, a QR that deep-links to join, and a copy/share-link action. */
export default function RoomShare({ code }: RoomShareProps) {
  const toast = useGameStore((s) => s.toast);
  const digits = usePrefsStore((s) => s.digits);

  // SSR-safe: only build an absolute URL in the browser.
  const joinUrl =
    typeof window !== "undefined" ? `${window.location.origin}/?room=${code}` : `/?room=${code}`;

  const share = async () => {
    try {
      if (typeof navigator !== "undefined" && navigator.share) {
        await navigator.share({ title: "تلميحة 🍇", text: `انضم لغرفتي: ${code}`, url: joinUrl });
        return;
      }
      await navigator.clipboard.writeText(joinUrl);
      toast("تم نسخ الرابط 🍇");
    } catch {
      toast("تعذّر المشاركة");
    }
  };

  return (
    <div className="room-share">
      <div className="room-code-display" aria-label={`رمز الغرفة ${code}`}>
        {formatDigits(code, digits)}
      </div>
      <div className="room-qr" aria-hidden="true">
        <QRCodeSVG value={joinUrl} size={132} bgColor="transparent" fgColor="#EAEAFF" level="M" />
      </div>
      <button className="btn btn-outline w100" onClick={share}>
        🔗 مشاركة الرابط
      </button>
    </div>
  );
}
