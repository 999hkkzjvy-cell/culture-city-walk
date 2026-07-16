import type { PlaceCandidate } from "@/lib/maps/types";
import { estimateWalkingLeg } from "@/lib/maps/fallback";
import type { MapProvider } from "@/lib/maps/types";
import { getOpeningHoursStatus } from "@/lib/opening-hours";
import type { RoutePlan, RouteStop, Theme } from "@/lib/route";
import { calculateTimeline, formatTime, parseTime } from "@/lib/route-kernel";

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
  restaurantPreferences?: RestaurantPreferences;
  routeGoal?: string;
  maxResults?: number;
  now?: Date;
};

export type RestaurantPreferences = {
  cuisines?: string[];
  budget?: string | null;
  mealRequirement?: "lunch" | "dinner" | null;
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
    .map((candidate) =>
      scoreCandidate(route, candidate, options.themes, undefined, {
        restaurantPreferences: options.restaurantPreferences,
        routeGoal: options.routeGoal,
      }),
    )
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
    .map((candidate) =>
      scoreCandidate(route, candidate, options.themes, undefined, {
        restaurantPreferences: options.restaurantPreferences,
        routeGoal: options.routeGoal,
      }),
    )
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

export type ProviderDetourResult = {
  candidates: RouteCandidate[];
  providerLegs: number;
  failedLegs: number;
};

type CandidateInsertion = {
  index: number;
  detourMinutes: number;
  detourMeters: number;
  providerLegs?: number;
  failedLegs?: number;
};

export async function refineCandidatesWithProviderDetours(
  route: RoutePlan,
  candidates: RouteCandidate[],
  calculateWalkingRoute: NonNullable<MapProvider["calculateWalkingRoute"]>,
  preferredThemes: Theme[],
  restaurantPreferences?: RestaurantPreferences,
  routeGoal?: string,
): Promise<ProviderDetourResult> {
  if (route.stops.length < 2 || candidates.length === 0) {
    return {
      candidates,
      providerLegs: 0,
      failedLegs: 0,
    };
  }

  let providerLegs = 0;
  let failedLegs = 0;
  const insertions = await Promise.all(
    candidates.map((candidate) =>
      refineProviderInsertion(
        route.stops,
        candidate.place,
        candidate.insertionIndex,
        calculateWalkingRoute,
      ),
    ),
  );
  const refined = candidates.map((candidate, index) => {
    const insertion = insertions[index];
    providerLegs += insertion.providerLegs ?? 0;
    failedLegs += insertion.failedLegs ?? 0;
    return scoreCandidate(route, candidate, preferredThemes, insertion, {
      providerVerified: (insertion.providerLegs ?? 0) > 0,
      restaurantPreferences,
      routeGoal,
    });
  });

  return {
    candidates: refined
      .sort((a, b) => b.score - a.score || a.detourMinutes - b.detourMinutes)
      .slice(0, candidates.length),
    providerLegs,
    failedLegs,
  };
}

function scoreCandidate(
  route: RoutePlan,
  candidate: SeedCandidate,
  preferredThemes: Theme[],
  insertionOverride?: CandidateInsertion,
  scoringOptions: {
    providerVerified?: boolean;
    restaurantPreferences?: RestaurantPreferences;
    routeGoal?: string;
  } = {},
): RouteCandidate {
  const insertion =
    insertionOverride ?? findBestInsertion(route.stops, candidate.place);
  const matchedThemes = candidate.themes.filter((theme) =>
    preferredThemes.includes(theme),
  );
  const typeAlreadyUsed = route.stops.some((stop) =>
    stop.themes.some((theme) => candidate.themes.includes(theme)),
  );
  const detourPenalty = Math.min(34, insertion.detourMinutes * 2.2);
  const themeScore = matchedThemes.length * 18;
  const diversityScore = typeAlreadyUsed ? 4 : 12;
  const providerQualityScore = getProviderQualityScore(candidate.place);
  const restaurantPreference = getRestaurantPreferenceMatch(
    candidate,
    scoringOptions.restaurantPreferences,
    route,
    insertion,
  );
  const routeGoalMatch = getRouteGoalMatch(candidate, scoringOptions.routeGoal);
  const baseScore =
    58 +
    themeScore +
    diversityScore +
    providerQualityScore +
    routeGoalMatch.score +
    restaurantPreference.score -
    detourPenalty;
  const score = clamp(Math.round(baseScore), 0, 100);
  const fitBand = getFitBand(score, insertion.detourMinutes);
  const reasons = buildReasons(
    candidate,
    matchedThemes,
    insertion.detourMinutes,
    scoringOptions.providerVerified,
    [...routeGoalMatch.reasons, ...restaurantPreference.reasons],
  );
  const risks = [
    ...buildRisks(candidate.place),
    ...restaurantPreference.risks,
  ];

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

async function refineProviderInsertion(
  stops: RouteStop[],
  candidate: PlaceCandidate,
  insertionIndex: number,
  calculateWalkingRoute: NonNullable<MapProvider["calculateWalkingRoute"]>,
): Promise<CandidateInsertion> {
  if (stops.length < 2) {
    return { index: 0, detourMinutes: 0, detourMeters: 0 };
  }

  const index = Math.min(Math.max(insertionIndex, 0), stops.length - 2);
  const stop = stops[index];
  const nextStop = stops[index + 1];
  const origin = routeStopAsPlaceCandidate(stop);
  const destination = routeStopAsPlaceCandidate(nextStop);
  const originalMinutes =
    nextStop.walkingFromPrevious?.minutes ??
    estimateWalkingLeg({ origin, destination }).durationMinutes;
  const originalMeters =
    nextStop.walkingFromPrevious?.distanceMeters ??
    estimateWalkingLeg({ origin, destination }).distanceMeters;
  const [originToCandidate, candidateToDestination] = await Promise.all([
    calculateProviderOrEstimatedLeg(origin, candidate, calculateWalkingRoute),
    calculateProviderOrEstimatedLeg(
      candidate,
      destination,
      calculateWalkingRoute,
    ),
  ]);

  return {
    index,
    detourMinutes: Math.max(
      0,
      originToCandidate.durationMinutes +
        candidateToDestination.durationMinutes -
        originalMinutes,
    ),
    detourMeters: Math.max(
      0,
      originToCandidate.distanceMeters +
        candidateToDestination.distanceMeters -
        originalMeters,
    ),
    providerLegs:
      originToCandidate.providerLegs + candidateToDestination.providerLegs,
    failedLegs:
      originToCandidate.failedLegs + candidateToDestination.failedLegs,
  };
}

async function calculateProviderOrEstimatedLeg(
  origin: PlaceCandidate,
  destination: PlaceCandidate,
  calculateWalkingRoute: NonNullable<MapProvider["calculateWalkingRoute"]>,
) {
  if (
    origin.coordinate?.system === "gcj02" &&
    destination.coordinate?.system === "gcj02"
  ) {
    try {
      const leg = await withTimeout(
        calculateWalkingRoute({ origin, destination }),
        3500,
      );
      return {
        durationMinutes: leg.durationMinutes,
        distanceMeters: leg.distanceMeters,
        providerLegs: 1,
        failedLegs: 0,
      };
    } catch {
      const estimated = estimateWalkingLeg({ origin, destination });
      return {
        durationMinutes: estimated.durationMinutes,
        distanceMeters: estimated.distanceMeters,
        providerLegs: 0,
        failedLegs: 1,
      };
    }
  }

  const estimated = estimateWalkingLeg({ origin, destination });
  return {
    durationMinutes: estimated.durationMinutes,
    distanceMeters: estimated.distanceMeters,
    providerLegs: 0,
    failedLegs: 0,
  };
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timeoutId = globalThis.setTimeout(() => {
      reject(new Error("provider_detour_timeout"));
    }, timeoutMs);

    promise
      .then(resolve)
      .catch(reject)
      .finally(() => globalThis.clearTimeout(timeoutId));
  });
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

function routeStopAsPlaceCandidate(stop: RouteStop): PlaceCandidate {
  return {
    id: stop.sourcePlaceId ?? stop.id,
    source: stop.source === "amap" ? "amap" : "manual",
    sourcePlaceId: stop.sourcePlaceId ?? stop.id,
    name: stop.name,
    address: stop.address,
    city: stop.area,
    district: stop.area,
    adcode: null,
    coordinate: stop.coordinate ?? null,
    poiType: null,
    verificationStatus: stop.verificationStatus ?? "source_pending",
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

  if (isExcludedRestaurantPoi(text)) {
    return null;
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

function getRestaurantPreferenceMatch(
  candidate: SeedCandidate,
  preferences?: RestaurantPreferences,
  route?: RoutePlan,
  insertion?: CandidateInsertion,
) {
  if (candidate.placeType !== "餐厅" || !preferences) {
    return {
      score: 0,
      reasons: [] as string[],
      risks: [] as string[],
    };
  }

  const cuisines = preferences.cuisines?.filter(Boolean) ?? [];
  const text = [
    candidate.place.name,
    candidate.place.address ?? "",
    candidate.place.poiType ?? "",
  ].join(" ");
  const matchedCuisine = cuisines.find((cuisine) =>
    matchesAny(text, getCuisineKeywords(cuisine)),
  );
  const budgetMatch = getBudgetMatch(
    candidate.place.providerCost,
    preferences.budget,
  );
  const expectedArrival = route && insertion
    ? getExpectedCandidateArrival(route, candidate.place, insertion)
    : null;
  const mealTiming = getMealTimingMatch(
    expectedArrival,
    preferences.mealRequirement,
  );
  const openingStatus = getOpeningHoursStatus(
    candidate.place.openingHours,
    expectedArrival ?? undefined,
    route?.dateLabel,
  );
  const restaurantRating = getRestaurantRatingMatch(
    candidate.place.providerRating,
  );
  const reasons: string[] = [];
  const risks: string[] = [];
  let score = 0;

  if (matchedCuisine) {
    score += 10;
    reasons.push(`符合${matchedCuisine}偏好`);
  } else if (cuisines.length > 0) {
    score -= 4;
  }

  if (budgetMatch.status === "matched") {
    score += 8;
    reasons.push(`人均约 ${budgetMatch.cost} 元，符合预算`);
  } else if (budgetMatch.status === "above") {
    score -= 5;
    reasons.push(`人均约 ${budgetMatch.cost} 元，可能超出预算`);
  } else if (budgetMatch.status === "below") {
    score += 2;
    reasons.push(`人均约 ${budgetMatch.cost} 元，低于预算上限`);
  }

  if (mealTiming.status === "target_meal_time") {
    score += 12;
    reasons.push(`${expectedArrival} 抵达接近${mealTiming.label}`);
  } else if (mealTiming.status === "meal_time") {
    score += 6;
    reasons.push(`${expectedArrival} 抵达接近${mealTiming.label}`);
  } else if (mealTiming.status === "off_meal_time") {
    score -= 3;
    reasons.push(`${expectedArrival} 抵达不在常规正餐时段`);
  }

  if (openingStatus.status === "open" && expectedArrival) {
    score += 8;
    reasons.push(`${expectedArrival} 预计营业`);
  } else if (openingStatus.status === "closed") {
    score -= 18;
    risks.push(openingStatus.reason || "预计用餐时段可能未营业");
  }

  if (restaurantRating.status === "strong") {
    score += 4;
    reasons.push(`餐厅评分 ${restaurantRating.rating}，优先级较高`);
  } else if (restaurantRating.status === "weak") {
    score -= 4;
    risks.push(`餐厅评分 ${restaurantRating.rating}，建议谨慎选择`);
  }

  return { score, reasons, risks };
}

function getRouteGoalMatch(candidate: SeedCandidate, routeGoal?: string) {
  const normalizedGoal = routeGoal?.trim();

  if (!normalizedGoal) {
    return { score: 0, reasons: [] as string[] };
  }

  const candidateText = [
    candidate.place.name,
    candidate.place.address ?? "",
    candidate.place.poiType ?? "",
    candidate.placeType,
    candidate.themes.join(" "),
  ].join(" ");
  const keywords = getRouteGoalKeywords(normalizedGoal);
  const matchedKeywords = keywords.filter((keyword) =>
    candidateText.includes(keyword),
  );
  let score = Math.min(14, matchedKeywords.length * 5);
  const reasons: string[] = [];

  if (
    candidate.placeType === "餐厅" &&
    matchesAny(normalizedGoal, ["晚餐", "午餐", "吃饭", "餐厅", "美食", "小吃"])
  ) {
    score += normalizedGoal.includes("晚餐") ? 20 : 12;
    reasons.push(
      normalizedGoal.includes("晚餐")
        ? "呼应晚餐安排目标"
        : "呼应用餐安排目标",
    );
  }

  if (matchedKeywords.length > 0) {
    reasons.push(`呼应路线目标：${matchedKeywords.slice(0, 3).join("、")}`);
  }

  return {
    score,
    reasons,
  };
}

function getRouteGoalKeywords(routeGoal: string) {
  const directKeywords = [
    "民国",
    "近代",
    "老城",
    "老街",
    "书店",
    "文学",
    "建筑",
    "历史",
    "音乐",
    "展览",
    "博物馆",
    "美术馆",
    "小吃",
    "淮扬",
    "南京菜",
    "本帮",
    "日料",
    "韩餐",
    "火锅",
    "烧烤",
    "晚餐",
    "午餐",
  ].filter((keyword) => routeGoal.includes(keyword));
  const looseKeywords = routeGoal
    .split(/[，。、“”\s,.;:：；/]+/)
    .map((keyword) => keyword.trim())
    .filter(
      (keyword) =>
        keyword.length >= 2 &&
        ![
          "附近",
          "路线",
          "目标",
          "补充",
          "安排",
          "希望",
          "想要",
          "适合",
          "一个",
          "一些",
          "这次",
        ].includes(keyword),
    );

  return [...new Set([...directKeywords, ...looseKeywords])];
}

function getCuisineKeywords(cuisine: string) {
  const keywords: Record<string, string[]> = {
    日料韩餐: [
      "日料",
      "日本",
      "寿司",
      "刺身",
      "拉面",
      "韩餐",
      "韩国",
      "韩式",
      "烤肉",
    ],
    东南亚菜: [
      "东南亚",
      "泰国",
      "泰式",
      "越南",
      "新加坡",
      "马来",
      "印尼",
      "咖喱",
    ],
    炒菜: [
      "炒菜",
      "中餐",
      "家常",
      "本帮",
      "江浙",
      "淮扬",
      "南京菜",
      "川菜",
      "湘菜",
      "粤菜",
      "菜馆",
      "饭店",
    ],
    西餐: [
      "西餐",
      "意大利",
      "披萨",
      "牛排",
      "汉堡",
      "法餐",
      "西式",
      "brunch",
    ],
    快餐: [
      "快餐",
      "简餐",
      "盖饭",
      "面馆",
      "粉面",
      "饺子",
      "馄饨",
      "肯德基",
      "麦当劳",
    ],
    火锅: ["火锅", "涮", "串串", "麻辣烫"],
    烧烤: ["烧烤", "烤串", "烤肉", "炭火"],
    地方小吃: [
      "小吃",
      "地方",
      "老字号",
      "鸭血粉丝",
      "锅贴",
      "馄饨",
      "汤包",
      "面馆",
      "南京菜",
      "淮扬",
    ],
  };

  return keywords[cuisine] ?? [cuisine];
}

function getBudgetMatch(costText?: string | null, budget?: string | null) {
  const cost = parseProviderCost(costText);
  const range = getBudgetRange(budget);

  if (cost === null || !range) {
    return { status: "unknown" as const, cost };
  }

  if (cost < range.min) {
    return { status: "below" as const, cost };
  }

  if (cost > range.max) {
    return { status: "above" as const, cost };
  }

  return { status: "matched" as const, cost };
}

function parseProviderCost(costText?: string | null) {
  if (!costText) {
    return null;
  }

  const match = costText.match(/\d+(?:\.\d+)?/);
  const cost = match ? Number(match[0]) : Number.NaN;

  return Number.isFinite(cost) ? cost : null;
}

function getBudgetRange(budget?: string | null) {
  switch (budget) {
    case "50元以内":
      return { min: 0, max: 50 };
    case "50-100元":
      return { min: 50, max: 100 };
    case "100-200元":
      return { min: 100, max: 200 };
    case "200元以上":
      return { min: 200, max: Number.POSITIVE_INFINITY };
    default:
      return null;
  }
}

function getExpectedCandidateArrival(
  route: RoutePlan,
  place: PlaceCandidate,
  insertion: CandidateInsertion,
) {
  const timeline = calculateTimeline(route.stops);
  const previousStop = timeline[insertion.index];

  if (!previousStop) {
    return null;
  }

  const previousArrival = parseTime(previousStop.calculatedTime);

  if (previousArrival === null) {
    return null;
  }

  const originToCandidate = estimateWalkingLeg({
    origin: routeStopAsPlaceCandidate(previousStop),
    destination: place,
  });

  return formatTime(
    previousArrival +
      previousStop.stayMinutes +
      originToCandidate.durationMinutes,
  );
}

function getMealTimingMatch(
  arrivalTime: string | null,
  mealRequirement?: RestaurantPreferences["mealRequirement"],
) {
  const minutes = parseTime(arrivalTime);

  if (minutes === null) {
    return { status: "unknown" as const, label: "" };
  }

  if (minutes >= 11 * 60 && minutes <= 14 * 60) {
    return {
      status:
        mealRequirement === "lunch"
          ? ("target_meal_time" as const)
          : ("meal_time" as const),
      label: "午餐时段",
    };
  }

  if (minutes >= 17 * 60 && minutes <= 20 * 60 + 30) {
    return {
      status:
        mealRequirement === "dinner"
          ? ("target_meal_time" as const)
          : ("meal_time" as const),
      label: "晚餐时段",
    };
  }

  if (minutes >= 10 * 60 && minutes <= 21 * 60) {
    return { status: "off_meal_time" as const, label: "" };
  }

  return { status: "unknown" as const, label: "" };
}

function getRestaurantRatingMatch(ratingText?: string | null) {
  const rating = Number(ratingText);

  if (!Number.isFinite(rating)) {
    return { status: "unknown" as const, rating: null };
  }

  if (rating >= 4.5) {
    return { status: "strong" as const, rating };
  }

  if (rating < 3.8) {
    return { status: "weak" as const, rating };
  }

  return { status: "neutral" as const, rating };
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

function isExcludedRestaurantPoi(text: string) {
  return matchesAny(text, [
    "奶茶",
    "茶饮",
    "饮品",
    "饮料",
    "冷饮",
    "果汁",
    "咖啡",
    "咖啡厅",
    "咖啡馆",
    "面包",
    "面包房",
    "烘焙",
    "糕点",
    "糕饼",
    "蛋糕",
    "西点",
    "甜品",
    "甜点",
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
  providerVerified = false,
  extraReasons: string[] = [],
) {
  const reasons = [
    providerVerified
      ? detourMinutes <= 8
        ? "高德步行复核显示绕行时间很低"
        : `高德步行复核预计新增约 ${detourMinutes} 分钟`
      : detourMinutes <= 8
        ? "绕行时间很低"
        : `预计新增约 ${detourMinutes} 分钟步行`,
  ];

  if (matchedThemes.length > 0) {
    reasons.push(`匹配${matchedThemes.join("、")}偏好`);
  }

  extraReasons.forEach((reason) => reasons.push(reason));

  if (candidate.place.providerRating) {
    reasons.push(`高德评分 ${candidate.place.providerRating}`);
  }

  reasons.push(`${candidate.placeType}类型补足路线层次`);

  return reasons;
}

function getProviderQualityScore(place: PlaceCandidate) {
  const rating = Number(place.providerRating);

  if (!Number.isFinite(rating)) {
    return 0;
  }

  if (rating >= 4.6) {
    return 8;
  }

  if (rating >= 4.2) {
    return 5;
  }

  if (rating >= 3.8) {
    return 2;
  }

  return -4;
}

function buildRisks(place: PlaceCandidate) {
  const risks: string[] = [];

  if (place.verificationStatus === "source_pending") {
    risks.push("地点信息待高德复核");
  }

  if (place.source === "amap" && !place.openingHours) {
    risks.push("开放时间待现场核验");
  }

  return risks;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}
