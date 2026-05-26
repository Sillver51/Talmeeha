import type { Engine } from "./engine";

type OscType = "sine" | "triangle" | "square" | "sawtooth";

interface ToneOpts {
  freq: number;
  type?: OscType;
  /** Attack in seconds (default 0.01). */
  attack?: number;
  /** Decay in seconds (default 0.18). */
  decay?: number;
  /** Peak gain 0-1 (default 0.4). */
  peak?: number;
  /** Offset in seconds from now (default 0). */
  at?: number;
}

/** Schedule a single tone with a linear-ramp envelope. */
export function tone(eng: Engine, opts: ToneOpts): void {
  const { freq, type = "sine", attack = 0.01, decay = 0.18, peak = 0.4, at = 0 } = opts;
  const t0 = eng.ctx.currentTime + at;
  const osc = eng.ctx.createOscillator();
  const env = eng.ctx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  env.gain.setValueAtTime(0, t0);
  env.gain.linearRampToValueAtTime(peak, t0 + attack);
  env.gain.linearRampToValueAtTime(0, t0 + attack + decay);
  osc.connect(env).connect(eng.master);
  osc.start(t0);
  osc.stop(t0 + attack + decay + 0.02);
}

/** Two-or-three-note ascending shimmer. */
export function shimmer(eng: Engine, freqs: number[]): void {
  freqs.forEach((f, i) =>
    tone(eng, { freq: f, type: "triangle", at: i * 0.08, peak: 0.25, decay: 0.22 }),
  );
}

/** Team-tuned reveal chime: a root sine + bright triangle harmonic. */
export function chime(eng: Engine, root: number, harmonic: number): void {
  tone(eng, { freq: root, type: "sine", peak: 0.35, decay: 0.25 });
  tone(eng, { freq: harmonic, type: "triangle", peak: 0.18, decay: 0.25 });
}

/** Two-note minor descent for wrong-color reveal. */
export function descent(eng: Engine, hi: number, lo: number): void {
  tone(eng, { freq: hi, type: "sine", peak: 0.3, decay: 0.12 });
  tone(eng, { freq: lo, type: "sine", at: 0.1, peak: 0.3, decay: 0.16 });
}

/** Soft mallet thud for neutral reveal. */
export function thud(eng: Engine, freq = 220): void {
  tone(eng, { freq, type: "sine", peak: 0.32, attack: 0.005, decay: 0.08 });
}

/** Deep gong + reverb-ish tail for assassin reveal. */
export function gong(eng: Engine, root = 65.4): void {
  tone(eng, { freq: root, type: "sine", peak: 0.45, attack: 0.005, decay: 1.6 });
  tone(eng, { freq: root * 1.5, type: "sawtooth", peak: 0.18, attack: 0.005, decay: 1.4 });
}

/** Band-passed white-noise whoosh + a two-note team chord. */
export function whoosh(eng: Engine, chord: [number, number]): void {
  const t0 = eng.ctx.currentTime;
  const buf = eng.ctx.createBuffer(1, Math.floor(eng.ctx.sampleRate * 0.35), eng.ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * 0.4;
  const src = eng.ctx.createBufferSource();
  src.buffer = buf;
  const filt = eng.ctx.createBiquadFilter();
  filt.type = "bandpass";
  filt.frequency.value = 800;
  filt.Q.value = 0.7;
  const env = eng.ctx.createGain();
  env.gain.setValueAtTime(0, t0);
  env.gain.linearRampToValueAtTime(0.22, t0 + 0.05);
  env.gain.linearRampToValueAtTime(0, t0 + 0.32);
  src.connect(filt).connect(env).connect(eng.master);
  src.start(t0);
  src.stop(t0 + 0.36);
  tone(eng, { freq: chord[0], type: "triangle", at: 0.05, peak: 0.18, decay: 0.28 });
  tone(eng, { freq: chord[1], type: "triangle", at: 0.05, peak: 0.18, decay: 0.28 });
}

/** Quiet metronome tick — used for the under-10s timer layer. */
export function tick(eng: Engine): void {
  tone(eng, { freq: 1200, type: "square", peak: 0.06, attack: 0.001, decay: 0.04 });
}

/** Ascending sequence in Maqam Rast (D-E-F#-G-A-Bb) for the win phrase. */
export function rastPhrase(eng: Engine): void {
  const notes = [146.83, 164.81, 184.99, 195.99, 220.0, 233.08];
  notes.forEach((f, i) =>
    tone(eng, { freq: f, type: "triangle", at: i * 0.15, peak: 0.25, decay: 0.2 }),
  );
}
