"use client";

import type { AiUsageRecord } from "@/lib/ai/route-collaboration";
import {
  createBrowserSupabaseClient,
  isSupabaseConfigured,
} from "@/lib/supabase/client";
import type { Database, Json } from "@/lib/supabase/database.types";

type AiRunAction = "parse_intent" | "rank_candidates";

type LogAiUsageInput = {
  routeId?: string | null;
  action: AiRunAction;
  usage: AiUsageRecord;
  inputPayload?: Json;
  outputPayload?: Json;
  errorMessage?: string | null;
  idempotencyKey?: string | null;
};

export async function logAiUsageRun(input: LogAiUsageInput) {
  if (!isSupabaseConfigured()) {
    return;
  }

  const client = createBrowserSupabaseClient();

  if (!client) {
    return;
  }

  const {
    data: { user },
    error: userError,
  } = await client.auth.getUser();

  if (userError || !user) {
    return;
  }

  const payload: Database["public"]["Tables"]["route_ai_runs"]["Insert"] = {
    route_id: isUuid(input.routeId) ? input.routeId : null,
    user_id: user.id,
    action: input.action,
    provider: input.usage.provider,
    model: input.usage.model,
    prompt_version: input.usage.promptVersion,
    schema_version: "v1",
    status: input.errorMessage ? "failed" : "succeeded",
    input_payload: input.inputPayload ?? {},
    output_payload: input.outputPayload ?? null,
    error_message: input.errorMessage ?? null,
    input_tokens: input.usage.inputTokens,
    output_tokens: input.usage.outputTokens,
    estimated_cost_cny: input.usage.estimatedCostCny,
    elapsed_ms: input.usage.elapsedMs,
    idempotency_key: input.idempotencyKey ?? null,
  };

  await client.from("route_ai_runs").insert(payload);
}

export function makeAiRunIdempotencyKey(
  action: AiRunAction,
  routeId: string,
  fingerprint: string,
) {
  return `${action}:${routeId}:${stableFingerprint(fingerprint)}`;
}

function isUuid(value?: string | null) {
  return Boolean(
    value &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        value,
      ),
  );
}

function stableFingerprint(value: string) {
  let hash = 0;

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }

  return hash.toString(36);
}
