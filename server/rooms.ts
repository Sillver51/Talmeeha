import type { GameState } from "@/lib/types";

export interface RoomStore {
  get(code: string): GameState | undefined;
  set(code: string, room: GameState): void;
  delete(code: string): void;
  all(): IterableIterator<[string, GameState]>;
  genCode(): string;
}

export function createStore(): RoomStore {
  const rooms = new Map<string, GameState>();
  return {
    get: (c) => rooms.get(c),
    set: (c, r) => {
      rooms.set(c, r);
    },
    delete: (c) => {
      rooms.delete(c);
    },
    all: () => rooms.entries(),
    genCode: () => {
      let code: string;
      do {
        code = String(Math.floor(1000 + Math.random() * 9000));
      } while (rooms.has(code));
      return code;
    },
  };
}

export const store = createStore();
