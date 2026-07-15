"use client";

import { useEffect, useState } from "react";
import { BookOpen, Bookmark, Clock } from "lucide-react";
import {
  createBrowserSupabaseClient,
  isSupabaseConfigured,
} from "@/lib/supabase/client";
import { generateStopThemeContentWithFallback } from "@/lib/ai/route-collaboration";
import { defaultDraft, type RoutePlan, type RouteStop } from "@/lib/route";
import { toggleFavoriteRoute } from "@/lib/storage";
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
    sourcePlaceId?: string;
    routeRole?: RouteStop["routeRole"];
  } | null;
};

type SharedRoutePayload = {
  route: {
    title: string;
    city: string;
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
    const timeoutId = window.setTimeout(() => controller.abort(), 2500);

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
            setFavoriteMessage(favorited ? "已收藏路线。" : "已取消收藏。");
          }}
          type="button"
        >
          <Bookmark size={15} />
          收藏路线
        </button>
      </div>
      {favoriteMessage ? <p className="auth-note">{favoriteMessage}</p> : null}
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
              <p key={connection.theme}>
                <strong>{connection.theme}</strong>：{connection.text}
              </p>
            ))}
          </article>
        ) : null}
      </div>
    </section>
  );
}

function routeFromSharePayload(payload: SharedRoutePayload): RoutePlan {
  return {
    ...defaultDraft,
    id: `share-${payload.share.code}`,
    title: payload.route.title,
    city: payload.route.city,
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
      time: stop.arrival_time?.slice(0, 5) ?? defaultDraft.startTime,
      note: stop.note?.text ?? "",
    })),
    distanceKm: 0,
  };
}
