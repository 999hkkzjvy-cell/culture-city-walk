"use client";

import {
  createRouteRepository,
  type RouteRepository,
  type SavedRouteSummary,
} from "@/lib/repositories/route-repository";
import type { RoutePlan } from "@/lib/route";
import {
  markRoutePlanSynced,
  readCandidateState,
  readRoutePlan,
  routePlanStorageKey,
  saveCandidateState,
  saveRoutePlan,
  type StoredCandidateState,
} from "@/lib/storage";

export type SavedLocalRouteResult = {
  saved: SavedRouteSummary;
  route: RoutePlan;
  candidateState: StoredCandidateState;
  repository: RouteRepository;
};

export async function saveLocalRouteToCloud(
  repository = createRouteRepository(),
): Promise<SavedLocalRouteResult> {
  const route = readRoutePlan();
  const candidateState = readCandidateState(route.id);
  const saved = await repository.save(route);
  const syncedRoute: RoutePlan = {
    ...route,
    id: saved.id,
    title: saved.title,
    city: saved.city,
    themes: saved.themes,
    updatedAt: saved.updatedAt,
  };
  const syncedCandidateState: StoredCandidateState = {
    ...candidateState,
    routeId: saved.id,
    updatedAt: new Date().toISOString(),
  };

  await repository.saveCandidates(saved.id, {
    candidates: syncedCandidateState.candidates,
    actions: syncedCandidateState.actions,
  });

  saveRoutePlan(syncedRoute);
  saveCandidateState(syncedCandidateState);
  markRoutePlanSynced(syncedRoute);
  dispatchRoutePlanSynced();

  return {
    saved,
    route: syncedRoute,
    candidateState: syncedCandidateState,
    repository,
  };
}

function dispatchRoutePlanSynced() {
  window.dispatchEvent(
    new StorageEvent("storage", { key: routePlanStorageKey }),
  );
}
