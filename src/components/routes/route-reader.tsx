"use client";

import Link from "next/link";
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
import { FactCheckNote } from "@/components/routes/fact-check-note";
import { RouteJourneyPanel } from "@/components/routes/route-journey-panel";
import { RouteMap } from "@/components/routes/route-map";
import { RoutePosterExport } from "@/components/routes/route-poster-export";
import { RouteSnapshotPanel } from "@/components/routes/route-snapshot-panel";
import { amapPlaceSearchUrl, amapWalkingNavigationUrl } from "@/lib/maps/amap";
import { createAmapWebServiceProvider } from "@/lib/maps/amap-web";
import { recalculateRouteWithProvider } from "@/lib/maps/route-recalculation";
import {
  generateStopThemeContentWithDeepSeek,
  isDeepSeekProxyConfigured,
} from "@/lib/ai/deepseek";
import {
  generateRouteSummaryWithFallback,
  generateStopThemeContentWithFallback,
  type StopThemeContent,
} from "@/lib/ai/route-collaboration";
import {
  demoRoute,
  isExperienceStop,
  type RoutePlan,
  type RouteStop,
} from "@/lib/route";
import {
  getPublishedCuratedDeepReadings,
  getPublishedCuratedRoute,
} from "@/lib/published-curated-routes";
import { getOpeningHoursWarning } from "@/lib/opening-hours";
import {
  removeRouteStop,
  updateRouteLegMinutes,
  updateRouteLegTravelMode,
  updateStopNote,
  updateStopStayMinutes,
} from "@/lib/route-editing";
import { calculateRouteKernel } from "@/lib/route-kernel";
import { persistFavoriteRouteToCloud } from "@/lib/repositories/favorite-route-repository";
import { createRouteRepository } from "@/lib/repositories/route-repository";
import {
  readRoutePlan,
  routePlanStorageKey,
  saveCandidateState,
  saveDeepReading,
  saveRoutePlan,
  isRouteFavorited,
  toggleFavoriteRoute,
  type StoredCandidateAction,
} from "@/lib/storage";
import {
  getRouteTravelModeLabel,
  routeTravelModeLabels,
  routeTravelModes,
} from "@/lib/transport";
import { journeyUrl, readRouteId } from "@/lib/urls";

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
  const [mapRecalculationState, setMapRecalculationState] =
    useState<MapRecalculationState>("idle");
  const [mapRecalculationMessage, setMapRecalculationMessage] = useState("");
  const [isMapFullscreen, setIsMapFullscreen] = useState(false);
  const [selectedMapStopId, setSelectedMapStopId] = useState(
    route.stops[0]?.id ?? null,
  );
  const effectiveSelectedMapStopId = route.stops.some(
    (stop) => stop.id === selectedMapStopId,
  )
    ? selectedMapStopId
    : (route.stops[0]?.id ?? null);
  const routeKernel = calculateRouteKernel(route);
  const [isEditing, setIsEditing] = useState(false);
  const [expandedStories, setExpandedStories] = useState<
    Record<string, boolean>
  >({});
  const [deepReadings, setDeepReadings] = useState<
    Record<string, DeepReadingState>
  >(() => toReadyDeepReadings(getPublishedCuratedDeepReadings(route.id)));
  const [isFavorited, setIsFavorited] = useState(false);
  const routeSummary = generateRouteSummaryWithFallback(route);
  const sourceLabel =
    routeKernel.legSource === "provider"
      ? "高德真实步行数据"
      : routeKernel.legSource === "estimated"
        ? "本地估算，待高德复核"
        : "缺少步行数据";

  useEffect(() => {
    queueMicrotask(() => setIsFavorited(isRouteFavorited(route.id)));
  }, [route.id]);

  useEffect(() => {
    queueMicrotask(() =>
      setDeepReadings(
        toReadyDeepReadings(getPublishedCuratedDeepReadings(route.id)),
      ),
    );
  }, [route.id]);

  function toggleFavorite() {
    const next = toggleFavoriteRoute(route);
    setIsFavorited(next);
    persistFavoriteRouteToCloud(route, next).catch(() => undefined);
  }

  useEffect(() => {
    const routeId = readRouteId(new URLSearchParams(window.location.search));

    if (
      !routeId ||
      routeId === demoRoute.id ||
      routeId === route.id ||
      getPublishedCuratedRoute(routeId)
    ) {
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

  async function recalculateWithAmap() {
    const provider = createAmapWebServiceProvider();

    if (!provider) {
      setMapRecalculationState("error");
      setMapRecalculationMessage(
        "Supabase 尚未配置，暂时不能调用高德 Web 代理。",
      );
      return;
    }

    setMapRecalculationState("loading");
    setMapRecalculationMessage("正在用高德复核步行、骑行、公交和驾车耗时...");

    try {
      const result = await recalculateRouteWithProvider(route, provider);
      persistRouteEdit(result.route);
      setMapRecalculationState(
        result.providerLegs > 0 && result.estimatedLegs === 0
          ? "ready"
          : "partial",
      );
      setMapRecalculationMessage(
        result.estimatedLegs > 0
          ? `已复核 ${result.providerLegs} 段，${result.estimatedLegs} 段保留本地估算。`
          : `已用高德复核 ${result.providerLegs} 段路线。`,
      );
    } catch {
      setMapRecalculationState("error");
      setMapRecalculationMessage("高德复核失败，当前路线仍保留原有路途数据。");
    }
  }

  function toggleDeepReading(stop: RouteStop) {
    const isExpanded = expandedStories[stop.id] ?? false;

    setExpandedStories((current) => ({
      ...current,
      [stop.id]: !isExpanded,
    }));

    if (isExpanded || deepReadings[stop.id] || !isDeepSeekProxyConfigured()) {
      return;
    }

    void loadDeepReading(stop);
  }

  async function loadDeepReading(stop: RouteStop) {
    setDeepReadings((current) => ({
      ...current,
      [stop.id]: {
        status: "loading",
        message: "正在检索资料并生成城市导览...",
      },
    }));

    try {
      const result = await generateStopThemeContentWithDeepSeek(stop, route);

      setDeepReadings((current) => ({
        ...current,
        [stop.id]: {
          status: "ready",
          content: result.data,
        },
      }));
      saveDeepReading(route.id, stop.id, result.data);
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      setDeepReadings((current) => ({
        ...current,
        [stop.id]: {
          status: "error",
          message: message.includes("source_research")
            ? "未找到可用的核验资料，已保留不含事实断言的本地模板讲解。"
            : "城市导览暂时失败，已保留本地模板讲解。",
        },
      }));
    }
  }

  return (
    <>
      <section className="route-hero">
        <div>
          <Link className="back-link" href="/plan/">
            <ArrowLeft size={16} />
            返回规划继续编辑
          </Link>
          <p>{routeSummary.summary}</p>
          <h1>{route.title}</h1>
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
          <Link href={journeyUrl(route.id)}>
            <Navigation size={17} />
            体验路线
          </Link>
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
          <button
            className={isFavorited ? "selected" : ""}
            onClick={toggleFavorite}
            type="button"
          >
            <Bookmark size={17} />
            {isFavorited ? "已收藏" : "收藏"}
          </button>
          <RoutePosterExport route={route} />
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

      {route.validation && route.validation.issueCount > 0 ? (
        <section className="route-kernel-alerts" aria-label="上次保存校验提示">
          <p>
            <FileText size={16} />
            上次保存校验保留 {route.validation.issueCount} 项问题
          </p>
          {route.validation.issues.slice(0, 3).map((issue) => (
            <p
              key={`${issue.code}-${issue.stopId ?? "route"}-${issue.message}`}
            >
              <AlertTriangle size={16} />
              {issue.message}
            </p>
          ))}
        </section>
      ) : null}

      <section className="reader-layout">
        <aside className={isMapFullscreen ? "map-pane fullscreen" : "map-pane"}>
          <button
            className="map-toggle"
            onClick={() => setIsMapFullscreen((current) => !current)}
            type="button"
          >
            {isMapFullscreen ? "退出全屏地图" : "全屏导航地图"}
          </button>
          <RouteMap route={route} selectedStopId={effectiveSelectedMapStopId} />
          <div className="map-source-note">
            <strong>地图内核</strong>
            <p>
              当前地图只读取路线内的 GCJ-02 坐标和已保存 polyline，不会把 POI
              写入 places。可用高德 Web 服务复核步行段距离、耗时和
              polyline；步行、骑行、公交、驾车/打车会优先使用高德复核，失败路段保留本地估算。
            </p>
            <div className="map-source-actions">
              <button
                disabled={mapRecalculationState === "loading"}
                onClick={recalculateWithAmap}
                type="button"
              >
                <Route size={15} />
                {mapRecalculationState === "loading"
                  ? "复核中"
                  : "用高德复核路途"}
              </button>
              {mapRecalculationMessage ? (
                <span className={mapRecalculationState}>
                  {mapRecalculationMessage}
                </span>
              ) : null}
            </div>
          </div>
        </aside>

        <div className="timeline">
          {routeKernel.stops.map((stop, index) => {
            const previousStop = routeKernel.stops[index - 1];
            const deepReading = deepReadings[stop.id];
            const story =
              deepReading?.content ??
              generateStopThemeContentWithFallback(stop);
            const isStoryExpanded = expandedStories[stop.id] ?? false;
            const canExpandStory = isExperienceStop(stop);
            const openingWarning = getOpeningHoursWarning(
              stop,
              stop.calculatedTime,
              route.dateLabel,
            );
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
                    mode: stop.walkingFromPrevious?.mode ?? "walking",
                  });

            return (
              <article
                className={
                  effectiveSelectedMapStopId === stop.id
                    ? "stop-card selected"
                    : "stop-card"
                }
                key={stop.id}
                onFocus={() => setSelectedMapStopId(stop.id)}
                onMouseEnter={() => setSelectedMapStopId(stop.id)}
              >
                <div className="stop-index">
                  {String(index + 1).padStart(2, "0")}
                </div>
                <div className="stop-body">
                  <div className="stop-time">
                    <strong>{stop.calculatedTime}</strong>
                    {stop.walkingFromPrevious ? (
                      <span>
                        {getRouteTravelModeLabel(stop.walkingFromPrevious.mode)}{" "}
                        {stop.walkingFromPrevious.minutes} 分钟 ·{" "}
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
                  {stop.openingHours ? (
                    <p className={openingWarning ? "opening-warning" : ""}>
                      开放时间：{stop.openingHours}
                      {openingWarning ? ` · ${openingWarning}` : ""}
                    </p>
                  ) : null}
                  {canExpandStory ? (
                    <div className="stop-story">
                      <div>
                        <span>
                          {deepReading?.content
                            ? deepReading.content.sourceStatus === "verified"
                              ? "城市导览 · 已检索资料"
                              : deepReading.content.sourceStatus === "partial"
                                ? "城市导览 · 资料有限"
                                : "城市导览 · 资料待补充"
                            : "现场导览 · 资料待补充"}
                        </span>
                        <strong>{story.shortIntro}</strong>
                      </div>
                      {isStoryExpanded ? (
                        <div className="stop-story-more">
                          {deepReading?.message ? (
                            <p>
                              <Sparkles size={14} />
                              {deepReading.message}
                            </p>
                          ) : null}
                          {story.themeConnections.map((connection) => (
                            <p key={`${stop.id}-${connection.title ?? connection.theme}`}>
                              <FileText size={14} />
                              {connection.title ?? connection.theme}：{connection.text}
                            </p>
                          ))}
                          {story.practicalTips.map((tip) => (
                            <p key={tip}>
                              <Clock size={14} />
                              {tip}
                            </p>
                          ))}
                          <FactCheckNote
                            city={route.city}
                            content={story}
                            dateLabel={route.dateLabel}
                            stop={stop}
                            time={stop.calculatedTime}
                          />
                          {story.checkInTasks.map((task) => (
                            <p key={task}>
                              <Sparkles size={14} />
                              现场任务：{task}
                            </p>
                          ))}
                        </div>
                      ) : null}
                      <button
                        onClick={() => toggleDeepReading(stop)}
                        type="button"
                      >
                        {isStoryExpanded
                          ? "收起深读"
                          : isDeepSeekProxyConfigured()
                            ? "生成深读"
                          : "展开深读"}
                      </button>
                      {isDeepSeekProxyConfigured() &&
                      (deepReading?.content || deepReading?.status === "error") ? (
                        <button
                          onClick={() => {
                            setExpandedStories((current) => ({
                              ...current,
                              [stop.id]: true,
                            }));
                            void loadDeepReading(stop);
                          }}
                          type="button"
                        >
                          {deepReading?.status === "error"
                            ? "重试百度生成"
                            : "用百度重新生成"}
                        </button>
                      ) : null}
                    </div>
                  ) : null}
                  {isEditing ? (
                    <div className="stop-edit-panel">
                      <label>
                        {isExperienceStop(stop) ? "停留分钟" : "停留"}
                        {isExperienceStop(stop) ? (
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
                        ) : (
                          <span>起终点不设置停留</span>
                        )}
                      </label>
                      {stop.walkingFromPrevious ? (
                        <div className="stop-leg-edit">
                          <label>
                            交通方式
                            <select
                              onChange={(event) =>
                                persistRouteEdit(
                                  updateRouteLegTravelMode(
                                    route,
                                    stop.id,
                                    event.target
                                      .value as (typeof routeTravelModes)[number],
                                  ),
                                )
                              }
                              value={stop.walkingFromPrevious.mode ?? "walking"}
                            >
                              {routeTravelModes.map((mode) => (
                                <option key={mode} value={mode}>
                                  {routeTravelModeLabels[mode]}
                                </option>
                              ))}
                            </select>
                          </label>
                          <label>
                            路途分钟
                            <input
                              aria-label={`${stop.name} 路途分钟`}
                              max={360}
                              min={1}
                              onChange={(event) =>
                                persistRouteEdit(
                                  updateRouteLegMinutes(
                                    route,
                                    stop.id,
                                    Number(event.target.value),
                                  ),
                                )
                              }
                              step={1}
                              type="number"
                              value={stop.walkingFromPrevious.minutes}
                            />
                          </label>
                        </div>
                      ) : null}
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
                    {index === 0 ? "在高德查看地点" : "打开高德导航"}
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
type MapRecalculationState = "idle" | "loading" | "ready" | "partial" | "error";
type DeepReadingState = {
  status: "loading" | "ready" | "error";
  content?: StopThemeContent;
  message?: string;
};

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

  const publishedRoute = getPublishedCuratedRoute(routeId);
  const route = readRoutePlan();

  const nextRoute =
    publishedRoute ??
    (!routeId || routeId === route.id || routeId === "demo" ? route : demoRoute);

  cachedRouteSnapshot = {
    key: cacheKey,
    route: nextRoute,
  };

  return nextRoute;
}

function toReadyDeepReadings(readings: Record<string, StopThemeContent>) {
  return Object.fromEntries(
    Object.entries(readings).map(([stopId, content]) => [
      stopId,
      { status: "ready" as const, content },
    ]),
  ) as Record<string, DeepReadingState>;
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
