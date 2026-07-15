import { describe, expect, it } from "vitest";
import { demoRoute } from "@/lib/route";
import {
  generateRouteCandidatesFromPlaces,
  generateRouteCandidates,
  getCandidateBandLabel,
  refineCandidatesWithProviderDetours,
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

  it("does not leak Nanjing local fallback candidates into other cities", () => {
    const shanghaiRoute = {
      ...demoRoute,
      city: "上海",
      stops: [],
    };
    const blankCityRoute = {
      ...demoRoute,
      city: "",
      stops: [],
    };

    expect(
      generateRouteCandidates(shanghaiRoute, {
        themes: ["历史", "建筑"],
        maxResults: 5,
      }),
    ).toHaveLength(0);
    expect(
      generateRouteCandidates(blankCityRoute, {
        themes: ["历史", "建筑"],
        maxResults: 5,
      }),
    ).toHaveLength(0);
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
        risks: ["开放时间待现场核验"],
      }),
    );
  });

  it("keeps AMap fact metadata and flags missing opening hours", () => {
    const candidates = generateRouteCandidatesFromPlaces(
      demoRoute,
      [
        {
          id: "amap:B030",
          source: "amap",
          sourcePlaceId: "B030",
          name: "城市历史展馆",
          address: "长江路 1 号",
          city: "南京市",
          district: "玄武区",
          adcode: "320102",
          coordinate: { lng: 118.797, lat: 32.0438, system: "gcj02" },
          poiType: "科教文化服务;博物馆",
          openingHours: "09:00-17:00",
          telephone: "025-12345678",
          providerRating: "4.7",
          providerCost: null,
          verificationStatus: "verified",
        },
        {
          id: "amap:B031",
          source: "amap",
          sourcePlaceId: "B031",
          name: "城市记忆馆",
          address: "长江路 2 号",
          city: "南京市",
          district: "玄武区",
          adcode: "320102",
          coordinate: { lng: 118.798, lat: 32.044, system: "gcj02" },
          poiType: "科教文化服务;博物馆",
          openingHours: null,
          telephone: null,
          providerRating: null,
          providerCost: null,
          verificationStatus: "verified",
        },
      ],
      {
        themes: ["历史"],
        acceptedTypes: ["博物馆"],
        maxResults: 2,
      },
    );
    const withOpeningHours = candidates.find(
      (candidate) => candidate.place.sourcePlaceId === "B030",
    );
    const withoutOpeningHours = candidates.find(
      (candidate) => candidate.place.sourcePlaceId === "B031",
    );

    expect(withOpeningHours?.place.openingHours).toBe("09:00-17:00");
    expect(withOpeningHours?.place.telephone).toBe("025-12345678");
    expect(withOpeningHours?.risks).not.toContain("开放时间待现场核验");
    expect(withoutOpeningHours?.risks).toContain("开放时间待现场核验");
  });

  it("can refine candidate detours with provider walking routes", async () => {
    const [candidate] = generateRouteCandidatesFromPlaces(
      demoRoute,
      [
        {
          id: "amap:B040",
          source: "amap",
          sourcePlaceId: "B040",
          name: "六朝文化空间",
          address: "长江路 3 号",
          city: "南京市",
          district: "玄武区",
          adcode: "320102",
          coordinate: { lng: 118.797, lat: 32.0438, system: "gcj02" },
          poiType: "科教文化服务;博物馆",
          openingHours: "09:00-17:00",
          telephone: null,
          providerRating: null,
          providerCost: null,
          verificationStatus: "verified",
        },
      ],
      {
        themes: ["历史"],
        acceptedTypes: ["博物馆"],
        maxResults: 1,
      },
    );
    const refined = await refineCandidatesWithProviderDetours(
      demoRoute,
      [candidate],
      async ({ origin, destination }) => ({
        fromPlaceId: origin.id,
        toPlaceId: destination.id,
        distanceMeters: 240,
        durationMinutes: 4,
        source: "provider",
        provider: "amap",
      }),
      ["历史"],
    );

    expect(refined.providerLegs).toBeGreaterThan(0);
    expect(refined.candidates[0].reasons[0]).toContain("高德步行复核");
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

  it("excludes milk tea, coffee, bakery, and dessert places from restaurant recommendations", () => {
    const candidates = generateRouteCandidatesFromPlaces(
      demoRoute,
      [
        {
          id: "amap:R001",
          source: "amap",
          sourcePlaceId: "R001",
          name: "巷口南京菜馆",
          address: "长江路 4 号",
          city: "南京市",
          district: "玄武区",
          adcode: "320102",
          coordinate: { lng: 118.799, lat: 32.044, system: "gcj02" },
          poiType: "餐饮服务;中餐厅",
          verificationStatus: "verified",
        },
        {
          id: "amap:R002",
          source: "amap",
          sourcePlaceId: "R002",
          name: "喜茶长江路店",
          address: "长江路",
          city: "南京市",
          district: "玄武区",
          adcode: "320102",
          coordinate: { lng: 118.8, lat: 32.044, system: "gcj02" },
          poiType: "餐饮服务;冷饮店;茶饮店",
          verificationStatus: "verified",
        },
        {
          id: "amap:R003",
          source: "amap",
          sourcePlaceId: "R003",
          name: "街角咖啡",
          address: "长江路",
          city: "南京市",
          district: "玄武区",
          adcode: "320102",
          coordinate: { lng: 118.801, lat: 32.044, system: "gcj02" },
          poiType: "餐饮服务;咖啡厅",
          verificationStatus: "verified",
        },
        {
          id: "amap:R004",
          source: "amap",
          sourcePlaceId: "R004",
          name: "原麦面包房",
          address: "长江路",
          city: "南京市",
          district: "玄武区",
          adcode: "320102",
          coordinate: { lng: 118.802, lat: 32.044, system: "gcj02" },
          poiType: "餐饮服务;糕饼店",
          verificationStatus: "verified",
        },
        {
          id: "amap:R005",
          source: "amap",
          sourcePlaceId: "R005",
          name: "甜品研究所",
          address: "长江路",
          city: "南京市",
          district: "玄武区",
          adcode: "320102",
          coordinate: { lng: 118.803, lat: 32.044, system: "gcj02" },
          poiType: "餐饮服务;甜品店",
          verificationStatus: "verified",
        },
      ],
      {
        themes: ["美食"],
        acceptedTypes: ["餐厅"],
        maxResults: 5,
      },
    );

    expect(candidates.map((candidate) => candidate.place.name)).toEqual([
      "巷口南京菜馆",
    ]);
  });

  it("prioritizes restaurants that match cuisine and budget preferences", () => {
    const candidates = generateRouteCandidatesFromPlaces(
      demoRoute,
      [
        {
          id: "amap:R010",
          source: "amap",
          sourcePlaceId: "R010",
          name: "寿司小馆",
          address: "长江路 6 号",
          city: "南京市",
          district: "玄武区",
          adcode: "320102",
          coordinate: { lng: 118.799, lat: 32.044, system: "gcj02" },
          poiType: "餐饮服务;外国餐厅;日本料理",
          providerCost: "85",
          verificationStatus: "verified",
        },
        {
          id: "amap:R011",
          source: "amap",
          sourcePlaceId: "R011",
          name: "重油川菜馆",
          address: "长江路 7 号",
          city: "南京市",
          district: "玄武区",
          adcode: "320102",
          coordinate: { lng: 118.7988, lat: 32.0438, system: "gcj02" },
          poiType: "餐饮服务;中餐厅;川菜",
          providerCost: "160",
          verificationStatus: "verified",
        },
      ],
      {
        themes: ["美食"],
        acceptedTypes: ["餐厅"],
        maxResults: 2,
        restaurantPreferences: {
          cuisines: ["日料韩餐"],
          budget: "50-100元",
        },
      },
    );

    expect(candidates[0].place.name).toBe("寿司小馆");
    expect(candidates[0].reasons).toEqual(
      expect.arrayContaining([
        "符合日料韩餐偏好",
        "人均约 85 元，符合预算",
      ]),
    );
  });
});
