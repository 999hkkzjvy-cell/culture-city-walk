import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { saveLocalRouteToCloud } from "@/lib/repositories/route-cloud-sync";
import type {
  RouteRepository,
  SavedRouteSummary,
} from "@/lib/repositories/route-repository";
import { demoRoute } from "@/lib/route";
import { generateRouteCandidates } from "@/lib/route-candidates";
import {
  readCandidateState,
  readRoutePlan,
  saveCandidateState,
  saveRoutePlan,
} from "@/lib/storage";

class MemoryStorage {
  private readonly values = new Map<string, string>();

  getItem(key: string) {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string) {
    this.values.set(key, value);
  }

  removeItem(key: string) {
    this.values.delete(key);
  }
}

describe("route cloud sync", () => {
  const originalWindow = globalThis.window;
  const savedRoute: SavedRouteSummary = {
    id: "cloud-route",
    title: "云端路线",
    city: "南京",
    themes: demoRoute.themes,
    updatedAt: "2026-07-15T00:00:00.000Z",
    visibility: "private",
    version: 1,
  };

  beforeEach(() => {
    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: {
        localStorage: new MemoryStorage(),
        dispatchEvent: vi.fn(),
        StorageEvent: class {},
      },
    });
    Object.defineProperty(globalThis, "StorageEvent", {
      configurable: true,
      value: class {},
    });
  });

  afterEach(() => {
    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: originalWindow,
    });
    Reflect.deleteProperty(globalThis, "StorageEvent");
  });

  it("migrates local demo route and candidate state to the saved cloud route id", async () => {
    const [candidate] = generateRouteCandidates(demoRoute, {
      themes: ["文学"],
      maxResults: 1,
    });
    const repository = {
      save: vi.fn().mockResolvedValue(savedRoute),
      saveCandidates: vi.fn().mockResolvedValue(undefined),
    } as unknown as RouteRepository;

    saveRoutePlan(demoRoute);
    saveCandidateState({
      routeId: demoRoute.id,
      candidates: [candidate],
      actions: { [candidate.id]: "backup" },
      updatedAt: "2026-07-15T00:00:00.000Z",
    });

    const result = await saveLocalRouteToCloud(repository);

    expect(result.saved.id).toBe("cloud-route");
    expect(repository.save).toHaveBeenCalledWith(
      expect.objectContaining({ id: "demo" }),
    );
    expect(repository.saveCandidates).toHaveBeenCalledWith("cloud-route", {
      candidates: [candidate],
      actions: { [candidate.id]: "backup" },
    });
    expect(readRoutePlan().id).toBe("cloud-route");
    expect(readCandidateState("cloud-route")).toEqual(
      expect.objectContaining({
        candidates: [candidate],
        actions: { [candidate.id]: "backup" },
      }),
    );
  });

  it("keeps the saved cloud route id when candidate sync fails", async () => {
    const repository = {
      save: vi.fn().mockResolvedValue(savedRoute),
      saveCandidates: vi.fn().mockRejectedValue(new Error("candidate_failed")),
    } as unknown as RouteRepository;

    saveRoutePlan(demoRoute);

    const result = await saveLocalRouteToCloud(repository);

    expect(result.candidateSyncFailed).toBe(true);
    expect(readRoutePlan().id).toBe("cloud-route");
    expect(readCandidateState("cloud-route").routeId).toBe("cloud-route");
  });
});
