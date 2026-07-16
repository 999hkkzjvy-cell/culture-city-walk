"use client";

import type { RoutePlan } from "@/lib/route";
import {
  readFavoriteRoutes,
  normalizeRoutePlan,
} from "@/lib/storage";
import {
  createBrowserSupabaseClient,
  type AppSupabaseClient,
} from "@/lib/supabase/client";
import type { Json } from "@/lib/supabase/database.types";

export type FavoriteRouteSyncResult = {
  routes: RoutePlan[];
  cloudAvailable: boolean;
  cloudCount: number;
};

export async function listFavoriteRoutesWithCloud(): Promise<FavoriteRouteSyncResult> {
  const localRoutes = readFavoriteRoutes();
  const client = createBrowserSupabaseClient();

  if (!client) {
    return {
      routes: localRoutes,
      cloudAvailable: false,
      cloudCount: 0,
    };
  }

  const repository = new FavoriteRouteRepository(client);
  const cloudRoutes = await repository.list().catch(() => null);

  if (!cloudRoutes) {
    return {
      routes: localRoutes,
      cloudAvailable: false,
      cloudCount: 0,
    };
  }

  return {
    routes: mergeFavoriteRoutes(localRoutes, cloudRoutes),
    cloudAvailable: true,
    cloudCount: cloudRoutes.length,
  };
}

export async function syncFavoriteRoutesToCloud(
  routes = readFavoriteRoutes(),
) {
  const client = createBrowserSupabaseClient();

  if (!client) {
    return { synced: false, reason: "supabase_not_configured" };
  }

  const repository = new FavoriteRouteRepository(client);
  await repository.sync(routes);
  return { synced: true };
}

export async function persistFavoriteRouteToCloud(
  route: RoutePlan,
  isFavorited: boolean,
) {
  const client = createBrowserSupabaseClient();

  if (!client) {
    return;
  }

  const repository = new FavoriteRouteRepository(client);

  if (isFavorited) {
    await repository.upsert(route);
    return;
  }

  await repository.remove(route.id);
}

export class FavoriteRouteRepository {
  constructor(private readonly client: AppSupabaseClient) {}

  async list() {
    const userId = await requireUserId(this.client);
    const { data, error } = await this.client
      .from("route_favorites")
      .select("route_snapshot")
      .eq("owner_id", userId)
      .order("updated_at", { ascending: false });

    if (error) {
      throw error;
    }

    return (data ?? []).map((item) =>
      normalizeRoutePlan(item.route_snapshot as Partial<RoutePlan>),
    );
  }

  async sync(routes: RoutePlan[]) {
    if (routes.length === 0) {
      return;
    }

    const userId = await requireUserId(this.client);
    const payload = routes.map((route) => ({
      owner_id: userId,
      source_route_id: route.id,
      route_snapshot: route as unknown as Json,
    }));
    const { error } = await this.client.from("route_favorites").upsert(payload, {
      onConflict: "owner_id,source_route_id",
    });

    if (error) {
      throw error;
    }
  }

  async upsert(route: RoutePlan) {
    await this.sync([route]);
  }

  async remove(routeId: string) {
    const userId = await requireUserId(this.client);
    const { error } = await this.client
      .from("route_favorites")
      .delete()
      .eq("owner_id", userId)
      .eq("source_route_id", routeId);

    if (error) {
      throw error;
    }
  }
}

function mergeFavoriteRoutes(localRoutes: RoutePlan[], cloudRoutes: RoutePlan[]) {
  const merged = new Map<string, RoutePlan>();

  [...localRoutes, ...cloudRoutes].forEach((route) => {
    if (!merged.has(route.id)) {
      merged.set(route.id, route);
    }
  });

  return [...merged.values()].sort((a, b) =>
    b.updatedAt.localeCompare(a.updatedAt),
  );
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
