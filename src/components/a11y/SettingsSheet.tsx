"use client";

import { useEffect, useRef } from "react";
import { usePrefsStore } from "@/store/prefsStore";
import InstallButton from "@/components/pwa/InstallButton";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";

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
  const closeRef = useRef<HTMLButtonElement>(null);

  // Dismiss on Escape; move focus to the close button when the dialog opens.
  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="settings-wrap"
      role="dialog"
      aria-modal="true"
      aria-label="الإعدادات"
      onClick={onClose}
    >
      <div className="settings-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="settings-head">
          <span className="settings-title">⚙ الإعدادات</span>
          <Button
            ref={closeRef}
            variant="ghost"
            size="sm"
            onClick={onClose}
            aria-label="إغلاق"
          >
            ✕
          </Button>
        </div>

        <div className="settings-row">
          <span>ألوان مناسبة لعمى الألوان</span>
          <Switch
            checked={palette === "colorblind"}
            onCheckedChange={(v) => update("palette", v ? "colorblind" : "default")}
            aria-label="ألوان مناسبة لعمى الألوان"
          />
        </div>

        <div className="settings-row">
          <span>تقليل الحركة</span>
          <Switch
            checked={reducedMotion === "on"}
            onCheckedChange={(v) => update("reducedMotion", v ? "on" : "system")}
            aria-label="تقليل الحركة"
          />
        </div>

        <div className="settings-row">
          <span id="set-digits-label">الأرقام</span>
          <Button
            variant="outline"
            size="sm"
            aria-labelledby="set-digits-label"
            aria-label={digits === "eastern" ? "الأرقام: عربية" : "الأرقام: لاتينية"}
            onClick={() => update("digits", digits === "eastern" ? "western" : "eastern")}
          >
            {digits === "eastern" ? "١٢٣ عربية" : "123 لاتينية"}
          </Button>
        </div>

        <div className="settings-row">
          <span>الصوت</span>
          <Switch checked={sound} onCheckedChange={(v) => update("sound", v)} aria-label="الصوت" />
        </div>

        <div className="settings-row">
          <span>تثبيت التطبيق</span>
          <InstallButton />
        </div>
      </div>
    </div>
  );
}
