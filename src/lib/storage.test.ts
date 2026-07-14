import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { demoRoute } from "@/lib/route";
import {
  readCandidateState,
  readRoutePlan,
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
    saveCandidateState({
      routeId: "demo",
      actions: {
        "local:nanjing-library": "backup",
      },
      updatedAt: "2026-07-14T00:00:00.000Z",
    });

    expect(readCandidateState("demo").actions).toEqual({
      "local:nanjing-library": "backup",
    });
    expect(readCandidateState("other").actions).toEqual({});
  });
});
