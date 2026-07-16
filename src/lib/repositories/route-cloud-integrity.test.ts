import { describe, expect, it, vi } from "vitest";
import { runRouteCloudIntegrityCheck } from "@/lib/repositories/route-cloud-integrity";
import type { RouteRepository } from "@/lib/repositories/route-repository";
import { demoRoute } from "@/lib/route";
import { generateRouteCandidates } from "@/lib/route-candidates";

describe("route cloud integrity check", () => {
  it("checks route, candidates, snapshot and share lifecycle in order", async () => {
    const [candidate] = generateRouteCandidates(demoRoute, {
      themes: ["文学"],
      maxResults: 1,
    });
    const savedRoute = {
      id: "cloud-route",
      title: demoRoute.title,
      city: demoRoute.city,
      themes: demoRoute.themes,
      updatedAt: "2026-07-16T00:00:00.000Z",
      visibility: "private" as const,
      version: 1,
    };
    const repository = {
      list: vi.fn().mockResolvedValue([savedRoute]),
      save: vi.fn().mockResolvedValue(savedRoute),
      get: vi.fn().mockResolvedValue({ ...demoRoute, id: savedRoute.id }),
      saveCandidates: vi.fn().mockResolvedValue(undefined),
      listCandidates: vi.fn().mockResolvedValue([
        {
          candidate,
          status: "backup",
        },
      ]),
      createSnapshot: vi.fn().mockResolvedValue({
        id: "snapshot-1",
        routeId: savedRoute.id,
        version: 1,
        title: demoRoute.title,
        stopCount: demoRoute.stops.length,
        candidateCount: 1,
        createdAt: "2026-07-16T00:00:00.000Z",
      }),
      listSnapshots: vi.fn().mockResolvedValue([]),
      readSnapshot: vi.fn().mockResolvedValue({
        route: { ...demoRoute, id: savedRoute.id },
        candidateState: {
          routeId: savedRoute.id,
          candidates: [candidate],
          actions: { [candidate.id]: "backup" },
          updatedAt: "2026-07-16T00:00:00.000Z",
        },
      }),
      delete: vi.fn().mockResolvedValue(undefined),
      createShare: vi.fn().mockResolvedValue({
        code: "share-code",
        url: "/share/?code=share-code",
        expiresAt: null,
        allowCopy: false,
      }),
      listShares: vi.fn().mockResolvedValue([
        {
          code: "share-code",
          url: "/share/?code=share-code",
          expiresAt: null,
          allowCopy: false,
        },
      ]),
      revokeShare: vi.fn().mockResolvedValue(undefined),
    } satisfies RouteRepository;

    const report = await runRouteCloudIntegrityCheck(repository, {
      route: demoRoute,
      candidates: [candidate],
      actions: { [candidate.id]: "backup" },
    });

    expect(report.checks).toEqual([
      "route_saved",
      "route_reloaded",
      "candidates_reloaded",
      "snapshot_reloaded",
      "share_created",
      "share_revoked",
    ]);
    expect(repository.save).toHaveBeenCalledWith(demoRoute);
    expect(repository.get).toHaveBeenCalledWith("cloud-route");
    expect(repository.saveCandidates).toHaveBeenCalledWith("cloud-route", {
      candidates: [candidate],
      actions: { [candidate.id]: "backup" },
    });
    expect(repository.revokeShare).toHaveBeenCalledWith("share-code");
  });

  it("fails with a focused error when route reload is missing", async () => {
    const repository = {
      save: vi.fn().mockResolvedValue({
        id: "cloud-route",
        title: demoRoute.title,
        city: demoRoute.city,
        themes: demoRoute.themes,
        updatedAt: "2026-07-16T00:00:00.000Z",
        visibility: "private" as const,
        version: 1,
      }),
      get: vi.fn().mockResolvedValue(null),
    } as unknown as RouteRepository;

    await expect(
      runRouteCloudIntegrityCheck(repository, {
        route: demoRoute,
        candidates: [],
      }),
    ).rejects.toThrow("route_integrity_read_failed");
  });
});
