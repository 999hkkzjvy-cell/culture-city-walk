import type { CandidatePlaceType } from "@/lib/route-candidates";
import type { Coordinate, MapProvider, PlaceCandidate } from "@/lib/maps/types";

export const AMAP_ROUTE_CANDIDATE_TIMEOUT_MS = 8000;

const amapCandidateTypesByPlaceType: Record<CandidatePlaceType, string[]> = {
  景点: ["110000"],
  博物馆: ["140000"],
  历史建筑: ["110000", "140000"],
  书店: ["060000", "140000"],
  咖啡馆: ["050000"],
  餐厅: ["050000"],
  公园: ["110000"],
};

type SearchPlacesAround = NonNullable<MapProvider["searchPlacesAround"]>;

type CollectAmapPlacesAroundInput = {
  centers: Coordinate[];
  city?: string;
  types: string;
  radiusMeters: number;
  limit: number;
  searchPlacesAround: SearchPlacesAround;
  timeoutMs?: number;
};

export type AmapPlacesAroundResult = {
  places: PlaceCandidate[];
  failedCount: number;
  firstError: unknown;
};

export function getAmapCandidateTypes(types: CandidatePlaceType[]) {
  return [
    ...new Set(types.flatMap((type) => amapCandidateTypesByPlaceType[type])),
  ].join("|");
}

export async function collectAmapPlacesAround({
  centers,
  city,
  types,
  radiusMeters,
  limit,
  searchPlacesAround,
  timeoutMs = AMAP_ROUTE_CANDIDATE_TIMEOUT_MS,
}: CollectAmapPlacesAroundInput): Promise<AmapPlacesAroundResult> {
  const results = await Promise.allSettled(
    centers.map((center) =>
      withTimeout(
        searchPlacesAround({
          center,
          city,
          types,
          radiusMeters,
          limit,
        }),
        timeoutMs,
      ),
    ),
  );
  const failed = results.filter(
    (result): result is PromiseRejectedResult => result.status === "rejected",
  );

  return {
    places: results.flatMap((result) =>
      result.status === "fulfilled" ? result.value : [],
    ),
    failedCount: failed.length,
    firstError: failed[0]?.reason,
  };
}

export function getAmapFailureDetail(error: unknown) {
  if (!(error instanceof Error) || !error.message) {
    return "";
  }

  return error.message.replace(/key=[^&\s)]+/gi, "key=***").slice(0, 80);
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timeoutId = globalThis.setTimeout(() => {
      reject(new Error("route_candidate_timeout"));
    }, timeoutMs);

    promise
      .then(resolve)
      .catch(reject)
      .finally(() => globalThis.clearTimeout(timeoutId));
  });
}
