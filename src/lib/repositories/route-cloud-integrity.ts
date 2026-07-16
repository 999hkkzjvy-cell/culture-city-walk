import type {
  RouteRepository,
  RouteSnapshotSummary,
  SavedRouteCandidate,
  SavedRouteSummary,
  ShareRecord,
} from "@/lib/repositories/route-repository";
import type { RouteCandidate } from "@/lib/route-candidates";
import type { RoutePlan } from "@/lib/route";
import type { StoredCandidateAction } from "@/lib/storage";

export type RouteCloudIntegrityInput = {
  route: RoutePlan;
  candidates: RouteCandidate[];
  actions?: Record<string, StoredCandidateAction>;
};

export type RouteCloudIntegrityReport = {
  saved: SavedRouteSummary;
  reloaded: RoutePlan;
  candidates: SavedRouteCandidate[];
  snapshot: RouteSnapshotSummary;
  share: ShareRecord;
  checks: string[];
};

export async function runRouteCloudIntegrityCheck(
  repository: RouteRepository,
  input: RouteCloudIntegrityInput,
): Promise<RouteCloudIntegrityReport> {
  const actions = input.actions ?? {};
  const saved = await repository.save(input.route);
  const reloaded = await repository.get(saved.id);

  if (!reloaded) {
    throw new Error("route_integrity_read_failed");
  }

  assertEqual(reloaded.title, saved.title, "route_integrity_title_mismatch");
  assertEqual(reloaded.city, saved.city, "route_integrity_city_mismatch");

  await repository.saveCandidates(saved.id, {
    candidates: input.candidates,
    actions,
  });
  const candidates = await repository.listCandidates(saved.id);

  if (candidates.length !== input.candidates.length) {
    throw new Error("route_integrity_candidates_mismatch");
  }

  const snapshot = await repository.createSnapshot(reloaded, {
    routeId: saved.id,
    candidates: input.candidates,
    actions,
    updatedAt: new Date().toISOString(),
  });
  const snapshotPayload = await repository.readSnapshot(snapshot.id);

  if (!snapshotPayload?.route || snapshotPayload.route.id !== saved.id) {
    throw new Error("route_integrity_snapshot_read_failed");
  }

  const share = await repository.createShare(saved.id);
  const shares = await repository.listShares(saved.id);

  if (!shares.some((item) => item.code === share.code)) {
    throw new Error("route_integrity_share_missing");
  }

  await repository.revokeShare(share.code);

  return {
    saved,
    reloaded,
    candidates,
    snapshot,
    share,
    checks: [
      "route_saved",
      "route_reloaded",
      "candidates_reloaded",
      "snapshot_reloaded",
      "share_created",
      "share_revoked",
    ],
  };
}

function assertEqual(actual: string, expected: string, errorCode: string) {
  if (actual !== expected) {
    throw new Error(errorCode);
  }
}
