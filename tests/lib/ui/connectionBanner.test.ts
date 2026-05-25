import { describe, it, expect } from "vitest";
import { bannerForStatus } from "@/components/system/ConnectionBanner";

describe("bannerForStatus", () => {
  it("shows a warn banner with Arabic copy while connecting", () => {
    const info = bannerForStatus("connecting");
    expect(info).not.toBeNull();
    expect(info?.tone).toBe("warn");
    expect(info?.text.trim().length).toBeGreaterThan(0);
  });

  it("shows nothing while online", () => {
    expect(bannerForStatus("online")).toBeNull();
  });

  it("shows a warn banner with Arabic copy while reconnecting", () => {
    const info = bannerForStatus("reconnecting");
    expect(info).not.toBeNull();
    expect(info?.tone).toBe("warn");
    expect(info?.text.trim().length).toBeGreaterThan(0);
  });

  it("shows an error banner with Arabic copy while offline", () => {
    const info = bannerForStatus("offline");
    expect(info).not.toBeNull();
    expect(info?.tone).toBe("error");
    expect(info?.text.trim().length).toBeGreaterThan(0);
  });
});
