import { estimateWalkingLeg } from "@/lib/maps/fallback";
import type { MapProvider, PlaceCandidate } from "@/lib/maps/types";
import type { RoutePlan, RouteStop, RouteTravelMode } from "@/lib/route";
import { calculateRouteKernel } from "@/lib/route-kernel";
import { estimateTravelLeg } from "@/lib/transport";

export type RouteRecalculationResult = {
  route: RoutePlan;
  providerLegs: number;
  estimatedLegs: number;
  errors: string[];
};

export async function recalculateRouteWithProvider(
  route: RoutePlan,
  provider: MapProvider,
): Promise<RouteRecalculationResult> {
  const errors: string[] = [];
  let providerLegs = 0;
  let estimatedLegs = 0;
  const stops: RouteStop[] = [];

  for (const [index, stop] of route.stops.entries()) {
    if (index === 0) {
      const firstStop = { ...stop };
      delete firstStop.walkingFromPrevious;
      stops.push(firstStop);
      continue;
    }

    const previousStop = stops[index - 1];
    const origin = routeStopAsPlaceCandidate(previousStop);
    const destination = routeStopAsPlaceCandidate(stop);
    const mode = stop.walkingFromPrevious?.mode ?? "walking";

    const providerMode = toProviderMode(mode);

    if (provider.calculateRoute && providerMode) {
      const leg = await provider
        .calculateRoute({
          origin,
          destination,
          mode: providerMode,
          city: route.city,
          departureTime: stop.time,
        })
        .then((providerLeg) => {
          providerLegs += 1;
          return providerLeg;
        })
        .catch((error) => {
          estimatedLegs += 1;
          errors.push(
            error instanceof Error
              ? `${previousStop.name} → ${stop.name}: ${error.message}`
              : `${previousStop.name} → ${stop.name}: provider failed`,
          );
          return estimateTravelLeg({ origin, destination, mode });
        });

      stops.push({
        ...stop,
        walkingFromPrevious: {
          minutes: leg.durationMinutes,
          distanceMeters: leg.distanceMeters,
          mode,
          source: leg.source,
          provider: leg.provider,
          polyline: leg.polyline,
        },
      });
      continue;
    }

    if (mode !== "walking") {
      const estimatedLeg = estimateTravelLeg({ origin, destination, mode });
      estimatedLegs += 1;
      stops.push({
        ...stop,
        walkingFromPrevious: {
          minutes: estimatedLeg.durationMinutes,
          distanceMeters:
            estimatedLeg.distanceMeters ||
            stop.walkingFromPrevious?.distanceMeters ||
            0,
          mode,
          source: "estimated",
          provider: "local",
        },
      });
      continue;
    }

    const leg = await provider
      .calculateWalkingRoute({ origin, destination })
      .then((providerLeg) => {
        providerLegs += 1;
        return providerLeg;
      })
      .catch((error) => {
        estimatedLegs += 1;
        errors.push(
          error instanceof Error
            ? `${previousStop.name} → ${stop.name}: ${error.message}`
            : `${previousStop.name} → ${stop.name}: provider failed`,
        );
        return estimateWalkingLeg({ origin, destination });
      });

    stops.push({
      ...stop,
      walkingFromPrevious: {
        minutes: leg.durationMinutes,
        distanceMeters: leg.distanceMeters,
        mode: "walking",
        source: leg.source,
        provider: leg.provider,
        polyline: leg.polyline,
      },
    });
  }

  const kernel = calculateRouteKernel({ ...route, stops });
  const timelineStops = kernel.stops.map((stop) => ({
    ...stop,
    time: stop.calculatedTime,
  }));

  return {
    route: {
      ...route,
      distanceKm: Number((kernel.totalWalkingMeters / 1000).toFixed(1)),
      stops: timelineStops,
      updatedAt: new Date().toISOString(),
    },
    providerLegs,
    estimatedLegs,
    errors,
  };
}

function toProviderMode(mode: RouteTravelMode) {
  if (mode === "walking" || mode === "transit") {
    return mode;
  }

  if (mode === "driving" || mode === "taxi") {
    return "driving";
  }

  return null;
}

function routeStopAsPlaceCandidate(stop: RouteStop): PlaceCandidate {
  return {
    id: stop.sourcePlaceId ?? stop.id,
    source:
      stop.source === "amap"
        ? "amap"
        : stop.source === "manual"
          ? "manual"
          : "estimated",
    sourcePlaceId: stop.sourcePlaceId ?? null,
    name: stop.name,
    address: stop.address || null,
    city: "",
    district: stop.area || null,
    adcode: null,
    coordinate: stop.coordinate ?? null,
    poiType: null,
    verificationStatus: stop.verificationStatus ?? "source_pending",
  };
}
