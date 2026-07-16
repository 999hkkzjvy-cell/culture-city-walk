const corsHeaders = {
  "Access-Control-Allow-Origin": Deno.env.get("SHARE_ALLOWED_ORIGINS") || "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const AMAP_REST_BASE = "https://restapi.amap.com";
const MAX_POI_LIMIT = 15;

type AmapProxyRequest =
  | {
      action: "diagnostic";
      probe?: boolean;
    }
  | {
      action: "place-text";
      keyword: string;
      city?: string;
      limit?: number;
    }
  | {
      action: "place-around";
      center: AmapPointInput;
      city?: string;
      types?: string;
      radiusMeters?: number;
      limit?: number;
    }
  | {
      action: "walking";
      origin: AmapPointInput;
      destination: AmapPointInput;
    }
  | {
      action: "route";
      origin: AmapPointInput;
      destination: AmapPointInput;
      mode: "walking" | "cycling" | "transit" | "driving";
      city?: string;
      departureTime?: string;
    };

type AmapPointInput = {
  id?: string | null;
  lng: number;
  lat: number;
};

type AmapPoi = {
  id?: string;
  name?: string;
  address?: string | unknown[];
  cityname?: string;
  adname?: string;
  adcode?: string;
  type?: string;
  location?: string;
  tel?: string;
  biz_ext?: {
    open_time?: string;
    rating?: string;
    cost?: string;
  };
};

type AmapWalkingStep = {
  distance?: string;
  duration?: string;
  polyline?: string;
  instruction?: string;
  road?: string;
  action?: string;
  assistant_action?: string;
};

type AmapWalkingPath = {
  distance?: string;
  duration?: string;
  steps?: AmapWalkingStep[];
};

type AmapCyclingPath = {
  distance?: string;
  duration?: string;
  steps?: AmapWalkingStep[];
};

type AmapTransitSegment = {
  walking?: {
    distance?: string;
    duration?: string;
  };
  bus?: {
    buslines?: Array<{
      distance?: string;
      duration?: string;
    }>;
  };
};

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (request.method !== "POST") {
    return json({ error: "method_not_allowed" }, 405);
  }

  let body: AmapProxyRequest;

  try {
    body = await request.json();
  } catch {
    return json({ error: "invalid_json" }, 400);
  }

  const amapKey = Deno.env.get("AMAP_WEB_SERVICE_KEY");

  if (body.action === "diagnostic") {
    return await handleDiagnostic(body, amapKey);
  }

  if (!amapKey) {
    return json({ error: "amap_not_configured" }, 500);
  }

  try {
    if (body.action === "place-text") {
      return await handlePlaceText(body, amapKey);
    }

    if (body.action === "place-around") {
      return await handlePlaceAround(body, amapKey);
    }

    if (body.action === "walking") {
      return await handleWalking(body, amapKey);
    }

    if (body.action === "route") {
      return await handleRoute(body, amapKey);
    }
  } catch {
    return json({ error: "amap_network_error" }, 502);
  }

  return json({ error: "invalid_action" }, 400);
});

async function handleDiagnostic(
  input: Extract<AmapProxyRequest, { action: "diagnostic" }>,
  amapKey: string | undefined,
) {
  if (!amapKey) {
    return json(
      {
        edgeFunctionReachable: true,
        amapKeyConfigured: false,
        providerReachable: false,
      },
      200,
    );
  }

  if (!input.probe) {
    return json(
      {
        edgeFunctionReachable: true,
        amapKeyConfigured: true,
        providerReachable: null,
      },
      200,
    );
  }

  const params = new URLSearchParams({
    key: amapKey,
    keywords: "总统府",
    city: "南京",
    citylimit: "true",
    output: "JSON",
    offset: "1",
    page: "1",
  });
  const response = await fetchAmap(`/v3/place/text?${params.toString()}`);

  return json(
    {
      edgeFunctionReachable: true,
      amapKeyConfigured: true,
      providerReachable: response.status === "1",
      info: response.info ?? null,
      infocode: response.infocode ?? null,
    },
    response.status === "1" ? 200 : 502,
  );
}

async function handlePlaceText(
  input: Extract<AmapProxyRequest, { action: "place-text" }>,
  amapKey: string,
) {
  if (typeof input.keyword !== "string") {
    return json({ error: "invalid_keyword" }, 400);
  }

  const keyword = input.keyword.trim();

  if (keyword.length < 2 || keyword.length > 80) {
    return json({ error: "invalid_keyword" }, 400);
  }

  const params = new URLSearchParams({
    key: amapKey,
    keywords: keyword,
    output: "JSON",
    extensions: "all",
    offset: String(normalizeLimit(input.limit)),
    page: "1",
    citylimit: "true",
  });

  if (input.city?.trim()) {
    params.set("city", input.city.trim());
  }

  const response = await fetchAmap(`/v3/place/text?${params.toString()}`);

  if (response.status !== "1") {
    return json(
      {
        error: "amap_provider_error",
        info: response.info ?? "UNKNOWN",
        infocode: response.infocode ?? null,
      },
      502,
    );
  }

  const pois = Array.isArray(response.pois) ? response.pois : [];

  return json(
    {
      places: pois.map(normalizePoi).filter(Boolean),
      count: Number(response.count ?? pois.length) || pois.length,
    },
    200,
  );
}

async function handleRoute(
  input: Extract<AmapProxyRequest, { action: "route" }>,
  amapKey: string,
) {
  if (input.mode === "walking") {
    return handleWalking(
      {
        action: "walking",
        origin: input.origin,
        destination: input.destination,
      },
      amapKey,
    );
  }

  if (input.mode === "transit") {
    return handleTransit(input, amapKey);
  }

  if (input.mode === "cycling") {
    return handleCycling(input, amapKey);
  }

  return handleDriving(input, amapKey);
}

async function handlePlaceAround(
  input: Extract<AmapProxyRequest, { action: "place-around" }>,
  amapKey: string,
) {
  if (!isValidPoint(input.center)) {
    return json({ error: "invalid_coordinate" }, 400);
  }

  const params = new URLSearchParams({
    key: amapKey,
    location: formatPoint(input.center),
    output: "JSON",
    extensions: "all",
    offset: String(normalizeLimit(input.limit)),
    page: "1",
    radius: String(normalizeRadius(input.radiusMeters)),
    sortrule: "distance",
  });

  if (input.city?.trim()) {
    params.set("city", input.city.trim());
    params.set("citylimit", "true");
  }

  if (input.types?.trim()) {
    params.set("types", input.types.trim());
  }

  const response = await fetchAmap(`/v3/place/around?${params.toString()}`);

  if (response.status !== "1") {
    return json(
      {
        error: "amap_provider_error",
        info: response.info ?? "UNKNOWN",
        infocode: response.infocode ?? null,
      },
      502,
    );
  }

  const pois = Array.isArray(response.pois) ? response.pois : [];

  return json(
    {
      places: pois.map(normalizePoi).filter(Boolean),
      count: Number(response.count ?? pois.length) || pois.length,
    },
    200,
  );
}

async function handleWalking(
  input: Extract<AmapProxyRequest, { action: "walking" }>,
  amapKey: string,
) {
  if (!isValidPoint(input.origin) || !isValidPoint(input.destination)) {
    return json({ error: "invalid_coordinate" }, 400);
  }

  const params = new URLSearchParams({
    key: amapKey,
    origin: formatPoint(input.origin),
    destination: formatPoint(input.destination),
    output: "JSON",
  });

  if (input.origin.id) {
    params.set("origin_id", input.origin.id);
  }

  if (input.destination.id) {
    params.set("destination_id", input.destination.id);
  }

  const response = await fetchAmap(
    `/v3/direction/walking?${params.toString()}`,
  );

  if (response.status !== "1") {
    return json(
      {
        error: "amap_provider_error",
        info: response.info ?? "UNKNOWN",
        infocode: response.infocode ?? null,
      },
      502,
    );
  }

  const path = response.route?.paths?.[0] as AmapWalkingPath | undefined;

  if (!path) {
    return json({ error: "route_not_found" }, 404);
  }

  return json(
    {
      distanceMeters: toNumber(path.distance),
      durationSeconds: toNumber(path.duration),
      polyline: flattenPolyline(path.steps ?? []),
      steps: (path.steps ?? []).map((step) => ({
        instruction: step.instruction ?? "",
        road: step.road ?? "",
        distanceMeters: toNumber(step.distance),
        durationSeconds: toNumber(step.duration),
        action: step.action ?? "",
        assistantAction: step.assistant_action ?? "",
      })),
    },
    200,
  );
}

async function handleDriving(
  input: Extract<AmapProxyRequest, { action: "route" }>,
  amapKey: string,
) {
  if (!isValidPoint(input.origin) || !isValidPoint(input.destination)) {
    return json({ error: "invalid_coordinate" }, 400);
  }

  const params = new URLSearchParams({
    key: amapKey,
    origin: formatPoint(input.origin),
    destination: formatPoint(input.destination),
    output: "JSON",
    extensions: "base",
  });

  const response = await fetchAmap(`/v3/direction/driving?${params.toString()}`);

  if (response.status !== "1") {
    return json(
      {
        error: "amap_provider_error",
        info: response.info ?? "UNKNOWN",
        infocode: response.infocode ?? null,
      },
      502,
    );
  }

  const path = response.route?.paths?.[0] as AmapWalkingPath | undefined;

  if (!path) {
    return json({ error: "route_not_found" }, 404);
  }

  return json(
    {
      distanceMeters: toNumber(path.distance),
      durationSeconds: toNumber(path.duration),
      polyline: flattenPolyline(path.steps ?? []),
      steps: [],
    },
    200,
  );
}

async function handleCycling(
  input: Extract<AmapProxyRequest, { action: "route" }>,
  amapKey: string,
) {
  if (!isValidPoint(input.origin) || !isValidPoint(input.destination)) {
    return json({ error: "invalid_coordinate" }, 400);
  }

  const params = new URLSearchParams({
    key: amapKey,
    origin: formatPoint(input.origin),
    destination: formatPoint(input.destination),
  });

  const response = await fetchAmap(`/v4/direction/bicycling?${params.toString()}`);

  if (response.errcode && response.errcode !== 0) {
    return json(
      {
        error: "amap_provider_error",
        info: response.errmsg ?? "UNKNOWN",
        infocode: String(response.errcode),
      },
      502,
    );
  }

  const path = response.data?.paths?.[0] as AmapCyclingPath | undefined;

  if (!path) {
    return json({ error: "route_not_found" }, 404);
  }

  return json(
    {
      distanceMeters: toNumber(path.distance),
      durationSeconds: toNumber(path.duration),
      polyline: flattenPolyline(path.steps ?? []),
      steps: [],
    },
    200,
  );
}

async function handleTransit(
  input: Extract<AmapProxyRequest, { action: "route" }>,
  amapKey: string,
) {
  if (!isValidPoint(input.origin) || !isValidPoint(input.destination)) {
    return json({ error: "invalid_coordinate" }, 400);
  }

  if (!input.city?.trim()) {
    return json({ error: "invalid_city" }, 400);
  }

  const params = new URLSearchParams({
    key: amapKey,
    origin: formatPoint(input.origin),
    destination: formatPoint(input.destination),
    city: input.city.trim(),
    output: "JSON",
  });

  const response = await fetchAmap(
    `/v3/direction/transit/integrated?${params.toString()}`,
  );

  if (response.status !== "1") {
    return json(
      {
        error: "amap_provider_error",
        info: response.info ?? "UNKNOWN",
        infocode: response.infocode ?? null,
      },
      502,
    );
  }

  const transit = response.route?.transits?.[0];

  if (!transit) {
    return json({ error: "route_not_found" }, 404);
  }

  const segments = Array.isArray(transit.segments)
    ? (transit.segments as AmapTransitSegment[])
    : [];
  const segmentWalkingDistance = segments.reduce(
    (total, segment) => total + toNumber(segment.walking?.distance),
    0,
  );

  return json(
    {
      distanceMeters: toNumber(transit.distance) || segmentWalkingDistance,
      durationSeconds: toNumber(transit.duration),
      polyline: [],
      steps: [],
    },
    200,
  );
}

async function fetchAmap(path: string) {
  const response = await fetch(`${AMAP_REST_BASE}${path}`, {
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    throw new Error("amap_network_error");
  }

  return response.json();
}

function normalizePoi(poi: AmapPoi) {
  if (!poi.id || !poi.name) {
    return null;
  }

  return {
    id: poi.id,
    name: poi.name,
    address: typeof poi.address === "string" ? poi.address : null,
    cityname: poi.cityname ?? "",
    adname: poi.adname ?? null,
    adcode: poi.adcode ?? null,
    type: poi.type ?? null,
    location: poi.location ?? null,
    openingHours: normalizeText(poi.biz_ext?.open_time),
    telephone: normalizeText(poi.tel),
    providerRating: normalizeText(poi.biz_ext?.rating),
    providerCost: normalizeText(poi.biz_ext?.cost),
  };
}

function normalizeText(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function flattenPolyline(steps: AmapWalkingStep[]) {
  const points = steps.flatMap((step) =>
    (step.polyline ?? "")
      .split(";")
      .map((point) => point.trim())
      .filter(Boolean),
  );

  return [...new Set(points)]
    .map((point) => {
      const [lng, lat] = point.split(",").map(Number);
      return { lng, lat, system: "gcj02" };
    })
    .filter(
      (point) => Number.isFinite(point.lng) && Number.isFinite(point.lat),
    );
}

function isValidPoint(point: unknown): point is AmapPointInput {
  if (!point || typeof point !== "object") {
    return false;
  }

  const value = point as Partial<AmapPointInput>;

  return (
    Number.isFinite(value.lng) &&
    Number.isFinite(value.lat) &&
    Number(value.lng) >= -180 &&
    Number(value.lng) <= 180 &&
    Number(value.lat) >= -90 &&
    Number(value.lat) <= 90
  );
}

function formatPoint(point: AmapPointInput) {
  return `${point.lng.toFixed(6)},${point.lat.toFixed(6)}`;
}

function toNumber(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeLimit(value: unknown) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return 8;
  }

  return Math.min(MAX_POI_LIMIT, Math.max(1, Math.round(parsed)));
}

function normalizeRadius(value: unknown) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return 1200;
  }

  return Math.min(3000, Math.max(200, Math.round(parsed)));
}

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json; charset=utf-8",
    },
  });
}
