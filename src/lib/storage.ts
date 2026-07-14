"use client";

import {
  defaultDraft,
  demoRoute,
  draftStorageKey,
  type RouteDraft,
  type RoutePlan,
} from "./route";

export type StoredCandidateAction = "joined" | "backup" | "ignored";

export type StoredCandidateState = {
  routeId: string;
  actions: Record<string, StoredCandidateAction>;
  updatedAt: string;
};

export const routePlanStorageKey = "cultural-citywalk:route-plan";
export const candidateStateStorageKey = "cultural-citywalk:candidate-state";

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
    actions: {},
    updatedAt: new Date().toISOString(),
  };
}
