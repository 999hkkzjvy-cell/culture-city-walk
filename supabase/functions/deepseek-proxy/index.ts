const corsHeaders = {
  "Access-Control-Allow-Origin": Deno.env.get("SHARE_ALLOWED_ORIGINS") || "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const DEEPSEEK_API_BASE = "https://api.deepseek.com";
const DEFAULT_MODEL = "deepseek-v4-flash";
const MAX_REQUEST_BYTES = 32_000;
const BAIDU_AI_SEARCH_URL =
  "https://qianfan.baidubce.com/v2/ai_search/web_search";
const MAX_RESEARCH_SOURCES = 8;

type DeepSeekProxyRequest =
  | {
      action: "diagnostic";
    }
  | {
      action: "parse-intent";
      input: string;
      draft: unknown;
      schemaRepair?: SchemaRepairHint;
    }
  | {
      action: "rank-candidates";
      intent: unknown;
      routeGoal?: string;
      candidates: unknown[];
      schemaRepair?: SchemaRepairHint;
    }
  | {
      action: "route-title";
      route: unknown;
      requestText: string;
      schemaRepair?: SchemaRepairHint;
    }
  | {
      action: "stop-deep-reading";
      route: unknown;
      stop: unknown;
      schemaRepair?: SchemaRepairHint;
    }
  | {
      action: "stop-question";
      route: unknown;
      stop: unknown;
      question: string;
      recentMessages?: unknown;
    };

type SchemaRepairHint = {
  issues?: unknown;
  previousResult?: unknown;
};

type DeepSeekUsage = {
  prompt_tokens?: number;
  completion_tokens?: number;
  prompt_cache_hit_tokens?: number;
  prompt_cache_miss_tokens?: number;
};

type ResearchSourceKind =
  | "official"
  | "authority"
  | "academic"
  | "cultural"
  | "map";

type ResearchSource = {
  id: string;
  label: string;
  href: string;
  kind: ResearchSourceKind;
  excerpt: string;
};

type StopResearch = {
  checkedAt: string;
  status: "verified" | "partial";
  contentDepth: "full" | "limited";
  sources: ResearchSource[];
  meta: {
    provider: "baidu_ai_search" | "map";
    attemptedQueries: number;
    successfulQueries: number;
    returnedReferences: number;
    acceptedSources: number;
    usedSourceIds: string[];
    mapIncluded: boolean;
    checkedAt: string;
  };
};

type BaiduSearchReference = {
  title?: unknown;
  url?: unknown;
  snippet?: unknown;
  content?: unknown;
  type?: unknown;
  website?: unknown;
  date?: unknown;
};

type AuthenticatedUser = {
  id: string;
};

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (request.method !== "POST") {
    return json({ error: "method_not_allowed" }, 405);
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

  const apiKey = Deno.env.get("DEEPSEEK_API_KEY");

  if (body.action === "diagnostic") {
    return await handleDiagnostic(request, Boolean(apiKey));
  }

  if (!apiKey) {
    return json({ error: "deepseek_not_configured" }, 500);
  }

  try {
    const limitCheck = await checkAiUsageLimits(request);

    if (!limitCheck.allowed) {
      return json({ error: limitCheck.error }, limitCheck.status);
    }

    if (body.action === "parse-intent") {
      return await handleParseIntent(body, apiKey);
    }

    if (body.action === "rank-candidates") {
      return await handleRankCandidates(body, apiKey);
    }

    if (body.action === "route-title") {
      return await handleRouteTitle(body, apiKey);
    }

    if (body.action === "stop-deep-reading") {
      return await handleStopDeepReading(body, apiKey);
    }

    if (body.action === "stop-question") {
      const user = await getAuthenticatedUser(request);

      if (!user) {
        return json({ error: "deepseek_auth_required" }, 401);
      }

      return await handleStopQuestion(body, apiKey);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "deepseek_error";
    return json({ error: message }, 502);
  }

  return json({ error: "invalid_action" }, 400);
});

async function handleDiagnostic(request: Request, hasApiKey: boolean) {
  const dailyUserLimit = parsePositiveNumber(
    Deno.env.get("AI_DAILY_USER_LIMIT"),
  );
  const projectCostLimit = parsePositiveNumber(
    Deno.env.get("AI_PROJECT_COST_LIMIT_CNY"),
  );
  const limitCheck = hasApiKey ? await checkAiUsageLimits(request) : null;

  return json({
    edgeFunctionReachable: true,
    deepseekKeyConfigured: hasApiKey,
    sourceResearchConfigured: Boolean(Deno.env.get("BAIDU_AI_SEARCH_API_KEY")),
    dailyUserLimit,
    projectCostLimit,
    limitStatus: limitCheck
      ? limitCheck.allowed
        ? "allowed"
        : limitCheck.error
      : "not_checked",
  });
}

async function checkAiUsageLimits(request: Request) {
  const dailyUserLimit = parsePositiveNumber(
    Deno.env.get("AI_DAILY_USER_LIMIT"),
  );
  const projectCostLimit = parsePositiveNumber(
    Deno.env.get("AI_PROJECT_COST_LIMIT_CNY"),
  );

  if (!dailyUserLimit && !projectCostLimit) {
    return { allowed: true as const };
  }

  const user = dailyUserLimit ? await getAuthenticatedUser(request) : null;

  if (dailyUserLimit && !user) {
    return {
      allowed: false as const,
      status: 401,
      error: "deepseek_auth_required",
    };
  }

  if (dailyUserLimit && user) {
    const runs = await fetchAiRuns({
      userId: user.id,
      fields: "id",
      useServiceRole: true,
    });

    if (!runs) {
      return {
        allowed: false as const,
        status: 503,
        error: "deepseek_limit_check_failed",
      };
    }

    if (runs.length >= dailyUserLimit) {
      return {
        allowed: false as const,
        status: 429,
        error: "deepseek_daily_user_limit_exceeded",
      };
    }
  }

  if (projectCostLimit) {
    const runs = await fetchAiRuns({
      fields: "estimated_cost_cny",
      useServiceRole: true,
    });

    if (!runs) {
      return {
        allowed: false as const,
        status: 503,
        error: "deepseek_limit_check_failed",
      };
    }

    const totalCost = runs.reduce(
      (sum, run) => sum + Number(run.estimated_cost_cny ?? 0),
      0,
    );

    if (totalCost >= projectCostLimit) {
      return {
        allowed: false as const,
        status: 429,
        error: "deepseek_project_cost_limit_exceeded",
      };
    }
  }

  return { allowed: true as const };
}

async function getAuthenticatedUser(request: Request) {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const authorization = request.headers.get("Authorization");

  if (!supabaseUrl || !anonKey || !authorization) {
    return null;
  }

  const response = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: {
      apikey: anonKey,
      Authorization: authorization,
    },
  });

  if (!response.ok) {
    return null;
  }

  const data = await response.json();

  return typeof data?.id === "string"
    ? ({ id: data.id } satisfies AuthenticatedUser)
    : null;
}

async function fetchAiRuns({
  fields,
  userId,
  useServiceRole = false,
}: {
  fields: string;
  userId?: string;
  useServiceRole?: boolean;
}) {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const apiKey = useServiceRole ? serviceRoleKey : anonKey;

  if (!supabaseUrl || !apiKey) {
    return null;
  }

  const since = new Date();
  since.setUTCHours(0, 0, 0, 0);
  const query = new URLSearchParams({
    select: fields,
    provider: "eq.deepseek",
    created_at: `gte.${since.toISOString()}`,
  });

  if (userId) {
    query.set("user_id", `eq.${userId}`);
  }

  const response = await fetch(
    `${supabaseUrl}/rest/v1/route_ai_runs?${query.toString()}`,
    {
      headers: {
        apikey: apiKey,
        Authorization: `Bearer ${apiKey}`,
      },
    },
  );

  if (!response.ok) {
    return null;
  }

  return await response.json();
}

function parsePositiveNumber(value: string | undefined) {
  if (!value) {
    return null;
  }

  const number = Number(value);

  return Number.isFinite(number) && number > 0 ? number : null;
}

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
    systemPrompt: withRepairInstruction(
      "你是城市漫游规划助手。请把用户需求解析为严格 json 对象，不要输出 markdown。只允许输出这些字段：mode, city, date, mustVisitPlaceIds, themeFilters, pace, maxWalkingKm, mealRequirement。themeFilters 只能从 历史、文学、建筑、音乐、书店、美食 中选择。pace 只能是 轻松漫步、平衡、充实紧凑。mealRequirement 可用 lunch、dinner 或 null，用户提到晚餐/晚饭/傍晚用 dinner，午餐/午饭/中午用 lunch。缺失信息使用 draft 中的值。",
      input.schemaRepair,
    ),
    userPrompt: JSON.stringify({
      input: input.input,
      draft: input.draft,
      schemaRepair: input.schemaRepair ?? null,
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
  const research = await researchStopSources(input);
  const response = await callDeepSeek(apiKey, {
    maxTokens: research.contentDepth === "full" ? 3600 : 1800,
    systemPrompt: withRepairInstruction(
      [
        "你是一位城市文化导游。你的讲解准确、具体、有知识密度，语气亲切易懂，但不假装亲历者，也不写成闲聊、营销文或百科条目。",
        "userPrompt.verifiedSources 是唯一可写成事实的证据包。年份、人物关系、建筑年代、文保信息、地址、开放时间、票价、预约方式和现场细节都必须被其中资料支持；没有证据就不写。禁止编造名人到访、引语、销量、称号、获奖，以及“最、唯一、第一”等绝对结论。",
        "kind 为 official、academic、authority 的资料可支持事实。kind 为 cultural 的资料只能支持以“相传”或“一种流传说法”明确标出的地方故事，不能支持确切年代、人物关系或经营信息。kind 为 map 的资料只可支持地址、时间和价格等实用信息。",
        "资料充足时，写给第一次到访的步行游客一篇 800-1200 字的现场导览。shortIntro 80-160 字；themeConnections 必须恰好 4 条，每条 160-260 字，并提供 2-12 字的 title。四段依次解释：历史背景与城市脉络、现场空间或实物、人物或人文故事、这座站点与今日城市和路线主题的关系。没有人物资料时，把第三段换成社会生活、文学文化或站点功能，不能补造人物故事。",
        "资料有限时，内容可以缩短为 400-700 字，并只讲有材料支持的部分；不要为了凑字数制造知识。专业词第一次出现时用普通游客能理解的话解释。开场可以从一个问题、物件、空间或历史反差切入，不必强行描写树影、光线或个人感受。",
        "输出严格 json 对象，不要 markdown。字段：placeId, shortIntro, themeConnections, practicalTips, checkInTasks, sourceClaims, sourceStatus。themeConnections 项为 {theme,title,text}。sourceClaims 项为 {text,sourceIds,kind}；kind 只能是 fact 或 legend。每条事实和传说都要列出实际使用的 S 编号。",
        "checkInTasks 必须恰好 2 项，标题和正文都不写“闯关”。第一项为具体可见、允许拍摄的目标；第二项为观察、对比、寻找或与同行者交流。任务要呼应讲解、目标明确、不打扰他人、不要求进入非开放区域。",
      ].join(""),
      input.schemaRepair,
    ),
    userPrompt: JSON.stringify({
      route: input.route,
      stop: input.stop,
      verifiedAt: research.checkedAt,
      researchStatus: research.status,
      contentDepth: research.contentDepth,
      verifiedSources: research.sources,
      schemaRepair: input.schemaRepair ?? null,
      exampleJson: {
        placeId: "poi-id",
        shortIntro:
          "这里不是一处孤立的建筑，而是理解这段城市历史的一把钥匙。先从眼前的空间和人流开始，再把它放回资料所记录的时代变化里看，故事会清楚得多。",
        themeConnections: [
          {
            theme: "历史",
            title: "一段城市脉络",
            text: "这里的历史不只属于一座建筑，也和它所在街区的变化相连。资料能确认的时间、人物和用途，应当用清楚的因果关系讲出来，让第一次到访的人知道：为什么这处地方会在今天仍被记住。",
          },
          {
            theme: "历史",
            title: "眼前怎么看",
            text: "把资料里的描述和眼前可见的门、院落、展品或街道关系起来看。术语需要解释成日常语言：它怎样影响人从哪里进入、在哪里停留，又怎样把过去留下在空间里。",
          },
          {
            theme: "文学",
            title: "人与故事",
            text: "只有资料支持的人物故事才能进入这一段。如果材料不足，就讲这个地方服务过怎样的人群、承载过怎样的文化生活；若是地方传说，必须写成相传或一种流传说法，并在来源中说明。",
          },
          {
            theme: "建筑",
            title: "走回今天",
            text: "最后把这处站点放回今天的城市生活和整条路线。说明它与前后站点的关系，再给游客一个可在现场完成的观看角度，而不是用空泛的抒情收尾。",
          },
        ],
        practicalTips: ["出门前看一眼当天的开放、预约和现场安排，免得扑空。"],
        checkInTasks: [
          "找一处最有辨识度的入口、材料或墙面细节，在允许拍摄处拍下来；试着把它和街道一起放进画面。",
          "找一块说明牌、旧照片或年代标识，看看它让你想起了什么；再和同行的人交换一下答案。",
        ],
        sourceClaims: [],
        sourceStatus: "verified",
      },
    }),
  });

  return json({
    result: attachStopResearch(response.result, research),
    usage: usageFromDeepSeek(response.usage, response.model, startedAt),
    warnings: [],
  });
}

async function handleStopQuestion(
  input: Extract<DeepSeekProxyRequest, { action: "stop-question" }>,
  apiKey: string,
) {
  const question = input.question.trim();

  if (!question || question.length > 500) {
    return json({ error: "invalid_question" }, 400);
  }

  const startedAt = performance.now();
  const research = await researchStopSources({
    action: "stop-deep-reading",
    route: input.route,
    stop: input.stop,
  });
  const response = await callDeepSeek(apiKey, {
    maxTokens: 1000,
    systemPrompt:
      "你是城市文化导游的现场问答助手。只能依据 userPrompt.verifiedSources 回答。事实级资料可支持确定表述；cultural 资料只能支持以“相传”或“一种流传说法”标出的故事；map 资料只支持地址、时间、价格等实用信息。资料不足时明确说“现有资料不足以确认”，不要用常识补足。回答 120-380 字，先直接回答，再解释与眼前站点的关系。输出严格 json：{answer:string,sourceIds:string[]}，不要 markdown。",
    userPrompt: JSON.stringify({
      question,
      route: input.route,
      stop: input.stop,
      verifiedSources: research.sources,
      recentMessages: normalizeRecentMessages(input.recentMessages),
    }),
  });
  const result = isRecord(response.result) ? response.result : {};
  const answer = readString(result.answer);
  const sourceIds = Array.isArray(result.sourceIds)
    ? result.sourceIds.filter((value): value is string => typeof value === "string")
    : [];

  if (!answer) {
    throw new Error("deepseek_invalid_question_response");
  }

  return json({
    result: {
      answer,
      sourceIds: sourceIds.filter((id) => research.sources.some((source) => source.id === id)),
      sourceStatus: research.status,
      sourceReferences: research.sources.map(({ id, label, href, kind }) => ({
        id,
        label,
        href,
        kind,
      })),
      verifiedAt: research.checkedAt,
      researchMeta: research.meta,
    },
    usage: usageFromDeepSeek(response.usage, response.model, startedAt),
    warnings: [],
  });
}

function normalizeRecentMessages(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .slice(-3)
    .flatMap((item) => {
      if (!isRecord(item)) {
        return [];
      }

      const role = readString(item.role);
      const content = readString(item.content);

      return role && content ? [{ role, content: content.slice(0, 360) }] : [];
    });
}

async function handleRouteTitle(
  input: Extract<DeepSeekProxyRequest, { action: "route-title" }>,
  apiKey: string,
) {
  const startedAt = performance.now();
  const response = await callDeepSeek(apiKey, {
    maxTokens: 260,
    systemPrompt: withRepairInstruction(
      '你是城市漫游路线命名助手。请基于城市、主题、站点和用户目标，输出一个短而具体的中文路线标题。标题 8-18 个中文字符优先，不要营销口号，不要使用引号，不要超过 32 个字符。输出严格 json：{"title":"路线标题","warnings":[]}。',
      input.schemaRepair,
    ),
    userPrompt: JSON.stringify({
      route: input.route,
      requestText: input.requestText,
      schemaRepair: input.schemaRepair ?? null,
      exampleJson: {
        title: "南京旧街书店慢读",
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

async function handleRankCandidates(
  input: Extract<DeepSeekProxyRequest, { action: "rank-candidates" }>,
  apiKey: string,
) {
  if (!Array.isArray(input.candidates) || input.candidates.length > 15) {
    return json({ error: "invalid_candidates" }, 400);
  }

  const startedAt = performance.now();
  const response = await callDeepSeek(apiKey, {
    maxTokens: 1200,
    systemPrompt: withRepairInstruction(
      '你是城市漫游候选点排序助手。请只基于用户意图、routeGoal 和给定 candidates 排序，不要编造候选点、事实来源或不可验证故事。routeGoal 是用户的一句话补充目标，优先用于判断餐厅、晚餐、主题关键词和收官位置。输出严格 json 对象，不要输出 markdown。格式为 {"ranked":[{"id":"候选点id","reasons":["一句中文推荐理由"]}],"warnings":[]}。ranked 只能使用输入里的 id。',
      input.schemaRepair,
    ),
    userPrompt: JSON.stringify({
      intent: input.intent,
      routeGoal: input.routeGoal ?? "",
      candidates: input.candidates,
      schemaRepair: input.schemaRepair ?? null,
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

function withRepairInstruction(
  prompt: string,
  schemaRepair?: SchemaRepairHint,
) {
  if (!schemaRepair) {
    return prompt;
  }

  return `${prompt}\n这是一次 schema 修复重试。请根据 schemaRepair.issues 修正 schemaRepair.previousResult 的 JSON 结构和值类型，只输出修复后的严格 json，不要添加 markdown、解释或不在字段范围内的内容。`;
}

async function researchStopSources(
  input: Extract<DeepSeekProxyRequest, { action: "stop-deep-reading" }>,
): Promise<StopResearch> {
  const checkedAt = new Date().toISOString();
  const stop = readStopResearchFields(input.stop);
  const mapSource = buildMapResearchSource(stop, checkedAt);
  const baiduApiKey = Deno.env.get("BAIDU_AI_SEARCH_API_KEY");

  if (!baiduApiKey && !mapSource) {
    throw new Error("source_research_not_configured");
  }

  const queries = baiduApiKey
    ? buildResearchQueries(readRouteCity(input.route), stop)
    : [];
  const settled = await Promise.allSettled(
    queries.map((query) =>
      searchBaiduSources({ apiKey: baiduApiKey!, city: readRouteCity(input.route), query }),
    ),
  );
  const successful = settled.filter(
    (result): result is PromiseFulfilledResult<BaiduSearchResult> =>
      result.status === "fulfilled",
  );
  const searchSources = dedupeResearchSources(
    successful.flatMap((result) => result.value.sources),
  );
  const sources = [...searchSources, ...(mapSource ? [mapSource] : [])]
    .slice(0, MAX_RESEARCH_SOURCES)
    .map((source, index) => ({ ...source, id: `S${index + 1}` }));

  if (sources.length === 0) {
    throw new Error("source_research_no_authoritative_sources");
  }

  const factSources = searchSources.filter((source) =>
    ["official", "academic", "authority"].includes(source.kind),
  );
  const nonMapSources = searchSources.length;
  const sourceTextLength = nonMapSources === 0
    ? 0
    : searchSources.reduce((sum, source) => sum + source.excerpt.length, 0);
  const contentDepth =
    factSources.length >= 1 && nonMapSources >= 2 && sourceTextLength >= 1200
      ? "full"
      : "limited";

  return {
    checkedAt,
    status: factSources.length > 0 ? "verified" : "partial",
    contentDepth,
    sources,
    meta: {
      provider: baiduApiKey ? "baidu_ai_search" : "map",
      attemptedQueries: queries.length,
      successfulQueries: successful.length,
      returnedReferences: successful.reduce(
        (total, result) => total + result.value.returnedReferences,
        0,
      ),
      acceptedSources: sources.length,
      usedSourceIds: sources.map((source) => source.id),
      mapIncluded: Boolean(mapSource),
      checkedAt,
    },
  };
}

type BaiduSearchResult = {
  sources: ResearchSource[];
  returnedReferences: number;
  requestId: string | null;
};

async function searchBaiduSources({
  apiKey,
  city,
  query,
}: {
  apiKey: string;
  city: string;
  query: string;
}): Promise<BaiduSearchResult> {
  const response = await fetch(BAIDU_AI_SEARCH_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messages: [
        {
          role: "user",
          content: query,
        },
      ],
      search_source: "baidu_search_v2",
      resource_type_filter: [{ type: "web", top_k: 20 }],
      ...(city ? { geo: { city: [city] } } : {}),
    }),
  });

  if (!response.ok) {
    throw new Error("source_research_failed");
  }

  const data = await response.json();
  const references =
    isRecord(data) && Array.isArray(data.references)
      ? (data.references as BaiduSearchReference[])
      : [];
  const seen = new Set<string>();
  const sources: ResearchSource[] = [];

  for (const reference of references) {
    if (reference.type !== "web") {
      continue;
    }

    const href = typeof reference.url === "string" ? reference.url : "";
    const kind =
      classifyResearchSource(href) ?? classifyCulturalResearchSource(href, reference);
    const excerpt =
      typeof reference.content === "string"
        ? compactExcerpt(reference.content)
        : typeof reference.snippet === "string"
          ? compactExcerpt(reference.snippet)
          : "";

    if (!href || !kind || !excerpt || seen.has(href)) {
      continue;
    }

    seen.add(href);
    sources.push({
      id: "",
      label:
        typeof reference.title === "string" && reference.title.trim()
          ? reference.title.trim().slice(0, 160)
          : new URL(href).hostname,
      href,
      kind,
      excerpt,
    });

    if (sources.length >= MAX_RESEARCH_SOURCES) {
      break;
    }
  }

  return {
    sources,
    returnedReferences: references.length,
    requestId:
      isRecord(data) && typeof data.request_id === "string"
        ? data.request_id
        : null,
  };
}

function buildResearchQueries(
  city: string,
  stop: ReturnType<typeof readStopResearchFields>,
) {
  const prefix = [city, stop.name].filter(Boolean).join(" ");
  const thematicWords = [stop.themes.join(" "), stop.note]
    .filter(Boolean)
    .join(" ")
    .slice(0, 48);

  return [
    `${prefix} 官网 历史 沿革 开放`,
    `${prefix} 人物 故事 轶事 地方志`,
    `${prefix} 建筑 文学 人文 ${thematicWords}`.trim(),
  ].filter((query) => query.trim().length > 0);
}

function dedupeResearchSources(sources: ResearchSource[]) {
  const seen = new Set<string>();

  return sources.filter((source) => {
    if (seen.has(source.href)) {
      return false;
    }

    seen.add(source.href);
    return true;
  });
}

function readStopResearchFields(stop: unknown) {
  const value = isRecord(stop) ? stop : {};

  return {
    name: readString(value.name),
    address: readString(value.address),
    openingHours: readString(value.openingHours),
    providerCost: readString(value.providerCost),
    note: readString(value.note),
    themes: Array.isArray(value.themes)
      ? value.themes.filter((theme): theme is string => typeof theme === "string")
      : [],
  };
}

function readRouteCity(route: unknown) {
  return isRecord(route) ? readString(route.city) : "";
}

function buildMapResearchSource(
  stop: ReturnType<typeof readStopResearchFields>,
  checkedAt: string,
): ResearchSource | null {
  const details = [
    stop.address ? `地址：${stop.address}` : "",
    stop.openingHours ? `高德开放时间：${stop.openingHours}` : "",
    stop.providerCost ? `高德人均/票价线索：${stop.providerCost}` : "",
  ].filter(Boolean);

  if (!stop.name || details.length === 0) {
    return null;
  }

  return {
    id: "",
    label: `高德地点资料（检索于 ${formatResearchDate(checkedAt)}）`,
    href: `https://www.amap.com/search?query=${encodeURIComponent(
      [stop.name, stop.address].filter(Boolean).join(" "),
    )}`,
    kind: "map",
    excerpt: details.join("；"),
  };
}

function classifyResearchSource(href: string): ResearchSourceKind | null {
  try {
    const hostname = new URL(href).hostname.toLowerCase();

    if (
      hostname.endsWith(".gov.cn") ||
      hostname === "gov.cn" ||
      hostname.endsWith(".museum.org.cn")
    ) {
      return "official";
    }

    if (
      hostname.endsWith(".edu.cn") ||
      hostname === "cnki.net" ||
      hostname.endsWith(".cnki.net") ||
      hostname.endsWith(".cssn.cn")
    ) {
      return "academic";
    }

    if (
      ["people.com.cn", "xinhuanet.com", "cctv.com", "chinanews.com.cn"].some(
        (domain) => hostname === domain || hostname.endsWith(`.${domain}`),
      )
    ) {
      return "authority";
    }
  } catch {
    return null;
  }

  return null;
}

function classifyCulturalResearchSource(
  href: string,
  reference: BaiduSearchReference,
): ResearchSourceKind | null {
  try {
    const hostname = new URL(href).hostname.toLowerCase();
    const blockedHosts = [
      "baike.baidu.com",
      "tieba.baidu.com",
      "zhihu.com",
      "xiaohongshu.com",
      "douyin.com",
      "weibo.com",
      "bilibili.com",
      "mafengwo.cn",
    ];
    const publisher =
      typeof reference.website === "string" ? reference.website.trim() : "";

    if (
      !publisher ||
      blockedHosts.some(
        (host) => hostname === host || hostname.endsWith(`.${host}`),
      )
    ) {
      return null;
    }

    return "cultural";
  } catch {
    return null;
  }
}

function attachStopResearch(result: unknown, research: StopResearch) {
  if (!isRecord(result)) {
    return result;
  }

  return {
    ...result,
    sourceStatus: research.status,
    contentDepth: research.contentDepth,
    sourceReferences: research.sources.map(({ id, label, href, kind }) => ({
      id,
      label,
      href,
      kind,
    })),
    verifiedAt: research.checkedAt,
    researchMeta: research.meta,
  };
}

function compactExcerpt(value: string) {
  return value.replace(/\s+/g, " ").trim().slice(0, 1_200);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function formatResearchDate(value: string) {
  return value.slice(0, 10);
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
    usage?.prompt_cache_miss_tokens ??
    Math.max(inputTokens - cacheHitTokens, 0);
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
