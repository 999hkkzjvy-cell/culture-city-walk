import { estimateWalkingLeg } from "@/lib/maps/fallback";
import type { PlaceCandidate } from "@/lib/maps/types";
import type { RouteTravelMode } from "@/lib/route";

export const routeTravelModes: RouteTravelMode[] = [
  "walking",
  "cycling",
  "transit",
  "driving",
  "taxi",
];

export const routeTravelModeLabels: Record<RouteTravelMode, string> = {
  walking: "步行",
  cycling: "骑行",
  transit: "公共交通",
  driving: "驾车",
  taxi: "打车",
};

const MODE_METERS_PER_MINUTE: Record<RouteTravelMode, number> = {
  walking: 75,
  cycling: 210,
  transit: 420,
  driving: 360,
  taxi: 400,
};

const MODE_BASE_MINUTES: Record<RouteTravelMode, number> = {
  walking: 0,
  cycling: 1,
  transit: 8,
  driving: 4,
  taxi: 5,
};

const MODE_MINUTES: Record<RouteTravelMode, number> = {
  walking: 1,
  cycling: 2,
  transit: 10,
  driving: 5,
  taxi: 6,
};

export function getRouteTravelModeLabel(mode?: RouteTravelMode) {
  return routeTravelModeLabels[mode ?? "walking"];
}

export function estimateTravelLeg(input: {
  origin: Pick<PlaceCandidate, "id" | "coordinate">;
  destination: Pick<PlaceCandidate, "id" | "coordinate">;
  mode?: RouteTravelMode;
}) {
  const mode = input.mode ?? "walking";
  const walkingLeg = estimateWalkingLeg(input);

  return {
    ...walkingLeg,
    durationMinutes: estimateTravelMinutes(
      walkingLeg.distanceMeters,
      mode,
      walkingLeg.durationMinutes,
    ),
    mode,
  };
}

export function estimateTravelMinutes(
  distanceMeters: number,
  mode: RouteTravelMode,
  walkingMinutes?: number,
) {
  if (distanceMeters <= 0) {
    return 0;
  }

  if (mode === "walking" && walkingMinutes !== undefined) {
    return walkingMinutes;
  }

  const minutes =
    MODE_BASE_MINUTES[mode] + distanceMeters / MODE_METERS_PER_MINUTE[mode];

  return Math.max(MODE_MINUTES[mode], Math.round(minutes));
}
