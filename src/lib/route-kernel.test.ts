import { describe, expect, it } from "vitest";
import {
  calculateRouteKernel,
  calculateTimeline,
  validateRouteStops,
} from "./route-kernel";
import type { RoutePlan, RouteStop } from "./route";

const baseStop: RouteStop = {
  id: "start",
  name: "起点",
  area: "鼓楼",
  address: "起点路 1 号",
  themes: ["历史"],
  stayMinutes: 20,
  time: "09:00",
  note: "起点说明",
};

function stop(overrides: Partial<RouteStop>): RouteStop {
  return {
    ...baseStop,
    ...overrides,
  };
}

describe("route kernel", () => {
  it("calculates a timeline from walking legs and stay time", () => {
    const timeline = calculateTimeline([
      stop({ id: "a", name: "A", time: "09:00", stayMinutes: 30 }),
      stop({
        id: "b",
        name: "B",
        time: "09:40",
        stayMinutes: 20,
        walkingFromPrevious: {
          minutes: 15,
          distanceMeters: 900,
          source: "estimated",
          provider: "local",
        },
      }),
      stop({
        id: "c",
        name: "C",
        time: "10:05",
        stayMinutes: 10,
        walkingFromPrevious: {
          minutes: 10,
          distanceMeters: 600,
          source: "estimated",
          provider: "local",
        },
      }),
    ]);

    expect(timeline.map((item) => item.calculatedTime)).toEqual([
      "09:00",
      "09:45",
      "10:15",
    ]);
  });

  it("reports fixed appointment conflicts", () => {
    const issues = validateRouteStops([
      stop({
        id: "a",
        name: "A",
        time: "09:00",
        stayMinutes: 60,
        fixedTime: true,
      }),
      stop({
        id: "b",
        name: "B",
        time: "09:30",
        stayMinutes: 20,
        fixedTime: true,
        walkingFromPrevious: {
          minutes: 10,
          distanceMeters: 700,
          source: "estimated",
          provider: "local",
        },
      }),
    ]);

    expect(issues).toContainEqual(
      expect.objectContaining({
        code: "fixed_time_conflict",
        stopId: "b",
        severity: "error",
      }),
    );
  });

  it("allows duplicate POIs for loops and return routes", () => {
    const issues = validateRouteStops([
      stop({ id: "a", name: "A", sourcePlaceId: "amap-1" }),
      stop({
        id: "b",
        name: "B",
        sourcePlaceId: "amap-1",
        walkingFromPrevious: {
          minutes: 10,
          distanceMeters: 700,
          source: "provider",
          provider: "amap",
        },
      }),
    ]);

    expect(issues).not.toContainEqual(
      expect.objectContaining({ code: "duplicate_poi" }),
    );
  });

  it("keeps estimated legs distinct from provider legs", () => {
    const route: RoutePlan = {
      id: "route-1",
      city: "南京",
      title: "测试路线",
      mode: "complete",
      dateLabel: "今天",
      durationHours: 3,
      walkingRangeKm: "3-5 km",
      themes: ["历史"],
      mustVisits: [],
      pace: "轻松漫步",
      updatedAt: "2026-07-14T00:00:00.000Z",
      distanceKm: 1.2,
      stops: [
        stop({ id: "a", name: "A", time: "09:00", stayMinutes: 20 }),
        stop({
          id: "b",
          name: "B",
          time: "09:30",
          stayMinutes: 20,
          walkingFromPrevious: {
            minutes: 10,
            distanceMeters: 700,
            source: "estimated",
            provider: "local",
          },
        }),
      ],
    };

    expect(calculateRouteKernel(route)).toEqual(
      expect.objectContaining({
        legSource: "estimated",
        totalMinutes: 50,
        totalWalkingMeters: 700,
      }),
    );
  });

  it("requires at least a start and an end stop", () => {
    expect(
      validateRouteStops([stop({ id: "only", name: "Only" })]),
    ).toContainEqual(
      expect.objectContaining({
        code: "missing_required_stop",
        severity: "error",
      }),
    );
  });
});
