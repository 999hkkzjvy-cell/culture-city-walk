const corsHeaders = {
  "Access-Control-Allow-Origin": Deno.env.get("SHARE_ALLOWED_ORIGINS") || "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const DEEPSEEK_API_BASE = "https://api.deepseek.com";
const DEFAULT_MODEL = "deepseek-v4-flash";
const MAX_REQUEST_BYTES = 32_000;

type DeepSeekProxyRequest =
  | {
      action: "parse-intent";
      input: string;
      draft: unknown;
    }
  | {
      action: "rank-candidates";
      intent: unknown;
      candidates: unknown[];
    }
  | {
      action: "stop-deep-reading";
      route: unknown;
      stop: unknown;
    };

type DeepSeekUsage = {
  prompt_tokens?: number;
  completion_tokens?: number;
  prompt_cache_hit_tokens?: number;
  prompt_cache_miss_tokens?: number;
};

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (request.method !== "POST") {
    return json({ error: "method_not_allowed" }, 405);
  }

  const apiKey = Deno.env.get("DEEPSEEK_API_KEY");

  if (!apiKey) {
    return json({ error: "deepseek_not_configured" }, 500);
  }

  const rawBody = await request.text();

  if (new TextEncoder().encode(rawBody).length > MAX_REQUEST_BYTES) {
    return json({ error: "request_too_large" }, 413);
  }

  let body: DeepSeekProxyRequest;

  try {
    body = JSON.parse(rawBody);
  } catch {
    return json({ error: "invalid_json" }, 400);
  }

  try {
    if (body.action === "parse-intent") {
      return await handleParseIntent(body, apiKey);
    }

    if (body.action === "rank-candidates") {
      return await handleRankCandidates(body, apiKey);
    }

    if (body.action === "stop-deep-reading") {
      return await handleStopDeepReading(body, apiKey);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "deepseek_error";
    return json({ error: message }, 502);
  }

  return json({ error: "invalid_action" }, 400);
});

async function handleParseIntent(
  input: Extract<DeepSeekProxyRequest, { action: "parse-intent" }>,
  apiKey: string,
) {
  if (typeof input.input !== "string" || input.input.trim().length > 1200) {
    return json({ error: "invalid_input" }, 400);
  }

  const startedAt = performance.now();
  const response = await callDeepSeek(apiKey, {
    maxTokens: 700,
    systemPrompt:
      "你是城市漫游规划助手。请把用户需求解析为严格 json 对象，不要输出 markdown。只允许输出这些字段：mode, city, date, mustVisitPlaceIds, themeFilters, pace, maxWalkingKm, mealRequirement。themeFilters 只能从 历史、文学、建筑、音乐、书店、美食 中选择。pace 只能是 轻松漫步、平衡、充实紧凑。缺失信息使用 draft 中的值。",
    userPrompt: JSON.stringify({
      input: input.input,
      draft: input.draft,
      exampleJson: {
        mode: "complete",
        city: "南京",
        date: null,
        mustVisitPlaceIds: ["先锋书店"],
        themeFilters: ["文学", "历史"],
        pace: "轻松漫步",
        maxWalkingKm: 8,
        mealRequirement: "lunch",
      },
    }),
  });

  return json({
    result: response.result,
    usage: usageFromDeepSeek(response.usage, response.model, startedAt),
    warnings: [],
  });
}

async function handleStopDeepReading(
  input: Extract<DeepSeekProxyRequest, { action: "stop-deep-reading" }>,
  apiKey: string,
) {
  const startedAt = performance.now();
  const response = await callDeepSeek(apiKey, {
    maxTokens: 1800,
    systemPrompt:
      "你是严谨但有趣的城市文化讲解撰稿人。请只基于用户给定站点和常识性公开知识生成内容；不确定的具体年份、人物轶事、开放信息要写成待核验，不要伪造来源。输出严格 json 对象，不要 markdown。字段：placeId, shortIntro, themeConnections, practicalTips, checkInTasks, sourceClaims, sourceStatus。shortIntro 写 180-420 字，包含空间第一印象、可能的建筑/街区观察、历史背景线索。themeConnections 至少 3 条，优先覆盖建筑风格、历史背景、名人轶事/城市记忆。checkInTasks 给 3 个有趣但不打扰他人的打卡任务。sourceStatus 固定 unverified。",
    userPrompt: JSON.stringify({
      route: input.route,
      stop: input.stop,
      exampleJson: {
        placeId: "poi-id",
        shortIntro:
          "这是一段较长的城市阅读讲解，提醒用户哪些内容需要现场或资料核验。",
        themeConnections: [
          { theme: "建筑", text: "观察建筑立面、材料和街道尺度。" },
          { theme: "历史", text: "梳理它与城市变迁的关系，具体事实待核验。" },
          { theme: "文学", text: "从路名、店招和人的停留方式读城市文本。" },
        ],
        practicalTips: ["出发前核验开放时间、预约和现场管控。"],
        checkInTasks: ["拍一张入口与街道同框的照片。"],
        sourceClaims: [],
        sourceStatus: "unverified",
      },
    }),
  });

  return json({
    result: response.result,
    usage: usageFromDeepSeek(response.usage, response.model, startedAt),
    warnings: [],
  });
}

async function handleRankCandidates(
  input: Extract<DeepSeekProxyRequest, { action: "rank-candidates" }>,
  apiKey: string,
) {
  if (!Array.isArray(input.candidates) || input.candidates.length > 12) {
    return json({ error: "invalid_candidates" }, 400);
  }

  const startedAt = performance.now();
  const response = await callDeepSeek(apiKey, {
    maxTokens: 1200,
    systemPrompt:
      "你是城市漫游候选点排序助手。请只基于用户意图和给定 candidates 排序，不要编造候选点、事实来源或不可验证故事。输出严格 json 对象，不要输出 markdown。格式为 {\"ranked\":[{\"id\":\"候选点id\",\"reasons\":[\"一句中文推荐理由\"]}],\"warnings\":[]}。ranked 只能使用输入里的 id。",
    userPrompt: JSON.stringify({
      intent: input.intent,
      candidates: input.candidates,
      exampleJson: {
        ranked: [
          {
            id: "local:nanjing-library",
            reasons: ["它能补足文学和书店线索，同时绕路较少。"],
          },
        ],
        warnings: [],
      },
    }),
  });

  return json({
    result: response.result,
    usage: usageFromDeepSeek(response.usage, response.model, startedAt),
    warnings: [],
  });
}

async function callDeepSeek(
  apiKey: string,
  input: {
    systemPrompt: string;
    userPrompt: string;
    maxTokens: number;
  },
) {
  const model = Deno.env.get("DEEPSEEK_MODEL") || DEFAULT_MODEL;
  const response = await fetch(`${DEEPSEEK_API_BASE}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: input.systemPrompt },
        { role: "user", content: input.userPrompt },
      ],
      response_format: { type: "json_object" },
      thinking: { type: "disabled" },
      max_tokens: input.maxTokens,
      stream: false,
    }),
  });

  if (!response.ok) {
    return handleDeepSeekError(response);
  }

  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content;

  if (typeof content !== "string" || !content.trim()) {
    throw new Error("deepseek_empty_response");
  }

  try {
    return {
      result: JSON.parse(content),
      usage: data.usage as DeepSeekUsage | undefined,
      model: typeof data.model === "string" ? data.model : model,
    };
  } catch {
    throw new Error("deepseek_invalid_json");
  }
}

async function handleDeepSeekError(response: Response): Promise<never> {
  let providerError = "";

  try {
    const body = await response.json();
    providerError = body?.error?.message || body?.message || "";
  } catch {
    providerError = await response.text();
  }

  throw new Error(
    `deepseek_provider_${response.status}${providerError ? `:${providerError}` : ""}`,
  );
}

function usageFromDeepSeek(
  usage: DeepSeekUsage | undefined,
  model: string,
  startedAt: number,
) {
  const inputTokens =
    usage?.prompt_tokens ??
    (usage?.prompt_cache_hit_tokens ?? 0) +
      (usage?.prompt_cache_miss_tokens ?? 0);
  const outputTokens = usage?.completion_tokens ?? 0;

  return {
    provider: "deepseek",
    model,
    inputTokens,
    outputTokens,
    elapsedMs: Math.round(performance.now() - startedAt),
    estimatedCostCny: estimateCostCny(model, usage, inputTokens, outputTokens),
  };
}

function estimateCostCny(
  model: string,
  usage: DeepSeekUsage | undefined,
  inputTokens: number,
  outputTokens: number,
) {
  const isPro = model.includes("pro");
  const usdCny = Number(Deno.env.get("AI_USD_CNY_RATE") || "7.2");
  const cacheHitTokens = usage?.prompt_cache_hit_tokens ?? 0;
  const cacheMissTokens =
    usage?.prompt_cache_miss_tokens ?? Math.max(inputTokens - cacheHitTokens, 0);
  const hitUsdPerMillion = isPro ? 0.003625 : 0.0028;
  const missUsdPerMillion = isPro ? 0.435 : 0.14;
  const outputUsdPerMillion = isPro ? 0.87 : 0.28;
  const usd =
    (cacheHitTokens / 1_000_000) * hitUsdPerMillion +
    (cacheMissTokens / 1_000_000) * missUsdPerMillion +
    (outputTokens / 1_000_000) * outputUsdPerMillion;

  return Number((usd * usdCny).toFixed(4));
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json; charset=utf-8",
    },
  });
}
