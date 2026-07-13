import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": Deno.env.get("SHARE_ALLOWED_ORIGINS") || "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

type ShareRoutePayload = {
  route: {
    id: string;
    title: string;
    city: string;
    theme_filters: unknown;
    preferences: unknown;
    version: number;
  };
  stops: Array<{
    sort_order: number;
    title_snapshot: string;
    arrival_time: string | null;
    stay_minutes: number;
    note: unknown;
    walking_from_previous: unknown;
  }>;
  share: {
    code: string;
    allow_copy: boolean;
    expires_at: string | null;
  };
};

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (request.method !== "GET") {
    return json({ error: "method_not_allowed" }, 405);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !serviceRoleKey) {
    return json({ error: "server_not_configured" }, 500);
  }

  const code = new URL(request.url).searchParams.get("code")?.trim();

  if (!code || code.length < 10 || code.length > 24) {
    return json({ error: "invalid_share_code" }, 400);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  const { data: share, error: shareError } = await supabase
    .from("route_shares")
    .select(
      `
      share_code,
      allow_copy,
      expires_at,
      revoked_at,
      route_version,
      routes!inner (
        id,
        title,
        city,
        theme_filters,
        preferences,
        version,
        owner_id
      )
    `,
    )
    .eq("share_code", code)
    .maybeSingle();

  if (shareError) {
    return json({ error: "share_lookup_failed" }, 500);
  }

  if (!share || share.revoked_at) {
    return json({ error: "share_not_found" }, 404);
  }

  if (share.expires_at && new Date(share.expires_at).getTime() < Date.now()) {
    return json({ error: "share_expired" }, 410);
  }

  const route = Array.isArray(share.routes) ? share.routes[0] : share.routes;

  if (!route) {
    return json({ error: "route_not_found" }, 404);
  }

  const { data: stops, error: stopsError } = await supabase
    .from("route_stops")
    .select("sort_order, title_snapshot, arrival_time, stay_minutes, note, walking_from_previous")
    .eq("route_id", route.id)
    .order("sort_order", { ascending: true });

  if (stopsError) {
    return json({ error: "stops_lookup_failed" }, 500);
  }

  const payload: ShareRoutePayload = {
    route: {
      id: route.id,
      title: route.title,
      city: route.city,
      theme_filters: route.theme_filters,
      preferences: route.preferences,
      version: route.version,
    },
    stops: stops ?? [],
    share: {
      code: share.share_code,
      allow_copy: share.allow_copy,
      expires_at: share.expires_at,
    },
  };

  return json(payload, 200);
});

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json; charset=utf-8",
    },
  });
}
