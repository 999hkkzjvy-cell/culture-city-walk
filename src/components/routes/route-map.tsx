"use client";

import type { CSSProperties } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  buildAmapRouteGeometry,
  type AmapMap,
  getAmapJsConfig,
  loadAmapJsApi,
} from "@/lib/maps/amap-js";
import type { RoutePlan } from "@/lib/route";

type MapState =
  "not-configured" | "no-geometry" | "loading" | "ready" | "error";

export function RouteMap({ route }: { route: RoutePlan }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const geometry = useMemo(() => buildAmapRouteGeometry(route), [route]);
  const [state, setState] = useState<MapState>("loading");
  const hasAmapKey = Boolean(getAmapJsConfig().key);
  const effectiveState = getEffectiveMapState(
    state,
    hasAmapKey,
    geometry.stopPoints.length,
  );

  useEffect(() => {
    if (!hasAmapKey || geometry.stopPoints.length === 0) {
      return;
    }

    let map: AmapMap | null = null;
    let cancelled = false;

    loadAmapJsApi()
      .then((AMap) => {
        if (cancelled || !containerRef.current) {
          return;
        }

        const center = geometry.stopPoints[0].position;
        map = new AMap.Map(containerRef.current, {
          center,
          mapStyle: "amap://styles/whitesmoke",
          resizeEnable: true,
          viewMode: "2D",
          zoom: 14,
        });

        const markers = geometry.stopPoints.map(
          (point, index) =>
            new AMap.Marker({
              content: markerContent(point.name, index + 1),
              offset: new AMap.Pixel(-15, -36),
              position: point.position,
              title: point.name,
            }),
        );
        const providerLines = geometry.providerLines.map(
          (line) =>
            new AMap.Polyline({
              path: line.path,
              strokeColor: "#1f6b50",
              strokeOpacity: 0.95,
              strokeWeight: 6,
              lineJoin: "round",
            }),
        );
        const estimatedLines = geometry.estimatedLines.map(
          (line) =>
            new AMap.Polyline({
              path: line.path,
              strokeColor: "#9b6f3f",
              strokeOpacity: 0.72,
              strokeStyle: "dashed",
              strokeWeight: 4,
              lineJoin: "round",
            }),
        );
        const overlays = [...estimatedLines, ...providerLines, ...markers];

        if (overlays.length > 0) {
          map.add(overlays);
          map.setFitView(overlays, false, [36, 36, 36, 36]);
        }

        setState("ready");
      })
      .catch(() => {
        if (!cancelled) {
          setState("error");
        }
      });

    return () => {
      cancelled = true;
      map?.destroy();
    };
  }, [geometry, hasAmapKey]);

  return (
    <div className="amap-route-map" aria-label="高德路线地图">
      <div ref={containerRef} className="amap-route-map-container" />
      {effectiveState !== "ready" ? (
        <MapFallback route={route} state={effectiveState} />
      ) : null}
      <div className="amap-route-map-legend">
        <span>
          <i className="provider-line" />
          高德 polyline
        </span>
        <span>
          <i className="estimated-line" />
          估算连接线
        </span>
        <span>{geometry.stopPoints.length} 个 GCJ-02 站点</span>
      </div>
    </div>
  );
}

function getEffectiveMapState(
  state: MapState,
  hasAmapKey: boolean,
  stopPointCount: number,
): MapState {
  if (!hasAmapKey) {
    return "not-configured";
  }

  if (stopPointCount === 0) {
    return "no-geometry";
  }

  return state;
}

function MapFallback({ route, state }: { route: RoutePlan; state: MapState }) {
  return (
    <div className="paper-map route-map-fallback">
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
      <p className="amap-route-map-status">{mapStateCopy[state]}</p>
    </div>
  );
}

const mapStateCopy: Record<MapState, string> = {
  "not-configured": "未配置高德 JS Key，暂时显示纸面路线示意图。",
  "no-geometry": "当前路线缺少 GCJ-02 坐标，暂时无法绘制高德地图。",
  loading: "正在加载高德地图...",
  ready: "",
  error: "高德地图加载失败，暂时显示纸面路线示意图。",
};

function markerContent(name: string, index: number) {
  return `<div class="amap-route-marker" title="${escapeHtml(name)}">${index}</div>`;
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}
