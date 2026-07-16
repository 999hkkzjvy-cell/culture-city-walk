"use client";

import {
  defaultDraft,
  demoRoute,
  draftStorageKey,
  type RouteDraft,
  type RoutePlan,
  type RouteValidationSnapshot,
} from "./route";
import { createRouteValidationSnapshot } from "./route-kernel";
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

export type StoredJourneyState = {
  routeId: string;
  arrivedStopIds: string[];
  skippedStopIds: string[];
  updatedAt: string;
};

export type StoredCheckInPhoto = {
  id: string;
  routeId: string;
  stopId: string;
  fileName: string;
  mimeType: string;
  dataUrl: string;
  storagePath?: string | null;
  syncStatus?: "local" | "cloud";
  createdAt: string;
};

export type StoredJourneyArchive = {
  id: string;
  routeId: string;
  routeTitle: string;
  city: string;
  score: number;
  arrivedCount: number;
  skippedCount: number;
  photoCount: number;
  experienceStopCount: number;
  completedAt: string;
};

export type PlanningImportSource = {
  routeId: string;
  originalRouteId: string;
  source: "favorite" | "shared" | "route";
  label: string;
  importedAt: string;
};

export const routePlanStorageKey = "cultural-citywalk:route-plan";
export const candidateStateStorageKey = "cultural-citywalk:candidate-state";
export const routeSnapshotsStorageKey = "cultural-citywalk:route-snapshots";
export const journeyStateStorageKey = "cultural-citywalk:journey-state";
export const checkInPhotosStorageKey = "cultural-citywalk:check-in-photos";
export const journeyArchivesStorageKey =
  "cultural-citywalk:journey-archives";
export const favoriteRoutesStorageKey = "cultural-citywalk:favorite-routes";
export const planningImportSourceStorageKey =
  "cultural-citywalk:planning-import-source";
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
    JSON.stringify(withRouteValidation(route)),
  );
}

function withRouteValidation(route: RoutePlan): RoutePlan {
  return {
      ...route,
      updatedAt: new Date().toISOString(),
      validation: createRouteValidationSnapshot(route),
  };
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

export function readJourneyState(routeId: string): StoredJourneyState {
  try {
    const raw = window.localStorage.getItem(journeyStateStorageKey);
    const parsed = raw ? (JSON.parse(raw) as Partial<StoredJourneyState>) : {};

    if (parsed.routeId !== routeId) {
      return emptyJourneyState(routeId);
    }

    return {
      routeId,
      arrivedStopIds: Array.isArray(parsed.arrivedStopIds)
        ? parsed.arrivedStopIds
        : [],
      skippedStopIds: Array.isArray(parsed.skippedStopIds)
        ? parsed.skippedStopIds
        : [],
      updatedAt: parsed.updatedAt ?? new Date().toISOString(),
    };
  } catch {
    return emptyJourneyState(routeId);
  }
}

export function saveJourneyState(state: StoredJourneyState) {
  window.localStorage.setItem(
    journeyStateStorageKey,
    JSON.stringify({
      ...state,
      arrivedStopIds: [...new Set(state.arrivedStopIds)],
      skippedStopIds: [...new Set(state.skippedStopIds)],
      updatedAt: new Date().toISOString(),
    }),
  );
}

export function readCheckInPhotos(
  routeId: string,
  stopId?: string,
): StoredCheckInPhoto[] {
  try {
    const raw = window.localStorage.getItem(checkInPhotosStorageKey);
    const parsed = raw ? (JSON.parse(raw) as StoredCheckInPhoto[]) : [];
    const photos = Array.isArray(parsed) ? parsed : [];

    return photos
      .filter(
        (photo) =>
          photo.routeId === routeId && (!stopId || photo.stopId === stopId),
      )
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  } catch {
    return [];
  }
}

export function saveCheckInPhoto(photo: StoredCheckInPhoto) {
  const photos = readAllCheckInPhotos().filter((item) => item.id !== photo.id);

  window.localStorage.setItem(
    checkInPhotosStorageKey,
    JSON.stringify([photo, ...photos].slice(0, 80)),
  );
}

export function removeCheckInPhoto(photoId: string) {
  window.localStorage.setItem(
    checkInPhotosStorageKey,
    JSON.stringify(
      readAllCheckInPhotos().filter((photo) => photo.id !== photoId),
    ),
  );
}

export function readJourneyArchives(routeId?: string): StoredJourneyArchive[] {
  try {
    const raw = window.localStorage.getItem(journeyArchivesStorageKey);
    const parsed = raw ? JSON.parse(raw) : [];
    const archives = Array.isArray(parsed) ? parsed : [];

    return archives
      .filter(
        (archive): archive is StoredJourneyArchive =>
          typeof archive?.id === "string" &&
          typeof archive.routeId === "string" &&
          (!routeId || archive.routeId === routeId),
      )
      .sort((a, b) => b.completedAt.localeCompare(a.completedAt));
  } catch {
    return [];
  }
}

export function saveJourneyArchive(archive: StoredJourneyArchive) {
  const archives = readJourneyArchives().filter(
    (item) => item.id !== archive.id,
  );

  window.localStorage.setItem(
    journeyArchivesStorageKey,
    JSON.stringify([archive, ...archives].slice(0, 80)),
  );
}

export function readFavoriteRoutes(): RoutePlan[] {
  try {
    const raw = window.localStorage.getItem(favoriteRoutesStorageKey);
    const parsed = raw ? JSON.parse(raw) : [];

    return Array.isArray(parsed)
      ? parsed.map((route) => normalizeRoutePlan(route))
      : [];
  } catch {
    return [];
  }
}

export function isRouteFavorited(routeId: string) {
  return readFavoriteRoutes().some((route) => route.id === routeId);
}

export function toggleFavoriteRoute(route: RoutePlan) {
  const favorites = readFavoriteRoutes();
  const exists = favorites.some((item) => item.id === route.id);
  const nextFavorites = exists
    ? favorites.filter((item) => item.id !== route.id)
    : [
        {
          ...route,
          updatedAt: new Date().toISOString(),
        },
        ...favorites,
      ];

  window.localStorage.setItem(
    favoriteRoutesStorageKey,
    JSON.stringify(nextFavorites.slice(0, 50)),
  );

  return !exists;
}

export function importRouteForPlanning(
  route: RoutePlan,
  source: Pick<PlanningImportSource, "source" | "label">,
) {
  const importedAt = new Date().toISOString();
  const importedRoute: RoutePlan = {
    ...route,
    id: `local-import-${Date.now()}`,
    title: route.title.includes("（我的版本）")
      ? route.title
      : `${route.title}（我的版本）`,
    updatedAt: importedAt,
  };

  saveRoutePlan(importedRoute);
  saveDraft(importedRoute);
  saveCandidateState(emptyCandidateState(importedRoute.id));
  window.localStorage.setItem(
    planningImportSourceStorageKey,
    JSON.stringify({
      routeId: importedRoute.id,
      originalRouteId: route.id,
      source: source.source,
      label: source.label,
      importedAt,
    } satisfies PlanningImportSource),
  );

  return importedRoute;
}

export function readPlanningImportSource(): PlanningImportSource | null {
  try {
    const raw = window.localStorage.getItem(planningImportSourceStorageKey);

    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as Partial<PlanningImportSource>;

    if (!parsed.routeId || !parsed.originalRouteId || !parsed.label) {
      return null;
    }

    return {
      routeId: parsed.routeId,
      originalRouteId: parsed.originalRouteId,
      source:
        parsed.source === "shared" || parsed.source === "route"
          ? parsed.source
          : "favorite",
      label: parsed.label,
      importedAt: parsed.importedAt ?? new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

export function clearPlanningImportSource() {
  window.localStorage.removeItem(planningImportSourceStorageKey);
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

function readAllCheckInPhotos(): StoredCheckInPhoto[] {
  try {
    const raw = window.localStorage.getItem(checkInPhotosStorageKey);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function normalizeRoutePlan(value: Partial<RoutePlan>): RoutePlan {
  return {
    ...demoRoute,
    ...value,
    themes: Array.isArray(value.themes) ? value.themes : demoRoute.themes,
    mustVisits: Array.isArray(value.mustVisits)
      ? value.mustVisits
      : demoRoute.mustVisits,
    startTime:
      typeof value.startTime === "string" ? value.startTime : demoRoute.startTime,
    stops: Array.isArray(value.stops) ? value.stops : demoRoute.stops,
    validation: parseRouteValidation(value.validation),
  };
}

function parseRouteValidation(value: unknown): RouteValidationSnapshot | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }

  const snapshot = value as Partial<RouteValidationSnapshot>;

  if (!Array.isArray(snapshot.issues) || typeof snapshot.checkedAt !== "string") {
    return undefined;
  }

  const issues = snapshot.issues
    .filter(
      (issue) =>
        issue &&
        typeof issue === "object" &&
        typeof issue.message === "string" &&
        typeof issue.code === "string" &&
        (issue.severity === "warning" || issue.severity === "error"),
    )
    .map((issue) => ({
      code: issue.code,
      severity: issue.severity,
      stopId: typeof issue.stopId === "string" ? issue.stopId : undefined,
      message: issue.message,
    }));

  return {
    checkedAt: snapshot.checkedAt,
    issueCount:
      typeof snapshot.issueCount === "number" ? snapshot.issueCount : issues.length,
    issues,
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

function emptyJourneyState(routeId: string): StoredJourneyState {
  return {
    routeId,
    arrivedStopIds: [],
    skippedStopIds: [],
    updatedAt: new Date().toISOString(),
  };
}
