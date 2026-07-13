import type { PlaceCandidate, WalkingRouteLeg } from "@/lib/maps/types";

const WALKING_METERS_PER_MINUTE = 75;

export function estimateWalkingLeg(input: {
  origin: Pick<PlaceCandidate, "id" | "coordinate">;
  destination: Pick<PlaceCandidate, "id" | "coordinate">;
}): WalkingRouteLeg {
  if (!input.origin.coordinate || !input.destination.coordinate) {
    return {
      fromPlaceId: input.origin.id,
      toPlaceId: input.destination.id,
      distanceMeters: 0,
      durationMinutes: 0,
      source: "estimated",
      provider: "local",
    };
  }

  const distanceMeters = Math.round(
    haversineMeters(input.origin.coordinate, input.destination.coordinate) *
      1.25,
  );

  return {
    fromPlaceId: input.origin.id,
    toPlaceId: input.destination.id,
    distanceMeters,
    durationMinutes: Math.max(
      1,
      Math.round(distanceMeters / WALKING_METERS_PER_MINUTE),
    ),
    source: "estimated",
    provider: "local",
  };
}

function haversineMeters(
  origin: { lng: number; lat: number },
  destination: { lng: number; lat: number },
) {
  const earthRadiusMeters = 6371000;
  const lat1 = toRadians(origin.lat);
  const lat2 = toRadians(destination.lat);
  const deltaLat = toRadians(destination.lat - origin.lat);
  const deltaLng = toRadians(destination.lng - origin.lng);

  const a =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLng / 2) ** 2;

  return earthRadiusMeters * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function toRadians(value: number) {
  return (value * Math.PI) / 180;
}
