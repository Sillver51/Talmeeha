"use client";

import { useEffect, useState } from "react";
import type { KeyboardEvent } from "react";
import Logo from "@/components/brand/Logo";
import { useGameStore } from "@/store/gameStore";

const onKey = (e: KeyboardEvent, fn: () => void) => {
  if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fn(); }
};

/**
 * Home screen — ports legacy `#s-home` (public/index.html ~651–677).
 * Mode toggle (host / online), host name → setup, online create/join.
 * Arabic copy is preserved verbatim from the legacy markup.
 */
export default function HomeScreen() {
  const mode = useGameStore((s) => s.mode);
  const selectMode = useGameStore((s) => s.selectMode);
  const startHostSetup = useGameStore((s) => s.startHostSetup);
  const createRoom = useGameStore((s) => s.createRoom);
  const joinRoom = useGameStore((s) => s.joinRoom);
  const pendingJoinCode = useGameStore((s) => s.pendingJoinCode);
  const setPendingJoinCode = useGameStore((s) => s.setPendingJoinCode);

  const [hostName, setHostName] = useState("");
  const [onlineName, setOnlineName] = useState("");
  const [code, setCode] = useState("");

  // Pre-fill the join code once when a deep-link (/?room=1234) supplies it.
  useEffect(() => {
    if (pendingJoinCode) {
      setCode(pendingJoinCode);
      setPendingJoinCode(null);
    }
  }, [pendingJoinCode, setPendingJoinCode]);

  return (
    <div className="screen on" id="s-home">
      <Logo tagline="لعبة الفرق والكلمات" mascot />
      <div className="card">
        <div className="card-title">🎮 اختر طريقة اللعب</div>
        <div className="mode-grid">
          <div
            className={mode === "host" ? "mode-card selected" : "mode-card"}
            id="mc-host"
            role="button"
            tabIndex={0}
            aria-pressed={mode === "host"}
            onClick={() => selectMode("host")}
            onKeyDown={(e) => onKey(e, () => selectMode("host"))}
          >
            <span className="mode-icon">🖥️</span>
            <div className="mode-title">وضع المضيف</div>
            <div className="mode-desc">أنت تضيف الأسماء وتتحكم — الشباب حواليك</div>
          </div>
          <div
            className={mode === "online" ? "mode-card selected" : "mode-card"}
            id="mc-online"
            role="button"
            tabIndex={0}
            aria-pressed={mode === "online"}
            onClick={() => selectMode("online")}
            onKeyDown={(e) => onKey(e, () => selectMode("online"))}
          >
            <span className="mode-icon">🌐</span>
            <div className="mode-title">وضع أونلاين</div>
            <div className="mode-desc">كل لاعب من جهازه برمز الغرفة</div>
          </div>
        </div>
        <div className="divider"></div>
        {mode === "host" ? (
          <div id="host-form">
            <input
              type="text"
              id="host-name"
              placeholder="اسمك (المضيف)"
              maxLength={18}
              value={hostName}
              onChange={(e) => setHostName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") startHostSetup(hostName);
              }}
            />
            <button
              className="btn btn-gold"
              onClick={() => startHostSetup(hostName)}
            >
              ✦ إعداد اللعبة
            </button>
          </div>
        ) : (
          <div id="online-form">
            <input
              type="text"
              id="inp-name"
              placeholder="اسمك في اللعبة"
              maxLength={18}
              value={onlineName}
              onChange={(e) => setOnlineName(e.target.value)}
            />
            <button
              className="btn btn-gold"
              onClick={() => createRoom(onlineName)}
            >
              📋 إنشاء غرفة
            </button>
            <div className="divider"></div>
            <input
              type="text"
              id="inp-code"
              placeholder="رمز الغرفة (4 أرقام)"
              maxLength={4}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              onKeyDown={(e) => {
                if (e.key === "Enter") joinRoom(code, onlineName);
              }}
            />
            <button
              className="btn btn-outline"
              onClick={() => joinRoom(code, onlineName)}
            >
              الانضمام <bdi>←</bdi>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
