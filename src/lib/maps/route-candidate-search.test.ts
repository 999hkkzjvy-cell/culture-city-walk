import { describe, expect, it, vi } from "vitest";
import {
  collectAmapPlacesAround,
  getAmapCandidateTypes,
  getAmapFailureDetail,
} from "@/lib/maps/route-candidate-search";
import type { PlaceCandidate } from "@/lib/maps/types";

const sixDynastiesMuseum: PlaceCandidate = {
  id: "amap:B001",
  source: "amap",
  sourcePlaceId: "B001",
  name: "六朝博物馆",
  address: "长江路 302 号",
  city: "南京市",
  district: "玄武区",
  adcode: "320102",
  coordinate: { lng: 118.797, lat: 32.0438, system: "gcj02" },
  poiType: "科教文化服务;博物馆",
  verificationStatus: "verified",
};

describe("route candidate AMap search", () => {
  it("uses stable AMap type codes for route candidate searches", () => {
    expect(getAmapCandidateTypes(["历史建筑", "博物馆", "餐厅"])).toBe(
      "110000|140000|050000",
    );
  });

  it("keeps successful sampled places when another AMap request fails", async () => {
    const providerSearch = vi
      .fn()
      .mockResolvedValueOnce([sixDynastiesMuseum])
      .mockRejectedValueOnce(new Error("Edge Function returned a non-2xx"));

    const result = await collectAmapPlacesAround({
      centers: [
        { lng: 118.797, lat: 32.0438, system: "gcj02" },
        { lng: 118.798, lat: 32.044, system: "gcj02" },
      ],
      city: "南京",
      types: "140000",
      radiusMeters: 1200,
      limit: 8,
      searchPlacesAround: providerSearch,
      timeoutMs: 100,
    });

    expect(providerSearch).toHaveBeenCalledTimes(2);
    expect(result.places).toEqual([sixDynastiesMuseum]);
    expect(result.failedCount).toBe(1);
    expect(result.firstError).toEqual(expect.any(Error));
  });

  it("redacts AMap keys from displayed failure details", () => {
    expect(
      getAmapFailureDetail(
        new Error("request failed: https://restapi.amap.com?key=secret-123&x=1"),
      ),
    ).toBe("request failed: https://restapi.amap.com?key=***&x=1");
  });
});
