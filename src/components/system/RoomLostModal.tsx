"use client";

import { useGameStore } from "@/store/gameStore";

/**
 * Recovery modal shown when a reconnect's `rejoin` fails (room gone / server
 * restarted). Returns the player to the home screen instead of leaving them
 * stranded on a now-dead board. Reuses the shared `.modal-wrap`/`.modal` styles.
 */
export default function RoomLostModal() {
  const roomLost = useGameStore((s) => s.roomLost);
  const goHome = useGameStore((s) => s.goHome);
  if (!roomLost) return null;
  return (
    <div className="modal-wrap" role="dialog" aria-modal="true" aria-label="انقطع الاتصال بالغرفة">
      <div className="modal">
        <div style={{ fontSize: "2rem", marginBottom: ".5rem" }} aria-hidden="true">
          🔌
        </div>
        <h2>انقطع الاتصال بالغرفة</h2>
        <p className="muted">انتهت الجلسة أو أُغلقت الغرفة. يمكنك العودة والبدء من جديد.</p>
        <button className="btn btn-gold" onClick={goHome}>
          العودة للرئيسية
        </button>
      </div>
    </div>
  );
}
