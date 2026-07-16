import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { defaultDraft, demoRoute } from "@/lib/route";
import { generateRouteCandidates } from "@/lib/route-candidates";
import {
  isDeepSeekProxyConfigured,
  generateStopThemeContentWithDeepSeek,
  generateRouteTitleWithDeepSeek,
  parseIntentWithDeepSeek,
  rankCandidatesWithDeepSeek,
} from "./deepseek";

const mocks = vi.hoisted(() => ({
  invoke: vi.fn(),
}));

vi.mock("@/lib/supabase/client", () => ({
  createBrowserSupabaseClient: () => ({
    functions: {
      invoke: mocks.invoke,
    },
  }),
  isSupabaseConfigured: () =>
    Boolean(
      process.env.NEXT_PUBLIC_SUPABASE_URL &&
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    ),
}));

const originalEnv = {
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  NEXT_PUBLIC_DEEPSEEK_PROXY_ENABLED:
    process.env.NEXT_PUBLIC_DEEPSEEK_PROXY_ENABLED,
};

const deepSeekUsage = {
  provider: "deepseek",
  model: "deepseek-v4-flash",
  inputTokens: 120,
  outputTokens: 80,
  elapsedMs: 900,
  estimatedCostCny: 0.001,
};

describe("DeepSeek proxy client", () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-key";
    process.env.NEXT_PUBLIC_DEEPSEEK_PROXY_ENABLED = "true";
    mocks.invoke.mockReset();
  });

  afterEach(() => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = originalEnv.NEXT_PUBLIC_SUPABASE_URL;
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY =
      originalEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    process.env.NEXT_PUBLIC_DEEPSEEK_PROXY_ENABLED =
      originalEnv.NEXT_PUBLIC_DEEPSEEK_PROXY_ENABLED;
  });

  it("requires the public opt-in flag", () => {
    expect(isDeepSeekProxyConfigured()).toBe(true);

    process.env.NEXT_PUBLIC_DEEPSEEK_PROXY_ENABLED = "false";

    expect(isDeepSeekProxyConfigured()).toBe(false);
  });

  it("parses planning intent from proxy json", async () => {
    mocks.invoke.mockResolvedValueOnce({
      data: {
        result: {
          mode: "complete",
          city: "苏州",
          date: null,
          mustVisitPlaceIds: ["拙政园"],
          themeFilters: ["历史", "建筑"],
          pace: "轻松漫步",
          maxWalkingKm: 8,
          mealRequirement: null,
        },
        usage: deepSeekUsage,
        warnings: [],
      },
      error: null,
    });

    const result = await parseIntentWithDeepSeek("苏州，想看园林建筑", defaultDraft);

    expect(result.data.city).toBe("苏州");
    expect(result.data.themeFilters).toEqual(["历史", "建筑"]);
    expect(result.usage.provider).toBe("deepseek");
  });

  it("retries once when DeepSeek output fails schema validation", async () => {
    mocks.invoke
      .mockResolvedValueOnce({
        data: {
          result: {
            mode: "complete",
            city: "",
            date: null,
            mustVisitPlaceIds: [],
            themeFilters: ["不存在的主题"],
            pace: "很快",
            maxWalkingKm: -1,
            mealRequirement: null,
          },
          usage: deepSeekUsage,
          warnings: [],
        },
        error: null,
      })
      .mockResolvedValueOnce({
        data: {
          result: {
            mode: "complete",
            city: "南京",
            date: null,
            mustVisitPlaceIds: [],
            themeFilters: ["历史"],
            pace: "平衡",
            maxWalkingKm: 8,
            mealRequirement: null,
          },
          usage: deepSeekUsage,
          warnings: [],
        },
        error: null,
      });

    const result = await parseIntentWithDeepSeek("南京历史路线", defaultDraft);

    expect(mocks.invoke).toHaveBeenCalledTimes(2);
    expect(mocks.invoke).toHaveBeenLastCalledWith("deepseek-proxy", {
      body: expect.objectContaining({
        action: "parse-intent",
        schemaRepair: expect.objectContaining({
          issues: expect.any(Array),
          previousResult: expect.any(Object),
        }),
      }),
    });
    expect(result.data.city).toBe("南京");
    expect(result.usage.inputTokens).toBe(deepSeekUsage.inputTokens * 2);
    expect(result.warnings).toContain("DeepSeek 输出格式已自动修复一次。");
  });

  it("orders known candidates and ignores invented ids", async () => {
    const candidates = generateRouteCandidates(demoRoute, {
      themes: ["历史", "文学"],
      maxResults: 3,
    });
    mocks.invoke.mockResolvedValueOnce({
      data: {
        result: {
          ranked: [
            {
              id: candidates[1].id,
              reasons: ["更贴近文学线索，并且不需要明显绕路。"],
            },
            {
              id: "invented-place",
              reasons: ["这个 ID 不应该被接受。"],
            },
          ],
          warnings: ["请复核开放时间。"],
        },
        usage: deepSeekUsage,
        warnings: [],
      },
      error: null,
    });

    const result = await rankCandidatesWithDeepSeek(candidates, {
      mode: "complete",
      city: "南京",
      date: null,
      mustVisitPlaceIds: [],
      themeFilters: ["文学"],
      pace: "轻松漫步",
      maxWalkingKm: 8,
      mealRequirement: null,
    });

    expect(result.data[0].id).toBe(candidates[1].id);
    expect(result.data.map((candidate) => candidate.id)).not.toContain(
      "invented-place",
    );
    expect(result.data[0].reasons.at(-1)).toContain("文学线索");
    expect(result.warnings).toContain("请复核开放时间。");
  });

  it("generates longer stop deep-reading content through the proxy", async () => {
    mocks.invoke.mockResolvedValueOnce({
      data: {
        result: {
          placeId: "presidential-palace",
          shortIntro:
            "总统府适合作为南京近代城市阅读的核心站点。可以从建筑群的入口秩序、院落空间、展陈动线和长江路街区关系开始观察，再把现场看到的门楼、材料、尺度与近代政治空间的公共性联系起来。具体人物轶事和年份仍需要以官方展陈或可靠资料核验。",
          themeConnections: [
            {
              theme: "建筑",
              text: "观察门楼、院落、轴线与材料变化，比较传统院落和近代办公空间如何并置。",
            },
            {
              theme: "历史",
              text: "这里承载近代政治叙事，但具体年份和人物关系需要以现场展陈为准。",
            },
            {
              theme: "文学",
              text: "可把长江路当作城市文本，记录道路、展牌和游客动线共同形成的叙事。",
            },
          ],
          practicalTips: ["出发前核验预约、门票和开放时间。"],
          checkInTasks: [
            "立面侦探关：找出门楼、材料或门窗里最有辨识度的一个细节。",
            "时间证据关：找到一块说明牌或年代标识，记录它指向的年份。",
          ],
          sourceClaims: [],
          sourceStatus: "unverified",
        },
        usage: deepSeekUsage,
        warnings: [],
      },
      error: null,
    });

    const result = await generateStopThemeContentWithDeepSeek(
      demoRoute.stops[2],
      demoRoute,
    );

    expect(mocks.invoke).toHaveBeenCalledWith("deepseek-proxy", {
      body: expect.objectContaining({
        action: "stop-deep-reading",
      }),
    });
    expect(result.data.shortIntro).toContain("近代城市阅读");
    expect(result.data.checkInTasks).toHaveLength(2);
    expect(result.data.checkInTasks[0]).toContain("立面");
    expect(result.usage.provider).toBe("deepseek");
  });

  it("generates a short route title through the proxy", async () => {
    mocks.invoke.mockResolvedValueOnce({
      data: {
        result: {
          title: "南京旧街书店慢读",
          warnings: [],
        },
        usage: deepSeekUsage,
        warnings: [],
      },
      error: null,
    });

    const result = await generateRouteTitleWithDeepSeek(
      demoRoute,
      "想要轻松一点，看看书店和旧街",
    );

    expect(mocks.invoke).toHaveBeenCalledWith("deepseek-proxy", {
      body: expect.objectContaining({
        action: "route-title",
      }),
    });
    expect(result.data.title).toBe("南京旧街书店慢读");
    expect(result.usage.provider).toBe("deepseek");
  });
});
