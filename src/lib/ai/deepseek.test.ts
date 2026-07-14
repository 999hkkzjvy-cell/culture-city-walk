import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { defaultDraft, demoRoute } from "@/lib/route";
import { generateRouteCandidates } from "@/lib/route-candidates";
import {
  isDeepSeekProxyConfigured,
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
});
