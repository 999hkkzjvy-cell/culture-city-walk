import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { logAiUsageRun, makeAiRunIdempotencyKey } from "@/lib/ai/usage-log";
import { promptVersion, type AiUsageRecord } from "@/lib/ai/route-collaboration";

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  insert: vi.fn(),
  from: vi.fn(),
}));

vi.mock("@/lib/supabase/client", () => ({
  createBrowserSupabaseClient: () =>
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      ? {
          auth: {
            getUser: mocks.getUser,
          },
          from: mocks.from,
        }
      : null,
  isSupabaseConfigured: () =>
    Boolean(
      process.env.NEXT_PUBLIC_SUPABASE_URL &&
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    ),
}));

describe("AI usage logging", () => {
  const originalUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const originalAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const usage: AiUsageRecord = {
    promptVersion,
    provider: "deepseek",
    model: "deepseek-v4-flash",
    inputTokens: 120,
    outputTokens: 40,
    elapsedMs: 880,
    estimatedCostCny: 0.02,
  };

  beforeEach(() => {
    mocks.getUser.mockReset();
    mocks.insert.mockReset();
    mocks.from.mockReset();
    mocks.from.mockReturnValue({ insert: mocks.insert });
    mocks.getUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
      error: null,
    });
  });

  afterEach(() => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = originalUrl;
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = originalAnonKey;
  });

  it("skips logging when Supabase is not configured", async () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    await logAiUsageRun({
      action: "parse_intent",
      usage,
    });

    expect(mocks.from).not.toHaveBeenCalled();
  });

  it("inserts route AI run usage for signed-in users", async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-key";

    await logAiUsageRun({
      routeId: "1caa3b6b-bc7f-48d7-936f-438d604f01ab",
      action: "rank_candidates",
      usage,
      inputPayload: { candidateIds: ["a"] },
      outputPayload: { rankedCandidateIds: ["a"] },
      idempotencyKey: "rank:demo:abc",
    });

    expect(mocks.from).toHaveBeenCalledWith("route_ai_runs");
    expect(mocks.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        route_id: "1caa3b6b-bc7f-48d7-936f-438d604f01ab",
        user_id: "user-1",
        action: "rank_candidates",
        provider: "deepseek",
        model: "deepseek-v4-flash",
        input_tokens: 120,
        output_tokens: 40,
        estimated_cost_cny: 0.02,
        idempotency_key: "rank:demo:abc",
      }),
    );
  });

  it("creates stable idempotency keys without exposing full prompts", () => {
    expect(makeAiRunIdempotencyKey("parse_intent", "demo", "same prompt")).toBe(
      makeAiRunIdempotencyKey("parse_intent", "demo", "same prompt"),
    );
    expect(
      makeAiRunIdempotencyKey("parse_intent", "demo", "same prompt"),
    ).not.toContain("same prompt");
  });
});
