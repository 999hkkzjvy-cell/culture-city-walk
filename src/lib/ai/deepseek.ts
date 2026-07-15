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
  const response = await invokeDeepSeekProxy("parse-intent", {
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
  });
  const parsed = planningIntentSchema.parse(response.result);

  return {
    data: parsed,
    usage: toUsageRecord(response.usage),
    warnings: response.warnings,
  };
}

export async function rankCandidatesWithDeepSeek(
  candidates: RouteCandidate[],
  intent: PlanningIntent,
): Promise<CollaborationResult<RouteCandidate[]>> {
  const response = await invokeDeepSeekProxy("rank-candidates", {
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
  });
  const ranked = rankedCandidateSchema.parse(response.result);
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
    usage: toUsageRecord(response.usage),
    warnings: [...response.warnings, ...ranked.warnings],
  };
}

export async function generateStopThemeContentWithDeepSeek(
  stop: RouteStop,
  route: RoutePlan,
): Promise<CollaborationResult<StopThemeContent>> {
  const response = await invokeDeepSeekProxy("stop-deep-reading", {
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
  });
  const parsed = stopThemeContentSchema.parse(response.result);

  return {
    data: parsed,
    usage: toUsageRecord(response.usage),
    warnings: response.warnings,
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

function toUsageRecord(usage: z.infer<typeof deepSeekUsageSchema>): AiUsageRecord {
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
