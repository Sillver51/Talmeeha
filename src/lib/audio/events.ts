import { ensureEngine, type EngineSettings } from "./engine";
import * as voices from "./voices";

const RED_ROOT = 440;        // A4
const RED_HARMONIC = 987.77; // B5
const BLUE_ROOT = 659.25;    // E5
const BLUE_HARMONIC = 987.77; // B5

const RED_CHORD: [number, number] = [220, 277.18];   // A3, C#4
const BLUE_CHORD: [number, number] = [246.94, 329.63]; // B3, E4

const CLUE_SHIMMER = [392.0, 493.88, 587.33]; // G4 B4 D5
const WRONG_HI = 466.16; // Bb4
const WRONG_LO = 440.0;  // A4

export function playClueSubmit(s: EngineSettings): void {
  const eng = ensureEngine(s);
  if (!eng) return;
  voices.shimmer(eng, CLUE_SHIMMER);
}

export function playReveal(
  team: "red" | "blue" | "neutral" | "assassin",
  s: EngineSettings,
): void {
  const eng = ensureEngine(s);
  if (!eng) return;
  if (team === "red") voices.chime(eng, RED_ROOT, RED_HARMONIC);
  else if (team === "blue") voices.chime(eng, BLUE_ROOT, BLUE_HARMONIC);
  else if (team === "neutral") voices.thud(eng);
  else voices.gong(eng);
}

export function playWrong(s: EngineSettings): void {
  const eng = ensureEngine(s);
  if (!eng) return;
  voices.descent(eng, WRONG_HI, WRONG_LO);
}

export function playTurnHandoff(team: "red" | "blue", s: EngineSettings): void {
  const eng = ensureEngine(s);
  if (!eng) return;
  voices.whoosh(eng, team === "red" ? RED_CHORD : BLUE_CHORD);
}

export function playTick(s: EngineSettings): void {
  const eng = ensureEngine(s);
  if (!eng) return;
  voices.tick(eng);
}

export function playWin(_team: "red" | "blue", s: EngineSettings): void {
  const eng = ensureEngine(s);
  if (!eng) return;
  voices.rastPhrase(eng);
}
