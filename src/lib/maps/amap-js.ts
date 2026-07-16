import type { Coordinate } from "@/lib/maps/types";
import type { RoutePlan, RouteStop } from "@/lib/route";

export type AmapLngLat = [number, number];

export type AmapRouteStopPoint = {
  id: string;
  name: string;
  area: string;
  position: AmapLngLat;
  source: RouteStop["source"];
  verificationStatus: RouteStop["verificationStatus"];
};

export type AmapRouteLine = {
  id: string;
  source: "provider" | "estimated";
  path: AmapLngLat[];
};

export type AmapRouteGeometry = {
  stopPoints: AmapRouteStopPoint[];
  providerLines: AmapRouteLine[];
  estimatedLines: AmapRouteLine[];
};

type AmapOverlay = object;

export type AmapMap = {
  add(overlay: AmapOverlay | AmapOverlay[]): void;
  remove(overlay: AmapOverlay | AmapOverlay[]): void;
  destroy(): void;
  setFitView(
    overlays?: AmapOverlay[],
    immediately?: boolean,
    avoid?: [number, number, number, number],
  ): void;
};

type AmapNamespace = {
  Map: new (
    container: string | HTMLElement,
    options: Record<string, unknown>,
  ) => AmapMap;
  Marker: new (options: Record<string, unknown>) => AmapOverlay;
  Pixel: new (x: number, y: number) => object;
  Polyline: new (options: Record<string, unknown>) => AmapOverlay;
};

declare global {
  interface Window {
    AMap?: AmapNamespace;
    _AMapSecurityConfig?: {
      securityJsCode?: string;
    };
    __cultureCitywalkAmapPromise?: Promise<AmapNamespace>;
  }
}

export function getAmapJsConfig() {
  return {
    key: process.env.NEXT_PUBLIC_AMAP_JS_KEY?.trim() ?? "",
    securityJsCode: process.env.NEXT_PUBLIC_AMAP_SECURITY_JS_CODE?.trim() ?? "",
  };
}

export function loadAmapJsApi(): Promise<AmapNamespace> {
  const config = getAmapJsConfig();

  if (!config.key) {
    return Promise.reject(new Error("amap_js_key_missing"));
  }

  if (typeof window === "undefined") {
    return Promise.reject(new Error("amap_requires_browser"));
  }

  if (window.AMap) {
    return Promise.resolve(window.AMap);
  }

  if (window.__cultureCitywalkAmapPromise) {
    return window.__cultureCitywalkAmapPromise;
  }

  if (config.securityJsCode) {
    window._AMapSecurityConfig = {
      securityJsCode: config.securityJsCode,
    };
  }

  window.__cultureCitywalkAmapPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.async = true;
    script.charset = "utf-8";
    script.src = `https://webapi.amap.com/maps?v=2.0&key=${encodeURIComponent(
      config.key,
    )}`;

    script.onload = () => {
      if (window.AMap) {
        resolve(window.AMap);
        return;
      }

      reject(new Error("amap_js_loaded_without_namespace"));
    };
    script.onerror = () => {
      window.__cultureCitywalkAmapPromise = undefined;
      reject(new Error("amap_js_load_failed"));
    };

    document.head.appendChild(script);
  });

  return window.__cultureCitywalkAmapPromise;
}

export function buildAmapRouteGeometry(route: RoutePlan): AmapRouteGeometry {
  const stopPoints = route.stops.flatMap((stop) => {
    const position = coordinateToAmapPoint(stop.coordinate);

    return position
      ? [
          {
            id: stop.id,
            name: stop.name,
            area: stop.area,
            position,
            source: stop.source,
            verificationStatus: stop.verificationStatus,
          },
        ]
      : [];
  });
  const stopPointById = new Map(
    stopPoints.map((point) => [point.id, point.position]),
  );
  const providerLines: AmapRouteLine[] = [];
  const estimatedLines: AmapRouteLine[] = [];

  route.stops.forEach((stop, index) => {
    if (index === 0) {
      return;
    }

    const polyline = (stop.walkingFromPrevious?.polyline ?? [])
      .map(coordinateToAmapPoint)
      .filter((point): point is AmapLngLat => Boolean(point));

    if (polyline.length >= 2) {
      providerLines.push({
        id: `${route.id}:${stop.id}:provider`,
        source: "provider",
        path: polyline,
      });
      return;
    }

    const previousStop = route.stops[index - 1];
    const origin = stopPointById.get(previousStop.id);
    const destination = stopPointById.get(stop.id);

    if (origin && destination) {
      estimatedLines.push({
        id: `${route.id}:${stop.id}:estimated`,
        source: "estimated",
        path: [origin, destination],
      });
    }
  });

  return {
    stopPoints,
    providerLines,
    estimatedLines,
  };
}

export function coordinateToAmapPoint(
  coordinate?: Coordinate | null,
): AmapLngLat | null {
  if (
    !coordinate ||
    coordinate.system !== "gcj02" ||
    !Number.isFinite(coordinate.lng) ||
    !Number.isFinite(coordinate.lat)
  ) {
    return null;
  }

  return [coordinate.lng, coordinate.lat];
}
