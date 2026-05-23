import { describe, it, expect } from "vitest";
import { createStore } from "../../server/rooms";
import type { GameState } from "@/lib/types";

describe("room store", () => {
  it("generates unique 4-digit codes and stores rooms", () => {
    const store = createStore();
    const code = store.genCode();
    expect(code).toMatch(/^\d{4}$/);
    store.set(code, { code } as unknown as GameState);
    expect(store.get(code)).toBeDefined();
    expect(store.genCode()).not.toBe(code);
  });
  it("deletes rooms", () => {
    const store = createStore();
    store.set("1111", { code: "1111" } as unknown as GameState);
    store.delete("1111");
    expect(store.get("1111")).toBeUndefined();
  });
});
