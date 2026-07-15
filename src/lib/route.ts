import type {
  Coordinate,
  CoordinateSystem,
  PlaceVerificationStatus,
} from "@/lib/maps/types";

export type Theme = "历史" | "文学" | "建筑" | "音乐" | "书店" | "美食";

export type PlanningMode = "discover" | "complete" | "refine";

export type RouteTravelMode =
  "walking" | "cycling" | "transit" | "driving" | "taxi";

export type Place = {
  id: string;
  name: string;
  area: string;
  address: string;
  themes: Theme[];
  mustVisit?: boolean;
  stayMinutes: number;
  routeRole?: "start" | "middle" | "end";
  source?: "amap" | "manual" | "seed" | "demo";
  sourcePlaceId?: string | null;
  coordinate?: Coordinate | null;
  coordinateSystem?: CoordinateSystem;
  verificationStatus?: PlaceVerificationStatus;
  openingHours?: string | null;
  telephone?: string | null;
  providerRating?: string | null;
  providerCost?: string | null;
};

export type RouteStop = Place & {
  time: string;
  note: string;
  fixedTime?: boolean;
  walkingFromPrevious?: {
    minutes: number;
    distanceMeters: number;
    mode?: RouteTravelMode;
    source?: "provider" | "estimated";
    provider?: "amap" | "local";
    label?: string;
    polyline?: Coordinate[];
  };
};

export type RouteDraft = {
  id: string;
  city: string;
  title: string;
  mode: PlanningMode;
  dateLabel: string;
  startTime: string;
  durationHours: number;
  walkingRangeKm: string;
  themes: Theme[];
  mustVisits: string[];
  pace: "轻松漫步" | "平衡" | "充实紧凑";
  updatedAt: string;
};

export type RoutePlan = RouteDraft & {
  distanceKm: number;
  stops: RouteStop[];
  validation?: RouteValidationSnapshot;
};

export type RouteValidationSnapshot = {
  checkedAt: string;
  issueCount: number;
  issues: RouteValidationIssue[];
};

export type RouteValidationIssue = {
  code: string;
  severity: "warning" | "error";
  stopId?: string;
  message: string;
};

export const draftStorageKey = "cultural-citywalk:draft";

export const defaultDraft: RouteDraft = {
  id: "demo",
  city: "南京",
  title: "书页与旧城之间",
  mode: "complete",
  dateLabel: "今天",
  startTime: "09:30",
  durationHours: 5,
  walkingRangeKm: "5-10 km",
  themes: ["文学", "历史", "建筑", "书店"],
  mustVisits: [],
  pace: "轻松漫步",
  updatedAt: "2026-07-13T00:00:00.000Z",
};

export const demoRoute: RoutePlan = {
  ...defaultDraft,
  distanceKm: 6.8,
  stops: [
    {
      id: "librairie",
      name: "先锋书店（五台山店）",
      area: "鼓楼",
      address: "广州路 173 号",
      themes: ["文学", "书店"],
      mustVisit: true,
      stayMinutes: 45,
      routeRole: "middle",
      source: "demo",
      sourcePlaceId: "librairie",
      coordinate: { lng: 118.7734, lat: 32.0526, system: "gcj02" },
      coordinateSystem: "gcj02",
      verificationStatus: "source_pending",
      time: "09:30",
      note: "在这家书店里，时间像被慢慢压下来。许多作家、诗人和学生在这里分享过他们的故事，也在这里留下了他们的文字。",
    },
    {
      id: "gym",
      name: "五台山体育馆旧址",
      area: "鼓楼",
      address: "五台山片区",
      themes: ["建筑", "历史"],
      stayMinutes: 25,
      routeRole: "middle",
      source: "demo",
      sourcePlaceId: "gym",
      coordinate: { lng: 118.7716, lat: 32.055, system: "gcj02" },
      coordinateSystem: "gcj02",
      verificationStatus: "source_pending",
      time: "10:40",
      note: "沿着老城区的公共空间继续前行，观察体育、集会和城市日常如何在同一片街区叠合。",
      walkingFromPrevious: {
        minutes: 12,
        distanceMeters: 750,
        mode: "walking",
        source: "estimated",
        provider: "local",
      },
    },
    {
      id: "presidential-palace",
      name: "总统府",
      area: "玄武",
      address: "长江路 292 号",
      themes: ["历史", "建筑"],
      mustVisit: true,
      stayMinutes: 70,
      routeRole: "middle",
      source: "demo",
      sourcePlaceId: "presidential-palace",
      coordinate: { lng: 118.7953, lat: 32.0454, system: "gcj02" },
      coordinateSystem: "gcj02",
      verificationStatus: "source_pending",
      time: "11:30",
      note: "中国近代史的重要舞台。这里适合作为路线中段的重心，把人物、建筑和制度变迁一起读。",
      walkingFromPrevious: {
        minutes: 15,
        distanceMeters: 1100,
        mode: "walking",
        source: "estimated",
        provider: "local",
      },
    },
    {
      id: "meiyuan",
      name: "梅园新村纪念馆",
      area: "玄武",
      address: "汉府街",
      themes: ["历史"],
      stayMinutes: 35,
      routeRole: "middle",
      source: "demo",
      sourcePlaceId: "meiyuan",
      coordinate: { lng: 118.8032, lat: 32.044, system: "gcj02" },
      coordinateSystem: "gcj02",
      verificationStatus: "source_pending",
      time: "13:20",
      note: "如果当天开放，它是总统府之后最顺路的补充站点，可以把宏大的历史叙事落到街巷尺度。",
      walkingFromPrevious: {
        minutes: 9,
        distanceMeters: 620,
        mode: "walking",
        source: "estimated",
        provider: "local",
      },
    },
    {
      id: "xuanwu",
      name: "顺和路公馆区",
      area: "玄武",
      address: "长江路周边",
      themes: ["建筑", "历史"],
      stayMinutes: 30,
      routeRole: "middle",
      source: "demo",
      sourcePlaceId: "xuanwu",
      coordinate: { lng: 118.8061, lat: 32.0468, system: "gcj02" },
      coordinateSystem: "gcj02",
      verificationStatus: "source_pending",
      time: "14:15",
      note: "用半小时慢走，留意院墙、门楼、树影和街道宽度，这些是旧城记忆最安静的线索。",
      walkingFromPrevious: {
        minutes: 16,
        distanceMeters: 980,
        mode: "walking",
        source: "estimated",
        provider: "local",
      },
    },
  ],
};

export function calculateRouteTotals(stops: RouteStop[]) {
  return stops.reduce(
    (totals, stop) => {
      totals.stayMinutes += stop.stayMinutes;
      totals.walkingMinutes += stop.walkingFromPrevious?.minutes ?? 0;
      totals.walkingMeters += stop.walkingFromPrevious?.distanceMeters ?? 0;
      return totals;
    },
    {
      stayMinutes: 0,
      walkingMinutes: 0,
      walkingMeters: 0,
    },
  );
}

export function isExperienceStop(stop: Pick<RouteStop, "routeRole">) {
  return stop.routeRole !== "start" && stop.routeRole !== "end";
}

export function getThemeSummary(themes: Theme[]) {
  return themes.length > 0 ? themes.join("、") : "城市文化";
}
