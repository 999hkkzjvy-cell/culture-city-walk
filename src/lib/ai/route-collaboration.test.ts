import { describe, expect, it } from "vitest";
import { defaultDraft, demoRoute } from "@/lib/route";
import { generateRouteCandidates } from "@/lib/route-candidates";
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
        shortIntro: expect.stringContaining("适合作为"),
      }),
    );
  });
});
