import { describe, expect, it } from "vitest";
import { demoRoute } from "@/lib/route";
import {
  generateRouteCandidatesFromPlaces,
  generateRouteCandidates,
  getCandidateBandLabel,
} from "@/lib/route-candidates";

describe("route candidates", () => {
  it("scores and sorts local fallback candidates", () => {
    const candidates = generateRouteCandidates(demoRoute, {
      themes: ["历史", "文学"],
      maxResults: 4,
    });

    expect(candidates).toHaveLength(4);
    expect(candidates.map((candidate) => candidate.score)).toEqual(
      [...candidates.map((candidate) => candidate.score)].sort((a, b) => b - a),
    );
  });

  it("keeps candidate provenance clear while API keys are deferred", () => {
    const [candidate] = generateRouteCandidates(demoRoute, {
      themes: ["历史"],
      maxResults: 1,
    });

    expect(candidate.place.source).toBe("manual");
    expect(candidate.place.verificationStatus).toBe("source_pending");
    expect(candidate.risks).toContain("地点信息待高德复核");
    expect(getCandidateBandLabel(candidate.fitBand)).toMatch(
      /非常顺路|推荐|可考虑/,
    );
  });

  it("filters candidates by accepted place types", () => {
    const candidates = generateRouteCandidates(demoRoute, {
      themes: ["历史"],
      acceptedTypes: ["博物馆"],
      maxResults: 5,
    });

    expect(candidates).toHaveLength(2);
    expect(
      candidates.every((candidate) => candidate.placeType === "博物馆"),
    ).toBe(true);
  });

  it("turns AMap nearby places into route-aware candidates", () => {
    const candidates = generateRouteCandidatesFromPlaces(
      demoRoute,
      [
        {
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
        },
        {
          id: "amap:B002",
          source: "amap",
          sourcePlaceId: "B002",
          name: "附近咖啡",
          address: "长江路",
          city: "南京市",
          district: "玄武区",
          adcode: "320102",
          coordinate: { lng: 118.798, lat: 32.044, system: "gcj02" },
          poiType: "餐饮服务;咖啡厅",
          verificationStatus: "verified",
        },
      ],
      {
        themes: ["历史", "文学"],
        acceptedTypes: ["博物馆"],
        maxResults: 3,
      },
    );

    expect(candidates).toHaveLength(1);
    expect(candidates[0]).toEqual(
      expect.objectContaining({
        placeType: "博物馆",
        stayMinutes: 50,
        insertionIndex: expect.any(Number),
        fitBand: expect.any(String),
        risks: [],
      }),
    );
  });

  it("rejects nearby duplicate AMap places with similar names", () => {
    const candidates = generateRouteCandidatesFromPlaces(
      demoRoute,
      [
        {
          id: "amap:B010",
          source: "amap",
          sourcePlaceId: "B010",
          name: "先锋书店五台山店",
          address: "广州路 173 号",
          city: "南京市",
          district: "鼓楼区",
          adcode: "320106",
          coordinate: { lng: 118.77342, lat: 32.05262, system: "gcj02" },
          poiType: "购物服务;专卖店;书店",
          verificationStatus: "verified",
        },
      ],
      {
        themes: ["文学", "书店"],
        acceptedTypes: ["书店"],
        maxResults: 3,
      },
    );

    expect(candidates).toHaveLength(0);
  });

  it("does not turn supermarket POIs into scenic fallback candidates", () => {
    const candidates = generateRouteCandidatesFromPlaces(
      demoRoute,
      [
        {
          id: "amap:B020",
          source: "amap",
          sourcePlaceId: "B020",
          name: "苏果超市",
          address: "长江路",
          city: "南京市",
          district: "玄武区",
          adcode: "320102",
          coordinate: { lng: 118.799, lat: 32.044, system: "gcj02" },
          poiType: "购物服务;超级市场;超市",
          verificationStatus: "verified",
        },
      ],
      {
        themes: ["历史"],
        acceptedTypes: ["景点", "书店", "餐厅"],
        maxResults: 3,
      },
    );

    expect(candidates).toHaveLength(0);
  });
});
