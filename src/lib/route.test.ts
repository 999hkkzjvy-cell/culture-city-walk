import { describe, expect, it } from "vitest";
import { calculateRouteTotals, demoRoute, getThemeSummary } from "./route";

describe("route helpers", () => {
  it("calculates walking and stay totals", () => {
    expect(calculateRouteTotals(demoRoute.stops)).toEqual({
      stayMinutes: 205,
      walkingMinutes: 52,
      walkingMeters: 3450,
    });
  });

  it("creates a readable theme summary", () => {
    expect(getThemeSummary(["文学", "建筑", "书店"])).toBe("文学、建筑、书店");
    expect(getThemeSummary([])).toBe("城市文化");
  });
});
