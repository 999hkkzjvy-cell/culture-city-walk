import { describe, expect, it } from "vitest";
import { buildAmapRouteGeometry } from "./amap-js";
import { demoRoute } from "@/lib/route";

describe("AMap JS route geometry", () => {
  it("builds stop markers and estimated route connectors from GCJ-02 stops", () => {
    const geometry = buildAmapRouteGeometry(demoRoute);

    expect(geometry.stopPoints).toHaveLength(demoRoute.stops.length);
    expect(geometry.providerLines).toHaveLength(0);
    expect(geometry.estimatedLines).toHaveLength(demoRoute.stops.length - 1);
    expect(geometry.estimatedLines[0].path).toEqual([
      [118.7734, 32.0526],
      [118.7716, 32.055],
    ]);
  });

  it("uses provider polyline when a walking leg has provider geometry", () => {
    const route = {
      ...demoRoute,
      stops: demoRoute.stops.map((stop, index) =>
        index === 1
          ? {
              ...stop,
              walkingFromPrevious: {
                ...stop.walkingFromPrevious,
                minutes: 8,
                distanceMeters: 500,
                mode: "walking" as const,
                source: "provider" as const,
                provider: "amap" as const,
                polyline: [
                  { lng: 118.7734, lat: 32.0526, system: "gcj02" as const },
                  { lng: 118.7722, lat: 32.0538, system: "gcj02" as const },
                  { lng: 118.7716, lat: 32.055, system: "gcj02" as const },
                ],
              },
            }
          : stop,
      ),
    };
    const geometry = buildAmapRouteGeometry(route);

    expect(geometry.providerLines).toHaveLength(1);
    expect(geometry.providerLines[0].path).toHaveLength(3);
    expect(geometry.estimatedLines).toHaveLength(demoRoute.stops.length - 2);
  });
});
