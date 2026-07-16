import { z } from "zod";
import type { RouteCandidate } from "@/lib/route-candidates";
import type { RouteDraft, RoutePlan, RouteStop, Theme } from "@/lib/route";

export const promptVersion = "route-collaboration-v0.1";

export const planningIntentSchema = z.object({
  mode: z.enum(["discover", "complete", "refine"]).default("complete"),
  city: z.string().min(1),
  date: z.string().nullable(),
  mustVisitPlaceIds: z.array(z.string()).default([]),
  themeFilters: z
    .array(z.enum(["历史", "文学", "建筑", "音乐", "书店", "美食"]))
    .default([]),
  pace: z.enum(["轻松漫步", "平衡", "充实紧凑"]).default("平衡"),
  maxWalkingKm: z.number().positive().max(30),
  mealRequirement: z.string().nullable(),
});

export const routeProposalSchema = z.object({
  title: z.string().min(1).max(80),
  orderedPlaceIds: z.array(z.string()).min(2),
  candidatePlaceIds: z.array(z.string()).default([]),
  stayMinutes: z.record(z.string(), z.number().int().min(5).max(240)),
  reasoningSummary: z.string().min(1).max(500),
  warnings: z.array(z.string()).default([]),
});

export const routeTitleSchema = z.object({
  title: z.string().min(2).max(32),
  warnings: z.array(z.string()).default([]),
});

export const stopThemeContentSchema = z.object({
  placeId: z.string().min(1),
  shortIntro: z.string().min(20).max(700),
  themeConnections: z.array(
    z.object({
      theme: z.enum(["历史", "文学", "建筑", "音乐", "书店", "美食"]),
      text: z.string().min(10).max(520),
    }),
  ),
  practicalTips: z.array(z.string()).default([]),
  checkInTasks: z.array(z.string().min(4).max(160)).default([]),
  sourceClaims: z.array(z.string()).default([]),
  sourceStatus: z.enum(["unverified", "verified"]).default("unverified"),
});

export type PlanningIntent = z.infer<typeof planningIntentSchema>;
export type RouteProposal = z.infer<typeof routeProposalSchema>;
export type RouteTitleSuggestion = z.infer<typeof routeTitleSchema>;
export type StopThemeContent = z.infer<typeof stopThemeContentSchema>;

export type AiUsageRecord = {
  promptVersion: string;
  provider: "fallback" | "deepseek";
  model: string;
  inputTokens: number;
  outputTokens: number;
  elapsedMs: number;
  estimatedCostCny: number;
};

export type CollaborationResult<T> = {
  data: T;
  usage: AiUsageRecord;
  warnings: string[];
};

export function parseIntentWithFallback(
  input: string,
  draft: RouteDraft,
): CollaborationResult<PlanningIntent> {
  const startedAt = performanceNow();
  const themes = inferThemes(input, draft.themes);
  const maxWalkingKm = inferMaxWalkingKm(draft.walkingRangeKm);
  const parsed = planningIntentSchema.parse({
    mode: draft.mode,
    city: inferCity(input) ?? draft.city,
    date: draft.dateLabel === "暂不确定" ? null : draft.dateLabel,
    mustVisitPlaceIds: draft.mustVisits,
    themeFilters: themes,
    pace: draft.pace,
    maxWalkingKm,
    mealRequirement: inferMealRequirement(input),
  });

  return {
    data: parsed,
    usage: fallbackUsage(input, JSON.stringify(parsed), startedAt),
    warnings: ["AI API 未配置，当前使用本地规则解析。"],
  };
}

export function rankCandidatesWithFallback(
  candidates: RouteCandidate[],
  intent: PlanningIntent,
  routeGoal = "",
): CollaborationResult<RouteCandidate[]> {
  const startedAt = performanceNow();
  const ranked = [...candidates].sort((a, b) => {
    const aThemeBoost = countThemeMatches(a.themes, intent.themeFilters) * 8;
    const bThemeBoost = countThemeMatches(b.themes, intent.themeFilters) * 8;
    const aGoalBoost = scoreCandidateAgainstGoal(a, routeGoal, intent);
    const bGoalBoost = scoreCandidateAgainstGoal(b, routeGoal, intent);

    return b.score + bThemeBoost + bGoalBoost - (a.score + aThemeBoost + aGoalBoost);
  });

  return {
    data: ranked.map((candidate) => ({
      ...candidate,
      reasons: [
        ...candidate.reasons,
        templateAiReason(candidate, intent.themeFilters, routeGoal, intent),
      ],
    })),
    usage: fallbackUsage(
      JSON.stringify(intent),
      ranked.map((candidate) => candidate.id).join(","),
      startedAt,
    ),
    warnings: ["AI 推荐理由来自模板，待 DeepSeek 接入后可替换。"],
  };
}

export function validateRouteProposal(raw: unknown, allowedPlaceIds: string[]) {
  const parsed = routeProposalSchema.safeParse(raw);

  if (!parsed.success) {
    return {
      success: false as const,
      issues: parsed.error.issues.map((issue) => issue.message),
    };
  }

  const allowed = new Set(allowedPlaceIds);
  const unknownIds = [
    ...parsed.data.orderedPlaceIds,
    ...parsed.data.candidatePlaceIds,
    ...Object.keys(parsed.data.stayMinutes),
  ].filter((id) => !allowed.has(id));

  if (unknownIds.length > 0) {
    return {
      success: false as const,
      issues: [
        `AI 输出包含不存在的 POI ID：${[...new Set(unknownIds)].join("、")}`,
      ],
    };
  }

  return {
    success: true as const,
    data: parsed.data,
  };
}

export function generateRouteSummaryWithFallback(route: RoutePlan) {
  const primaryThemes = route.themes.slice(0, 2).join("、") || "城市文化";

  return {
    title: `${route.city} · ${primaryThemes}漫游`,
    summary: `从${route.stops[0]?.name ?? "起点"}出发，串联${route.stops.length}个站点，以${primaryThemes}为线索，保留人工复核和实地调整空间。`,
    sourceStatus: "template" as const,
  };
}

export function generateStopThemeContentWithFallback(
  stop: RouteStop,
): StopThemeContent {
  const theme = stop.themes[0] ?? "历史";
  const stopArea = stop.area ? `${stop.area}片区` : "这片街区";
  const stopAddress = stop.address ? `地址线索是${stop.address}` : "";
  const shortIntro =
    stop.note.trim().length >= 20
      ? stop.note.trim().slice(0, 170)
      : `${stop.name} 适合作为这条路线中的${theme}观察点。到现场时，可以把门面、街道尺度、周边业态和人流节奏一起看，先形成自己的城市阅读，再补充史料核验。`;
  const themeConnections = (stop.themes.length > 0 ? stop.themes : [theme])
    .slice(0, 3)
    .map((item) => ({
      theme: item,
      text: buildThemeConnection(stop, item, stopArea, stopAddress).slice(
        0,
        178,
      ),
    }));

  return stopThemeContentSchema.parse({
    placeId: stop.sourcePlaceId ?? stop.id,
    shortIntro,
    themeConnections,
    practicalTips: [
      `建议停留 ${stop.stayMinutes} 分钟：前半段观察空间和人流，后半段记录与本路线主题相关的细节。`,
      "开放时间、预约、门票和现场管控信息需要出发前再次核验。",
    ],
    checkInTasks: [
      `拍一张能同时看到${stop.name}入口和周边街道关系的照片。`,
      "记录一个你认为最能代表这里气质的细节：门牌、树影、声音或人流。",
    ],
    sourceClaims: [],
    sourceStatus: "unverified",
  });
}

function buildThemeConnection(
  stop: RouteStop,
  theme: Theme,
  stopArea: string,
  stopAddress: string,
) {
  switch (theme) {
    case "历史":
      return `${stop.name} 可以从“城市记忆如何被保留”切入：看建筑边界、门牌、纪念性标识和周边街巷关系。${stopAddress}，适合作为后续查证地方志、展陈说明或官方介绍的索引。`;
    case "文学":
      return `把这里当作一段城市文本来读：记录店招、路名、橱窗、行人停留方式和声音层次，再和路线中的书店或文学站点互相对照。`;
    case "建筑":
      return `重点看立面比例、入口尺度、材料颜色和新旧建筑的连接方式。${stopArea}的街道肌理能帮助判断它在路线中的空间角色。`;
    case "音乐":
      return `适合用声音来观察：留意街面噪声、室内外声场变化、是否有演出或公共广播，让音乐主题落到真实步行体验。`;
    case "书店":
      return `如果这里与阅读或出版有关，可以看选书、陈列、活动海报和读者停留方式；如果不是书店，则把它作为前后阅读站点之间的城市语境。`;
    case "美食":
      return `美食线索不只看吃什么，也看排队、出餐节奏、街角气味和午间人流。适合判断这段路线是否需要安排休息或用餐。`;
  }
}

function inferThemes(input: string, fallbackThemes: Theme[]) {
  const themeWords: Theme[] = ["历史", "文学", "建筑", "音乐", "书店", "美食"];
  const inferred = themeWords.filter((theme) => input.includes(theme));

  return inferred.length > 0 ? inferred : fallbackThemes;
}

function inferCity(input: string) {
  return ["南京", "上海", "北京", "杭州", "苏州", "广州"].find((city) =>
    input.includes(city),
  );
}

function inferMaxWalkingKm(label: string) {
  const match = /(\d+)(?:\s*-\s*(\d+))?\s*km/i.exec(label);

  if (!match) {
    return 10;
  }

  return Number(match[2] ?? match[1]);
}

function inferMealRequirement(input: string) {
  if (matchesAny(input, ["晚餐", "晚饭", "傍晚", "晚上吃", "收官餐"])) {
    return "dinner";
  }

  if (matchesAny(input, ["午餐", "午饭", "中午吃"])) {
    return "lunch";
  }

  return null;
}

function countThemeMatches(candidateThemes: Theme[], targetThemes: Theme[]) {
  return candidateThemes.filter((theme) => targetThemes.includes(theme)).length;
}

function templateAiReason(
  candidate: RouteCandidate,
  themes: Theme[],
  routeGoal = "",
  intent?: PlanningIntent,
) {
  const matchedThemes = candidate.themes.filter((theme) =>
    themes.includes(theme),
  );

  if (
    candidate.placeType === "餐厅" &&
    (routeGoal.includes("晚餐") || intent?.mealRequirement === "dinner")
  ) {
    return "它更适合作为晚餐候选，能把路线收束到用餐和休息节奏上。";
  }

  if (candidate.placeType === "餐厅" && routeGoal.includes("午餐")) {
    return "它适合作为午餐候选，能在路线中段提供明确的用餐停顿。";
  }

  const goalKeywords = getGoalKeywords(routeGoal);
  const matchedGoalKeywords = goalKeywords.filter((keyword) =>
    [candidate.place.name, candidate.place.address ?? "", candidate.place.poiType ?? ""]
      .join(" ")
      .includes(keyword),
  );

  if (matchedGoalKeywords.length > 0) {
    return `它呼应你补充的${matchedGoalKeywords.slice(0, 2).join("、")}目标，同时保持路线连续。`;
  }

  if (matchedThemes.length === 0) {
    return "作为备选点，它主要补充路线节奏和空间连续性。";
  }

  return `它能加强${matchedThemes.join("、")}线索，同时不明显拉长步行时间。`;
}

function scoreCandidateAgainstGoal(
  candidate: RouteCandidate,
  routeGoal: string,
  intent: PlanningIntent,
) {
  const text = [
    candidate.place.name,
    candidate.place.address ?? "",
    candidate.place.poiType ?? "",
    candidate.placeType,
    candidate.themes.join(" "),
  ].join(" ");
  const keywordScore = getGoalKeywords(routeGoal).filter((keyword) =>
    text.includes(keyword),
  ).length;
  const dinnerScore =
    candidate.placeType === "餐厅" &&
    (routeGoal.includes("晚餐") || intent.mealRequirement === "dinner")
      ? 36
      : 0;
  const lunchScore =
    candidate.placeType === "餐厅" &&
    (routeGoal.includes("午餐") || intent.mealRequirement === "lunch")
      ? 24
      : 0;

  return Math.min(16, keywordScore * 5) + dinnerScore + lunchScore;
}

function getGoalKeywords(routeGoal: string) {
  return [
    "民国",
    "近代",
    "老城",
    "老街",
    "书店",
    "文学",
    "建筑",
    "历史",
    "音乐",
    "展览",
    "博物馆",
    "美术馆",
    "小吃",
    "淮扬",
    "南京菜",
    "本帮",
    "日料",
    "韩餐",
    "火锅",
    "烧烤",
  ].filter((keyword) => routeGoal.includes(keyword));
}

function matchesAny(input: string, keywords: string[]) {
  return keywords.some((keyword) => input.includes(keyword));
}

function fallbackUsage(
  input: string,
  output: string,
  startedAt: number,
): AiUsageRecord {
  return {
    promptVersion,
    provider: "fallback",
    model: "local-template",
    inputTokens: estimateTokens(input),
    outputTokens: estimateTokens(output),
    elapsedMs: Math.round(performanceNow() - startedAt),
    estimatedCostCny: 0,
  };
}

function estimateTokens(value: string) {
  return Math.ceil(value.length / 2);
}

function performanceNow() {
  return typeof performance === "undefined" ? Date.now() : performance.now();
}
