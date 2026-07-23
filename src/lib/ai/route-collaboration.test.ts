import { describe, expect, it } from "vitest";
import { defaultDraft, demoRoute, type RouteStop } from "@/lib/route";
import {
  generateRouteCandidates,
  generateRouteCandidatesFromPlaces,
} from "@/lib/route-candidates";
import {
  generateRouteSummaryWithFallback,
  generateStopThemeContentWithFallback,
  parseIntentWithFallback,
  rankCandidatesWithFallback,
  validateRouteProposal,
} from "./route-collaboration";

describe("route collaboration fallback", () => {
  it("parses natural language into a structured intent without an AI key", () => {
    const result = parseIntentWithFallback(
      "南京，想走文学和历史路线，午餐不要太赶",
      defaultDraft,
    );

    expect(result.data).toEqual(
      expect.objectContaining({
        city: "南京",
        mode: "complete",
        themeFilters: ["历史", "文学"],
        mealRequirement: "lunch",
      }),
    );
    expect(result.usage.provider).toBe("fallback");
    expect(result.usage.estimatedCostCny).toBe(0);
  });

  it("rejects route proposals with POI IDs outside the provided candidate set", () => {
    const result = validateRouteProposal(
      {
        title: "测试路线",
        orderedPlaceIds: ["librairie", "invented-place"],
        candidatePlaceIds: [],
        stayMinutes: {
          librairie: 40,
          "invented-place": 20,
        },
        reasoningSummary: "测试",
      },
      ["librairie", "presidential-palace"],
    );

    expect(result).toEqual(
      expect.objectContaining({
        success: false,
        issues: expect.arrayContaining([
          expect.stringContaining("不存在的 POI ID"),
        ]),
      }),
    );
  });

  it("ranks real candidates with template reasons when AI is unavailable", () => {
    const intent = parseIntentWithFallback("我想多一点文学", defaultDraft).data;
    const candidates = generateRouteCandidates(demoRoute, {
      themes: intent.themeFilters,
      maxResults: 3,
    });
    const ranked = rankCandidatesWithFallback(candidates, intent);

    expect(ranked.data).toHaveLength(3);
    expect(ranked.data[0].reasons.at(-1)).toMatch(/文学|备选点/);
    expect(ranked.warnings[0]).toContain("待 DeepSeek 接入");
  });

  it("keeps dinner goals in fallback intent and candidate ranking", () => {
    const intent = parseIntentWithFallback(
      "南京，最后想在晚餐附近找一家南京菜餐厅",
      defaultDraft,
    ).data;
    const candidates = generateRouteCandidatesFromPlaces(
      demoRoute,
      [
        {
          id: "amap:meal",
          source: "amap",
          sourcePlaceId: "meal",
          name: "老城南京菜馆",
          address: "终点附近",
          city: "南京市",
          district: "秦淮区",
          adcode: "320104",
          coordinate: { lng: 118.799, lat: 32.04, system: "gcj02" },
          poiType: "餐饮服务;中餐厅;南京菜",
          verificationStatus: "verified",
        },
        {
          id: "amap:gallery",
          source: "amap",
          sourcePlaceId: "gallery",
          name: "城市展览馆",
          address: "长江路",
          city: "南京市",
          district: "玄武区",
          adcode: "320102",
          coordinate: { lng: 118.792, lat: 32.04, system: "gcj02" },
          poiType: "科教文化服务;展览馆",
          verificationStatus: "verified",
        },
      ],
      {
        themes: intent.themeFilters,
        acceptedTypes: ["餐厅", "博物馆"],
        maxResults: 2,
      },
    );
    const ranked = rankCandidatesWithFallback(
      candidates,
      intent,
      "最后想在晚餐附近找一家南京菜餐厅",
    );

    expect(intent.mealRequirement).toBe("dinner");
    expect(ranked.data[0].placeType).toBe("餐厅");
    expect(ranked.data[0].reasons.at(-1)).toContain("晚餐候选");
  });

  it("generates route title and summary using a deterministic template", () => {
    expect(generateRouteSummaryWithFallback(demoRoute)).toEqual(
      expect.objectContaining({
        title: "南京 · 文学、历史漫游",
        sourceStatus: "template",
      }),
    );
  });

  it("pads short stop notes for fallback content", () => {
    expect(
      generateStopThemeContentWithFallback({
        ...demoRoute.stops[0],
        note: "短备注",
      }),
    ).toEqual(
      expect.objectContaining({
        sourceStatus: "unverified",
        shortIntro: expect.stringContaining("最适合慢一点读"),
      }),
    );
  });

  it("generates two site-specific challenge tasks for architecture stops", () => {
    const content = generateStopThemeContentWithFallback({
      ...demoRoute.stops[1],
      name: "顺和路公馆区",
      themes: ["建筑", "历史"],
      note: "短备注",
    });

    expect(content.themeConnections).toHaveLength(3);
    expect(content.shortIntro).toContain("门、墙、屋檐和树影");
    expect(content.checkInTasks).toHaveLength(2);
    expect(content.checkInTasks[0]).toContain("找一处最像");
    expect(content.checkInTasks.join(" ")).toContain("顺和路公馆区");
  });

  it("generates museum deep reading with collection-oriented tasks", () => {
    const museumStop: RouteStop = {
      ...demoRoute.stops[2],
      id: "museum",
      sourcePlaceId: "museum",
      name: "南京市博物馆",
      themes: ["历史"],
      note: "短备注",
    };
    const content = generateStopThemeContentWithFallback(museumStop);

    expect(content.shortIntro).toContain("一件让你愿意靠近的展品");
    expect(content.checkInTasks).toHaveLength(2);
    expect(content.checkInTasks[0]).toContain("最想讲给朋友听的展品");
    expect(content.checkInTasks[1]).toContain("地图、旧照片或时间表");
  });

  it("generates restaurant deep reading with dish and rhythm tasks", () => {
    const restaurantStop: RouteStop = {
      ...demoRoute.stops[2],
      id: "restaurant",
      sourcePlaceId: "restaurant",
      name: "老城南京菜馆",
      themes: ["美食"],
      providerCost: "80",
      note: "短备注",
    };
    const content = generateStopThemeContentWithFallback(restaurantStop);

    expect(content.shortIntro).toContain("菜单、店招和出餐的节奏");
    expect(content.checkInTasks).toHaveLength(2);
    expect(content.checkInTasks[0]).toContain("菜单或招牌");
    expect(content.checkInTasks[1]).toContain("点单前坐三分钟");
  });

  it("uses a relaxed, non-reporting voice for fallback deep reading", () => {
    const content = generateStopThemeContentWithFallback({
      ...demoRoute.stops[1],
      name: "顺和路公馆区",
      themes: ["建筑", "历史"],
      note: "短备注",
    });
    const readerFacingCopy = [
      content.shortIntro,
      ...content.themeConnections.map((connection) => connection.text),
      ...content.practicalTips,
      ...content.checkInTasks,
    ].join(" ");

    expect(readerFacingCopy).not.toMatch(
      /线索|核验|观察点|建议|适合作为|追问|展陈主线|立面比例|门窗尺度|侦探关/,
    );
    expect(content.checkInTasks).toHaveLength(2);
  });
});
