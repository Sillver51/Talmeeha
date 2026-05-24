import { create } from "zustand";
import {
  DEFAULT_PREFS,
  mergePrefs,
  prefsDataAttributes,
  type Prefs,
} from "@/lib/a11y/prefs";

const PREFS_KEY = "talmeeha_prefs";

// SSR-safe storage — never touched at module load / during render.
function loadPrefs(): Prefs {
  if (typeof window === "undefined") return DEFAULT_PREFS;
  try {
    const s = window.localStorage.getItem(PREFS_KEY);
    if (s) return mergePrefs(DEFAULT_PREFS, JSON.parse(s) as Partial<Prefs>);
  } catch {
    // ignore corrupt persisted state
  }
  return DEFAULT_PREFS;
}

function savePrefs(p: Prefs): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(PREFS_KEY, JSON.stringify(p));
  } catch {
    // ignore quota / private-mode errors
  }
}

function applyToDocument(p: Prefs): void {
  if (typeof document === "undefined") return;
  const el = document.documentElement;
  for (const [k, v] of Object.entries(prefsDataAttributes(p))) el.setAttribute(k, v);
}

interface PrefsStore extends Prefs {
  hydrate(): void;
  update<K extends keyof Prefs>(key: K, value: Prefs[K]): void;
}

export const usePrefsStore = create<PrefsStore>((set, get) => ({
  ...DEFAULT_PREFS,
  hydrate() {
    const p = loadPrefs();
    applyToDocument(p);
    set(p);
  },
  update(key, value) {
    const current: Prefs = {
      palette: get().palette,
      reducedMotion: get().reducedMotion,
      digits: get().digits,
      sound: get().sound,
    };
    const next = mergePrefs(current, { [key]: value } as Partial<Prefs>);
    savePrefs(next);
    applyToDocument(next);
    set(next);
  },
}));
