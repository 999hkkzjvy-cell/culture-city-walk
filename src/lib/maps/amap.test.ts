import { describe, expect, it } from "vitest";
import {
  amapPlaceSearchUrl,
  amapWalkingNavigationUrl,
  placeCandidateFromAmapPoi,
} from "./amap";

describe("amap url helpers", () => {
  it("creates search URLs when coordinates are not available", () => {
    expect(amapPlaceSearchUrl({ name: "先锋书店", city: "南京" })).toContain(
      "https://uri.amap.com/search?",
    );
    expect(amapPlaceSearchUrl({ name: "先锋书店", city: "南京" })).toContain(
      "keyword=%E5%85%88%E9%94%8B%E4%B9%A6%E5%BA%97",
    );
  });

  it("creates walking navigation URLs for GCJ-02 coordinates", () => {
    const url = amapWalkingNavigationUrl({
      from: {
        name: "A",
        coordinate: { lng: 118.78, lat: 32.05, system: "gcj02" },
      },
      to: {
        name: "B",
        coordinate: { lng: 118.79, lat: 32.06, system: "gcj02" },
      },
    });

    expect(url).toContain("https://uri.amap.com/navigation?");
    expect(url).toContain("mode=walk");
    expect(url).toContain("coordinate=gaode");
  });

  it("marks parsed AMap POIs as verified GCJ-02 places", () => {
    expect(
      placeCandidateFromAmapPoi({
        id: "poi-1",
        name: "测试地点",
        cityname: "南京市",
        location: "118.78,32.05",
        openingHours: "09:00-17:00",
        telephone: "025-12345678",
      }),
    ).toEqual(
      expect.objectContaining({
        source: "amap",
        sourcePlaceId: "poi-1",
        verificationStatus: "verified",
        coordinate: { lng: 118.78, lat: 32.05, system: "gcj02" },
        openingHours: "09:00-17:00",
        telephone: "025-12345678",
      }),
    );
  });
});
