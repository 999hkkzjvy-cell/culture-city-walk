"use client";

import { defaultDraft, draftStorageKey, type RouteDraft } from "./route";

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
