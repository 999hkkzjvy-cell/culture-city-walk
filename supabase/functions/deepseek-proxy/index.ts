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
const MAX_RESEARCH_SOURCES = 6;

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

type ResearchSourceKind = "official" | "authority" | "academic" | "map";

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
  sources: ResearchSource[];
};

type BaiduSearchReference = {
  title?: unknown;
  url?: unknown;
  snippet?: unknown;
  content?: unknown;
  type?: unknown;
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
    maxTokens: 2200,
    systemPrompt: withRepairInstruction(
      [
        "你叫小城，在这座城市住了很多年，喜欢读本地历史、建筑随笔和作家的城市笔记。现在正带着一位朋友散步：像突然想起一件有意思的事那样分享，不像导游背书，也不必面面俱到。",
        "开场总从可感知的细节进入：光线、声音、气味、门的样子、树影或脚步的节奏，而不是定义、年代或地位。知识要包在一个小场景里，先说“你注意到没有”“有意思的是”“看看这里”，让读者在现场多停一会儿。每站只挑 1-2 个最值得讲的点；同一路线的不同站点必须使用不同的开场角度和内容结构，不能只替换地名。",
        "可以使用“我总觉得”“每次路过我都会留意”这类仅表达当下感受的朋友口吻；绝不能虚构亲身经历、人物轶事或来访记录。不要写营销软文、学术腔、说明书式罗列，也不要复制任何参考路线的句子或段落。",
        "userPrompt.verifiedSources 是唯一可写成事实的证据包。只可把其中支持的内容写成具体年份、人物关系、建筑年代、文保级别、地址、开放时间、票价、预约方式和现场细节；证据不足就删去该事实，不用常识、记忆或推测补足。禁止编造名人到访、轶事、引语、销量、称号、获奖，以及“最、唯一、第一”等绝对结论。",
        "餐饮店的营业时间、价格、菜单和预约信息都容易变化：只有证据包明确提供时才可写入 practicalTips，并写明 userPrompt.verifiedAt；不得把它们写进没有日期的历史叙述。",
        "在面向读者的 shortIntro、themeConnections、practicalTips 和 checkInTasks 中，不要使用“线索、核验、观察点、建议、适合作为、追问、展陈主线、立面比例、门窗尺度、待确认、待验证”等词。不要把不确定性写成扫兴的免责声明；没有证据便不写。",
        "输出严格 json 对象，不要 markdown。字段：placeId, shortIntro, themeConnections, practicalTips, checkInTasks, sourceClaims, sourceStatus。",
        "shortIntro 写 2-4 句自然短句：从感官细节切入，写这地方给人的感觉，再放进一个证据支持的有意思事实。让人读完想停下来多看两眼。",
        "themeConnections 输出 3-4 条。每条用 2-4 句讲一个与站点有关的小故事或现场片段，不要按“历史/建筑/文学”做填表式罗列；最后一句最好落回现场，可以邀请朋友看看、找找或留意。历史事实只可来自证据包，其他内容写为当下可做的感受或观察。",
        "checkInTasks 必须恰好 2 项，语气像朋友发起一个不难但有意思的小游戏，不要添加“XX关”标签。第一项通常是找一个具体视觉目标并在允许拍摄处拍照；第二项是稍有挑战的观察、对比、寻找或互动。任务必须和当前站点的内容呼应，目标明确，不打扰他人、不要求进入非开放区域，也不用“核验、确认、验证”等报告式词语。",
        "sourceClaims 列出 1-5 条你实际使用的关键事实，每条以对应资料编号开头，例如“S1：……”。没有充分证据时可为空。sourceStatus 必须使用 userPrompt.researchStatus 的值。",
      ].join(""),
      input.schemaRepair,
    ),
    userPrompt: JSON.stringify({
      route: input.route,
      stop: input.stop,
      verifiedAt: research.checkedAt,
      researchStatus: research.status,
      verifiedSources: research.sources,
      schemaRepair: input.schemaRepair ?? null,
      exampleJson: {
        placeId: "poi-id",
        shortIntro:
          "拐进这条街时，先看看墙面上被树影切开的明暗。资料里提到，这处地方曾见证过一段城市变迁；站在这里，你会发现宏大的故事其实离脚步很近。",
        themeConnections: [
          {
            theme: "建筑",
            text: "你注意到没有，入口和街道之间总会留下一个让人放慢脚步的过渡。走近一点看看材料、光线和人的动线，它们比一串术语更会讲故事。",
          },
          {
            theme: "历史",
            text: "资料里保存下来的那件往事，不必急着背下来。先在现场找找它留下的空间感，想想当时的人会从哪里进来、又会在哪里停下。",
          },
          {
            theme: "文学",
            text: "这儿很适合把城市当作一本摊开的书。看看路名、店招和路过的人，哪一个细节最像这一页的句子。",
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

  const authoritativeSources = baiduApiKey
    ? await searchBaiduSources({
        apiKey: baiduApiKey,
        city: readRouteCity(input.route),
        stop,
      })
    : [];
  const sources = [
    ...authoritativeSources,
    ...(mapSource ? [mapSource] : []),
  ].slice(0, MAX_RESEARCH_SOURCES);

  if (sources.length === 0) {
    throw new Error("source_research_no_authoritative_sources");
  }

  return {
    checkedAt,
    status: authoritativeSources.length > 0 ? "verified" : "partial",
    sources: sources.map((source, index) => ({
      ...source,
      id: `S${index + 1}`,
    })),
  };
}

async function searchBaiduSources({
  apiKey,
  city,
  stop,
}: {
  apiKey: string;
  city: string;
  stop: ReturnType<typeof readStopResearchFields>;
}) {
  const query = [city, stop.name, stop.address, "官网 开放时间 历史 建筑"]
    .filter(Boolean)
    .join(" ");
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
          content: query.slice(0, 36),
        },
      ],
      search_source: "baidu_search_v2",
      resource_type_filter: [{ type: "web", top_k: 20 }],
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
    const kind = classifyResearchSource(href);
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

  return sources;
}

function readStopResearchFields(stop: unknown) {
  const value = isRecord(stop) ? stop : {};

  return {
    name: readString(value.name),
    address: readString(value.address),
    openingHours: readString(value.openingHours),
    providerCost: readString(value.providerCost),
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

function attachStopResearch(result: unknown, research: StopResearch) {
  if (!isRecord(result)) {
    return result;
  }

  return {
    ...result,
    sourceStatus: research.status,
    sourceReferences: research.sources.map(({ id, label, href, kind }) => ({
      id,
      label,
      href,
      kind,
    })),
    verifiedAt: research.checkedAt,
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
