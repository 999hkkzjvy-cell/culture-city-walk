import { describe, expect, it } from "vitest";
import type { MapProvider } from "@/lib/maps/types";
import { demoRoute } from "@/lib/route";
import { calculateRouteKernel } from "@/lib/route-kernel";
import { updateRouteLegTravelMode } from "@/lib/route-editing";
import { recalculateRouteWithProvider } from "./route-recalculation";

describe("route recalculation with map provider", () => {
  it("replaces estimated legs with provider-backed walking data", async () => {
    const provider: MapProvider = {
      async suggestPlaces() {
        return [];
      },
      async calculateWalkingRoute({ origin, destination }) {
        return {
          fromPlaceId: origin.id,
          toPlaceId: destination.id,
          distanceMeters: 900,
          durationMinutes: 12,
          source: "provider",
          provider: "amap",
          polyline: [
            { lng: 118.77, lat: 32.05, system: "gcj02" },
            { lng: 118.78, lat: 32.05, system: "gcj02" },
          ],
        };
      },
    };

    const result = await recalculateRouteWithProvider(demoRoute, provider);

    expect(result.providerLegs).toBe(demoRoute.stops.length - 1);
    expect(result.estimatedLegs).toBe(0);
    expect(calculateRouteKernel(result.route).legSource).toBe("provider");
    expect(result.route.stops[1].walkingFromPrevious).toEqual(
      expect.objectContaining({
        source: "provider",
        provider: "amap",
        distanceMeters: 900,
        minutes: 12,
      }),
    );
  });

  it("keeps a local estimate when the provider fails for a leg", async () => {
    const provider: MapProvider = {
      async suggestPlaces() {
        return [];
      },
      async calculateWalkingRoute() {
        throw new Error("amap unavailable");
      },
    };

    const result = await recalculateRouteWithProvider(demoRoute, provider);

    expect(result.providerLegs).toBe(0);
    expect(result.estimatedLegs).toBe(demoRoute.stops.length - 1);
    expect(result.errors[0]).toContain("amap unavailable");
    expect(calculateRouteKernel(result.route).legSource).toBe("estimated");
  });

  it("does not replace non-walking legs with walking provider data", async () => {
    const mixedRoute = updateRouteLegTravelMode(demoRoute, "gym", "cycling");
    const provider: MapProvider = {
      async suggestPlaces() {
        return [];
      },
      async calculateWalkingRoute({ origin, destination }) {
        return {
          fromPlaceId: origin.id,
          toPlaceId: destination.id,
          distanceMeters: 900,
          durationMinutes: 12,
          source: "provider",
          provider: "amap",
        };
      },
    };

    const result = await recalculateRouteWithProvider(mixedRoute, provider);

    expect(result.route.stops[1].walkingFromPrevious).toEqual(
      expect.objectContaining({
        mode: "cycling",
        source: "estimated",
        provider: "local",
      }),
    );
    expect(result.providerLegs).toBe(demoRoute.stops.length - 2);
  });
});
