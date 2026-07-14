import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { demoRoute } from "@/lib/route";
import { generateRouteCandidates } from "@/lib/route-candidates";
import {
  createRouteSnapshot,
  readCandidateState,
  readCurrentCandidateState,
  readRoutePlan,
  readRouteSnapshots,
  saveCandidateState,
  saveRoutePlan,
} from "./storage";

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

describe("local storage helpers", () => {
  const originalWindow = globalThis.window;

  beforeEach(() => {
    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: {
        localStorage: new MemoryStorage(),
      },
    });
  });

  afterEach(() => {
    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: originalWindow,
    });
  });

  it("saves and reads a full route plan", () => {
    saveRoutePlan({
      ...demoRoute,
      title: "本地预案",
      stops: demoRoute.stops.slice(0, 3),
    });

    expect(readRoutePlan()).toEqual(
      expect.objectContaining({
        title: "本地预案",
        stops: expect.arrayContaining([
          expect.objectContaining({ id: "presidential-palace" }),
        ]),
      }),
    );
  });

  it("saves and reads candidate action state for a route", () => {
    const [candidate] = generateRouteCandidates(demoRoute, {
      themes: ["文学"],
      maxResults: 1,
    });

    saveCandidateState({
      routeId: "demo",
      candidates: [candidate],
      actions: {
        [candidate.id]: "backup",
      },
      updatedAt: "2026-07-14T00:00:00.000Z",
    });

    expect(readCandidateState("demo")).toEqual(
      expect.objectContaining({
        candidates: [candidate],
        actions: {
          [candidate.id]: "backup",
        },
      }),
    );
    expect(readCandidateState("other").actions).toEqual({});
  });

  it("reads candidate state for the current saved route", () => {
    saveRoutePlan({
      ...demoRoute,
      id: "cloud-route",
    });

    saveCandidateState({
      routeId: "cloud-route",
      candidates: [],
      actions: {
        "manual-stop": "joined",
      },
      updatedAt: "2026-07-14T00:00:00.000Z",
    });

    expect(readCurrentCandidateState().actions).toEqual({
      "manual-stop": "joined",
    });
  });

  it("creates versioned route snapshots", () => {
    const first = createRouteSnapshot(demoRoute);
    const second = createRouteSnapshot({
      ...demoRoute,
      title: "更新后的路线",
    });

    expect(first.version).toBe(1);
    expect(second.version).toBe(2);
    const snapshots = readRouteSnapshots("demo");

    expect(snapshots).toEqual([
      expect.objectContaining({ version: 2 }),
      expect.objectContaining({ version: 1 }),
    ]);
    expect(snapshots[0].route.title).toBe("更新后的路线");
  });
});
