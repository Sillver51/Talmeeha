import { describe, it, expect } from "vitest";
import { submitClueSchema, joinOnlineSchema } from "@/lib/schemas";

describe("schemas", () => {
  it("accepts a valid clue payload", () => {
    expect(submitClueSchema.safeParse({ code: "1234", word: "بحر", num: 2 }).success).toBe(true);
  });
  it("rejects a multi-word clue", () => {
    expect(submitClueSchema.safeParse({ code: "1234", word: "بحر كبير", num: 2 }).success).toBe(false);
  });
  it("rejects a bad room code", () => {
    expect(joinOnlineSchema.safeParse({ code: "12", name: "أحمد" }).success).toBe(false);
  });
});
