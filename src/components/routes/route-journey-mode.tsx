"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import {
  ArrowLeft,
  Camera,
  CheckCircle2,
  Clock,
  FileText,
  ImagePlus,
  MapPin,
  Navigation,
  NotebookTabs,
  RotateCcw,
  SkipForward,
  Sparkles,
  Trash2,
} from "lucide-react";
import {
  generateStopThemeContentWithDeepSeek,
  isDeepSeekProxyConfigured,
} from "@/lib/ai/deepseek";
import { FactCheckNote } from "@/components/routes/fact-check-note";
import { StopQuestionPanel } from "@/components/routes/stop-question-panel";
import {
  generateRouteSummaryWithFallback,
  generateStopThemeContentWithFallback,
  type StopThemeContent,
} from "@/lib/ai/route-collaboration";
import { amapPlaceSearchUrl, amapWalkingNavigationUrl } from "@/lib/maps/amap";
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
import { calculateRouteKernel } from "@/lib/route-kernel";
import { createRouteRepository } from "@/lib/repositories/route-repository";
import {
  archiveCheckInPhoto,
  deleteCheckInPhoto,
  listCheckInPhotos,
} from "@/lib/repositories/checkin-photo-repository";
import {
  readJourneyState,
  readJourneyArchives,
  readDeepReadings,
  readRoutePlan,
  routePlanStorageKey,
  saveCandidateState,
  saveJourneyArchive,
  saveDeepReading,
  saveJourneyState,
  saveRoutePlan,
  type StoredCandidateAction,
  type StoredCheckInPhoto,
  type StoredJourneyArchive,
  type StoredJourneyState,
} from "@/lib/storage";
import { getRouteTravelModeLabel } from "@/lib/transport";
import { journeyArchiveUrl, readRouteId, routeUrl } from "@/lib/urls";

let cachedJourneyRoute:
  | {
      key: string;
      route: RoutePlan;
    }
  | undefined;

type RemoteRouteState = "idle" | "loading" | "ready" | "not-found" | "error";
type UploadState = "idle" | "loading" | "ready" | "local" | "error";
type DeepReadingState = {
  status: "loading" | "ready" | "error";
  content?: StopThemeContent;
  message?: string;
};

export function RouteJourneyMode() {
  const route = useSyncExternalStore(
    subscribeToLocalRoutePlan,
    readRoutePlanForJourney,
    () => demoRoute,
  );
  const routeKernel = calculateRouteKernel(route);
  const routeSummary = generateRouteSummaryWithFallback(route);
  const [remoteRouteState, setRemoteRouteState] =
    useState<RemoteRouteState>("idle");
  const [selectedStopId, setSelectedStopId] = useState(
    () => route.stops[0]?.id ?? "",
  );
  const [journey, setJourney] = useState<StoredJourneyState>(() =>
    typeof window === "undefined"
      ? emptyJourneyState(route.id)
      : readJourneyState(route.id),
  );
  const [deepReadings, setDeepReadings] = useState<
    Record<string, DeepReadingState>
  >({});
  const [photos, setPhotos] = useState<StoredCheckInPhoto[]>([]);
  const [archives, setArchives] = useState<StoredJourneyArchive[]>(() =>
    typeof window === "undefined" ? [] : readJourneyArchives(route.id),
  );
  const [uploadState, setUploadState] = useState<UploadState>("idle");
  const [uploadMessage, setUploadMessage] = useState("");
  const [isCompleted, setIsCompleted] = useState(false);

  const selectedStop =
    routeKernel.stops.find((stop) => stop.id === selectedStopId) ??
    routeKernel.stops[0] ??
    null;
  const selectedIndex = selectedStop
    ? routeKernel.stops.findIndex((stop) => stop.id === selectedStop.id)
    : -1;
  const previousStop =
    selectedIndex > 0 ? routeKernel.stops[selectedIndex - 1] : null;
  const selectedPhotos = selectedStop
    ? photos.filter((photo) => photo.stopId === selectedStop.id)
    : [];
  const content = selectedStop
    ? (deepReadings[selectedStop.id]?.content ??
      generateStopThemeContentWithFallback(selectedStop))
    : null;
  const experienceStops = routeKernel.stops.filter(isExperienceStop);
  const experienceStopIds = new Set(experienceStops.map((stop) => stop.id));
  const completedCount = journey.arrivedStopIds.filter((id) =>
    experienceStopIds.has(id),
  ).length;
  const skippedCount = journey.skippedStopIds.filter((id) =>
    experienceStopIds.has(id),
  ).length;
  const checkInPhotoCount = photos.filter((photo) =>
    experienceStopIds.has(photo.stopId),
  ).length;
  const journeyScore = Math.min(
    100,
    completedCount * 18 + checkInPhotoCount * 10,
  );
  const totalStayMinutes = useMemo(
    () => route.stops.reduce((total, stop) => total + stop.stayMinutes, 0),
    [route.stops],
  );
  const latestArchive = archives[0] ?? null;

  useEffect(() => {
    let isMounted = true;

    queueMicrotask(() => {
      if (!isMounted) {
        return;
      }

      setSelectedStopId((current) =>
        route.stops.some((stop) => stop.id === current)
          ? current
          : (route.stops[0]?.id ?? ""),
      );
      setJourney(readJourneyState(route.id));
      setArchives(readJourneyArchives(route.id));
      const cachedReadings = readDeepReadings(route.id).readings;
      setDeepReadings(
        Object.fromEntries(
          Object.entries({
            ...getPublishedCuratedDeepReadings(route.id),
            ...cachedReadings,
          }).map(([stopId, content]) => [
            stopId,
            { status: "ready" as const, content },
          ]),
        ),
      );
      void listCheckInPhotos(route.id).then((nextPhotos) => {
        if (isMounted) {
          setPhotos(nextPhotos);
        }
      });
    });

    return () => {
      isMounted = false;
    };
  }, [route.id, route.stops]);

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
        setSelectedStopId(loadedRoute.stops[0]?.id ?? "");
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

  function updateJourney(next: StoredJourneyState) {
    saveJourneyState(next);
    setJourney(next);
  }

  function markArrived(stopId: string) {
    const stop = route.stops.find((item) => item.id === stopId);

    if (stop && !isExperienceStop(stop)) {
      return;
    }

    updateJourney({
      ...journey,
      arrivedStopIds: [...new Set([...journey.arrivedStopIds, stopId])],
      skippedStopIds: journey.skippedStopIds.filter((id) => id !== stopId),
      updatedAt: new Date().toISOString(),
    });
  }

  function markActive(stopId: string) {
    updateJourney({
      ...journey,
      arrivedStopIds: journey.arrivedStopIds.filter((id) => id !== stopId),
      skippedStopIds: journey.skippedStopIds.filter((id) => id !== stopId),
      updatedAt: new Date().toISOString(),
    });
  }

  function skipStop(stopId: string) {
    const stop = route.stops.find((item) => item.id === stopId);

    if (stop && !isExperienceStop(stop)) {
      return;
    }

    updateJourney({
      ...journey,
      skippedStopIds: [...new Set([...journey.skippedStopIds, stopId])],
      arrivedStopIds: journey.arrivedStopIds.filter((id) => id !== stopId),
      updatedAt: new Date().toISOString(),
    });
  }

  function resetJourney() {
    updateJourney(emptyJourneyState(route.id));
    setIsCompleted(false);
  }

  function completeJourney() {
    const completedAt = new Date().toISOString();
    const archive: StoredJourneyArchive = {
      id: `journey-${route.id}-${completedAt}`,
      routeId: route.id,
      routeTitle: route.title,
      city: route.city,
      score: journeyScore,
      arrivedCount: completedCount,
      skippedCount,
      photoCount: checkInPhotoCount,
      experienceStopCount: experienceStops.length,
      completedAt,
    };

    saveJourneyArchive(archive);
    setArchives((current) => [archive, ...current]);
    setIsCompleted(true);
  }

  function requestDeepReading(stop: RouteStop) {
    if (!isDeepSeekProxyConfigured()) {
      const content = generateStopThemeContentWithFallback(stop);
      setDeepReadings((current) => ({
        ...current,
        [stop.id]: {
          status: "ready",
          content,
          message: "DeepSeek 未启用，当前显示本地模板深读。",
        },
      }));
      saveDeepReading(route.id, stop.id, content);
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

  async function handlePhotoInput(fileList: FileList | null) {
    const file = fileList?.[0];

    if (!file || !selectedStop) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      setUploadState("error");
      setUploadMessage("请选择图片文件。");
      return;
    }

    setUploadState("loading");
    setUploadMessage("正在压缩并存档打卡图...");

    try {
      const photo = await buildStoredPhoto(file, route.id, selectedStop.id);
      const result = await archiveCheckInPhoto(photo);
      setPhotos(await listCheckInPhotos(route.id));
      setUploadState(result.synced ? "ready" : "local");
      setUploadMessage(result.message);
    } catch {
      setUploadState("error");
      setUploadMessage("打卡图存档失败，可能是浏览器本地空间不足。");
    }
  }

  async function deletePhoto(photo: StoredCheckInPhoto) {
    await deleteCheckInPhoto(photo);
    setPhotos(await listCheckInPhotos(route.id));
  }

  const navigationUrl =
    selectedStop && selectedIndex === 0
      ? amapPlaceSearchUrl({
          name: selectedStop.name,
          city: route.city,
          address: selectedStop.address,
        })
      : selectedStop
        ? amapWalkingNavigationUrl({
            from: previousStop
              ? {
                  name: previousStop.name,
                  coordinate: previousStop.coordinate,
                }
              : undefined,
            to: {
              name: selectedStop.name,
              coordinate: selectedStop.coordinate,
            },
            mode: selectedStop.walkingFromPrevious?.mode ?? "walking",
          })
        : "#";

  return (
    <>
      <section className="journey-mode-hero">
        <Link className="back-link" href={routeUrl(route.id)}>
          <ArrowLeft size={16} />
          返回路线详情
        </Link>
        <div>
          <p>{routeSummary.summary}</p>
          <h1>体验路线 · {route.title}</h1>
          <div className="route-meta">
            <span>
              <MapPin size={16} />
              {route.city}
            </span>
            <span>
              <Clock size={16} />
              游玩 {Math.round(totalStayMinutes / 60)} 小时
            </span>
            <span>
              <CheckCircle2 size={16} />
              已到达 {completedCount}/{experienceStops.length}
            </span>
          </div>
        </div>
      </section>

      <RouteLoadStatus state={remoteRouteState} />

      {latestArchive ? (
        <section className="journey-archive-strip">
          <div>
            <p>最近行程存档</p>
            <strong>
              到达 {latestArchive.arrivedCount}/
              {latestArchive.experienceStopCount} · 记录照片{" "}
              {latestArchive.photoCount} 张
            </strong>
          </div>
          <Link className="secondary-link" href={journeyArchiveUrl()}>
            <NotebookTabs size={15} />
            {formatArchiveTime(latestArchive.completedAt)} 完成
          </Link>
        </section>
      ) : null}

      {isCompleted ? (
        <section className="journey-completion">
          <p>路线完成</p>
          <h2>你走到了 {completedCount} 个站点</h2>
          <span>
            完成 {completedCount}/{experienceStops.length} 个体验站点，上传{" "}
            {checkInPhotoCount} 张打卡图。
          </span>
          <strong>{buildPraiseCopy(journeyScore, route.city)}</strong>
          <Link className="secondary-link" href={journeyArchiveUrl()}>
            <NotebookTabs size={15} />
            继续查看行程存档
          </Link>
        </section>
      ) : null}

      <section className="journey-mode-layout">
        <aside className="journey-route-overview" aria-label="路线概览">
          <div className="journey-overview-heading">
            <div>
              <p>路线概览</p>
              <h2>{route.stops.length} 个站点</h2>
            </div>
            <button onClick={resetJourney} type="button">
              <RotateCcw size={14} />
              重置
            </button>
          </div>
          <div className="journey-progress-summary">
            <span>已到达 {completedCount}</span>
            <span>
              未完成 {experienceStops.length - completedCount - skippedCount}
            </span>
            <span>暂不游玩 {skippedCount}</span>
          </div>
          <div className="journey-stop-list">
            {routeKernel.stops.map((stop, index) => {
              const isSelected = stop.id === selectedStop?.id;
              const isArrived = journey.arrivedStopIds.includes(stop.id);
              const isSkipped = journey.skippedStopIds.includes(stop.id);

              return (
                <button
                  className={isSelected ? "selected" : ""}
                  key={stop.id}
                  onClick={() => setSelectedStopId(stop.id)}
                  type="button"
                >
                  <span className="journey-stop-index">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span className="journey-stop-copy">
                    <strong>{stop.name}</strong>
                    <small>
                      {stop.calculatedTime}
                      {isExperienceStop(stop)
                        ? ` · 拟游玩 ${stop.stayMinutes} 分钟`
                        : " · 导航节点"}
                    </small>
                    <small>
                      {stop.walkingFromPrevious
                        ? `${getRouteTravelModeLabel(stop.walkingFromPrevious.mode)} ${stop.walkingFromPrevious.minutes} 分钟 · ${stop.walkingFromPrevious.distanceMeters} m`
                        : "起点"}
                    </small>
                  </span>
                  <em>
                    {!isExperienceStop(stop)
                      ? stop.routeRole === "end"
                        ? "终点"
                        : "起点"
                      : isArrived
                        ? "已到达"
                        : isSkipped
                          ? "已跳过"
                          : "进行中"}
                  </em>
                </button>
              );
            })}
          </div>
        </aside>

        <section className="journey-stop-detail" aria-label="站点深度讲解">
          {selectedStop && content ? (
            <>
              <div className="journey-stop-heading">
                <div>
                  <p>
                    第 {selectedIndex + 1} 站 · {selectedStop.calculatedTime}
                  </p>
                  <h2>{selectedStop.name}</h2>
                  <span>
                    {isExperienceStop(selectedStop)
                      ? `拟游玩 ${selectedStop.stayMinutes} 分钟 · `
                      : "导航节点 · "}
                    {selectedStop.address}
                  </span>
                </div>
                <div className="journey-stop-actions">
                  {isExperienceStop(selectedStop) ? (
                    <>
                      <button
                        className={
                          journey.arrivedStopIds.includes(selectedStop.id)
                            ? "selected"
                            : ""
                        }
                        onClick={() =>
                          journey.arrivedStopIds.includes(selectedStop.id)
                            ? markActive(selectedStop.id)
                            : markArrived(selectedStop.id)
                        }
                        type="button"
                      >
                        <CheckCircle2 size={15} />
                        {journey.arrivedStopIds.includes(selectedStop.id)
                          ? "取消到达"
                          : "标记到达"}
                      </button>
                      <button
                        className={
                          journey.skippedStopIds.includes(selectedStop.id)
                            ? "selected"
                            : ""
                        }
                        onClick={() =>
                          journey.skippedStopIds.includes(selectedStop.id)
                            ? markActive(selectedStop.id)
                            : skipStop(selectedStop.id)
                        }
                        type="button"
                      >
                        <SkipForward size={15} />
                        {journey.skippedStopIds.includes(selectedStop.id)
                          ? "恢复游玩"
                          : "暂不游玩"}
                      </button>
                    </>
                  ) : null}
                  <a href={navigationUrl} rel="noreferrer" target="_blank">
                    <Navigation size={15} />
                    {selectedIndex === 0 ? "高德查看" : "高德导航"}
                  </a>
                </div>
              </div>

              {isExperienceStop(selectedStop) ? (
                <article className="journey-reading-block">
                  <div className="journey-reading-title">
                    <span>
                      {deepReadings[selectedStop.id]?.content
                        ? deepReadings[selectedStop.id]?.content
                            ?.sourceStatus === "verified"
                          ? "城市导览 · 已检索资料"
                          : deepReadings[selectedStop.id]?.content
                                ?.sourceStatus === "partial"
                            ? "城市导览 · 资料有限"
                            : "城市导览 · 资料待补充"
                        : "现场导览 · 资料待补充"}
                    </span>
                    <button
                      disabled={
                        deepReadings[selectedStop.id]?.status === "loading"
                      }
                      onClick={() => requestDeepReading(selectedStop)}
                      type="button"
                    >
                      <Sparkles size={14} />
                      {isDeepSeekProxyConfigured() ? "开始听这里的故事" : "刷新导览"}
                    </button>
                  </div>
                  {deepReadings[selectedStop.id]?.message ? (
                    <p className="journey-reading-message">
                      {deepReadings[selectedStop.id]?.message}
                    </p>
                  ) : null}
                  <p>{content.shortIntro}</p>
                  <div className="journey-reading-grid">
                    {content.themeConnections.map((connection) => (
                      <section key={connection.title ?? connection.theme}>
                        <h3>
                          <FileText size={15} />
                          {connection.title ?? connection.theme}
                        </h3>
                        <p>{connection.text}</p>
                      </section>
                    ))}
                  </div>
                  <FactCheckNote
                    city={route.city}
                    content={content}
                    dateLabel={route.dateLabel}
                    stop={selectedStop}
                    time={selectedStop.calculatedTime}
                  />
                  <StopQuestionPanel
                    key={selectedStop.id}
                    route={route}
                    stop={selectedStop}
                  />
                </article>
              ) : (
                <article className="journey-reading-block">
                  <div className="journey-reading-title">
                    <span>导航节点</span>
                  </div>
                  <p>
                    这一站用于确定路线起终点，不生成深度讲解、停留时间和打卡任务。
                  </p>
                </article>
              )}

              {isExperienceStop(selectedStop) ? (
                <section className="journey-task-block">
                  <div>
                    <p>打卡任务</p>
                    <h3>两项现场任务</h3>
                  </div>
                  <div className="journey-task-list">
                    {content.checkInTasks.map((task) => (
                      <label key={task}>
                        <input type="checkbox" />
                        <span>{task}</span>
                      </label>
                    ))}
                  </div>
                  <div className="journey-tip-list">
                    {content.practicalTips.map((tip) => (
                      <p key={tip}>{tip}</p>
                    ))}
                  </div>
                </section>
              ) : null}

              {isExperienceStop(selectedStop) ? (
                <section className="journey-photo-archive">
                  <div className="journey-photo-heading">
                    <div>
                      <p>打卡图存档</p>
                      <h3>{selectedPhotos.length} 张照片</h3>
                    </div>
                    <label className="journey-upload-button">
                      <ImagePlus size={15} />
                      上传打卡图
                      <input
                        accept="image/*"
                        aria-label="上传打卡图"
                        onChange={(event) => {
                          void handlePhotoInput(event.target.files);
                          event.currentTarget.value = "";
                        }}
                        type="file"
                      />
                    </label>
                  </div>
                  {uploadMessage ? (
                    <p className={`journey-upload-status ${uploadState}`}>
                      {uploadMessage}
                    </p>
                  ) : null}
                  {selectedPhotos.length > 0 ? (
                    <div className="journey-photo-grid">
                      {selectedPhotos.map((photo) => (
                        <figure key={photo.id}>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            alt={`${selectedStop.name} 打卡图`}
                            src={photo.dataUrl}
                          />
                          <figcaption>
                            <span>{formatArchiveTime(photo.createdAt)}</span>
                            <button
                              aria-label={`删除打卡图 ${photo.fileName}`}
                              onClick={() => {
                                void deletePhoto(photo);
                              }}
                              type="button"
                            >
                              <Trash2 size={14} />
                            </button>
                          </figcaption>
                        </figure>
                      ))}
                    </div>
                  ) : (
                    <div className="journey-photo-empty">
                      <Camera size={18} />
                      <span>还没有为这一站上传打卡图。</span>
                    </div>
                  )}
                </section>
              ) : null}
              {selectedStop.routeRole === "end" ? (
                <button
                  className="primary-action compact"
                  onClick={completeJourney}
                  type="button"
                >
                  <CheckCircle2 size={15} />
                  完成路线
                </button>
              ) : null}
            </>
          ) : (
            <div className="journey-photo-empty">
              <MapPin size={18} />
              <span>当前路线还没有站点。</span>
            </div>
          )}
        </section>
      </section>
    </>
  );
}

function RouteLoadStatus({ state }: { state: RemoteRouteState }) {
  if (state === "idle") {
    return null;
  }

  const copy: Record<Exclude<RemoteRouteState, "idle">, string> = {
    loading: "正在读取云端路线与候选点状态...",
    ready: "云端路线已恢复为当前本地预案，可继续体验路线。",
    "not-found": "没有找到这条云端路线，已保留当前本地预案。",
    error: "云端路线暂时无法读取，已保留当前本地预案。",
  };

  return <p className="route-load-status">{copy[state]}</p>;
}

function readRoutePlanForJourney(): RoutePlan {
  const params = new URLSearchParams(window.location.search);
  const routeId = params.get("id");
  const storageValue = window.localStorage.getItem(routePlanStorageKey) ?? "";
  const cacheKey = `${routeId ?? ""}:${storageValue}`;

  if (cachedJourneyRoute?.key === cacheKey) {
    return cachedJourneyRoute.route;
  }

  const publishedRoute = getPublishedCuratedRoute(routeId);
  const route = readRoutePlan();
  const nextRoute =
    publishedRoute ??
    (!routeId || routeId === route.id || routeId === "demo" ? route : demoRoute);

  cachedJourneyRoute = {
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

function emptyJourneyState(routeId: string): StoredJourneyState {
  return {
    routeId,
    arrivedStopIds: [],
    skippedStopIds: [],
    updatedAt: new Date().toISOString(),
  };
}

async function buildStoredPhoto(
  file: File,
  routeId: string,
  stopId: string,
): Promise<StoredCheckInPhoto> {
  const dataUrl = await resizeImageFile(file);
  const createdAt = new Date().toISOString();

  return {
    id: createCheckInPhotoId(),
    routeId,
    stopId,
    fileName: file.name || "check-in.jpg",
    mimeType: "image/jpeg",
    dataUrl,
    createdAt,
  };
}

function createCheckInPhotoId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return "10000000-1000-4000-8000-100000000000".replace(/[018]/g, (char) =>
    (
      Number(char) ^
      (Math.floor(Math.random() * 16) >> (Number(char) / 4))
    ).toString(16),
  );
}

function resizeImageFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      const image = new Image();
      image.onload = () => {
        const maxSize = 1280;
        const ratio = Math.min(
          1,
          maxSize / Math.max(image.naturalWidth, image.naturalHeight),
        );
        const width = Math.max(1, Math.round(image.naturalWidth * ratio));
        const height = Math.max(1, Math.round(image.naturalHeight * ratio));
        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d");

        if (!context) {
          reject(new Error("canvas_context_unavailable"));
          return;
        }

        canvas.width = width;
        canvas.height = height;
        context.drawImage(image, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", 0.82));
      };
      image.onerror = reject;
      image.src = String(reader.result);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function formatArchiveTime(value: string) {
  try {
    return new Intl.DateTimeFormat("zh-CN", {
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function buildPraiseCopy(score: number, city: string) {
  if (score >= 90) {
    return `你把${city}读得很细：路线、现场和影像都留下了自己的证据。`;
  }

  if (score >= 60) {
    return `这是一份扎实的${city}行程存档，已经有足够多的现场观察可以回看。`;
  }

  return `这次先留下路线骨架也很好，下次可以多上传几张现场照片，把记忆补完整。`;
}
