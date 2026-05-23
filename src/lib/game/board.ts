import type { Card, CardType, Team } from "@/lib/types";
import { shuffle, type Rng, systemRng } from "./rng";
import { BOARD_SIZE } from "@/lib/words";

export function buildBoard(
  words: readonly string[],
  rng: Rng = systemRng,
): { board: Card[]; startTeam: Team } {
  const picked = shuffle(words, rng).slice(0, BOARD_SIZE);
  const startTeam: Team = rng() < 0.5 ? "red" : "blue";
  const other: Team = startTeam === "red" ? "blue" : "red";
  const types: CardType[] = [
    ...Array<CardType>(9).fill(startTeam),
    ...Array<CardType>(8).fill(other),
    ...Array<CardType>(7).fill("neutral"),
    "assassin",
  ];
  const shuffledTypes = shuffle(types, rng);
  const board: Card[] = picked.map((w, i) => ({ w, t: shuffledTypes[i]!, rv: false }));
  return { board, startTeam };
}
