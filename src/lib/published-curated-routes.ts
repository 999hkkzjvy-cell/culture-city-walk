import {
  getCuratedRouteDraft,
  type CuratedRouteDraftStop,
} from "@/lib/curated-route-drafts";
import {
  stopThemeContentSchema,
  type StopThemeContent,
} from "@/lib/ai/route-collaboration";
import type { Coordinate, PlaceVerificationStatus } from "@/lib/maps/types";
import type { RoutePlan, RouteStop, Theme } from "@/lib/route";

export const humanSmokeRouteId = "nanjing-human-smoke";

const editorialDraftResult = getCuratedRouteDraft(
  "nanjing-watergate-to-bookstore-draft",
);

if (!editorialDraftResult) {
  throw new Error("缺少“人间烟火：一座城市的日常”编辑稿。");
}

const editorialDraft = editorialDraftResult;

type PublishedStopDefinition = {
  id: string;
  address: string;
  area: string;
  coordinate: Coordinate;
  sourcePlaceId: string | null;
  source: "amap" | "manual";
  verificationStatus: PlaceVerificationStatus;
  themes: Theme[];
  time: string;
  stayMinutes: number;
  fixedTime?: boolean;
  note: string;
  openingHours?: string;
  providerCost?: string;
  walkingFromPrevious?: RouteStop["walkingFromPrevious"];
};

const gcj02 = (lng: number, lat: number): Coordinate => ({
  lng,
  lat,
  system: "gcj02",
});

const publishedStopDefinitions: PublishedStopDefinition[] = [
  {
    id: "handmade-wonton-mochou-new-village",
    area: "建邺",
    address: "南湖路莫愁新村 22 号",
    coordinate: gcj02(118.760107, 32.030509),
    source: "amap",
    sourcePlaceId: "B0FFFPAT52",
    verificationStatus: "possibly_outdated",
    themes: ["美食", "历史"],
    time: "07:00",
    stayMinutes: 60,
    openingHours: "06:00–17:30（出发日前复核）",
    note: "早餐也是路线的第一站：从社区小店的清晨节奏进入这座城市的日常。菜单、排队与座位以当天现场为准。",
  },
  {
    id: "water-west-gate-square",
    area: "秦淮",
    address: "莫愁路 81 号附近",
    coordinate: gcj02(118.770169, 32.029744),
    source: "amap",
    sourcePlaceId: "B0FFFZS53M",
    verificationStatus: "source_pending",
    themes: ["历史", "建筑"],
    time: "08:14",
    stayMinutes: 10,
    note: "把水边、广场和三山门遗址碑放在一起看，辨认旧城边界怎样进入今天的道路与日常。",
    walkingFromPrevious: {
      minutes: 14,
      distanceMeters: 1080,
      mode: "walking",
      source: "provider",
      provider: "amap",
      label: "步行至水西门广场",
    },
  },
  {
    id: "shangxin-pavilion",
    area: "秦淮",
    address: "水西门广场内",
    coordinate: gcj02(118.76966, 32.02967),
    source: "manual",
    sourcePlaceId: null,
    verificationStatus: "source_pending",
    themes: ["历史", "文学"],
    time: "08:24",
    stayMinutes: 3,
    note: "作为独立观察点停一会儿：先看水边视野与公共空间，再等待可靠资料解释亭名的历史和文学关联。",
    walkingFromPrevious: {
      minutes: 0,
      distanceMeters: 80,
      mode: "walking",
      source: "estimated",
      provider: "local",
    },
  },
  {
    id: "zhongnan-bank-former-site",
    area: "秦淮",
    address: "白下路 155 号",
    coordinate: gcj02(118.790586, 32.02869),
    source: "amap",
    sourcePlaceId: "B001911PPA",
    verificationStatus: "verified",
    themes: ["历史", "建筑"],
    time: "08:47",
    stayMinutes: 10,
    note: "从转角入口、钟楼和原营业厅方向，观察民国金融建筑如何面对街道展示秩序与信誉。",
    walkingFromPrevious: {
      minutes: 20,
      distanceMeters: 4215,
      mode: "cycling",
      source: "provider",
      provider: "amap",
      label: "骑行至中南银行旧址，含取还车和等候开门缓冲",
    },
  },
  {
    id: "saint-pauls-church",
    area: "秦淮",
    address: "太平南路 396 号",
    coordinate: gcj02(118.79065, 32.029514),
    source: "amap",
    sourcePlaceId: "B00190BBXQ",
    verificationStatus: "possibly_outdated",
    themes: ["历史", "建筑"],
    time: "09:00",
    stayMinutes: 18,
    fixedTime: true,
    openingHours: "计划 09:00 后观察；礼拜与开放安排须出发日前复核",
    note: "从钟楼、礼拜空间与传统构架进入太平南路公共生活中的宗教建筑一页。",
    walkingFromPrevious: {
      minutes: 3,
      distanceMeters: 105,
      mode: "walking",
      source: "provider",
      provider: "amap",
      label: "步行并等候圣保罗堂开门",
    },
  },
  {
    id: "qinghechangji-former-branch",
    area: "秦淮",
    address: "太平南路 382 号",
    coordinate: gcj02(118.791211, 32.030586),
    source: "amap",
    sourcePlaceId: "B0FFF3RZHS",
    verificationStatus: "verified",
    themes: ["历史", "建筑"],
    time: "09:18",
    stayMinutes: 6,
    note: "在一处可核验的民国商号旧址前，观察商店建筑如何被嵌进连续的商业立面。",
    walkingFromPrevious: {
      minutes: 0,
      distanceMeters: 140,
      mode: "walking",
      source: "estimated",
      provider: "local",
    },
  },
  {
    id: "jiangsu-hotel-taiping-south-road",
    area: "秦淮",
    address: "太平南路 305 号",
    coordinate: gcj02(118.79181, 32.03234),
    source: "manual",
    sourcePlaceId: null,
    verificationStatus: "source_pending",
    themes: ["建筑", "美食"],
    time: "09:24",
    stayMinutes: 5,
    note: "在饭店与沿街建筑前观察商业街不同年代的功能叠加；“原安乐酒店”的沿革仍待补证。",
    walkingFromPrevious: {
      minutes: 0,
      distanceMeters: 240,
      mode: "walking",
      source: "estimated",
      provider: "local",
    },
  },
  {
    id: "taiping-shopping-mall",
    area: "秦淮",
    address: "太平南路 279 号",
    coordinate: gcj02(118.7922, 32.03304),
    source: "amap",
    sourcePlaceId: "B00190BBXP",
    verificationStatus: "verified",
    themes: ["历史", "建筑"],
    time: "09:29",
    stayMinutes: 6,
    note: "用一座民国时期的商场，讨论现代零售、商号集合与商业街的公共生活。",
    walkingFromPrevious: {
      minutes: 0,
      distanceMeters: 110,
      mode: "walking",
      source: "estimated",
      provider: "local",
    },
  },
  {
    id: "ancient-bookstore-taiping-south-road",
    area: "秦淮",
    address: "太平南路 220 号",
    coordinate: gcj02(118.792804, 32.035304),
    source: "amap",
    sourcePlaceId: "B00190YONT",
    verificationStatus: "possibly_outdated",
    themes: ["文学", "书店", "历史"],
    time: "09:35",
    stayMinutes: 7,
    note: "从原中华书局南京分局的外观进入太平南路的出版与阅读记忆，连接旧书店街与下午的当代书店。",
    walkingFromPrevious: {
      minutes: 0,
      distanceMeters: 320,
      mode: "walking",
      source: "estimated",
      provider: "local",
    },
  },
  {
    id: "west-cabbage-garden",
    area: "秦淮",
    address: "西白菜园历史风貌区",
    coordinate: gcj02(118.795121, 32.038425),
    source: "amap",
    sourcePlaceId: "B0HRHU2CCF",
    verificationStatus: "source_pending",
    themes: ["建筑", "历史"],
    time: "09:42",
    stayMinutes: 18,
    note: "从商业街转入居住街巷，观察小尺度住区、更新与居民日常怎样改变行走速度和观看方式。",
    walkingFromPrevious: {
      minutes: 0,
      distanceMeters: 560,
      mode: "walking",
      source: "estimated",
      provider: "local",
    },
  },
  {
    id: "tong-jun-residence-watergate-route",
    area: "秦淮",
    address: "文昌巷 52 号",
    coordinate: gcj02(118.795215, 32.036746),
    source: "amap",
    sourcePlaceId: "B00190CUZM",
    verificationStatus: "possibly_outdated",
    themes: ["建筑", "历史"],
    time: "10:00",
    stayMinutes: 90,
    fixedTime: true,
    note: "从童寯自宅进入相邻建筑馆，讨论建筑师如何把专业判断放进私人居所，又如何被保存为建筑档案。",
    walkingFromPrevious: {
      minutes: 0,
      distanceMeters: 260,
      mode: "walking",
      source: "estimated",
      provider: "local",
      label: "穿过西白菜园至童寯故居",
    },
  },
  {
    id: "ipho-watergate-route",
    area: "秦淮",
    address: "利济巷 38 号",
    coordinate: gcj02(118.7999, 32.0322),
    source: "amap",
    sourcePlaceId: "B0JDML46EM",
    verificationStatus: "possibly_outdated",
    themes: ["美食"],
    time: "11:30",
    stayMinutes: 81,
    openingHours: "10:00–21:00（地图资料，出发日前复核）",
    providerCost: "约 ¥52（地图资料，待复核）",
    note: "午餐是独立服务站：恢复体力，也从菜单、香气和用餐方式观察今天城市饮食的多样性。",
    walkingFromPrevious: {
      minutes: 9,
      distanceMeters: 645,
      mode: "walking",
      source: "provider",
      provider: "amap",
      label: "步行至 iPHO 爱福越式食堂",
    },
  },
  {
    id: "puyue-bookstore-watergate-route",
    area: "鼓楼",
    address: "中山北路 346 号老学堂创意园东区 6 栋",
    coordinate: gcj02(118.7576, 32.0729),
    source: "amap",
    sourcePlaceId: "B0IRF5AJXC",
    verificationStatus: "possibly_outdated",
    themes: ["书店", "文学"],
    time: "14:00",
    stayMinutes: 120,
    fixedTime: true,
    openingHours: "09:00–19:00（地图资料，出发日前复核）",
    note: "用一间当代书店收束：城市阅读不只在旧址里，也仍发生在今天可停留、可交流的空间。",
    walkingFromPrevious: {
      minutes: 60,
      distanceMeters: 9000,
      mode: "taxi",
      source: "provider",
      provider: "amap",
      label: "打车至朴阅书店，含周末路况与到店缓冲",
    },
  },
];

export const humanSmokeRoute: RoutePlan = {
  id: humanSmokeRouteId,
  city: "南京",
  title: "人间烟火：一座城市的日常",
  mode: "complete",
  dateLabel: "2026-07-25",
  startTime: "07:00",
  durationHours: 9,
  walkingRangeKm: "5–10 km",
  distanceKm: 17.5,
  themes: ["历史", "建筑", "书店", "美食"],
  mustVisits: ["童寯故居与童寯建筑馆", "朴阅书店"],
  pace: "充实紧凑",
  updatedAt: "2026-07-24T00:00:00.000Z",
  themePack: {
    id: "nanjing-human-smoke",
    centralQuestion: editorialDraft.centralQuestion,
    narrativeArc: editorialDraft.narrativeArc,
    anchorPlaceIds: [
      "water-west-gate-square",
      "tong-jun-residence-watergate-route",
      "puyue-bookstore-watergate-route",
    ],
    allowedPlaceIds: publishedStopDefinitions.map((stop) => stop.id),
    status: "published",
  },
  stops: publishedStopDefinitions.map((definition) => {
    const editorialStop = getEditorialStop(definition.id);

    return {
      ...definition,
      name: editorialStop.name,
      routeRole: "middle",
      journeyRole: editorialStop.journeyRole,
      contentBrief: {
        deepReadingFocus: editorialStop.deepReadingFocus,
        taskDirection: editorialStop.taskDirection,
        researchKeywords: editorialStop.researchKeywords,
        editorialNotes: editorialStop.editorialNotes,
      },
    };
  }),
};

export const humanSmokePreloadedReadings = Object.fromEntries(
  humanSmokeRoute.stops.map((stop) => [stop.id, createPreloadedReading(stop)]),
) as Record<string, StopThemeContent>;

export function getPublishedCuratedRoute(routeId: string | null | undefined) {
  return routeId === humanSmokeRouteId ? humanSmokeRoute : null;
}

export function getPublishedCuratedDeepReadings(
  routeId: string | null | undefined,
) {
  return routeId === humanSmokeRouteId ? humanSmokePreloadedReadings : {};
}

function getEditorialStop(id: string): CuratedRouteDraftStop {
  const stop = editorialDraft.stops.find((item) => item.id === id);

  if (!stop) {
    throw new Error(`缺少已审核站点：${id}`);
  }

  return stop;
}

function createPreloadedReading(stop: RouteStop): StopThemeContent {
  const editorialStop = getEditorialStop(stop.id);
  const sourceReferences = editorialDraft.sources
    .filter((source) => editorialStop.sourceIds.includes(source.id))
    .map((source, index) => ({
      id: `S${index + 1}`,
      label: `${source.publisher}｜${source.title}`,
      href: source.url,
      kind: source.kind,
    }));
  const hasFactSource = sourceReferences.some((source) =>
    ["official", "authority", "academic"].includes(source.kind),
  );

  return stopThemeContentSchema.parse({
    placeId: stop.sourcePlaceId ?? stop.id,
    shortIntro: stop.note,
    themeConnections: [
      {
        theme: stop.themes[0] ?? "历史",
        title: "为什么在这条路线上",
        text: editorialStop.purpose,
      },
      {
        theme: stop.themes[1] ?? stop.themes[0] ?? "历史",
        title: "导览重点",
        text:
          editorialStop.deepReadingFocus ??
          "先从现场可见的空间、标识与人的使用方式出发，再阅读可靠资料。",
      },
    ],
    practicalTips: editorialStop.reviewNote ? [editorialStop.reviewNote] : [],
    checkInTasks: [
      editorialStop.taskDirection ?? "记录一处让你愿意停下来的现场细节。",
      `拍下一张能回应“${humanSmokeRoute.title}”的${stop.name}照片，或写下一句观察。`,
    ],
    sourceStatus: hasFactSource ? "partial" : "unverified",
    contentDepth: "limited",
    sourceReferences,
    verifiedAt: hasFactSource ? "2026-07-24T00:00:00.000Z" : null,
    researchMeta: null,
  });
}
