"use client";

import type { CSSProperties } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  buildAmapRouteGeometry,
  coordinateToAmapPoint,
  type AmapLngLat,
  type AmapMap,
  getAmapJsConfig,
  loadAmapJsApi,
} from "@/lib/maps/amap-js";
import type { Coordinate } from "@/lib/maps/types";
import type { RoutePlan } from "@/lib/route";

type MapState =
  "not-configured" | "no-geometry" | "loading" | "ready" | "error";

export type RouteMapPreviewCandidate = {
  id: string;
  name: string;
  insertionIndex: number;
  coordinate?: Coordinate | null;
  placeType?: string;
  score?: number;
};

export function RouteMap({
  route,
  selectedStopId,
  previewCandidate,
  compact = false,
}: {
  route: RoutePlan;
  selectedStopId?: string | null;
  previewCandidate?: RouteMapPreviewCandidate | null;
  compact?: boolean;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const geometry = useMemo(() => buildAmapRouteGeometry(route), [route]);
  const previewGeometry = useMemo(
    () => buildPreviewGeometry(route, previewCandidate),
    [route, previewCandidate],
  );
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
              content: markerContent(
                point.name,
                index + 1,
                point.id === selectedStopId,
              ),
              offset: new AMap.Pixel(-16, -38),
              position: point.position,
              title: point.name,
            }),
        );
        const providerLines = geometry.providerLines.map(
          (line) =>
            new AMap.Polyline({
              path: line.path,
              strokeColor: isSelectedLeg(line.id, selectedStopId)
                ? "#b45f2a"
                : "#1f6b50",
              strokeOpacity: 0.95,
              strokeWeight: isSelectedLeg(line.id, selectedStopId) ? 8 : 6,
              lineJoin: "round",
            }),
        );
        const estimatedLines = geometry.estimatedLines.map(
          (line) =>
            new AMap.Polyline({
              path: line.path,
              strokeColor: isSelectedLeg(line.id, selectedStopId)
                ? "#b45f2a"
                : "#9b6f3f",
              strokeOpacity: isSelectedLeg(line.id, selectedStopId) ? 0.95 : 0.72,
              strokeStyle: "dashed",
              strokeWeight: isSelectedLeg(line.id, selectedStopId) ? 6 : 4,
              lineJoin: "round",
            }),
        );
        const previewLines = previewGeometry.lines.map(
          (line) =>
            new AMap.Polyline({
              path: line,
              strokeColor: "#d47b3c",
              strokeOpacity: 0.92,
              strokeStyle: "dashed",
              strokeWeight: 5,
              lineJoin: "round",
            }),
        );
        const previewMarker = previewGeometry.point
          ? new AMap.Marker({
              content: previewMarkerContent(previewGeometry.name),
              offset: new AMap.Pixel(-16, -38),
              position: previewGeometry.point,
              title: previewGeometry.name,
            })
          : null;
        const overlays = [
          ...estimatedLines,
          ...providerLines,
          ...previewLines,
          ...markers,
          ...(previewMarker ? [previewMarker] : []),
        ];

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
  }, [geometry, hasAmapKey, previewGeometry, selectedStopId]);

  return (
    <div
      className={compact ? "amap-route-map compact" : "amap-route-map"}
      aria-label="高德路线地图"
    >
      <div ref={containerRef} className="amap-route-map-container" />
      {effectiveState !== "ready" ? (
        <MapFallback
          previewCandidate={previewCandidate}
          route={route}
          state={effectiveState}
        />
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
        {previewCandidate ? (
          <span>
            <i className="candidate-line" />
            候选插入预览
          </span>
        ) : null}
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

function MapFallback({
  previewCandidate,
  route,
  state,
}: {
  previewCandidate?: RouteMapPreviewCandidate | null;
  route: RoutePlan;
  state: MapState;
}) {
  return (
    <div className="paper-map route-map-fallback">
      <ol>
        {route.stops.map((stop, index) => (
          <li key={stop.id} style={{ "--i": index } as CSSProperties}>
            <span>{index + 1}</span>
            {stop.name}
          </li>
        ))}
        {previewCandidate ? (
          <li
            className="candidate-preview"
            style={{ "--i": 9 } as CSSProperties}
          >
            <span>+</span>
            {previewCandidate.name}
          </li>
        ) : null}
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

function markerContent(name: string, index: number, selected: boolean) {
  const className = selected
    ? "amap-route-marker selected"
    : "amap-route-marker";

  return `<div class="${className}" title="${escapeHtml(name)}">${index}</div>`;
}

function previewMarkerContent(name: string) {
  return `<div class="amap-route-marker candidate" title="${escapeHtml(
    name,
  )}">+</div>`;
}

function isSelectedLeg(lineId: string, selectedStopId?: string | null) {
  return Boolean(selectedStopId && lineId.includes(`:${selectedStopId}:`));
}

function buildPreviewGeometry(
  route: RoutePlan,
  candidate?: RouteMapPreviewCandidate | null,
):
  | {
      name: string;
      point: AmapLngLat;
      lines: AmapLngLat[][];
    }
  | {
      name: string;
      point: null;
      lines: [];
    } {
  const candidatePoint = coordinateToAmapPoint(candidate?.coordinate);

  if (!candidate || !candidatePoint) {
    return { name: candidate?.name ?? "", point: null, lines: [] };
  }

  const previousStop = route.stops[candidate.insertionIndex];
  const nextStop = route.stops[candidate.insertionIndex + 1];
  const previousPoint = coordinateToAmapPoint(previousStop?.coordinate);
  const nextPoint = coordinateToAmapPoint(nextStop?.coordinate);
  const lines = [
    previousPoint ? [previousPoint, candidatePoint] : null,
    nextPoint ? [candidatePoint, nextPoint] : null,
  ].filter((line): line is AmapLngLat[] => Boolean(line));

  return {
    name: candidate.name,
    point: candidatePoint,
    lines,
  };
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}
