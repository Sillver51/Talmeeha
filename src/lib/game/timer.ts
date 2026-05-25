export type TimerPreset = "relaxed" | "normal" | "blitz";

export interface TimerConfig {
  enabled: boolean;
  preset: TimerPreset;
  durationMs: number;
}

export const PRESETS: Record<TimerPreset, { durationMs: number; label: string }> = {
  relaxed: { durationMs: 90000, label: "مريح" },
  normal: { durationMs: 60000, label: "عادي" },
  blitz: { durationMs: 30000, label: "سريع" },
};

export const DEFAULT_TIMER: TimerConfig = {
  enabled: false,
  preset: "normal",
  durationMs: 60000,
};

export function applyTurnDeadline<R extends { timer?: TimerConfig }>(
  room: R,
  now: number,
): R & { turnDeadlineAt: number | null } {
  const t = room.timer;
  return { ...room, turnDeadlineAt: t?.enabled ? now + t.durationMs : null };
}

export function clearTurnDeadline<R>(room: R): R & { turnDeadlineAt: null } {
  return { ...room, turnDeadlineAt: null };
}
