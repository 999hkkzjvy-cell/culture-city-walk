"use client";

import Link from "next/link";
import type { CSSProperties } from "react";
import { useEffect, useState, useSyncExternalStore } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  Bookmark,
  Clock,
  Edit3,
  FileText,
  MapPin,
  Navigation,
  Route,
  Save,
  Share2,
  Sparkles,
  Trash2,
} from "lucide-react";
import { RouteCloudActions } from "@/components/routes/route-cloud-actions";
import { RouteJourneyPanel } from "@/components/routes/route-journey-panel";
import { RouteSnapshotPanel } from "@/components/routes/route-snapshot-panel";
import { amapPlaceSearchUrl, amapWalkingNavigationUrl } from "@/lib/maps/amap";
import {
  generateRouteSummaryWithFallback,
  generateStopThemeContentWithFallback,
} from "@/lib/ai/route-collaboration";
import { demoRoute, type RoutePlan } from "@/lib/route";
import {
  removeRouteStop,
  updateStopNote,
  updateStopStayMinutes,
} from "@/lib/route-editing";
import { calculateRouteKernel } from "@/lib/route-kernel";
import { createRouteRepository } from "@/lib/repositories/route-repository";
import {
  readRoutePlan,
  routePlanStorageKey,
  saveCandidateState,
  saveRoutePlan,
  type StoredCandidateAction,
} from "@/lib/storage";
import { readRouteId } from "@/lib/urls";

let cachedRouteSnapshot:
  | {
      key: string;
      route: RoutePlan;
    }
  | undefined;

export function RouteReader() {
  const route = useSyncExternalStore(
    subscribeToLocalRoutePlan,
    readRoutePlanForReader,
    () => demoRoute,
  );

  const [remoteRouteState, setRemoteRouteState] =
    useState<RemoteRouteState>("idle");
  const routeKernel = calculateRouteKernel(route);
  const [isEditing, setIsEditing] = useState(false);
  const [expandedStories, setExpandedStories] = useState<
    Record<string, boolean>
  >({});
  const routeSummary = generateRouteSummaryWithFallback(route);
  const sourceLabel =
    routeKernel.legSource === "provider"
      ? "高德真实步行数据"
      : routeKernel.legSource === "estimated"
        ? "本地估算，待高德复核"
        : "缺少步行数据";

  useEffect(() => {
    const routeId = readRouteId(new URLSearchParams(window.location.search));

    if (!routeId || routeId === demoRoute.id || routeId === route.id) {
      return;
    }

    let isMounted = true;
    const repository = createRouteRepository();
    queueMicrotask(() => {
      if (isMounted) {
        setRemoteRouteState("loading");
      }
    });

    repository
      .get(routeId)
      .then(async (loadedRoute) => {
        if (!isMounted) {
          return;
        }

        if (!loadedRoute) {
          setRemoteRouteState("not-found");
          return;
        }

        saveRoutePlan(loadedRoute);

        const savedCandidates = await repository
          .listCandidates(loadedRoute.id)
          .catch(() => []);
        const actions = Object.fromEntries(
          savedCandidates
            .filter(({ status }) => status !== "suggested")
            .map(({ candidate, status }) => [
              candidate.id,
              status as StoredCandidateAction,
            ]),
        ) as Record<string, StoredCandidateAction>;

        saveCandidateState({
          routeId: loadedRoute.id,
          candidates: savedCandidates.map(({ candidate }) => candidate),
          actions,
          updatedAt: new Date().toISOString(),
        });
        dispatchRouteStorageChange();
        setRemoteRouteState("ready");
      })
      .catch(() => {
        if (isMounted) {
          setRemoteRouteState("error");
        }
      });

    return () => {
      isMounted = false;
    };
  }, [route.id]);

  return (
    <>
      <section className="route-hero">
        <div>
          <Link className="back-link" href="/plan/">
            <ArrowLeft size={16} />
            返回规划继续编辑
          </Link>
          <p>{routeSummary.summary}</p>
          <h1>{route.city} · 文学漫游</h1>
          <div className="route-meta">
            <span>
              <MapPin size={16} />
              {(routeKernel.totalWalkingMeters / 1000).toFixed(1)} km
            </span>
            <span>
              <Clock size={16} />
              预计 {Math.round(routeKernel.totalMinutes / 60)} 小时
            </span>
            <span>
              <Sparkles size={16} />
              {route.stops.length} 个站点
            </span>
            <span>
              <Route size={16} />
              {sourceLabel}
            </span>
          </div>
          <div className="theme-tabs">
            {route.themes.map((theme) => (
              <button
                className={theme === "文学" ? "selected" : ""}
                key={theme}
                type="button"
              >
                {theme}
              </button>
            ))}
          </div>
        </div>
        <div className="route-tools">
          <button
            onClick={() => setIsEditing((current) => !current)}
            type="button"
          >
            {isEditing ? <Save size={17} /> : <Edit3 size={17} />}
            {isEditing ? "完成编辑" : "编辑路线"}
          </button>
          <button
            onClick={() =>
              document
                .querySelector<HTMLElement>("[data-route-cloud-actions]")
                ?.scrollIntoView({ behavior: "smooth", block: "center" })
            }
            type="button"
          >
            <Share2 size={17} />
            分享
          </button>
          <button type="button">
            <Bookmark size={17} />
            收藏
          </button>
        </div>
        <div className="postmark" aria-hidden="true">
          NANJING
          <br />
          1935
        </div>
      </section>

      <section className="route-cloud-band">
        <RouteCloudActions />
        <RouteSnapshotPanel route={route} />
      </section>

      <RouteLoadStatus state={remoteRouteState} />

      <RouteJourneyPanel route={route} />

      {routeKernel.issues.length > 0 ? (
        <section className="route-kernel-alerts" aria-label="路线校验提示">
          {routeKernel.issues.map((issue) => (
            <p key={`${issue.code}-${issue.stopId ?? "route"}`}>
              <AlertTriangle size={16} />
              {issue.message}
            </p>
          ))}
        </section>
      ) : null}

      <section className="reader-layout">
        <aside className="map-pane">
          <button className="map-toggle" type="button">
            查看地图
          </button>
          <div className="paper-map" aria-label="路线地图示意图">
            <ol>
              {route.stops.map((stop, index) => (
                <li key={stop.id} style={{ "--i": index } as CSSProperties}>
                  <span>{index + 1}</span>
                  {stop.name}
                </li>
              ))}
            </ol>
            <div className="map-legend">
              <span>••• 步行路线</span>
              <span>● 站点</span>
              <span>◎ 地铁站</span>
            </div>
          </div>
          <div className="map-source-note">
            <strong>地图内核</strong>
            <p>
              当前站点顺序和步行段来自本地预案或示例数据。接入高德 Web
              服务后，这里会展示真实步行 polyline、耗时和距离。
            </p>
          </div>
        </aside>

        <div className="timeline">
          {routeKernel.stops.map((stop, index) => {
            const previousStop = routeKernel.stops[index - 1];
            const story = generateStopThemeContentWithFallback(stop);
            const isStoryExpanded = expandedStories[stop.id] ?? false;
            const navigationUrl =
              index === 0
                ? amapPlaceSearchUrl({
                    name: stop.name,
                    city: route.city,
                    address: stop.address,
                  })
                : amapWalkingNavigationUrl({
                    from: previousStop
                      ? {
                          name: previousStop.name,
                          coordinate: previousStop.coordinate,
                        }
                      : undefined,
                    to: { name: stop.name, coordinate: stop.coordinate },
                  });

            return (
              <article className="stop-card" key={stop.id}>
                <div className="stop-index">
                  {String(index + 1).padStart(2, "0")}
                </div>
                <div className="stop-body">
                  <div className="stop-time">
                    <strong>{stop.calculatedTime}</strong>
                    {stop.walkingFromPrevious ? (
                      <span>
                        步行 {stop.walkingFromPrevious.minutes} 分钟 ·{" "}
                        {stop.walkingFromPrevious.distanceMeters} m
                        <em>
                          {stop.walkingFromPrevious.source === "provider"
                            ? "高德"
                            : "估算"}
                        </em>
                      </span>
                    ) : (
                      <span>起点</span>
                    )}
                  </div>
                  <h2>
                    {stop.name}
                    {stop.mustVisit ? <em>必去</em> : null}
                  </h2>
                  <p>{stop.note}</p>
                  <div className="stop-story">
                    <div>
                      <span>模板讲解 · 来源待核验</span>
                      <strong>{story.shortIntro}</strong>
                    </div>
                    {isStoryExpanded ? (
                      <div className="stop-story-more">
                        {story.themeConnections.map((connection) => (
                          <p key={`${stop.id}-${connection.theme}`}>
                            <FileText size={14} />
                            {connection.theme}：{connection.text}
                          </p>
                        ))}
                        {story.practicalTips.map((tip) => (
                          <p key={tip}>
                            <Clock size={14} />
                            {tip}
                          </p>
                        ))}
                      </div>
                    ) : null}
                    <button
                      onClick={() =>
                        setExpandedStories((current) => ({
                          ...current,
                          [stop.id]: !isStoryExpanded,
                        }))
                      }
                      type="button"
                    >
                      {isStoryExpanded ? "收起深读" : "展开深读"}
                    </button>
                  </div>
                  {isEditing ? (
                    <div className="stop-edit-panel">
                      <label>
                        停留分钟
                        <input
                          max={240}
                          min={5}
                          onChange={(event) =>
                            persistRouteEdit(
                              updateStopStayMinutes(
                                route,
                                stop.id,
                                Number(event.target.value),
                              ),
                            )
                          }
                          step={5}
                          type="number"
                          value={stop.stayMinutes}
                        />
                      </label>
                      <label>
                        个人备注
                        <textarea
                          onChange={(event) =>
                            persistRouteEdit(
                              updateStopNote(
                                route,
                                stop.id,
                                event.target.value,
                              ),
                            )
                          }
                          rows={3}
                          value={stop.note}
                        />
                      </label>
                      <button
                        className="stop-edit-delete"
                        disabled={route.stops.length <= 2}
                        onClick={() =>
                          persistRouteEdit(removeRouteStop(route, stop.id))
                        }
                        type="button"
                      >
                        <Trash2 size={15} />
                        删除站点
                      </button>
                    </div>
                  ) : null}
                  <div className="stop-tags">
                    {stop.themes.map((theme) => (
                      <span key={theme}>{theme}</span>
                    ))}
                  </div>
                  <a
                    className="stop-nav-link"
                    href={navigationUrl}
                    rel="noreferrer"
                    target="_blank"
                  >
                    <Navigation size={15} />
                    {index === 0 ? "在高德查看地点" : "打开高德步行导航"}
                  </a>
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </>
  );
}

type RemoteRouteState = "idle" | "loading" | "ready" | "not-found" | "error";

function RouteLoadStatus({ state }: { state: RemoteRouteState }) {
  if (state === "idle") {
    return null;
  }

  const copy: Record<Exclude<RemoteRouteState, "idle">, string> = {
    loading: "正在读取云端路线与候选点状态...",
    ready: "云端路线已恢复为当前本地预案，可返回规划页继续编辑。",
    "not-found": "没有找到这条云端路线，已保留当前本地预案。",
    error: "云端路线暂时无法读取，已保留当前本地预案。",
  };

  return <p className="route-load-status">{copy[state]}</p>;
}

function persistRouteEdit(route: RoutePlan) {
  saveRoutePlan(route);
  dispatchRouteStorageChange();
}

function readRoutePlanForReader(): RoutePlan {
  const params = new URLSearchParams(window.location.search);
  const routeId = params.get("id");
  const storageValue = window.localStorage.getItem(routePlanStorageKey) ?? "";
  const cacheKey = `${routeId ?? ""}:${storageValue}`;

  if (cachedRouteSnapshot?.key === cacheKey) {
    return cachedRouteSnapshot.route;
  }

  const route = readRoutePlan();

  const nextRoute =
    !routeId || routeId === route.id || routeId === "demo" ? route : demoRoute;

  cachedRouteSnapshot = {
    key: cacheKey,
    route: nextRoute,
  };

  return nextRoute;
}

function subscribeToLocalRoutePlan(onStoreChange: () => void) {
  window.addEventListener("storage", onStoreChange);

  return () => window.removeEventListener("storage", onStoreChange);
}

function dispatchRouteStorageChange() {
  window.dispatchEvent(
    new StorageEvent("storage", { key: routePlanStorageKey }),
  );
}
