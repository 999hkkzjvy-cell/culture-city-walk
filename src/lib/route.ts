export type Theme = "历史" | "文学" | "建筑" | "音乐" | "书店" | "美食";

export type PlanningMode = "discover" | "complete" | "refine";

export type Place = {
  id: string;
  name: string;
  area: string;
  address: string;
  themes: Theme[];
  mustVisit?: boolean;
  stayMinutes: number;
};

export type RouteStop = Place & {
  time: string;
  note: string;
  walkingFromPrevious?: {
    minutes: number;
    distanceMeters: number;
  };
};

export type RouteDraft = {
  id: string;
  city: string;
  title: string;
  mode: PlanningMode;
  dateLabel: string;
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
};

export const draftStorageKey = "cultural-citywalk:draft";

export const defaultDraft: RouteDraft = {
  id: "demo",
  city: "南京",
  title: "书页与旧城之间",
  mode: "complete",
  dateLabel: "今天",
  durationHours: 5,
  walkingRangeKm: "5-10 km",
  themes: ["文学", "历史", "建筑", "书店"],
  mustVisits: ["先锋书店", "总统府"],
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
      time: "10:40",
      note: "沿着老城区的公共空间继续前行，观察体育、集会和城市日常如何在同一片街区叠合。",
      walkingFromPrevious: {
        minutes: 12,
        distanceMeters: 750,
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
      time: "11:30",
      note: "中国近代史的重要舞台。这里适合作为路线中段的重心，把人物、建筑和制度变迁一起读。",
      walkingFromPrevious: {
        minutes: 15,
        distanceMeters: 1100,
      },
    },
    {
      id: "meiyuan",
      name: "梅园新村纪念馆",
      area: "玄武",
      address: "汉府街",
      themes: ["历史"],
      stayMinutes: 35,
      time: "13:20",
      note: "如果当天开放，它是总统府之后最顺路的补充站点，可以把宏大的历史叙事落到街巷尺度。",
      walkingFromPrevious: {
        minutes: 9,
        distanceMeters: 620,
      },
    },
    {
      id: "xuanwu",
      name: "顺和路公馆区",
      area: "玄武",
      address: "长江路周边",
      themes: ["建筑", "历史"],
      stayMinutes: 30,
      time: "14:15",
      note: "用半小时慢走，留意院墙、门楼、树影和街道宽度，这些是旧城记忆最安静的线索。",
      walkingFromPrevious: {
        minutes: 16,
        distanceMeters: 980,
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

export function getThemeSummary(themes: Theme[]) {
  return themes.length > 0 ? themes.join("、") : "城市文化";
}
