import { describe, expect, it } from "vitest";
import { collectRouteSearchCenters } from "@/lib/maps/route-search-centers";
import type { RoutePlan, RouteStop } from "@/lib/route";

describe("route search centers", () => {
  it("samples long provider polylines instead of using one fixed midpoint", () => {
    const route = routeWithStops([
      stop("start", 118.7, 32),
      {
        ...stop("end", 118.75, 32),
        walkingFromPrevious: {
          minutes: 60,
          distanceMeters: 4700,
          mode: "walking",
          source: "provider",
          provider: "amap",
          polyline: [
            { lng: 118.7, lat: 32, system: "gcj02" },
            { lng: 118.715, lat: 32.003, system: "gcj02" },
            { lng: 118.735, lat: 32.001, system: "gcj02" },
            { lng: 118.75, lat: 32, system: "gcj02" },
          ],
        },
      },
    ]);

    const centers = collectRouteSearchCenters(route, {
      maxCenters: 8,
      minDistanceMeters: 200,
      segmentSampleMeters: 1000,
      maxSamplesPerSegment: 3,
    });

    expect(centers).toHaveLength(5);
    expect(centers[0]).toEqual({ lng: 118.7, lat: 32, system: "gcj02" });
    expect(centers.at(-1)).toEqual({
      lng: 118.75,
      lat: 32,
      system: "gcj02",
    });
  });

  it("dedupes dense downtown points before limiting API samples", () => {
    const route = routeWithStops([
      stop("one", 118.7, 32),
      stop("two", 118.7005, 32.0004),
      stop("three", 118.701, 32.0008),
      stop("four", 118.73, 32.01),
    ]);

    const centers = collectRouteSearchCenters(route, {
      maxCenters: 4,
      minDistanceMeters: 650,
      segmentSampleMeters: 1200,
    });

    expect(centers.length).toBeLessThanOrEqual(4);
    expect(centers[0].lng).toBeCloseTo(118.7);
    expect(centers.at(-1)?.lng).toBeCloseTo(118.73);
  });
});

function routeWithStops(stops: RouteStop[]): RoutePlan {
  return {
    id: "route-search-centers-test",
    city: "南京",
    title: "采样测试",
    mode: "complete",
    dateLabel: "今天",
    startTime: "09:30",
    durationHours: 4,
    walkingRangeKm: "5-10 km",
    themes: ["历史"],
    mustVisits: [],
    pace: "轻松漫步",
    updatedAt: "2026-07-16T00:00:00.000Z",
    distanceKm: 5,
    stops,
  };
}

function stop(id: string, lng: number, lat: number): RouteStop {
  return {
    id,
    name: id,
    area: "南京",
    address: "",
    themes: ["历史"],
    stayMinutes: 30,
    routeRole: "middle",
    source: "amap",
    sourcePlaceId: id,
    coordinate: { lng, lat, system: "gcj02" },
    coordinateSystem: "gcj02",
    verificationStatus: "verified",
    time: "09:30",
    note: "",
  };
}
