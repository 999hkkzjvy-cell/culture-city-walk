import { describe, expect, it } from "vitest";
import { getOpeningHoursWarning } from "@/lib/opening-hours";
import type { RouteStop } from "@/lib/route";

describe("opening hours", () => {
  it("accepts multiple daily windows", () => {
    expect(
      getOpeningHoursWarning(
        stopWithOpeningHours("09:00-11:30, 13:00-17:00", "14:20"),
      ),
    ).toBe("");
    expect(
      getOpeningHoursWarning(
        stopWithOpeningHours("09:00-11:30, 13:00-17:00", "12:20"),
      ),
    ).toContain("可能不在开放时间内");
  });

  it("accepts overnight windows", () => {
    expect(
      getOpeningHoursWarning(stopWithOpeningHours("18:00-02:00", "01:30")),
    ).toBe("");
    expect(
      getOpeningHoursWarning(stopWithOpeningHours("18:00-02:00", "14:00")),
    ).toContain("可能不在开放时间内");
  });

  it("treats all-day opening as available", () => {
    expect(
      getOpeningHoursWarning(stopWithOpeningHours("全天开放", "03:20")),
    ).toBe("");
    expect(
      getOpeningHoursWarning(stopWithOpeningHours("24小时营业", "23:50")),
    ).toBe("");
  });

  it("uses weekday opening and closed-day hints when date is known", () => {
    const openingHours = "周二至周日 09:00-17:00，周一闭馆";

    expect(
      getOpeningHoursWarning(
        stopWithOpeningHours(openingHours, "10:30"),
        "10:30",
        "周一",
      ),
    ).toContain("当天可能闭馆");
    expect(
      getOpeningHoursWarning(
        stopWithOpeningHours(openingHours, "10:30"),
        "10:30",
        "周二",
      ),
    ).toBe("");
  });

  it("flags appointment and holiday notes for manual verification", () => {
    expect(
      getOpeningHoursWarning(
        stopWithOpeningHours("09:00-17:00，需提前预约", "10:00"),
      ),
    ).toContain("请出发前再次核验");
    expect(
      getOpeningHoursWarning(
        stopWithOpeningHours("节假日开放时间以景区公告为准", "10:00"),
      ),
    ).toContain("请出发前再次核验");
  });
});

function stopWithOpeningHours(
  openingHours: string,
  time: string,
): RouteStop {
  return {
    id: "test-stop",
    name: "测试地点",
    area: "南京",
    address: "测试地址",
    themes: ["历史"],
    stayMinutes: 30,
    time,
    note: "",
    openingHours,
  };
}
