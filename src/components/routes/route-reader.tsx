"use client";

import Link from "next/link";
import type { CSSProperties } from "react";
import { useSyncExternalStore } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  Bookmark,
  Clock,
  MapPin,
  Navigation,
  Route,
  Share2,
  Sparkles,
} from "lucide-react";
import { RouteCloudActions } from "@/components/routes/route-cloud-actions";
import { amapPlaceSearchUrl, amapWalkingNavigationUrl } from "@/lib/maps/amap";
import { demoRoute, type RoutePlan } from "@/lib/route";
import { calculateRouteKernel } from "@/lib/route-kernel";
import { readRoutePlan, routePlanStorageKey } from "@/lib/storage";

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

  const routeKernel = calculateRouteKernel(route);
  const sourceLabel =
    routeKernel.legSource === "provider"
      ? "高德真实步行数据"
      : routeKernel.legSource === "estimated"
        ? "本地估算，待高德复核"
        : "缺少步行数据";

  return (
    <>
      <section className="route-hero">
        <div>
          <Link className="back-link" href="/plan/">
            <ArrowLeft size={16} />
            返回
          </Link>
          <p>{route.title}</p>
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
          <button type="button">
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
      </section>

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
