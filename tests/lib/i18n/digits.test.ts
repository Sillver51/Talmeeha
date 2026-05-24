import { describe, it, expect } from "vitest";
import { toEasternDigits, formatNumber, formatDigits } from "@/lib/i18n/digits";

describe("toEasternDigits", () => {
  it("maps western to eastern arabic digits", () => {
    expect(toEasternDigits("0123456789")).toBe("٠١٢٣٤٥٦٧٨٩");
  });
  it("leaves non-digit characters untouched", () => {
    expect(toEasternDigits("رمز 1234")).toBe("رمز ١٢٣٤");
  });
});

describe("formatNumber", () => {
  it("western style returns plain digits", () => {
    expect(formatNumber(42, "western")).toBe("42");
  });
  it("eastern style converts", () => {
    expect(formatNumber(42, "eastern")).toBe("٤٢");
  });
});

describe("formatDigits", () => {
  it("converts embedded digits for eastern", () => {
    expect(formatDigits("تبقّى 2 تخمينات", "eastern")).toBe("تبقّى ٢ تخمينات");
  });
  it("passes a string through unchanged for western", () => {
    expect(formatDigits("تبقّى 2 تخمينات", "western")).toBe("تبقّى 2 تخمينات");
  });
});
