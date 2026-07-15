import type { Coordinate } from "@/lib/maps/types";
import type { RoutePlan } from "@/lib/route";

type RouteSearchCenterOptions = {
  maxCenters?: number;
  minDistanceMeters?: number;
  segmentSampleMeters?: number;
  maxSamplesPerSegment?: number;
};

const earthRadiusMeters = 6371000;

export function collectRouteSearchCenters(
  route: RoutePlan,
  {
    maxCenters = 8,
    minDistanceMeters = 650,
    segmentSampleMeters = 1200,
    maxSamplesPerSegment = 3,
  }: RouteSearchCenterOptions = {},
): Coordinate[] {
  const candidates: Coordinate[] = [];
  const stops = route.stops;

  stops.forEach((stop, index) => {
    const current = isGcj02Coordinate(stop.coordinate) ? stop.coordinate : null;

    if (index === 0 && current) {
      candidates.push(current);
    }

    const previous = stops[index - 1];
    const previousCoordinate = isGcj02Coordinate(previous?.coordinate)
      ? previous.coordinate
      : null;

    if (previousCoordinate && current) {
      candidates.push(
        ...sampleLegCenters(
          previousCoordinate,
          current,
          stop.walkingFromPrevious?.polyline ?? [],
          segmentSampleMeters,
          maxSamplesPerSegment,
        ),
      );
    }

    if (current && index > 0) {
      candidates.push(current);
    }
  });

  return dedupeByDistance(candidates, minDistanceMeters).slice(0, maxCenters);
}

function sampleLegCenters(
  origin: Coordinate,
  destination: Coordinate,
  polyline: Coordinate[],
  segmentSampleMeters: number,
  maxSamplesPerSegment: number,
) {
  const path = normalizeLegPath(origin, destination, polyline);
  const totalMeters = pathDistanceMeters(path);

  if (totalMeters <= 0) {
    return [];
  }

  const sampleCount =
    totalMeters < segmentSampleMeters
      ? 1
      : Math.min(
          maxSamplesPerSegment,
          Math.max(1, Math.floor(totalMeters / segmentSampleMeters)),
        );

  return Array.from({ length: sampleCount }, (_, index) =>
    pointAtDistance(path, (totalMeters * (index + 1)) / (sampleCount + 1)),
  ).filter((point): point is Coordinate => Boolean(point));
}

function normalizeLegPath(
  origin: Coordinate,
  destination: Coordinate,
  polyline: Coordinate[],
) {
  const validPolyline = polyline.filter(isGcj02Coordinate);
  const path = validPolyline.length >= 2 ? [...validPolyline] : [];

  if (path.length === 0 || distanceMeters(origin, path[0]) > 80) {
    path.unshift(origin);
  }

  if (distanceMeters(path[path.length - 1], destination) > 80) {
    path.push(destination);
  }

  return path;
}

function pointAtDistance(path: Coordinate[], targetMeters: number) {
  let walkedMeters = 0;

  for (let index = 1; index < path.length; index += 1) {
    const from = path[index - 1];
    const to = path[index];
    const legMeters = distanceMeters(from, to);

    if (walkedMeters + legMeters >= targetMeters) {
      const ratio = legMeters === 0 ? 0 : (targetMeters - walkedMeters) / legMeters;
      return {
        lng: from.lng + (to.lng - from.lng) * ratio,
        lat: from.lat + (to.lat - from.lat) * ratio,
        system: "gcj02" as const,
      };
    }

    walkedMeters += legMeters;
  }

  return path.at(-1) ?? null;
}

function dedupeByDistance(coordinates: Coordinate[], minDistanceMeters: number) {
  const accepted: Coordinate[] = [];

  coordinates.forEach((coordinate) => {
    if (
      !accepted.some(
        (existing) => distanceMeters(existing, coordinate) < minDistanceMeters,
      )
    ) {
      accepted.push(coordinate);
    }
  });

  return accepted;
}

function pathDistanceMeters(path: Coordinate[]) {
  return path.reduce(
    (sum, coordinate, index) =>
      index === 0 ? 0 : sum + distanceMeters(path[index - 1], coordinate),
    0,
  );
}

function distanceMeters(a: Coordinate, b: Coordinate) {
  const lat1 = toRadians(a.lat);
  const lat2 = toRadians(b.lat);
  const deltaLat = toRadians(b.lat - a.lat);
  const deltaLng = toRadians(b.lng - a.lng);
  const haversine =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLng / 2) ** 2;

  return (
    earthRadiusMeters *
    2 *
    Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine))
  );
}

function toRadians(degrees: number) {
  return (degrees * Math.PI) / 180;
}

function isGcj02Coordinate(
  coordinate?: Coordinate | null,
): coordinate is Coordinate {
  return Boolean(
    coordinate &&
      coordinate.system === "gcj02" &&
      Number.isFinite(coordinate.lng) &&
      Number.isFinite(coordinate.lat),
  );
}
