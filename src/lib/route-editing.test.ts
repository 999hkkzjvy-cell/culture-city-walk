import { describe, expect, it } from "vitest";
import { demoRoute } from "@/lib/route";
import { calculateRouteKernel } from "@/lib/route-kernel";
import { generateRouteCandidates } from "@/lib/route-candidates";
import {
  insertCandidateIntoRoute,
  moveRouteStop,
  removeRouteStop,
  updateStopStayMinutes,
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

  it("does not insert the same candidate twice", () => {
    const [candidate] = generateRouteCandidates(demoRoute, {
      themes: ["历史"],
      maxResults: 1,
    });
    const once = insertCandidateIntoRoute(demoRoute, candidate);
    const twice = insertCandidateIntoRoute(once, candidate);

    expect(twice.stops).toHaveLength(once.stops.length);
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

  it("removes a stop while preserving at least start and end", () => {
    const edited = removeRouteStop(demoRoute, "gym");
    const twoStopRoute = {
      ...demoRoute,
      stops: demoRoute.stops.slice(0, 2),
    };

    expect(edited.stops.map((stop) => stop.id)).not.toContain("gym");
    expect(removeRouteStop(twoStopRoute, "gym").stops).toHaveLength(2);
  });
});
