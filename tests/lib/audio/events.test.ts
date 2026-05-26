import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/audio/voices", () => ({
  tone: vi.fn(),
  shimmer: vi.fn(),
  chime: vi.fn(),
  descent: vi.fn(),
  thud: vi.fn(),
  gong: vi.fn(),
  whoosh: vi.fn(),
  tick: vi.fn(),
  rastPhrase: vi.fn(),
}));

class FakeGainNode {
  gain = { value: 0, linearRampToValueAtTime: vi.fn(), setValueAtTime: vi.fn() };
  connect = vi.fn();
}
class FakeAudioContext {
  state = "running";
  destination = {};
  currentTime = 0;
  sampleRate = 44100;
  createGain() { return new FakeGainNode(); }
  resume = vi.fn(() => Promise.resolve());
  close = vi.fn(() => Promise.resolve());
}

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  (globalThis as unknown as { window: { AudioContext: typeof FakeAudioContext } }).window = {
    AudioContext: FakeAudioContext,
  } as never;
});

describe("audio events", () => {
  it("playClueSubmit dispatches shimmer", async () => {
    const voices = await import("@/lib/audio/voices");
    const { playClueSubmit } = await import("@/lib/audio/events");
    playClueSubmit({ sound: true, volume: 60 });
    expect(voices.shimmer).toHaveBeenCalledTimes(1);
  });

  it("playReveal('red') dispatches red-tuned chime", async () => {
    const voices = await import("@/lib/audio/voices");
    const { playReveal } = await import("@/lib/audio/events");
    playReveal("red", { sound: true, volume: 60 });
    expect(voices.chime).toHaveBeenCalledWith(expect.anything(), 440, 987.77);
  });

  it("playReveal('blue') dispatches blue-tuned chime", async () => {
    const voices = await import("@/lib/audio/voices");
    const { playReveal } = await import("@/lib/audio/events");
    playReveal("blue", { sound: true, volume: 60 });
    expect(voices.chime).toHaveBeenCalledWith(expect.anything(), 659.25, 987.77);
  });

  it("playReveal('neutral') dispatches thud", async () => {
    const voices = await import("@/lib/audio/voices");
    const { playReveal } = await import("@/lib/audio/events");
    playReveal("neutral", { sound: true, volume: 60 });
    expect(voices.thud).toHaveBeenCalledTimes(1);
  });

  it("playReveal('assassin') dispatches gong", async () => {
    const voices = await import("@/lib/audio/voices");
    const { playReveal } = await import("@/lib/audio/events");
    playReveal("assassin", { sound: true, volume: 60 });
    expect(voices.gong).toHaveBeenCalledTimes(1);
  });

  it("playWrong dispatches descent", async () => {
    const voices = await import("@/lib/audio/voices");
    const { playWrong } = await import("@/lib/audio/events");
    playWrong({ sound: true, volume: 60 });
    expect(voices.descent).toHaveBeenCalledTimes(1);
  });

  it("playTurnHandoff dispatches whoosh with team chord", async () => {
    const voices = await import("@/lib/audio/voices");
    const { playTurnHandoff } = await import("@/lib/audio/events");
    playTurnHandoff("red", { sound: true, volume: 60 });
    expect(voices.whoosh).toHaveBeenCalledWith(expect.anything(), [220, 277.18]);
  });

  it("playWin dispatches the Maqam Rast phrase", async () => {
    const voices = await import("@/lib/audio/voices");
    const { playWin } = await import("@/lib/audio/events");
    playWin("red", { sound: true, volume: 60 });
    expect(voices.rastPhrase).toHaveBeenCalledTimes(1);
  });

  it("does NOT dispatch any voice when sound is off", async () => {
    const voices = await import("@/lib/audio/voices");
    const events = await import("@/lib/audio/events");
    const settings = { sound: false, volume: 60 };
    events.playClueSubmit(settings);
    events.playReveal("blue", settings);
    events.playReveal("assassin", settings);
    events.playWrong(settings);
    events.playTurnHandoff("blue", settings);
    events.playTick(settings);
    events.playWin("red", settings);
    expect(voices.shimmer).not.toHaveBeenCalled();
    expect(voices.chime).not.toHaveBeenCalled();
    expect(voices.gong).not.toHaveBeenCalled();
    expect(voices.descent).not.toHaveBeenCalled();
    expect(voices.whoosh).not.toHaveBeenCalled();
    expect(voices.tick).not.toHaveBeenCalled();
    expect(voices.rastPhrase).not.toHaveBeenCalled();
  });
});
