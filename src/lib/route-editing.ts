import { estimateWalkingLeg } from "@/lib/maps/fallback";
import type { PlaceCandidate } from "@/lib/maps/types";
import type { RouteCandidate } from "@/lib/route-candidates";
import type { RoutePlan, RouteStop, Theme } from "@/lib/route";
import { calculateRouteKernel } from "@/lib/route-kernel";

export type ManualRouteStopInput = {
  name: string;
  area: string;
  address: string;
  stayMinutes: number;
  themes: Theme[];
  note?: string;
};

export function insertCandidateIntoRoute(
  route: RoutePlan,
  candidate: RouteCandidate,
): RoutePlan {
  const existingPlaceIds = new Set(
    route.stops.map((stop) => stop.sourcePlaceId ?? stop.id),
  );
  const candidatePlaceId = candidate.place.sourcePlaceId ?? candidate.place.id;

  if (existingPlaceIds.has(candidatePlaceId)) {
    return route;
  }

  const insertionIndex = Math.min(
    Math.max(candidate.insertionIndex + 1, 1),
    route.stops.length,
  );
  const candidateStop = routeStopFromCandidate(candidate);
  const stops = [
    ...route.stops.slice(0, insertionIndex),
    candidateStop,
    ...route.stops.slice(insertionIndex),
  ];

  return rebuildRouteFromStops(route, stops);
}

export function removeRouteStop(route: RoutePlan, stopId: string): RoutePlan {
  if (route.stops.length <= 2) {
    return route;
  }

  return rebuildRouteFromStops(
    route,
    route.stops.filter((stop) => stop.id !== stopId),
  );
}

export function appendManualStopToRoute(
  route: RoutePlan,
  input: ManualRouteStopInput,
): RoutePlan {
  const name = input.name.trim();

  if (!name) {
    return route;
  }

  const stopId = manualStopId(name);
  const manualStop: RouteStop = {
    id: stopId,
    name,
    area: input.area.trim() || route.city,
    address: input.address.trim() || "手工地点，地址待补充",
    themes: input.themes.length > 0 ? input.themes : route.themes.slice(0, 1),
    stayMinutes: Math.min(240, Math.max(5, Math.round(input.stayMinutes))),
    source: "manual",
    sourcePlaceId: stopId,
    coordinate: null,
    coordinateSystem: "gcj02",
    verificationStatus: "user_confirmed",
    time: "09:00",
    note:
      input.note?.trim() ||
      "手工确认地点。接入高德后可再补充坐标、开放状态和真实步行路线。",
  };

  return rebuildRouteFromStops(route, [...route.stops, manualStop]);
}

export function moveRouteStop(
  route: RoutePlan,
  fromIndex: number,
  toIndex: number,
): RoutePlan {
  if (
    fromIndex < 0 ||
    fromIndex >= route.stops.length ||
    toIndex < 0 ||
    toIndex >= route.stops.length ||
    fromIndex === toIndex
  ) {
    return route;
  }

  const stops = [...route.stops];
  const [moved] = stops.splice(fromIndex, 1);
  stops.splice(toIndex, 0, moved);

  return rebuildRouteFromStops(route, stops);
}

function manualStopId(name: string) {
  const slug =
    name
      .toLowerCase()
      .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 36) || "manual-stop";

  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `manual-${slug}-${crypto.randomUUID().slice(0, 8)}`;
  }

  return `manual-${slug}-${Date.now().toString(36)}`;
}

export function updateStopStayMinutes(
  route: RoutePlan,
  stopId: string,
  stayMinutes: number,
): RoutePlan {
  const safeStayMinutes = Math.min(240, Math.max(5, Math.round(stayMinutes)));

  return rebuildRouteFromStops(
    route,
    route.stops.map((stop) =>
      stop.id === stopId ? { ...stop, stayMinutes: safeStayMinutes } : stop,
    ),
  );
}

export function updateStopNote(
  route: RoutePlan,
  stopId: string,
  note: string,
): RoutePlan {
  return rebuildRouteFromStops(
    route,
    route.stops.map((stop) =>
      stop.id === stopId ? { ...stop, note: note.trim() } : stop,
    ),
  );
}

export function rebuildRouteFromStops(
  route: RoutePlan,
  stops: RouteStop[],
): RoutePlan {
  const stopsWithLegs = recalculateEstimatedLegs(stops);
  const kernel = calculateRouteKernel({ ...route, stops: stopsWithLegs });
  const timelineStops = kernel.stops.map((stop) => ({
    ...stop,
    time: stop.calculatedTime,
  }));

  return {
    ...route,
    distanceKm: Number((kernel.totalWalkingMeters / 1000).toFixed(1)),
    stops: timelineStops,
    updatedAt: new Date().toISOString(),
  };
}

function recalculateEstimatedLegs(stops: RouteStop[]): RouteStop[] {
  return stops.map((stop, index) => {
    if (index === 0) {
      const firstStop = { ...stop };
      delete firstStop.walkingFromPrevious;

      return firstStop;
    }

    const previousStop = stops[index - 1];
    const leg = estimateWalkingLeg({
      origin: routeStopAsPlaceCandidate(previousStop),
      destination: routeStopAsPlaceCandidate(stop),
    });

    return {
      ...stop,
      walkingFromPrevious: {
        minutes: leg.durationMinutes,
        distanceMeters: leg.distanceMeters,
        source: leg.source,
        provider: leg.provider,
      },
    };
  });
}

function routeStopFromCandidate(candidate: RouteCandidate): RouteStop {
  return {
    id: candidate.place.id,
    name: candidate.place.name,
    area: candidate.place.district ?? candidate.place.city,
    address: candidate.place.address ?? "地址待高德复核",
    themes: candidate.themes,
    stayMinutes: candidate.stayMinutes,
    source: candidate.place.source === "amap" ? "amap" : "manual",
    sourcePlaceId: candidate.place.sourcePlaceId,
    coordinate: candidate.place.coordinate,
    coordinateSystem: candidate.place.coordinate?.system,
    verificationStatus: candidate.place.verificationStatus,
    time: "09:00",
    note: `${candidate.placeType}候选点。${candidate.reasons[0] ?? "加入后会重新计算时间轴。"}`,
  };
}

function routeStopAsPlaceCandidate(
  stop: RouteStop,
): Pick<PlaceCandidate, "id" | "coordinate"> {
  return {
    id: stop.sourcePlaceId ?? stop.id,
    coordinate: stop.coordinate ?? null,
  };
}
