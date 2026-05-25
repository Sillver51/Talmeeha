import { describe, it, expect } from "vitest";
import { arabicCount } from "@/lib/i18n/plural";
import type { ArabicCountForms } from "@/lib/i18n/plural";

const playerForms: ArabicCountForms = {
  one: "لاعب واحد",
  two: "لاعبان",
  plural: "لاعبين",
};

describe("arabicCount", () => {
  it("n=1 returns the singular form without a numeral", () => {
    expect(arabicCount(1, "1", playerForms)).toBe("لاعب واحد");
  });

  it("n=2 returns the dual form without a numeral", () => {
    expect(arabicCount(2, "2", playerForms)).toBe("لاعبان");
  });

  it("n=0 prefixes the formatted numeral before the plural", () => {
    expect(arabicCount(0, "0", playerForms)).toBe("0 لاعبين");
  });

  it("n=3 prefixes the formatted numeral before the plural", () => {
    expect(arabicCount(3, "3", playerForms)).toBe("3 لاعبين");
  });

  it("n=11 prefixes the formatted numeral before the plural", () => {
    expect(arabicCount(11, "11", playerForms)).toBe("11 لاعبين");
  });
});
