import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { demoRoute } from "@/lib/route";
import { buildPlaceVerificationProfile } from "./place-verification";

describe("place verification profile", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("collects opening, reservation, ticket and source references", () => {
    vi.setSystemTime(new Date("2026-07-16T10:00:00.000Z"));
    const stop = {
      ...demoRoute.stops[2],
      openingHours: "周二至周日 09:00-17:00，周一闭馆，需预约",
      telephone: "025-12345678",
      providerCost: "35.00",
    };

    const profile = buildPlaceVerificationProfile({
      city: demoRoute.city,
      dateLabel: demoRoute.dateLabel,
      stop,
      time: "11:30",
    });

    expect(profile.status).toBe("warning");
    expect(profile.openingNotice).toContain("高德开放时间");
    expect(profile.ticketNotice).toContain("门票");
    expect(profile.reservationNotice).toContain("预约");
    expect(profile.sourceReferences.map((source) => source.label)).toEqual([
      "官方公告搜索",
      "门票/预约搜索",
      "高德地点页",
      "电话核验 025-12345678",
    ]);
    expect(profile.checkedAt).toBe("2026-07-16T10:00:00.000Z");
  });
});
