export interface EngineSettings {
  sound: boolean;
  /** 0–100 */
  volume: number;
}

export interface Engine {
  ctx: AudioContext;
  master: GainNode;
  /** Update master gain in place from a fresh volume (0-100). */
  setVolume(volume: number): void;
}

let singleton: Engine | null = null;

function browserAudioContext(): typeof AudioContext | undefined {
  if (typeof window === "undefined") return undefined;
  const w = window as unknown as {
    AudioContext?: typeof AudioContext;
    webkitAudioContext?: typeof AudioContext;
  };
  return w.AudioContext ?? w.webkitAudioContext;
}

function volumeToGain(v: number): number {
  if (!Number.isFinite(v)) return 0.6;
  if (v <= 0) return 0;
  if (v >= 100) return 1;
  return v / 100;
}

/**
 * Lazily build (or return) the audio engine. Returns null when `sound` is off
 * or when no AudioContext implementation is available (SSR or older browser).
 *
 * Browser autoplay policies require the FIRST call to happen inside a user
 * gesture. Callers should invoke `ensureEngine()` on click/keydown, not on
 * page load.
 */
export function ensureEngine(s: EngineSettings): Engine | null {
  if (!s.sound) return null;
  if (singleton) return singleton;
  const Ctor = browserAudioContext();
  if (!Ctor) return null;
  const ctx = new Ctor();
  const master = ctx.createGain();
  master.gain.value = volumeToGain(s.volume);
  master.connect(ctx.destination);
  singleton = {
    ctx,
    master,
    setVolume(v: number) {
      master.gain.value = volumeToGain(v);
    },
  };
  if (ctx.state === "suspended") void ctx.resume();
  return singleton;
}

/** Tear down the engine. Used when the sound pref flips off, and in tests. */
export function destroyEngine(): void {
  if (!singleton) return;
  void singleton.ctx.close();
  singleton = null;
}
