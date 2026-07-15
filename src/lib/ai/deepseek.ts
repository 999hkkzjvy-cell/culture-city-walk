import { z } from "zod";
import type { RouteCandidate } from "@/lib/route-candidates";
import type { RouteDraft, RoutePlan, RouteStop } from "@/lib/route";
import {
  createBrowserSupabaseClient,
  isSupabaseConfigured,
} from "@/lib/supabase/client";
import {
  planningIntentSchema,
  promptVersion,
  stopThemeContentSchema,
  type AiUsageRecord,
  type CollaborationResult,
  type PlanningIntent,
  type StopThemeContent,
} from "./route-collaboration";

const deepSeekUsageSchema = z.object({
  provider: z.literal("deepseek"),
  model: z.string().min(1),
  inputTokens: z.number().int().nonnegative(),
  outputTokens: z.number().int().nonnegative(),
  elapsedMs: z.number().int().nonnegative(),
  estimatedCostCny: z.number().nonnegative(),
});

const rankedCandidateSchema = z.object({
  ranked: z
    .array(
      z.object({
        id: z.string().min(1),
        reasons: z.array(z.string().min(1).max(140)).min(1).max(3),
      }),
    )
    .default([]),
  warnings: z.array(z.string()).default([]),
});

const proxyResponseSchema = z.object({
  result: z.unknown(),
  usage: deepSeekUsageSchema,
  warnings: z.array(z.string()).default([]),
});

type DeepSeekUsage = z.infer<typeof deepSeekUsageSchema>;

type ProxyResponse = z.infer<typeof proxyResponseSchema>;

export function isDeepSeekProxyConfigured() {
  return (
    isSupabaseConfigured() &&
    process.env.NEXT_PUBLIC_DEEPSEEK_PROXY_ENABLED === "true"
  );
}

export async function parseIntentWithDeepSeek(
  input: string,
  draft: RouteDraft,
): Promise<CollaborationResult<PlanningIntent>> {
  const action = "parse-intent";
  const payload = {
    input,
    draft: {
      mode: draft.mode,
      city: draft.city,
      dateLabel: draft.dateLabel,
      mustVisits: draft.mustVisits,
      themes: draft.themes,
      pace: draft.pace,
      walkingRangeKm: draft.walkingRangeKm,
    },
  };
  const response = await invokeDeepSeekProxy(action, payload);
  const parsed = await parseResultWithRepair(
    action,
    payload,
    response,
    planningIntentSchema,
  );

  return {
    data: parsed.data,
    usage: toUsageRecord(parsed.usage),
    warnings: parsed.warnings,
  };
}

export async function rankCandidatesWithDeepSeek(
  candidates: RouteCandidate[],
  intent: PlanningIntent,
): Promise<CollaborationResult<RouteCandidate[]>> {
  const action = "rank-candidates";
  const payload = {
    intent,
    candidates: candidates.map((candidate) => ({
      id: candidate.id,
      name: candidate.place.name,
      area: candidate.place.district ?? candidate.place.city,
      placeType: candidate.placeType,
      themes: candidate.themes,
      stayMinutes: candidate.stayMinutes,
      detourMinutes: candidate.detourMinutes,
      detourMeters: candidate.detourMeters,
      score: candidate.score,
      fitBand: candidate.fitBand,
      localReasons: candidate.reasons,
      risks: candidate.risks,
    })),
  };
  const response = await invokeDeepSeekProxy(action, payload);
  const parsed = await parseResultWithRepair(
    action,
    payload,
    response,
    rankedCandidateSchema,
  );
  const ranked = parsed.data;
  const candidateById = new Map(candidates.map((candidate) => [candidate.id, candidate]));
  const seen = new Set<string>();
  const ordered = ranked.ranked
    .map((item) => {
      const candidate = candidateById.get(item.id);

      if (!candidate || seen.has(item.id)) {
        return null;
      }

      seen.add(item.id);

      return {
        ...candidate,
        reasons: [...candidate.reasons, ...item.reasons],
      };
    })
    .filter((candidate): candidate is RouteCandidate => Boolean(candidate));
  const missing = candidates.filter((candidate) => !seen.has(candidate.id));

  return {
    data: [...ordered, ...missing],
    usage: toUsageRecord(parsed.usage),
    warnings: [...parsed.warnings, ...ranked.warnings],
  };
}

export async function generateStopThemeContentWithDeepSeek(
  stop: RouteStop,
  route: RoutePlan,
): Promise<CollaborationResult<StopThemeContent>> {
  const action = "stop-deep-reading";
  const payload = {
    route: {
      city: route.city,
      title: route.title,
      themes: route.themes,
      stopNames: route.stops.map((item) => item.name),
    },
    stop: {
      id: stop.sourcePlaceId ?? stop.id,
      name: stop.name,
      area: stop.area,
      address: stop.address,
      themes: stop.themes,
      note: stop.note,
      stayMinutes: stop.stayMinutes,
      verificationStatus: stop.verificationStatus,
    },
  };
  const response = await invokeDeepSeekProxy(action, payload);
  const parsed = await parseResultWithRepair(
    action,
    payload,
    response,
    stopThemeContentSchema,
  );

  return {
    data: parsed.data,
    usage: toUsageRecord(parsed.usage),
    warnings: parsed.warnings,
  };
}

async function invokeDeepSeekProxy(action: string, payload: object) {
  const client = createBrowserSupabaseClient();

  if (!client) {
    throw new Error("Supabase is not configured.");
  }

  const { data, error } = await client.functions.invoke("deepseek-proxy", {
    body: {
      action,
      ...payload,
    },
  });

  if (error) {
    throw new Error(error.message);
  }

  return proxyResponseSchema.parse(data);
}

async function parseResultWithRepair<T>(
  action: string,
  payload: object,
  response: ProxyResponse,
  schema: z.ZodType<T>,
) {
  const parsed = schema.safeParse(response.result);

  if (parsed.success) {
    return {
      data: parsed.data,
      usage: response.usage,
      warnings: response.warnings,
    };
  }

  const repairResponse = await invokeDeepSeekProxy(action, {
    ...payload,
    schemaRepair: {
      issues: parsed.error.issues.map(formatZodIssue).slice(0, 8),
      previousResult: response.result,
    },
  });
  const repaired = schema.parse(repairResponse.result);

  return {
    data: repaired,
    usage: mergeUsage(response.usage, repairResponse.usage),
    warnings: [
      ...response.warnings,
      "DeepSeek 输出格式已自动修复一次。",
      ...repairResponse.warnings,
    ],
  };
}

function formatZodIssue(issue: z.ZodIssue) {
  const path = issue.path.length > 0 ? issue.path.join(".") : "root";

  return `${path}: ${issue.message}`;
}

function mergeUsage(first: DeepSeekUsage, second: DeepSeekUsage): DeepSeekUsage {
  return {
    provider: "deepseek",
    model: second.model || first.model,
    inputTokens: first.inputTokens + second.inputTokens,
    outputTokens: first.outputTokens + second.outputTokens,
    elapsedMs: first.elapsedMs + second.elapsedMs,
    estimatedCostCny: first.estimatedCostCny + second.estimatedCostCny,
  };
}

function toUsageRecord(usage: DeepSeekUsage): AiUsageRecord {
  return {
    promptVersion,
    provider: usage.provider,
    model: usage.model,
    inputTokens: usage.inputTokens,
    outputTokens: usage.outputTokens,
    elapsedMs: usage.elapsedMs,
    estimatedCostCny: usage.estimatedCostCny,
  };
}
