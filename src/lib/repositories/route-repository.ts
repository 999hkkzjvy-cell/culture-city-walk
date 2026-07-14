import type { RouteCandidate } from "@/lib/route-candidates";
import {
  demoRoute,
  type RouteDraft,
  type RoutePlan,
  type RouteStop,
} from "@/lib/route";
import {
  createRouteSnapshot,
  readCandidateState,
  readDraft,
  readRouteSnapshot,
  readRouteSnapshots,
  saveCandidateState,
  saveDraft,
  type StoredCandidateAction,
  type StoredCandidateState,
} from "@/lib/storage";
import {
  createBrowserSupabaseClient,
  type AppSupabaseClient,
} from "@/lib/supabase/client";
import type { Database, Json } from "@/lib/supabase/database.types";

export type SavedRouteSummary = {
  id: string;
  title: string;
  city: string;
  updatedAt: string;
  visibility: "private" | "shared";
  version: number;
};

export type ShareRecord = {
  code: string;
  url: string;
  expiresAt: string | null;
  allowCopy: boolean;
  revokedAt?: string | null;
  createdAt?: string;
};

export type RouteCandidateStatus = "suggested" | StoredCandidateAction;

export type SavedRouteCandidate = {
  candidate: RouteCandidate;
  status: RouteCandidateStatus;
};

export type SaveRouteCandidatesInput = {
  candidates: RouteCandidate[];
  actions: Record<string, StoredCandidateAction>;
};

export type RouteSnapshotPayload = {
  route: RoutePlan;
  candidateState: StoredCandidateState;
};

export type RouteSnapshotSummary = {
  id: string;
  routeId: string;
  version: number;
  title: string;
  stopCount: number;
  candidateCount: number;
  createdAt: string;
};

export interface RouteRepository {
  list(): Promise<SavedRouteSummary[]>;
  get(id: string): Promise<RoutePlan | null>;
  save(route: RoutePlan): Promise<SavedRouteSummary>;
  saveCandidates(
    routeId: string,
    input: SaveRouteCandidatesInput,
  ): Promise<void>;
  listCandidates(routeId: string): Promise<SavedRouteCandidate[]>;
  createSnapshot(
    route: RoutePlan,
    candidateState: StoredCandidateState,
  ): Promise<RouteSnapshotSummary>;
  listSnapshots(routeId: string): Promise<RouteSnapshotSummary[]>;
  readSnapshot(snapshotId: string): Promise<RouteSnapshotPayload | null>;
  delete(id: string): Promise<void>;
  createShare(routeId: string): Promise<ShareRecord>;
  listShares(routeId: string): Promise<ShareRecord[]>;
  revokeShare(code: string): Promise<void>;
}

export interface DraftRepository {
  getLocalDraft(): RouteDraft | null;
  saveLocalDraft(draft: RouteDraft): void;
  clearLocalDraft(): void;
}

export class LocalDraftRepository implements DraftRepository {
  getLocalDraft() {
    return readDraft();
  }

  saveLocalDraft(draft: RouteDraft) {
    saveDraft(draft);
  }

  clearLocalDraft() {
    window.localStorage.removeItem("cultural-citywalk:draft");
  }
}

export function createRouteRepository(): RouteRepository {
  const client = createBrowserSupabaseClient();
  return client
    ? new SupabaseRouteRepository(client)
    : new LocalRouteRepository();
}

class LocalRouteRepository implements RouteRepository {
  async list() {
    return [
      {
        id: demoRoute.id,
        title: demoRoute.title,
        city: demoRoute.city,
        updatedAt: demoRoute.updatedAt,
        visibility: "private" as const,
        version: 1,
      },
    ];
  }

  async get(id: string) {
    return id === demoRoute.id ? demoRoute : null;
  }

  async save(route: RoutePlan) {
    saveDraft(route);
    return {
      id: route.id,
      title: route.title,
      city: route.city,
      updatedAt: new Date().toISOString(),
      visibility: "private" as const,
      version: 1,
    };
  }

  async saveCandidates(routeId: string, input: SaveRouteCandidatesInput) {
    saveCandidateState({
      routeId,
      candidates: input.candidates,
      actions: input.actions,
      updatedAt: new Date().toISOString(),
    });
  }

  async listCandidates(routeId: string) {
    const state = readCandidateState(routeId);

    return state.candidates.map((candidate) => ({
      candidate,
      status: state.actions[candidate.id] ?? "suggested",
    }));
  }

  async createSnapshot(route: RoutePlan, candidateState: StoredCandidateState) {
    return mapStoredSnapshotToSummary(createRouteSnapshot(route, candidateState));
  }

  async listSnapshots(routeId: string) {
    return readRouteSnapshots(routeId).map(mapStoredSnapshotToSummary);
  }

  async readSnapshot(snapshotId: string) {
    const snapshot = readRouteSnapshot(snapshotId);

    return snapshot
      ? {
          route: snapshot.route,
          candidateState: snapshot.candidateState,
        }
      : null;
  }

  async delete() {
    window.localStorage.removeItem("cultural-citywalk:draft");
  }

  async createShare(): Promise<ShareRecord> {
    throw new Error("supabase_not_configured");
  }

  async listShares(): Promise<ShareRecord[]> {
    return [];
  }

  async revokeShare(): Promise<void> {
    throw new Error("supabase_not_configured");
  }
}

class SupabaseRouteRepository implements RouteRepository {
  constructor(private readonly client: AppSupabaseClient) {}

  async list(): Promise<SavedRouteSummary[]> {
    const { data, error } = await this.client
      .from("routes")
      .select("id,title,city,updated_at,visibility,version")
      .order("updated_at", { ascending: false });

    if (error) {
      throw error;
    }

    return (data ?? []).map((route) => ({
      id: route.id,
      title: route.title,
      city: route.city,
      updatedAt: route.updated_at,
      visibility: route.visibility as "private" | "shared",
      version: route.version,
    }));
  }

  async get(id: string): Promise<RoutePlan | null> {
    const { data: route, error } = await this.client
      .from("routes")
      .select(
        "id,title,city,explore_mode,theme_filters,preferences,version,updated_at",
      )
      .eq("id", id)
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (!route) {
      return null;
    }

    const { data: stops, error: stopsError } = await this.client
      .from("route_stops")
      .select(
        "id,sort_order,title_snapshot,arrival_time,stay_minutes,note,walking_from_previous",
      )
      .eq("route_id", id)
      .order("sort_order", { ascending: true });

    if (stopsError) {
      throw stopsError;
    }

    const preferences = route.preferences as Record<string, unknown>;

    return {
      id: route.id,
      city: route.city,
      title: route.title,
      mode: route.explore_mode as RoutePlan["mode"],
      dateLabel: String(preferences.dateLabel ?? "今天"),
      durationHours: Number(preferences.durationHours ?? 5),
      walkingRangeKm: String(preferences.walkingRangeKm ?? "5-10 km"),
      themes: Array.isArray(route.theme_filters)
        ? (route.theme_filters as RoutePlan["themes"])
        : [],
      mustVisits: Array.isArray(preferences.mustVisits)
        ? (preferences.mustVisits as string[])
        : [],
      pace: (preferences.pace as RoutePlan["pace"]) ?? "轻松漫步",
      distanceKm: Number(preferences.distanceKm ?? 0),
      updatedAt: route.updated_at,
      stops: (stops ?? []).map(mapStopFromRow),
    };
  }

  async save(route: RoutePlan): Promise<SavedRouteSummary> {
    const userId = await requireUserId(this.client);

    await this.client.from("profiles").upsert({ id: userId });

    const routeInsert: Database["public"]["Tables"]["routes"]["Insert"] = {
      id: route.id === "demo" ? undefined : route.id,
      owner_id: userId,
      explore_mode: route.mode,
      title: route.title,
      city: route.city,
      status: "ready",
      visibility: "private",
      theme_filters: route.themes as Json,
      preferences: {
        dateLabel: route.dateLabel,
        durationHours: route.durationHours,
        walkingRangeKm: route.walkingRangeKm,
        mustVisits: route.mustVisits,
        pace: route.pace,
        distanceKm: route.distanceKm,
      },
    };

    const { data: savedRoute, error } = await this.client
      .from("routes")
      .upsert(routeInsert)
      .select("id,title,city,updated_at,visibility,version")
      .single();

    if (error) {
      throw error;
    }

    await this.replaceStops(savedRoute.id, route.stops);

    return {
      id: savedRoute.id,
      title: savedRoute.title,
      city: savedRoute.city,
      updatedAt: savedRoute.updated_at,
      visibility: savedRoute.visibility as "private" | "shared",
      version: savedRoute.version,
    };
  }

  async saveCandidates(
    routeId: string,
    input: SaveRouteCandidatesInput,
  ): Promise<void> {
    const { error: deleteError } = await this.client
      .from("route_candidates")
      .delete()
      .eq("route_id", routeId);

    if (deleteError) {
      throw deleteError;
    }

    if (input.candidates.length === 0) {
      return;
    }

    const payload = input.candidates.map((candidate) =>
      routeCandidateToInsert(routeId, candidate, input.actions[candidate.id]),
    );
    const { error } = await this.client
      .from("route_candidates")
      .insert(payload);

    if (error) {
      throw error;
    }
  }

  async listCandidates(routeId: string): Promise<SavedRouteCandidate[]> {
    const { data, error } = await this.client
      .from("route_candidates")
      .select(
        "candidate_place,place_type,themes,status,fit_band,score,insertion_index,detour_minutes,detour_meters,stay_minutes,reasons,risks,cache_key",
      )
      .eq("route_id", routeId)
      .order("score", { ascending: false });

    if (error) {
      throw error;
    }

    return (data ?? []).map(mapCandidateFromRow);
  }

  async createSnapshot(
    route: RoutePlan,
    candidateState: StoredCandidateState,
  ): Promise<RouteSnapshotSummary> {
    const userId = await requireUserId(this.client);
    let routeId = route.id;
    let snapshotRoute = route;

    if (route.id === demoRoute.id) {
      const saved = await this.save(route);
      routeId = saved.id;
      snapshotRoute = {
        ...route,
        id: saved.id,
        updatedAt: saved.updatedAt,
      };
      await this.saveCandidates(saved.id, {
        candidates: candidateState.candidates,
        actions: candidateState.actions,
      });
    }

    const nextVersion = await this.getNextSnapshotVersion(routeId);
    const payload = toSnapshotPayload(snapshotRoute, {
      ...candidateState,
      routeId,
    });
    const { data, error } = await this.client
      .from("route_snapshots")
      .insert({
        route_id: routeId,
        version: nextVersion,
        snapshot: payload as unknown as Json,
        created_by: userId,
      })
      .select("id,route_id,version,snapshot,created_at")
      .single();

    if (error) {
      throw error;
    }

    return mapSnapshotRowToSummary(data);
  }

  async listSnapshots(routeId: string): Promise<RouteSnapshotSummary[]> {
    if (routeId === demoRoute.id) {
      return [];
    }

    const { data, error } = await this.client
      .from("route_snapshots")
      .select("id,route_id,version,snapshot,created_at")
      .eq("route_id", routeId)
      .order("version", { ascending: false });

    if (error) {
      throw error;
    }

    return (data ?? []).map(mapSnapshotRowToSummary);
  }

  async readSnapshot(
    snapshotId: string,
  ): Promise<RouteSnapshotPayload | null> {
    const { data, error } = await this.client
      .from("route_snapshots")
      .select("snapshot")
      .eq("id", snapshotId)
      .maybeSingle();

    if (error) {
      throw error;
    }

    return data ? parseSnapshotPayload(data.snapshot) : null;
  }

  async delete(id: string) {
    const { error } = await this.client.from("routes").delete().eq("id", id);

    if (error) {
      throw error;
    }
  }

  async createShare(routeId: string): Promise<ShareRecord> {
    const userId = await requireUserId(this.client);

    const { data: route, error: routeError } = await this.client
      .from("routes")
      .select("version")
      .eq("id", routeId)
      .single();

    if (routeError) {
      throw routeError;
    }

    const { data, error } = await this.client
      .from("route_shares")
      .insert({
        route_id: routeId,
        route_version: route.version,
        created_by: userId,
        allow_copy: false,
      })
      .select("share_code,expires_at,allow_copy")
      .single();

    if (error) {
      throw error;
    }

    return {
      code: data.share_code,
      url: `/share/?code=${encodeURIComponent(data.share_code)}`,
      expiresAt: data.expires_at,
      allowCopy: data.allow_copy,
      revokedAt: null,
    };
  }

  async listShares(routeId: string): Promise<ShareRecord[]> {
    const { data, error } = await this.client
      .from("route_shares")
      .select("share_code,expires_at,allow_copy,revoked_at,created_at")
      .eq("route_id", routeId)
      .order("created_at", { ascending: false });

    if (error) {
      throw error;
    }

    return (data ?? []).map((share) => ({
      code: share.share_code,
      url: `/share/?code=${encodeURIComponent(share.share_code)}`,
      expiresAt: share.expires_at,
      allowCopy: share.allow_copy,
      revokedAt: share.revoked_at,
      createdAt: share.created_at,
    }));
  }

  async revokeShare(code: string) {
    const { error } = await this.client
      .from("route_shares")
      .update({ revoked_at: new Date().toISOString() })
      .eq("share_code", code);

    if (error) {
      throw error;
    }
  }

  private async replaceStops(routeId: string, stops: RouteStop[]) {
    const { error: deleteError } = await this.client
      .from("route_stops")
      .delete()
      .eq("route_id", routeId);

    if (deleteError) {
      throw deleteError;
    }

    const payload = stops.map((stop, index) => ({
      route_id: routeId,
      sort_order: index,
      arrival_time: stop.time,
      stay_minutes: stop.stayMinutes,
      constraint_type: stop.mustVisit ? "must_visit" : "recommended",
      source_type: "user",
      title_snapshot: stop.name,
      note: {
        text: stop.note,
        area: stop.area,
        address: stop.address,
        themes: stop.themes,
      },
      walking_from_previous: stop.walkingFromPrevious ?? null,
    }));

    if (payload.length === 0) {
      return;
    }

    const { error } = await this.client.from("route_stops").insert(payload);

    if (error) {
      throw error;
    }
  }

  private async getNextSnapshotVersion(routeId: string) {
    const { data, error } = await this.client
      .from("route_snapshots")
      .select("version")
      .eq("route_id", routeId)
      .order("version", { ascending: false })
      .limit(1);

    if (error) {
      throw error;
    }

    return (data?.[0]?.version ?? 0) + 1;
  }
}

function mapStoredSnapshotToSummary(snapshot: {
  id: string;
  routeId: string;
  version: number;
  route: RoutePlan;
  candidateState: StoredCandidateState;
  createdAt: string;
}): RouteSnapshotSummary {
  return {
    id: snapshot.id,
    routeId: snapshot.routeId,
    version: snapshot.version,
    title: snapshot.route.title,
    stopCount: snapshot.route.stops.length,
    candidateCount: snapshot.candidateState.candidates.length,
    createdAt: snapshot.createdAt,
  };
}

function toSnapshotPayload(
  route: RoutePlan,
  candidateState: StoredCandidateState,
): RouteSnapshotPayload {
  return {
    route,
    candidateState,
  };
}

function parseSnapshotPayload(value: Json): RouteSnapshotPayload | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const payload = value as Partial<RouteSnapshotPayload>;
  if (!payload.route || !payload.candidateState) {
    return null;
  }

  return {
    route: payload.route,
    candidateState: payload.candidateState,
  };
}

function mapSnapshotRowToSummary(row: {
  id: string;
  route_id: string;
  version: number;
  snapshot: Json;
  created_at: string;
}): RouteSnapshotSummary {
  const payload = parseSnapshotPayload(row.snapshot);

  return {
    id: row.id,
    routeId: row.route_id,
    version: row.version,
    title: payload?.route.title ?? "未命名路线",
    stopCount: payload?.route.stops.length ?? 0,
    candidateCount: payload?.candidateState.candidates.length ?? 0,
    createdAt: row.created_at,
  };
}

function routeCandidateToInsert(
  routeId: string,
  candidate: RouteCandidate,
  action: StoredCandidateAction | undefined,
): Database["public"]["Tables"]["route_candidates"]["Insert"] {
  return {
    route_id: routeId,
    source: candidate.place.source,
    source_place_id: candidate.place.sourcePlaceId,
    title_snapshot: candidate.place.name,
    candidate_place: candidate.place as unknown as Json,
    place_type: candidate.placeType,
    themes: candidate.themes as Json,
    status: action ?? "suggested",
    fit_band: candidate.fitBand,
    score: candidate.score,
    insertion_index: candidate.insertionIndex,
    detour_minutes: candidate.detourMinutes,
    detour_meters: candidate.detourMeters,
    stay_minutes: candidate.stayMinutes,
    reasons: candidate.reasons as Json,
    risks: candidate.risks as Json,
    cache_key: candidate.cacheKey,
  };
}

function mapCandidateFromRow(row: {
  candidate_place: Json;
  place_type: string;
  themes: Json;
  status: string;
  fit_band: string;
  score: number;
  insertion_index: number;
  detour_minutes: number;
  detour_meters: number;
  stay_minutes: number;
  reasons: Json;
  risks: Json;
  cache_key: string;
}): SavedRouteCandidate {
  const place = row.candidate_place as RouteCandidate["place"];
  const candidate: RouteCandidate = {
    id: place.id,
    place,
    placeType: row.place_type as RouteCandidate["placeType"],
    themes: Array.isArray(row.themes)
      ? (row.themes as RouteCandidate["themes"])
      : [],
    stayMinutes: row.stay_minutes,
    insertionIndex: row.insertion_index,
    detourMinutes: row.detour_minutes,
    detourMeters: row.detour_meters,
    score: row.score,
    fitBand: row.fit_band as RouteCandidate["fitBand"],
    reasons: Array.isArray(row.reasons) ? (row.reasons as string[]) : [],
    risks: Array.isArray(row.risks) ? (row.risks as string[]) : [],
    cacheKey: row.cache_key,
  };

  return {
    candidate,
    status: row.status as RouteCandidateStatus,
  };
}

async function requireUserId(client: AppSupabaseClient) {
  const {
    data: { user },
    error,
  } = await client.auth.getUser();

  if (error) {
    throw error;
  }

  if (!user) {
    throw new Error("auth_required");
  }

  return user.id;
}

function mapStopFromRow(row: {
  id: string;
  title_snapshot: string;
  arrival_time: string | null;
  stay_minutes: number;
  note: Json;
  walking_from_previous: Json | null;
}): RouteStop {
  const note = (row.note ?? {}) as Record<string, unknown>;

  return {
    id: row.id,
    name: row.title_snapshot,
    area: String(note.area ?? ""),
    address: String(note.address ?? ""),
    themes: Array.isArray(note.themes)
      ? (note.themes as RouteStop["themes"])
      : [],
    stayMinutes: row.stay_minutes,
    time: row.arrival_time?.slice(0, 5) ?? "",
    note: String(note.text ?? ""),
    walkingFromPrevious: row.walking_from_previous
      ? (row.walking_from_previous as RouteStop["walkingFromPrevious"])
      : undefined,
  };
}
