import { describe, expect, it } from "vitest";
import { routeRepositoryTestUtils } from "@/lib/repositories/route-repository";
import type { RouteStop } from "@/lib/route";
import type { Json } from "@/lib/supabase/database.types";

describe("route repository mapping", () => {
  it("preserves route role and provider metadata from cloud stop rows", () => {
    const stop = routeRepositoryTestUtils.mapStopFromRow({
      id: "stop-1",
      title_snapshot: "上海邮政博物馆",
      arrival_time: "10:30:00",
      stay_minutes: 45,
      note: {
        text: "高德已确认地点。",
        area: "虹口",
        address: "北苏州路 250 号",
        themes: ["历史", "建筑"],
        source: "amap",
        sourcePlaceId: "B001",
        coordinate: { lng: 121.49, lat: 31.24, system: "gcj02" },
        coordinateSystem: "gcj02",
        verificationStatus: "verified",
        mustVisit: true,
        routeRole: "middle",
        openingHours: "09:00-17:00",
        telephone: "021-12345678",
        providerRating: "4.7",
        providerCost: "35",
      } satisfies Json,
      walking_from_previous: null,
    });

    expect(stop).toEqual(
      expect.objectContaining({
        routeRole: "middle",
        openingHours: "09:00-17:00",
        telephone: "021-12345678",
        providerRating: "4.7",
        providerCost: "35",
        source: "amap",
        sourcePlaceId: "B001",
        verificationStatus: "verified",
      }),
    );
  });

  it("maps explicit start and end stops to navigation-only constraints", () => {
    const baseStop: RouteStop = {
      id: "stop",
      name: "站点",
      area: "南京",
      address: "地址",
      themes: ["历史"],
      stayMinutes: 0,
      routeRole: "start",
      source: "amap",
      sourcePlaceId: "B002",
      coordinate: { lng: 118.78, lat: 32.04, system: "gcj02" },
      coordinateSystem: "gcj02",
      verificationStatus: "verified",
      time: "09:00",
      note: "导航节点",
    };

    expect(routeRepositoryTestUtils.routeStopConstraintType(baseStop)).toBe(
      "start",
    );
    expect(
      routeRepositoryTestUtils.routeStopConstraintType({
        ...baseStop,
        routeRole: "end",
      }),
    ).toBe("end");
    expect(
      routeRepositoryTestUtils.placeInsertFromStop({
        ...baseStop,
        openingHours: "09:00-17:00",
        providerRating: "4.6",
      }).raw_provider_data,
    ).toEqual(
      expect.objectContaining({
        routeRole: "start",
        openingHours: "09:00-17:00",
        providerRating: "4.6",
      }),
    );
  });

  it("parses persisted route validation snapshots", () => {
    expect(
      routeRepositoryTestUtils.parseRouteValidation({
        checkedAt: "2026-07-16T00:00:00.000Z",
        issueCount: 1,
        issues: [
          {
            code: "fixed_time_conflict",
            severity: "error",
            stopId: "stop-2",
            message: "固定时间冲突",
          },
        ],
      }),
    ).toEqual(
      expect.objectContaining({
        issueCount: 1,
        issues: [
          expect.objectContaining({
            code: "fixed_time_conflict",
            stopId: "stop-2",
          }),
        ],
      }),
    );
  });
});
