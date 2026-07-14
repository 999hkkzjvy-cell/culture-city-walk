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

export const stopThemeContentSchema = z.object({
  placeId: z.string().min(1),
  shortIntro: z.string().min(20).max(180),
  themeConnections: z.array(
    z.object({
      theme: z.enum(["历史", "文学", "建筑", "音乐", "书店", "美食"]),
      text: z.string().min(10).max(180),
    }),
  ),
  practicalTips: z.array(z.string()).default([]),
  sourceClaims: z.array(z.string()).default([]),
  sourceStatus: z.enum(["unverified", "verified"]).default("unverified"),
});

export type PlanningIntent = z.infer<typeof planningIntentSchema>;
export type RouteProposal = z.infer<typeof routeProposalSchema>;
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
    mealRequirement: input.includes("午餐") ? "lunch" : null,
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
): CollaborationResult<RouteCandidate[]> {
  const startedAt = performanceNow();
  const ranked = [...candidates].sort((a, b) => {
    const aThemeBoost = countThemeMatches(a.themes, intent.themeFilters) * 8;
    const bThemeBoost = countThemeMatches(b.themes, intent.themeFilters) * 8;

    return b.score + bThemeBoost - (a.score + aThemeBoost);
  });

  return {
    data: ranked.map((candidate) => ({
      ...candidate,
      reasons: [
        ...candidate.reasons,
        templateAiReason(candidate, intent.themeFilters),
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
  const shortIntro =
    stop.note.trim().length >= 20
      ? stop.note.trim().slice(0, 170)
      : `${stop.name} 适合作为这条路线中的${theme}观察点，具体故事和来源后续需要继续核验。`;

  return stopThemeContentSchema.parse({
    placeId: stop.sourcePlaceId ?? stop.id,
    shortIntro,
    themeConnections: [
      {
        theme,
        text: `这里暂以${theme}作为阅读角度，后续 AI 接入后再生成更完整的站点讲解。`,
      },
    ],
    practicalTips: ["开放时间、预约和门票信息需要出发前再次核验。"],
    sourceClaims: [],
    sourceStatus: "unverified",
  });
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

function countThemeMatches(candidateThemes: Theme[], targetThemes: Theme[]) {
  return candidateThemes.filter((theme) => targetThemes.includes(theme)).length;
}

function templateAiReason(candidate: RouteCandidate, themes: Theme[]) {
  const matchedThemes = candidate.themes.filter((theme) =>
    themes.includes(theme),
  );

  if (matchedThemes.length === 0) {
    return "作为备选点，它主要补充路线节奏和空间连续性。";
  }

  return `它能加强${matchedThemes.join("、")}线索，同时不明显拉长步行时间。`;
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
