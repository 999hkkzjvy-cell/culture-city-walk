"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { BookOpen, Bookmark, Clock, Edit3 } from "lucide-react";
import { RoutePosterExport } from "@/components/routes/route-poster-export";
import {
  createBrowserSupabaseClient,
  isSupabaseConfigured,
} from "@/lib/supabase/client";
import { generateStopThemeContentWithFallback } from "@/lib/ai/route-collaboration";
import { persistFavoriteRouteToCloud } from "@/lib/repositories/favorite-route-repository";
import { defaultDraft, type RoutePlan, type RouteStop } from "@/lib/route";
import { importRouteForPlanning, toggleFavoriteRoute } from "@/lib/storage";
import { readShareCode } from "@/lib/urls";

type SharedStop = {
  sort_order: number;
  title_snapshot: string;
  arrival_time: string | null;
  stay_minutes: number;
  note: {
    text?: string;
    area?: string;
    address?: string;
    themes?: RouteStop["themes"];
    source?: RouteStop["source"];
    sourcePlaceId?: string | null;
    coordinate?: RouteStop["coordinate"];
    coordinateSystem?: RouteStop["coordinateSystem"];
    verificationStatus?: RouteStop["verificationStatus"];
    mustVisit?: boolean;
    routeRole?: RouteStop["routeRole"];
    openingHours?: string | null;
    telephone?: string | null;
    providerRating?: string | null;
    providerCost?: string | null;
  } | null;
  walking_from_previous: RouteStop["walkingFromPrevious"] | null;
};

type SharedRoutePayload = {
  route: {
    id: string;
    title: string;
    city: string;
    theme_filters: unknown;
    preferences: unknown;
    version: number;
  };
  stops: SharedStop[];
  share: {
    code: string;
    expires_at: string | null;
  };
};

type LoadState = "loading" | "ready" | "empty" | "error" | "not-configured";

export function SharedRouteReader() {
  const [state, setState] = useState<LoadState>("loading");
  const [payload, setPayload] = useState<SharedRoutePayload | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [favoriteMessage, setFavoriteMessage] = useState("");

  useEffect(() => {
    let isMounted = true;
    const shareCode = readShareCode(
      new URLSearchParams(window.location.search),
    );

    if (!shareCode) {
      queueMicrotask(() => setState("empty"));
      return;
    }

    const client = createBrowserSupabaseClient();

    if (!client || !isSupabaseConfigured()) {
      queueMicrotask(() => setState("not-configured"));
      return;
    }

    const functionUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/share-route?code=${encodeURIComponent(shareCode)}`;
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), 15000);

    fetch(functionUrl, {
      headers: {
        apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
      },
      signal: controller.signal,
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error("share_fetch_failed");
        }
        return response.json() as Promise<SharedRoutePayload>;
      })
      .then((data) => {
        if (!isMounted) {
          return;
        }
        setPayload(data);
        setState("ready");
      })
      .catch(() => {
        if (isMounted) {
          setState("error");
        }
      })
      .finally(() => window.clearTimeout(timeoutId));

    return () => {
      isMounted = false;
      controller.abort();
      window.clearTimeout(timeoutId);
    };
  }, []);

  if (state === "empty") {
    return <p className="auth-note">分享码为空，请检查链接。</p>;
  }

  if (state === "not-configured") {
    return (
      <section className="library-panel">
        <h2>分享页待连接</h2>
        <p>配置 Supabase 后，这里会读取 Edge Function 返回的只读路线。</p>
      </section>
    );
  }

  if (state === "loading") {
    return <p className="auth-note">正在读取分享路线...</p>;
  }

  if (state === "error" || !payload) {
    return <p className="auth-note">分享链接不可用，可能已过期或被撤销。</p>;
  }

  const sharedRoute = routeFromSharePayload(payload);
  const selectedStop = sharedRoute.stops[selectedIndex] ?? sharedRoute.stops[0];
  const selectedContent = selectedStop
    ? generateStopThemeContentWithFallback(selectedStop)
    : null;

  return (
    <section className="shared-route">
      <div className="section-heading">
        <h2>{payload.route.title}</h2>
        <span>
          {payload.route.city} ·{" "}
          {payload.share.expires_at
            ? `有效至 ${payload.share.expires_at.slice(0, 10)}`
            : "长期有效"}
        </span>
        <button
          className="secondary-link"
          onClick={() => {
            const favorited = toggleFavoriteRoute(sharedRoute);
            persistFavoriteRouteToCloud(sharedRoute, favorited).catch(
              () => undefined,
            );
            setFavoriteMessage(favorited ? "已收藏路线。" : "已取消收藏。");
          }}
          type="button"
        >
          <Bookmark size={15} />
          收藏路线
        </button>
        <Link
          className="secondary-link"
          href="/plan/"
          onClick={() =>
            importRouteForPlanning(sharedRoute, {
              source: "shared",
              label: "分享路线",
            })
          }
        >
          <Edit3 size={15} />
          修改为我的路线
        </Link>
      </div>
      {favoriteMessage ? <p className="auth-note">{favoriteMessage}</p> : null}
      <RoutePosterExport route={sharedRoute} variant="panel" />
      <div className="shared-source-note">
        <strong>只读分享</strong>
        <p>
          站点、步行时间和讲解可能包含本地估算或待核验内容；出发前请再次确认开放时间、预约和交通情况。
        </p>
      </div>
      <div className="shared-route-layout">
        <div className="route-list">
          {payload.stops.map((stop, index) => (
            <button
              className={
                selectedIndex === index
                  ? "route-list-item selected"
                  : "route-list-item"
              }
              key={`${payload.share.code}-${stop.sort_order}`}
              onClick={() => setSelectedIndex(index)}
              type="button"
            >
              <BookOpen size={22} aria-hidden="true" />
              <div>
                <h3>{stop.title_snapshot}</h3>
                <p>
                  <Clock size={13} />
                  {stop.arrival_time?.slice(0, 5) ?? "时间待定"} · 停留{" "}
                  {stop.stay_minutes} 分钟
                </p>
              </div>
            </button>
          ))}
        </div>
        {selectedStop && selectedContent ? (
          <article className="shared-reading">
            <span>分享深读 · 不含打卡任务</span>
            <h3>{selectedStop.name}</h3>
            <p>{selectedContent.shortIntro}</p>
            {selectedContent.themeConnections.map((connection) => (
              <p key={connection.title ?? connection.theme}>
                <strong>{connection.title ?? connection.theme}</strong>：
                {connection.text}
              </p>
            ))}
          </article>
        ) : null}
      </div>
    </section>
  );
}

function routeFromSharePayload(payload: SharedRoutePayload): RoutePlan {
  const themes = parseSharedThemes(payload.route.theme_filters);
  const preferences = parseSharedPreferences(payload.route.preferences);

  return {
    ...defaultDraft,
    ...preferences,
    id: payload.route.id || `share-${payload.share.code}`,
    title: payload.route.title,
    city: payload.route.city,
    themes,
    updatedAt: new Date().toISOString(),
    stops: payload.stops.map((stop) => ({
      id: `share-${payload.share.code}-${stop.sort_order}`,
      name: stop.title_snapshot,
      area: stop.note?.area ?? payload.route.city,
      address: stop.note?.address ?? "",
      themes: stop.note?.themes ?? defaultDraft.themes,
      stayMinutes: stop.stay_minutes,
      routeRole: stop.note?.routeRole ?? "middle",
      source: stop.note?.source ?? "manual",
      sourcePlaceId: stop.note?.sourcePlaceId ?? null,
      coordinate: stop.note?.coordinate ?? null,
      coordinateSystem: stop.note?.coordinateSystem,
      verificationStatus: stop.note?.verificationStatus,
      mustVisit: stop.note?.mustVisit,
      openingHours: stop.note?.openingHours ?? null,
      telephone: stop.note?.telephone ?? null,
      providerRating: stop.note?.providerRating ?? null,
      providerCost: stop.note?.providerCost ?? null,
      time: stop.arrival_time?.slice(0, 5) ?? defaultDraft.startTime,
      note: stop.note?.text ?? "",
      walkingFromPrevious: stop.walking_from_previous ?? undefined,
    })),
    distanceKm: preferences.distanceKm ?? 0,
  };
}

function parseSharedThemes(value: unknown): RoutePlan["themes"] {
  if (!Array.isArray(value)) {
    return defaultDraft.themes;
  }

  const themes = value.filter((theme): theme is RoutePlan["themes"][number] =>
    defaultDraft.themes.includes(theme as RoutePlan["themes"][number]),
  );

  return themes.length > 0 ? themes : defaultDraft.themes;
}

function parseSharedPreferences(value: unknown): Partial<RoutePlan> {
  if (!value || typeof value !== "object") {
    return {};
  }

  const preferences = value as Record<string, unknown>;

  return {
    dateLabel:
      typeof preferences.dateLabel === "string"
        ? preferences.dateLabel
        : defaultDraft.dateLabel,
    startTime:
      typeof preferences.startTime === "string"
        ? preferences.startTime
        : defaultDraft.startTime,
    durationHours:
      typeof preferences.durationHours === "number"
        ? preferences.durationHours
        : defaultDraft.durationHours,
    walkingRangeKm:
      typeof preferences.walkingRangeKm === "string"
        ? preferences.walkingRangeKm
        : defaultDraft.walkingRangeKm,
    mustVisits: Array.isArray(preferences.mustVisits)
      ? preferences.mustVisits.filter(
          (item): item is string => typeof item === "string",
        )
      : defaultDraft.mustVisits,
    pace:
      preferences.pace === "轻松漫步" ||
      preferences.pace === "平衡" ||
      preferences.pace === "充实紧凑"
        ? preferences.pace
        : defaultDraft.pace,
    distanceKm:
      typeof preferences.distanceKm === "number"
        ? preferences.distanceKm
        : 0,
  };
}
