"use client";

import { usePrefsStore } from "@/store/prefsStore";

interface SettingsSheetProps {
  open: boolean;
  onClose: () => void;
}

/** Accessibility settings: colorblind palette, reduced motion, digit style, sound. */
export default function SettingsSheet({ open, onClose }: SettingsSheetProps) {
  const palette = usePrefsStore((s) => s.palette);
  const reducedMotion = usePrefsStore((s) => s.reducedMotion);
  const digits = usePrefsStore((s) => s.digits);
  const sound = usePrefsStore((s) => s.sound);
  const update = usePrefsStore((s) => s.update);

  if (!open) return null;

  return (
    <div className="settings-wrap" role="dialog" aria-modal="true" aria-label="الإعدادات">
      <div className="settings-sheet">
        <div className="settings-head">
          <span className="settings-title">⚙ الإعدادات</span>
          <button className="btn btn-ghost btn-sm" onClick={onClose} aria-label="إغلاق">
            ✕
          </button>
        </div>

        <div className="settings-row">
          <span>ألوان مناسبة لعمى الألوان</span>
          <button
            className={palette === "colorblind" ? "toggle on" : "toggle"}
            role="switch"
            aria-checked={palette === "colorblind"}
            onClick={() => update("palette", palette === "colorblind" ? "default" : "colorblind")}
          >
            {palette === "colorblind" ? "مُفعّل" : "مُعطّل"}
          </button>
        </div>

        <div className="settings-row">
          <span>تقليل الحركة</span>
          <button
            className={reducedMotion === "on" ? "toggle on" : "toggle"}
            role="switch"
            aria-checked={reducedMotion === "on"}
            onClick={() => update("reducedMotion", reducedMotion === "on" ? "system" : "on")}
          >
            {reducedMotion === "on" ? "مُفعّل" : "تلقائي"}
          </button>
        </div>

        <div className="settings-row">
          <span>الأرقام</span>
          <button
            className="toggle"
            onClick={() => update("digits", digits === "eastern" ? "western" : "eastern")}
          >
            {digits === "eastern" ? "١٢٣ عربية" : "123 لاتينية"}
          </button>
        </div>

        <div className="settings-row">
          <span>الصوت</span>
          <button
            className={sound ? "toggle on" : "toggle"}
            role="switch"
            aria-checked={sound}
            onClick={() => update("sound", !sound)}
          >
            {sound ? "مُفعّل" : "مُعطّل"}
          </button>
        </div>
      </div>
    </div>
  );
}
