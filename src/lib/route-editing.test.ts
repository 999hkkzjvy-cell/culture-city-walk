import { describe, expect, it } from "vitest";
import { demoRoute } from "@/lib/route";
import { calculateRouteKernel } from "@/lib/route-kernel";
import { generateRouteCandidates } from "@/lib/route-candidates";
import {
  appendManualStopToRoute,
  appendPlaceCandidateToRoute,
  insertCandidateIntoRoute,
  moveRouteStop,
  removeRouteStop,
  updateRouteLegMinutes,
  updateRouteLegTravelMode,
  updateStopStayMinutes,
  updateStopNote,
} from "./route-editing";

describe("route editing", () => {
  it("inserts a candidate and recalculates walking legs and timeline", () => {
    const [candidate] = generateRouteCandidates(demoRoute, {
      themes: ["历史", "文学"],
      maxResults: 1,
    });
    const edited = insertCandidateIntoRoute(demoRoute, candidate);

    expect(edited.stops).toHaveLength(demoRoute.stops.length + 1);
    expect(edited.stops.map((stop) => stop.id)).toContain(candidate.id);
    expect(edited.stops.slice(1)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          walkingFromPrevious: expect.objectContaining({
            source: "estimated",
            provider: "local",
          }),
        }),
      ]),
    );
    expect(calculateRouteKernel(edited).issues).not.toContainEqual(
      expect.objectContaining({ code: "duplicate_poi" }),
    );
  });

  it("allows the same candidate to appear twice when explicitly inserted", () => {
    const [candidate] = generateRouteCandidates(demoRoute, {
      themes: ["历史"],
      maxResults: 1,
    });
    const once = insertCandidateIntoRoute(demoRoute, candidate);
    const twice = insertCandidateIntoRoute(once, candidate);

    expect(twice.stops).toHaveLength(once.stops.length + 1);
    expect(calculateRouteKernel(twice).issues).not.toContainEqual(
      expect.objectContaining({ code: "duplicate_poi" }),
    );
  });

  it("appends a manual stop with user-confirmed provenance", () => {
    const edited = appendManualStopToRoute(demoRoute, {
      name: "临时集合点",
      area: "鼓楼",
      address: "地铁口附近",
      stayMinutes: 20,
      themes: ["历史"],
    });
    const stop = edited.stops.at(-1);

    expect(stop).toEqual(
      expect.objectContaining({
        name: "临时集合点",
        source: "manual",
        verificationStatus: "user_confirmed",
        stayMinutes: 20,
      }),
    );
    expect(calculateRouteKernel(edited).legSource).toBe("estimated");
  });

  it("appends a verified AMap place with provider identity", () => {
    const edited = appendPlaceCandidateToRoute(demoRoute, {
      place: {
        id: "amap:B001905YQ1",
        source: "amap",
        sourcePlaceId: "B001905YQ1",
        name: "先锋书店(五台山总店)",
        address: "广州路173号",
        city: "南京市",
        district: "鼓楼区",
        adcode: "320106",
        coordinate: { lng: 118.773496, lat: 32.05072, system: "gcj02" },
        poiType: "购物服务;专卖店;书店",
        verificationStatus: "verified",
      },
      stayMinutes: 40,
      themes: ["书店", "文学"],
    });
    const stop = edited.stops.at(-1);

    expect(stop).toEqual(
      expect.objectContaining({
        source: "amap",
        sourcePlaceId: "B001905YQ1",
        verificationStatus: "verified",
        coordinate: { lng: 118.773496, lat: 32.05072, system: "gcj02" },
      }),
    );
    expect(
      appendPlaceCandidateToRoute(edited, {
        place: {
          id: "amap:B001905YQ1",
          source: "amap",
          sourcePlaceId: "B001905YQ1",
          name: "先锋书店(五台山总店)",
          address: "广州路173号",
          city: "南京市",
          district: "鼓楼区",
          adcode: "320106",
          coordinate: { lng: 118.773496, lat: 32.05072, system: "gcj02" },
          poiType: "购物服务;专卖店;书店",
          verificationStatus: "verified",
        },
        stayMinutes: 40,
        themes: ["书店", "文学"],
      }).stops,
    ).toHaveLength(edited.stops.length + 1);
  });

  it("can insert a confirmed place as the route start", () => {
    const edited = appendPlaceCandidateToRoute(demoRoute, {
      place: {
        id: "amap:start",
        source: "amap",
        sourcePlaceId: "start",
        name: "酒店",
        address: "集合点",
        city: "南京市",
        district: "鼓楼区",
        adcode: "320106",
        coordinate: { lng: 118.77, lat: 32.05, system: "gcj02" },
        poiType: "住宿服务",
        verificationStatus: "verified",
      },
      stayMinutes: 5,
      themes: ["历史"],
      placement: "start",
    });

    expect(edited.stops[0]).toEqual(
      expect.objectContaining({
        name: "酒店",
        sourcePlaceId: "start",
      }),
    );
  });

  it("moves a stop and recalculates route distance", () => {
    const moved = moveRouteStop(demoRoute, 1, 3);

    expect(moved.stops[3].id).toBe(demoRoute.stops[1].id);
    expect(moved.distanceKm).toBeGreaterThan(0);
    expect(calculateRouteKernel(moved).legSource).toBe("estimated");
  });

  it("updates stay minutes and keeps the value bounded", () => {
    const edited = updateStopStayMinutes(demoRoute, "librairie", 300);

    expect(edited.stops[0].stayMinutes).toBe(240);
    expect(calculateRouteKernel(edited).totalStayMinutes).toBeGreaterThan(
      calculateRouteKernel(demoRoute).totalStayMinutes,
    );
  });

  it("updates a leg travel mode and manual travel minutes", () => {
    const cycling = updateRouteLegTravelMode(demoRoute, "gym", "cycling");

    expect(cycling.stops[1].walkingFromPrevious).toEqual(
      expect.objectContaining({
        mode: "cycling",
        source: "estimated",
        provider: "local",
      }),
    );
    expect(cycling.stops[1].walkingFromPrevious?.minutes).toBeLessThan(
      demoRoute.stops[1].walkingFromPrevious?.minutes ?? 999,
    );

    const manual = updateRouteLegMinutes(cycling, "gym", 18);

    expect(manual.stops[1].walkingFromPrevious).toEqual(
      expect.objectContaining({
        mode: "cycling",
        minutes: 18,
        label: "手动调整",
      }),
    );
    expect(calculateRouteKernel(manual).stops[1].calculatedTime).toBe("10:33");
  });

  it("updates a stop note and recalculates the route", () => {
    const edited = updateStopNote(demoRoute, "librairie", "新的个人备注");

    expect(edited.stops[0].note).toBe("新的个人备注");
    expect(edited.updatedAt).not.toBe(demoRoute.updatedAt);
  });

  it("removes a stop while preserving at least start and end", () => {
    const edited = removeRouteStop(demoRoute, "gym");
    const twoStopRoute = {
      ...demoRoute,
      stops: demoRoute.stops.slice(0, 2),
    };

    expect(edited.stops.map((stop) => stop.id)).not.toContain("gym");
    expect(removeRouteStop(twoStopRoute, "gym").stops).toHaveLength(2);
  });

  it("allows removing the only stop from a new city draft route", () => {
    const oneStopRoute = {
      ...demoRoute,
      id: "local-shanghai-draft",
      city: "上海",
      stops: demoRoute.stops.slice(0, 1),
    };

    expect(removeRouteStop(oneStopRoute, "librairie").stops).toHaveLength(0);
  });
});
