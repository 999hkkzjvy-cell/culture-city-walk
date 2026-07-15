import type { PlaceCandidate } from "@/lib/maps/types";
import { estimateWalkingLeg } from "@/lib/maps/fallback";
import type { RoutePlan, RouteStop, Theme } from "@/lib/route";

export type CandidatePlaceType =
  "景点" | "博物馆" | "历史建筑" | "书店" | "咖啡馆" | "餐厅" | "公园";

export type CandidateFitBand = "very_along" | "recommended" | "optional";

export type RouteCandidate = {
  id: string;
  place: PlaceCandidate;
  placeType: CandidatePlaceType;
  themes: Theme[];
  stayMinutes: number;
  insertionIndex: number;
  detourMinutes: number;
  detourMeters: number;
  score: number;
  fitBand: CandidateFitBand;
  reasons: string[];
  risks: string[];
  cacheKey: string;
};

export type CandidateSearchOptions = {
  themes: Theme[];
  acceptedTypes?: CandidatePlaceType[];
  maxResults?: number;
  now?: Date;
};

type SeedCandidate = Omit<
  RouteCandidate,
  | "id"
  | "insertionIndex"
  | "detourMinutes"
  | "detourMeters"
  | "score"
  | "fitBand"
  | "reasons"
  | "risks"
  | "cacheKey"
>;

export const candidatePlaceTypes: CandidatePlaceType[] = [
  "景点",
  "博物馆",
  "历史建筑",
  "书店",
  "咖啡馆",
  "餐厅",
  "公园",
];

const LOCAL_NANJING_CANDIDATES: SeedCandidate[] = [
  {
    place: {
      id: "local:john-rabe-house",
      source: "manual",
      sourcePlaceId: "nanjing-john-rabe-house",
      name: "拉贝故居",
      address: "小粉桥 1 号",
      city: "南京",
      district: "鼓楼",
      adcode: null,
      coordinate: { lng: 118.7839, lat: 32.0559, system: "gcj02" },
      poiType: "历史建筑",
      verificationStatus: "source_pending",
    },
    placeType: "历史建筑",
    themes: ["历史", "建筑"],
    stayMinutes: 30,
  },
  {
    place: {
      id: "local:six-dynasties-museum",
      source: "manual",
      sourcePlaceId: "nanjing-six-dynasties-museum",
      name: "六朝博物馆",
      address: "长江路 302 号",
      city: "南京",
      district: "玄武",
      adcode: null,
      coordinate: { lng: 118.797, lat: 32.0438, system: "gcj02" },
      poiType: "博物馆",
      verificationStatus: "source_pending",
    },
    placeType: "博物馆",
    themes: ["历史", "建筑"],
    stayMinutes: 50,
  },
  {
    place: {
      id: "local:jiangning-imperial-silk",
      source: "manual",
      sourcePlaceId: "nanjing-jiangning-imperial-silk",
      name: "江宁织造博物馆",
      address: "长江路 123 号",
      city: "南京",
      district: "玄武",
      adcode: null,
      coordinate: { lng: 118.7901, lat: 32.0442, system: "gcj02" },
      poiType: "博物馆",
      verificationStatus: "source_pending",
    },
    placeType: "博物馆",
    themes: ["历史", "文学", "建筑"],
    stayMinutes: 45,
  },
  {
    place: {
      id: "local:nanjing-library",
      source: "manual",
      sourcePlaceId: "nanjing-library",
      name: "南京图书馆",
      address: "中山东路 189 号",
      city: "南京",
      district: "玄武",
      adcode: null,
      coordinate: { lng: 118.7919, lat: 32.0448, system: "gcj02" },
      poiType: "书店",
      verificationStatus: "source_pending",
    },
    placeType: "书店",
    themes: ["文学", "书店"],
    stayMinutes: 35,
  },
  {
    place: {
      id: "local:1912-block",
      source: "manual",
      sourcePlaceId: "nanjing-1912-block",
      name: "南京 1912 街区",
      address: "太平北路",
      city: "南京",
      district: "玄武",
      adcode: null,
      coordinate: { lng: 118.7945, lat: 32.0473, system: "gcj02" },
      poiType: "餐厅",
      verificationStatus: "source_pending",
    },
    placeType: "餐厅",
    themes: ["美食", "建筑"],
    stayMinutes: 45,
  },
];

export function generateRouteCandidates(
  route: RoutePlan,
  options: CandidateSearchOptions,
): RouteCandidate[] {
  const acceptedTypes = options.acceptedTypes ?? candidatePlaceTypes;
  const maxResults = options.maxResults ?? 6;

  return dedupeCandidates(LOCAL_NANJING_CANDIDATES)
    .filter((candidate) => isSameCity(candidate.place.city, route.city))
    .filter((candidate) => acceptedTypes.includes(candidate.placeType))
    .map((candidate) => scoreCandidate(route, candidate, options.themes))
    .sort((a, b) => b.score - a.score || a.detourMinutes - b.detourMinutes)
    .slice(0, maxResults);
}

export function generateRouteCandidatesFromPlaces(
  route: RoutePlan,
  places: PlaceCandidate[],
  options: CandidateSearchOptions,
): RouteCandidate[] {
  const acceptedTypes = options.acceptedTypes ?? candidatePlaceTypes;
  const maxResults = options.maxResults ?? 6;

  return dedupeCandidates(
    places
      .map((place) => seedCandidateFromPlace(place))
      .filter((candidate): candidate is SeedCandidate => Boolean(candidate)),
  )
    .filter((candidate) => isSameCity(candidate.place.city, route.city))
    .filter((candidate) => acceptedTypes.includes(candidate.placeType))
    .filter((candidate) => !isDuplicateRouteStop(route, candidate.place))
    .map((candidate) => scoreCandidate(route, candidate, options.themes))
    .sort((a, b) => b.score - a.score || a.detourMinutes - b.detourMinutes)
    .slice(0, maxResults);
}

export function getCandidateBandLabel(band: CandidateFitBand) {
  switch (band) {
    case "very_along":
      return "非常顺路";
    case "recommended":
      return "推荐";
    case "optional":
      return "可考虑";
  }
}

function scoreCandidate(
  route: RoutePlan,
  candidate: SeedCandidate,
  preferredThemes: Theme[],
): RouteCandidate {
  const insertion = findBestInsertion(route.stops, candidate.place);
  const matchedThemes = candidate.themes.filter((theme) =>
    preferredThemes.includes(theme),
  );
  const typeAlreadyUsed = route.stops.some((stop) =>
    stop.themes.some((theme) => candidate.themes.includes(theme)),
  );
  const detourPenalty = Math.min(34, insertion.detourMinutes * 2.2);
  const themeScore = matchedThemes.length * 18;
  const diversityScore = typeAlreadyUsed ? 4 : 12;
  const baseScore = 58 + themeScore + diversityScore - detourPenalty;
  const score = clamp(Math.round(baseScore), 0, 100);
  const fitBand = getFitBand(score, insertion.detourMinutes);
  const reasons = buildReasons(
    candidate,
    matchedThemes,
    insertion.detourMinutes,
  );
  const risks =
    candidate.place.verificationStatus === "source_pending"
      ? ["地点信息待高德复核"]
      : [];

  return {
    id: candidate.place.id,
    ...candidate,
    insertionIndex: insertion.index,
    detourMinutes: insertion.detourMinutes,
    detourMeters: insertion.detourMeters,
    score,
    fitBand,
    reasons,
    risks,
    cacheKey: [
      route.id,
      candidate.place.sourcePlaceId ?? candidate.place.id,
      insertion.index,
    ].join(":"),
  };
}

function findBestInsertion(stops: RouteStop[], candidate: PlaceCandidate) {
  if (stops.length < 2) {
    return { index: 0, detourMinutes: 0, detourMeters: 0 };
  }

  return stops.slice(0, -1).reduce(
    (best, stop, index) => {
      const nextStop = stops[index + 1];
      const origin = routeStopAsPlaceCandidate(stop);
      const destination = routeStopAsPlaceCandidate(nextStop);
      const originToCandidate = estimateWalkingLeg({
        origin,
        destination: candidate,
      });
      const candidateToDestination = estimateWalkingLeg({
        origin: candidate,
        destination,
      });
      const originalMinutes =
        nextStop.walkingFromPrevious?.minutes ??
        estimateWalkingLeg({ origin, destination }).durationMinutes;
      const originalMeters =
        nextStop.walkingFromPrevious?.distanceMeters ??
        estimateWalkingLeg({ origin, destination }).distanceMeters;
      const detourMinutes = Math.max(
        0,
        originToCandidate.durationMinutes +
          candidateToDestination.durationMinutes -
          originalMinutes,
      );
      const detourMeters = Math.max(
        0,
        originToCandidate.distanceMeters +
          candidateToDestination.distanceMeters -
          originalMeters,
      );

      return detourMinutes < best.detourMinutes
        ? { index, detourMinutes, detourMeters }
        : best;
    },
    { index: 0, detourMinutes: Number.POSITIVE_INFINITY, detourMeters: 0 },
  );
}

function routeStopAsPlaceCandidate(
  stop: RouteStop,
): Pick<PlaceCandidate, "id" | "coordinate"> {
  return {
    id: stop.sourcePlaceId ?? stop.id,
    coordinate: stop.coordinate ?? null,
  };
}

function seedCandidateFromPlace(place: PlaceCandidate): SeedCandidate | null {
  const placeType = inferPlaceType(place);

  if (!placeType) {
    return null;
  }

  return {
    place,
    placeType,
    themes: inferThemes(placeType, place.poiType),
    stayMinutes: inferStayMinutes(placeType),
  };
}

function inferPlaceType(place: PlaceCandidate): CandidatePlaceType | null {
  const text = `${place.name} ${place.address ?? ""} ${place.poiType ?? ""}`;

  if (isExcludedPoi(text)) {
    return null;
  }

  if (matchesAny(text, ["博物馆", "展览馆", "纪念馆", "美术馆"])) {
    return "博物馆";
  }

  if (matchesAny(text, ["旧址", "故居", "公馆", "历史", "文物", "建筑"])) {
    return "历史建筑";
  }

  if (matchesAny(text, ["书店", "图书", "书局", "书房"])) {
    return "书店";
  }

  if (matchesAny(text, ["咖啡"])) {
    return "咖啡馆";
  }

  if (matchesAny(text, ["餐饮", "餐厅", "美食", "小吃", "饭店"])) {
    return "餐厅";
  }

  if (matchesAny(text, ["公园", "园林", "绿地"])) {
    return "公园";
  }

  if (
    matchesAny(text, [
      "风景名胜",
      "景区",
      "景点",
      "名胜",
      "遗址",
      "牌坊",
      "城墙",
      "街区",
      "广场",
    ])
  ) {
    return "景点";
  }

  return null;
}

function inferThemes(placeType: CandidatePlaceType, poiType: string | null) {
  const themesByType: Record<CandidatePlaceType, Theme[]> = {
    景点: ["历史", "建筑"],
    博物馆: ["历史", "建筑"],
    历史建筑: ["历史", "建筑"],
    书店: ["文学", "书店"],
    咖啡馆: ["文学", "美食"],
    餐厅: ["美食"],
    公园: ["历史", "建筑"],
  };
  const themes = new Set<Theme>(themesByType[placeType]);

  if (poiType?.includes("音乐")) {
    themes.add("音乐");
  }

  return [...themes];
}

function inferStayMinutes(placeType: CandidatePlaceType) {
  switch (placeType) {
    case "博物馆":
      return 50;
    case "历史建筑":
      return 35;
    case "书店":
      return 35;
    case "咖啡馆":
      return 25;
    case "餐厅":
      return 45;
    case "公园":
      return 35;
    case "景点":
      return 40;
  }
}

function matchesAny(text: string, keywords: string[]) {
  return keywords.some((keyword) => text.includes(keyword));
}

function isExcludedPoi(text: string) {
  return matchesAny(text, [
    "超级市场",
    "便民商店",
    "便利店",
    "小卖部",
    "烟酒",
    "彩票",
    "药房",
    "药店",
    "停车场",
    "公共厕所",
    "写字楼",
    "住宅区",
    "生活服务",
    "维修",
  ]);
}

function isSameCity(candidateCity: string, routeCity: string) {
  const normalize = (city: string) => city.trim().replace(/市$/, "");
  const normalizedCandidateCity = normalize(candidateCity);
  const normalizedRouteCity = normalize(routeCity);

  if (!normalizedCandidateCity || !normalizedRouteCity) {
    return false;
  }

  return (
    normalizedCandidateCity === normalizedRouteCity ||
    normalizedCandidateCity.includes(normalizedRouteCity) ||
    normalizedRouteCity.includes(normalizedCandidateCity)
  );
}

function dedupeCandidates(candidates: SeedCandidate[]) {
  const seen = new Set<string>();

  return candidates.filter((candidate) => {
    const key = candidate.place.sourcePlaceId ?? candidate.place.id;

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

function isDuplicateRouteStop(route: RoutePlan, place: PlaceCandidate) {
  return route.stops.some((stop) => {
    if (
      place.sourcePlaceId &&
      stop.sourcePlaceId &&
      place.sourcePlaceId === stop.sourcePlaceId
    ) {
      return true;
    }

    const distanceMeters = distanceBetweenCoordinates(
      place.coordinate,
      stop.coordinate,
    );

    return (
      distanceMeters !== null &&
      distanceMeters <= 250 &&
      areNamesSimilar(place.name, stop.name)
    );
  });
}

function areNamesSimilar(candidateName: string, stopName: string) {
  const candidate = normalizePlaceName(candidateName);
  const stop = normalizePlaceName(stopName);

  if (candidate.length < 2 || stop.length < 2) {
    return false;
  }

  if (candidate.includes(stop) || stop.includes(candidate)) {
    return Math.min(candidate.length, stop.length) >= 3;
  }

  const candidateChars = [...new Set(candidate)];
  const stopChars = new Set(stop);
  const overlap = candidateChars.filter((char) => stopChars.has(char)).length;

  return overlap / Math.min(candidateChars.length, stopChars.size) >= 0.68;
}

function normalizePlaceName(value: string) {
  return value
    .replace(/[（(].*?[）)]/g, "")
    .replace(/南京|中国|景区|景点|旧址|遗址|纪念馆|博物馆/g, "")
    .replace(/[^\p{Script=Han}a-z0-9]/giu, "")
    .toLowerCase();
}

function distanceBetweenCoordinates(
  a: PlaceCandidate["coordinate"],
  b: RouteStop["coordinate"],
) {
  if (!a || !b) {
    return null;
  }

  const toRadians = (degree: number) => (degree * Math.PI) / 180;
  const earthRadiusMeters = 6371000;
  const deltaLat = toRadians(b.lat - a.lat);
  const deltaLng = toRadians(b.lng - a.lng);
  const lat1 = toRadians(a.lat);
  const lat2 = toRadians(b.lat);
  const haversine =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLng / 2) ** 2;

  return (
    2 *
    earthRadiusMeters *
    Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine))
  );
}

function getFitBand(score: number, detourMinutes: number): CandidateFitBand {
  if (score >= 78 && detourMinutes <= 8) {
    return "very_along";
  }

  if (score >= 62 && detourMinutes <= 18) {
    return "recommended";
  }

  return "optional";
}

function buildReasons(
  candidate: SeedCandidate,
  matchedThemes: Theme[],
  detourMinutes: number,
) {
  const reasons = [
    detourMinutes <= 8
      ? "绕行时间很低"
      : `预计新增约 ${detourMinutes} 分钟步行`,
  ];

  if (matchedThemes.length > 0) {
    reasons.push(`匹配${matchedThemes.join("、")}偏好`);
  }

  reasons.push(`${candidate.placeType}类型补足路线层次`);

  return reasons;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}
