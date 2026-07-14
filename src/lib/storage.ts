"use client";

import {
  defaultDraft,
  demoRoute,
  draftStorageKey,
  type RouteDraft,
  type RoutePlan,
} from "./route";
import type { RouteCandidate } from "./route-candidates";

export type StoredCandidateAction = "joined" | "backup" | "ignored";

export type StoredCandidateState = {
  routeId: string;
  candidates: RouteCandidate[];
  actions: Record<string, StoredCandidateAction>;
  updatedAt: string;
};

export type StoredRouteSnapshot = {
  id: string;
  routeId: string;
  version: number;
  route: RoutePlan;
  candidateState: StoredCandidateState;
  createdAt: string;
};

export const routePlanStorageKey = "cultural-citywalk:route-plan";
export const candidateStateStorageKey = "cultural-citywalk:candidate-state";
export const routeSnapshotsStorageKey = "cultural-citywalk:route-snapshots";
export const syncedRouteSignatureStorageKey =
  "cultural-citywalk:synced-route-signature";

export function readDraft(): RouteDraft {
  try {
    const raw = window.localStorage.getItem(draftStorageKey);
    if (!raw) {
      return defaultDraft;
    }
    return {
      ...defaultDraft,
      ...JSON.parse(raw),
    };
  } catch {
    return defaultDraft;
  }
}

export function saveDraft(draft: RouteDraft) {
  window.localStorage.setItem(
    draftStorageKey,
    JSON.stringify({
      ...draft,
      updatedAt: new Date().toISOString(),
    }),
  );
}

export function readRoutePlan(): RoutePlan {
  try {
    const raw = window.localStorage.getItem(routePlanStorageKey);

    if (!raw) {
      return demoRoute;
    }

    return normalizeRoutePlan(JSON.parse(raw));
  } catch {
    return demoRoute;
  }
}

export function saveRoutePlan(route: RoutePlan) {
  window.localStorage.setItem(
    routePlanStorageKey,
    JSON.stringify({
      ...route,
      updatedAt: new Date().toISOString(),
    }),
  );
}

export function readCandidateState(
  routeId = demoRoute.id,
): StoredCandidateState {
  try {
    const raw = window.localStorage.getItem(candidateStateStorageKey);

    if (!raw) {
      return emptyCandidateState(routeId);
    }

    const parsed = JSON.parse(raw) as Partial<StoredCandidateState>;

    if (parsed.routeId !== routeId || !parsed.actions) {
      return emptyCandidateState(routeId);
    }

    return {
      routeId,
      candidates: Array.isArray(parsed.candidates) ? parsed.candidates : [],
      actions: parsed.actions,
      updatedAt: parsed.updatedAt ?? new Date().toISOString(),
    };
  } catch {
    return emptyCandidateState(routeId);
  }
}

export function saveCandidateState(state: StoredCandidateState) {
  window.localStorage.setItem(
    candidateStateStorageKey,
    JSON.stringify({
      ...state,
      updatedAt: new Date().toISOString(),
    }),
  );
}

export function readCurrentCandidateState() {
  return readCandidateState(readRoutePlan().id);
}

export function readRouteSnapshots(routeId: string): StoredRouteSnapshot[] {
  try {
    const raw = window.localStorage.getItem(routeSnapshotsStorageKey);
    const snapshots = raw ? (JSON.parse(raw) as StoredRouteSnapshot[]) : [];

    return snapshots
      .filter((snapshot) => snapshot.routeId === routeId)
      .sort((a, b) => b.version - a.version);
  } catch {
    return [];
  }
}

export function readRouteSnapshot(snapshotId: string) {
  return readAllRouteSnapshots().find((snapshot) => snapshot.id === snapshotId);
}

export function createRouteSnapshot(
  route: RoutePlan,
  candidateState = readCandidateState(route.id),
): StoredRouteSnapshot {
  const snapshots = readAllRouteSnapshots();
  const latestVersion = snapshots
    .filter((snapshot) => snapshot.routeId === route.id)
    .reduce((max, snapshot) => Math.max(max, snapshot.version), 0);
  const createdAt = new Date().toISOString();
  const snapshot: StoredRouteSnapshot = {
    id: `${route.id}-${latestVersion + 1}-${Date.now()}`,
    routeId: route.id,
    version: latestVersion + 1,
    route: {
      ...route,
      updatedAt: createdAt,
    },
    candidateState: {
      ...candidateState,
      routeId: route.id,
      updatedAt: createdAt,
    },
    createdAt,
  };

  window.localStorage.setItem(
    routeSnapshotsStorageKey,
    JSON.stringify([snapshot, ...snapshots]),
  );

  return snapshot;
}

export function getRoutePlanSignature(route = readRoutePlan()) {
  return [
    route.id,
    route.updatedAt,
    route.stops.length,
    route.stops
      .map((stop) => `${stop.id}:${stop.time}:${stop.stayMinutes}`)
      .join("|"),
  ].join("::");
}

export function hasSyncedRoutePlan(route = readRoutePlan()) {
  return (
    window.localStorage.getItem(syncedRouteSignatureStorageKey) ===
    getRoutePlanSignature(route)
  );
}

export function markRoutePlanSynced(route = readRoutePlan()) {
  window.localStorage.setItem(
    syncedRouteSignatureStorageKey,
    getRoutePlanSignature(route),
  );
}

function readAllRouteSnapshots(): StoredRouteSnapshot[] {
  try {
    const raw = window.localStorage.getItem(routeSnapshotsStorageKey);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function normalizeRoutePlan(value: Partial<RoutePlan>): RoutePlan {
  return {
    ...demoRoute,
    ...value,
    themes: Array.isArray(value.themes) ? value.themes : demoRoute.themes,
    mustVisits: Array.isArray(value.mustVisits)
      ? value.mustVisits
      : demoRoute.mustVisits,
    stops: Array.isArray(value.stops) ? value.stops : demoRoute.stops,
  };
}

function emptyCandidateState(routeId: string): StoredCandidateState {
  return {
    routeId,
    candidates: [],
    actions: {},
    updatedAt: new Date().toISOString(),
  };
}
