import { describe, it, expect, vi, beforeEach } from "vitest";

class FakeGainNode {
  gain = { value: 0, linearRampToValueAtTime: vi.fn(), setValueAtTime: vi.fn() };
  connect = vi.fn();
}

class FakeAudioContext {
  state = "running";
  destination = {};
  currentTime = 0;
  sampleRate = 44100;
  createGain() {
    return new FakeGainNode();
  }
  resume = vi.fn(() => Promise.resolve());
  close = vi.fn(() => Promise.resolve());
}

beforeEach(() => {
  vi.resetModules();
  (globalThis as unknown as { window: { AudioContext: typeof FakeAudioContext } }).window = {
    AudioContext: FakeAudioContext,
  } as never;
});

describe("audio engine", () => {
  it("does not create an AudioContext when sound pref is false", async () => {
    const { ensureEngine } = await import("@/lib/audio/engine");
    const e = ensureEngine({ sound: false, volume: 60 });
    expect(e).toBeNull();
  });

  it("creates a singleton AudioContext when sound is true", async () => {
    const { ensureEngine } = await import("@/lib/audio/engine");
    const e1 = ensureEngine({ sound: true, volume: 60 });
    const e2 = ensureEngine({ sound: true, volume: 60 });
    expect(e1).not.toBeNull();
    expect(e1).toBe(e2);
  });

  it("applies master gain from volume (0-100 → 0-1)", async () => {
    const { ensureEngine } = await import("@/lib/audio/engine");
    const e = ensureEngine({ sound: true, volume: 50 });
    expect(e?.master.gain.value).toBeCloseTo(0.5, 2);
  });

  it("setVolume updates master gain in place", async () => {
    const { ensureEngine } = await import("@/lib/audio/engine");
    const e = ensureEngine({ sound: true, volume: 50 });
    e?.setVolume(80);
    expect(e?.master.gain.value).toBeCloseTo(0.8, 2);
  });

  it("destroyEngine releases the singleton and a fresh ensureEngine builds a new one", async () => {
    const { ensureEngine, destroyEngine } = await import("@/lib/audio/engine");
    const e1 = ensureEngine({ sound: true, volume: 60 });
    destroyEngine();
    const e2 = ensureEngine({ sound: true, volume: 60 });
    expect(e1).not.toBe(e2);
  });
});
