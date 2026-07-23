"use client";

import Link from "next/link";
import {
  RouteMap,
  type RouteMapPreviewCandidate,
} from "@/components/routes/route-map";
import {
  ArrowRight,
  Bookmark,
  ChevronDown,
  ChevronUp,
  Check,
  Clock3,
  EyeOff,
  MapPinned,
  Pencil,
  Plus,
  Search,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { type KeyboardEvent, useMemo, useState } from "react";
import {
  defaultDraft,
  demoRoute,
  getThemeSummary,
  type RouteDraft,
  type RoutePlan,
  type Theme,
} from "@/lib/route";
import {
  candidatePlaceTypes,
  generateRouteCandidates,
  generateRouteCandidatesFromPlaces,
  getCandidateBandLabel,
  refineCandidatesWithProviderDetours,
  type CandidateFitBand,
  type CandidatePlaceType,
  type RestaurantPreferences,
  type RouteCandidate,
} from "@/lib/route-candidates";
import {
  parseIntentWithFallback,
  rankCandidatesWithFallback,
  type AiUsageRecord,
} from "@/lib/ai/route-collaboration";
import {
  isDeepSeekProxyConfigured,
  generateRouteTitleWithDeepSeek,
  parseIntentWithDeepSeek,
  rankCandidatesWithDeepSeek,
} from "@/lib/ai/deepseek";
import { logAiUsageRun, makeAiRunIdempotencyKey } from "@/lib/ai/usage-log";
import {
  calculateRouteKernel,
  calculateTimeline,
  formatTime,
  parseTime,
} from "@/lib/route-kernel";
import {
  createAmapWebServiceProvider,
  isAmapWebProxyConfigured,
} from "@/lib/maps/amap-web";
import type { Coordinate, MapProvider, PlaceCandidate } from "@/lib/maps/types";
import { getOpeningHoursWarning } from "@/lib/opening-hours";
import {
  collectAmapPlacesAround,
  getAmapCandidateTypes,
  getAmapFailureDetail,
} from "@/lib/maps/route-candidate-search";
import { collectRouteSearchCenters } from "@/lib/maps/route-search-centers";
import {
  appendPlaceCandidateToRoute,
  inferStayMinutesForPlace,
  insertCandidateIntoRoute,
  moveRouteStop,
  removeRouteStop,
  type RouteStopPlacement,
  updateRouteStartTime,
  updateRouteLegMinutes,
  updateRouteLegTravelMode,
  updateStopStayMinutes,
} from "@/lib/route-editing";
import {
  readCandidateState,
  readDraft,
  readPlanningImportSource,
  readRoutePlan,
  clearPlanningImportSource,
  saveCandidateState,
  saveDraft,
  saveRoutePlan,
  type PlanningImportSource,
  type StoredCandidateAction,
} from "@/lib/storage";
import { routeUrl } from "@/lib/urls";
import {
  getRouteTravelModeLabel,
  routeTravelModeLabels,
  routeTravelModes,
} from "@/lib/transport";

const allThemes: Theme[] = ["历史", "文学", "建筑", "音乐", "书店", "美食"];
type CandidateAction = "joined" | "backup" | "ignored";
type PlaceSearchState = "idle" | "loading" | "ready" | "error";
type MealParty = "一人食" | "多人食";
type MealBudget = "50元以内" | "50-100元" | "100-200元" | "200元以上";
type PlannedPlaceEntry = {
  id: string;
  name: string;
  role: RouteStopPlacement;
  routeStopId: string | null;
};
const candidateBands: CandidateFitBand[] = [
  "very_along",
  "recommended",
  "optional",
];
const placeRoleOptions: Array<{ value: RouteStopPlacement; label: string }> = [
  { value: "start", label: "出发" },
  { value: "middle", label: "必去" },
  { value: "end", label: "终点" },
];
const mealCuisineOptions = [
  "日料韩餐",
  "东南亚菜",
  "炒菜",
  "西餐",
  "快餐",
  "火锅",
  "烧烤",
  "地方小吃",
];

function normalizeCityName(city: string) {
  return city.trim().replace(/市$/, "");
}

function isSameDraftCity(route: RoutePlan, draft: RouteDraft) {
  const routeCity = normalizeCityName(route.city);
  const draftCity = normalizeCityName(draft.city);

  return (
    routeCity.length > 0 && draftCity.length > 0 && routeCity === draftCity
  );
}

function cityDraftId(city: string) {
  const slug =
    normalizeCityName(city)
      .toLowerCase()
      .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 24) || "unspecified";

  return `local-${slug}-draft`;
}

function createBlankRouteFromDraft(draft: RouteDraft): RoutePlan {
  const city = draft.city.trim();
  const title = generateRouteTitle(draft, []);

  return {
    ...defaultDraft,
    ...draft,
    id: cityDraftId(city),
    city,
    title,
    mustVisits: [],
    distanceKm: 0,
    stops: [],
    updatedAt: new Date().toISOString(),
  };
}

export function PlanningDesk() {
  const [draft, setDraft] = useState<RouteDraft>(() =>
    typeof window === "undefined" ? defaultDraft : readDraft(),
  );
  const [saved, setSaved] = useState(false);
  const [requestText, setRequestText] = useState("");
  const [placeRole, setPlaceRole] = useState<RouteStopPlacement>("middle");
  const [mustVisitInput, setMustVisitInput] = useState("");
  const [plannedPlaces, setPlannedPlaces] = useState<PlannedPlaceEntry[]>(() =>
    draft.mustVisits.map((name, index) => ({
      id: `stored-${index}-${name}`,
      name,
      role: "middle",
      routeStopId: null,
    })),
  );
  const [mustVisitSearchState, setMustVisitSearchState] =
    useState<PlaceSearchState>("idle");
  const [mustVisitSearchMessage, setMustVisitSearchMessage] = useState("");
  const [mustVisitSuggestions, setMustVisitSuggestions] = useState<
    PlaceCandidate[]
  >([]);
  const [candidates, setCandidates] = useState<RouteCandidate[]>(() =>
    typeof window === "undefined"
      ? []
      : (() => {
          const storedRoute = readRoutePlan();
          return isSameDraftCity(storedRoute, draft)
            ? readCandidateState(storedRoute.id).candidates
            : [];
        })(),
  );
  const [candidateActions, setCandidateActions] = useState<
    Record<string, CandidateAction>
  >(() => {
    if (typeof window === "undefined") {
      return {};
    }

    const storedRoute = readRoutePlan();
    return isSameDraftCity(storedRoute, draft)
      ? (readCandidateState(storedRoute.id).actions as Record<
          string,
          CandidateAction
        >)
      : {};
  });
  const [aiWarnings, setAiWarnings] = useState<string[]>([]);
  const [aiUsage, setAiUsage] = useState<AiUsageRecord | null>(null);
  const [isGeneratingCandidates, setIsGeneratingCandidates] = useState(false);
  const [previewRoute, setPreviewRoute] = useState(() =>
    typeof window === "undefined"
      ? demoRoute
      : (() => {
          const storedRoute = readRoutePlan();
          return isSameDraftCity(storedRoute, draft)
            ? storedRoute
            : createBlankRouteFromDraft(draft);
        })(),
  );
  const [selectedCandidateTypes, setSelectedCandidateTypes] =
    useState<CandidatePlaceType[]>(candidatePlaceTypes);
  const [includeMeals, setIncludeMeals] = useState(false);
  const [mealParty, setMealParty] = useState<MealParty>("多人食");
  const [mealBudget, setMealBudget] = useState<MealBudget>("50-100元");
  const [mealCuisines, setMealCuisines] = useState<string[]>([
    "炒菜",
    "地方小吃",
  ]);
  const [expandedCandidateIds, setExpandedCandidateIds] = useState<
    Record<string, boolean>
  >({});
  const [previewCandidateId, setPreviewCandidateId] = useState<string | null>(
    null,
  );
  const [planningImportSource, setPlanningImportSource] =
    useState<PlanningImportSource | null>(() =>
      typeof window === "undefined" ? null : readPlanningImportSource(),
    );

  const summary = useMemo(() => getThemeSummary(draft.themes), [draft.themes]);
  const activeCandidates = candidates;
  const baseKernel = useMemo(() => calculateRouteKernel(demoRoute), []);
  const previewKernel = useMemo(
    () => calculateRouteKernel(previewRoute),
    [previewRoute],
  );
  const routeImpactMinutes =
    previewKernel.totalMinutes - baseKernel.totalMinutes;
  const routeImpactMeters =
    previewKernel.totalWalkingMeters - baseKernel.totalWalkingMeters;
  const previewEndTime = getRouteEndTime(previewKernel.stops);
  const effectiveCandidateTypes = useMemo(() => {
    if (!includeMeals || selectedCandidateTypes.includes("餐厅")) {
      return selectedCandidateTypes;
    }

    return [...selectedCandidateTypes, "餐厅" as CandidatePlaceType];
  }, [includeMeals, selectedCandidateTypes]);
  const visibleCandidates = activeCandidates.filter(
    (candidate) =>
      candidateActions[candidate.id] !== "ignored" &&
      effectiveCandidateTypes.includes(candidate.placeType),
  );
  const pendingCandidates = visibleCandidates.filter(
    (candidate) => !candidateActions[candidate.id],
  );
  const processedCandidates = visibleCandidates.filter(
    (candidate) => candidateActions[candidate.id],
  );
  const ignoredCandidates = activeCandidates.filter(
    (candidate) => candidateActions[candidate.id] === "ignored",
  );
  const groupedCandidates = candidateBands.map((band) => ({
    band,
    candidates: pendingCandidates.filter(
      (candidate) => candidate.fitBand === band,
    ),
  }));
  const mapPreviewCandidate = useMemo<RouteMapPreviewCandidate | null>(() => {
    const candidate =
      pendingCandidates.find((item) => item.id === previewCandidateId) ??
      pendingCandidates.find((item) => expandedCandidateIds[item.id]);

    if (!candidate) {
      return null;
    }

    return {
      id: candidate.id,
      name: candidate.place.name,
      insertionIndex: candidate.insertionIndex,
      coordinate: candidate.place.coordinate,
      placeType: candidate.placeType,
      score: candidate.score,
    };
  }, [expandedCandidateIds, pendingCandidates, previewCandidateId]);

  function toggleTheme(theme: Theme) {
    setSaved(false);
    setDraft((current) => {
      const themes = current.themes.includes(theme)
        ? current.themes.filter((item) => item !== theme)
        : [...current.themes, theme];

      return {
        ...current,
        themes,
      };
    });
  }

  function updateCity(city: string) {
    setSaved(false);
    const nextDraft = {
      ...draft,
      city,
      mustVisits:
        normalizeCityName(city) === normalizeCityName(draft.city)
          ? draft.mustVisits
          : [],
    };

    setDraft(nextDraft);

    if (normalizeCityName(city) === normalizeCityName(draft.city)) {
      const nextRoute = {
        ...previewRoute,
        city: city.trim(),
        title: generateRouteTitle({ ...draft, city }, previewRoute.stops),
        updatedAt: new Date().toISOString(),
      };

      setPreviewRoute(persistPreviewRoute(nextRoute));
      return;
    }

    const nextRoute = createBlankRouteFromDraft(nextDraft);

    setPreviewRoute(persistPreviewRoute(nextRoute));
    setPlannedPlaces([]);
    setCandidates([]);
    setCandidateActions({});
    setExpandedCandidateIds({});
    setMustVisitSuggestions([]);
    setMustVisitSearchState("idle");
    setMustVisitSearchMessage("");
    saveCandidateState({
      routeId: nextRoute.id,
      candidates: [],
      actions: {},
      updatedAt: new Date().toISOString(),
    });
  }

  function addMustVisit(
    placeName = mustVisitInput,
    placeCandidate?: PlaceCandidate,
  ) {
    const place = placeName.trim();

    if (!place || !placeCandidate) {
      setMustVisitSearchState("error");
      setMustVisitSearchMessage("请先从高德搜索结果中选择真实地点。");
      return;
    }

    setSaved(false);
    const currentRoute = previewRoute;
    const routeThemes =
      draft.themes.length > 0 ? draft.themes : (["历史"] as Theme[]);
    const nextRoute = withGeneratedRouteTitle(
      appendPlaceCandidateToRoute(currentRoute, {
          place: placeCandidate,
          stayMinutes: inferStayMinutesForPlace(placeCandidate, placeRole),
          themes: routeThemes.slice(0, 2),
          placement: placeRole,
          note: placeRoleNote(placeRole),
        }),
      draft,
    );
    const routeStopId = findAddedStopId(currentRoute, nextRoute);
    const nextPlannedPlaces = [
      ...plannedPlaces,
      {
        id: plannedPlaceId(place, plannedPlaces.length),
        name: place,
        role: placeRole,
        routeStopId,
      },
    ];

    setPreviewRoute(persistPreviewRoute(nextRoute));
    setPlannedPlaces(nextPlannedPlaces);
    syncDraftMustVisits(nextPlannedPlaces);
    setMustVisitInput("");
    setMustVisitSuggestions([]);
    setMustVisitSearchState("idle");
    setMustVisitSearchMessage("");
  }

  function removeMustVisit(entryId: string) {
    const entry = plannedPlaces.find((item) => item.id === entryId);
    const nextPlannedPlaces = plannedPlaces.filter(
      (item) => item.id !== entryId,
    );

    setSaved(false);
    setPlannedPlaces(nextPlannedPlaces);
    syncDraftMustVisits(nextPlannedPlaces);

    if (entry?.routeStopId) {
      setPreviewRoute((current) =>
        persistPreviewRoute(
          withGeneratedRouteTitle(
            removeRouteStop(current, entry.routeStopId ?? ""),
          ),
        ),
      );
    }
  }

  function handleMustVisitKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key !== "Enter") {
      return;
    }

    event.preventDefault();
    void searchMustVisitPlaces();
  }

  async function searchMustVisitPlaces() {
    const keyword = mustVisitInput.trim();

    if (keyword.length < 2) {
      setMustVisitSearchState("error");
      setMustVisitSearchMessage("请输入至少两个字再搜索。");
      return;
    }

    const provider = createAmapWebServiceProvider();

    if (!provider) {
      setMustVisitSearchState("error");
      setMustVisitSearchMessage("Supabase 尚未配置，暂时不能搜索高德地点。");
      return;
    }

    setMustVisitSearchState("loading");
    setMustVisitSearchMessage("正在搜索高德地点...");

    try {
      const places = await provider.suggestPlaces({
        keyword,
        city: draft.city,
      });

      setMustVisitSuggestions(places);
      setMustVisitSearchState("ready");
      setMustVisitSearchMessage(
        places.length > 0
          ? `找到 ${places.length} 个地点。`
          : "没有找到匹配地点。",
      );
    } catch {
      setMustVisitSuggestions([]);
      setMustVisitSearchState("error");
      setMustVisitSearchMessage("高德地点搜索失败，请稍后重试或换个关键词。");
    }
  }

  function updateStartTime(startTime: string) {
    setSaved(false);
    setDraft((current) => ({
      ...current,
      startTime,
    }));
    setPreviewRoute((current) =>
      persistPreviewRoute(updateRouteStartTime(current, startTime)),
    );
  }

  function syncDraftMustVisits(entries: PlannedPlaceEntry[]) {
    setDraft((current) => ({
      ...current,
      mustVisits: entries.map((entry) => entry.name),
    }));
  }

  function findAddedStopId(
    previousRoute: typeof previewRoute,
    nextRoute: typeof previewRoute,
  ) {
    const previousIds = new Set(previousRoute.stops.map((stop) => stop.id));
    return (
      nextRoute.stops.find((stop) => !previousIds.has(stop.id))?.id ?? null
    );
  }

  function plannedPlaceId(name: string, index: number) {
    if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
      return `place-${crypto.randomUUID()}`;
    }

    return `place-${index}-${name}`;
  }

  function placeRoleLabel(role: RouteStopPlacement) {
    return (
      placeRoleOptions.find((option) => option.value === role)?.label ?? "必去"
    );
  }

  function placeRoleNote(role: RouteStopPlacement) {
    switch (role) {
      case "start":
        return "用户指定为出发点。";
      case "end":
        return "用户指定为终点。";
      case "middle":
        return "用户指定为必去点。";
    }
  }

  function persistDraft() {
    saveDraft(draft);
    saveRoutePlan(previewRoute);
    saveCandidateState({
      routeId: previewRoute.id,
      candidates: activeCandidates,
      actions: candidateActions as Record<string, StoredCandidateAction>,
      updatedAt: new Date().toISOString(),
    });
    setSaved(true);
  }

  async function generateSuggestions() {
    setIsGeneratingCandidates(true);

    try {
      const intent = await getPlanningIntent();
      const candidateResult = await getRouteAwareCandidates(previewRoute, {
        themes: intent.data.themeFilters,
        acceptedTypes: effectiveCandidateTypes,
        maxResults: includeMeals ? 6 : 5,
        restaurantPreferences: includeMeals
          ? {
              cuisines: mealCuisines,
              budget: mealBudget,
              mealRequirement: normalizeMealRequirement(
                intent.data.mealRequirement,
                requestText,
              ),
            }
          : undefined,
        routeGoal: requestText,
        mealRequirement: normalizeMealRequirement(
          intent.data.mealRequirement,
          requestText,
        ),
      });
      const ranked = await rankCandidateSuggestions(
        candidateResult.candidates,
        intent.data,
      );
      void recordAiRuns(intent, ranked, candidateResult.candidates);

      setCandidates(ranked.data);
      setCandidateActions({});
      setExpandedCandidateIds({});
      persistCandidateActions({}, ranked.data);
      setAiWarnings([
        ...intent.warnings,
        ...candidateResult.warnings,
        ...ranked.warnings,
      ]);
      setAiUsage(ranked.usage);
      void updateRouteTitleWithAi(previewRoute);
    } finally {
      setIsGeneratingCandidates(false);
    }
  }

  async function updateRouteTitleWithAi(route: RoutePlan) {
    if (!isDeepSeekProxyConfigured()) {
      return;
    }

    try {
      const result = await generateRouteTitleWithDeepSeek(route, requestText);
      const title = sanitizeRouteTitle(result.data.title);

      if (!title) {
        return;
      }

      setPreviewRoute((current) => {
        if (!isSameRouteShape(current, route)) {
          return current;
        }

        return persistPreviewRoute({
          ...current,
          title,
        });
      });
      setAiWarnings((current) => [...current, ...result.warnings]);
      void logAiUsageRun({
        routeId: route.id,
        action: "route_summary",
        usage: result.usage,
        inputPayload: {
          routeId: route.id,
          title: route.title,
          requestText,
          stopNames: route.stops.map((stop) => stop.name),
        },
        outputPayload: {
          title,
          warnings: result.warnings,
        },
        idempotencyKey: makeAiRunIdempotencyKey(
          "route_summary",
          route.id,
          `${route.title}:${route.stops.map((stop) => stop.id).join(",")}:${requestText}`,
        ),
      });
    } catch {
      // 标题生成是增强能力，失败时保留本地确定性标题。
    }
  }

  async function getRouteAwareCandidates(
    route: RoutePlan,
    options: {
      themes: Theme[];
      acceptedTypes: CandidatePlaceType[];
      maxResults: number;
      restaurantPreferences?: RestaurantPreferences;
      routeGoal?: string;
      mealRequirement?: RestaurantPreferences["mealRequirement"];
    },
  ) {
    const fallbackCandidates = () =>
      generateRouteCandidates(route, {
        themes: options.themes,
        acceptedTypes: options.acceptedTypes,
        maxResults: options.maxResults,
        restaurantPreferences: options.restaurantPreferences,
        routeGoal: options.routeGoal,
      });
    const fallbackResult = (
      message: string,
      existingWarnings: string[] = [],
    ) => {
      const fallback = fallbackCandidates();
      const fallbackMessage =
        fallback.length > 0
          ? `${message}，已使用本地候选。`
          : `${message}，当前城市暂无本地候选。请先搜索并添加带坐标的必去点，或放宽候选类型筛选。`;

      return {
        candidates: fallback,
        warnings: [...existingWarnings, fallbackMessage],
      };
    };

    if (!isAmapWebProxyConfigured()) {
      return { candidates: fallbackCandidates(), warnings: [] };
    }

    const provider = createAmapWebServiceProvider();

    if (!provider?.searchPlacesAround) {
      return { candidates: fallbackCandidates(), warnings: [] };
    }

    const centers = collectRouteSearchCenters(route);

    if (centers.length === 0) {
      return fallbackResult("当前路线缺少可用于高德沿线搜索的坐标");
    }

    try {
      const types = getAmapCandidateTypes(options.acceptedTypes);
      const searchPlacesAround = provider.searchPlacesAround;
      const { places, failedCount, firstError } = await collectAmapPlacesAround(
        {
          centers,
          city: route.city,
          types,
          radiusMeters: 1200,
          limit: 12,
          searchPlacesAround,
        },
      );
      const warnings =
        failedCount > 0 && failedCount < centers.length
          ? [
              `高德沿途候选部分采样点搜索失败（${failedCount}/${centers.length}），已使用成功返回的地点继续筛选。`,
            ]
          : [];
      const mealSearchResult = await collectMealPlacesAroundRoute(route, {
        ...options,
        searchPlacesAround,
      });
      const allPlaces = dedupePlaces([...places, ...mealSearchResult.places]);
      const providerWarnings = [...warnings, ...mealSearchResult.warnings];

      const providerCandidates = ensureMealCandidates(
        generateRouteCandidatesFromPlaces(
          route,
          allPlaces,
          {
            themes: options.themes,
            acceptedTypes: options.acceptedTypes,
            maxResults: options.maxResults,
            restaurantPreferences: options.restaurantPreferences,
            routeGoal: options.routeGoal,
          },
        ),
        route,
        allPlaces,
        options,
      );

      if (providerCandidates.length > 0) {
        if (provider.calculateWalkingRoute) {
          const detourResult = await refineCandidatesWithProviderDetours(
            route,
            providerCandidates,
            provider.calculateWalkingRoute,
            options.themes,
            options.restaurantPreferences,
            options.routeGoal,
          );
          const detourWarnings =
            detourResult.providerLegs > 0
              ? [
                  `已用高德步行复核 ${detourResult.providerLegs} 段候选绕行。`,
                  ...(detourResult.failedLegs > 0
                    ? [
                        `${detourResult.failedLegs} 段候选绕行复核失败，已保留本地估算。`,
                      ]
                    : []),
                ]
              : detourResult.failedLegs > 0
                ? ["候选绕行复核失败，已保留本地估算。"]
                : [];

          return {
            candidates: detourResult.candidates,
            warnings: [...providerWarnings, ...detourWarnings],
          };
        }

        return { candidates: providerCandidates, warnings: providerWarnings };
      }

      if (failedCount === centers.length) {
        const failureDetail = getAmapFailureDetail(firstError);

        return fallbackResult(
          failureDetail
            ? `高德沿途候选搜索失败（${failureDetail}）`
            : "高德沿途候选搜索失败",
        );
      }

      if (allPlaces.length > 0) {
        return fallbackResult(
          "高德已返回地点，但当前筛选类型/路线约束下没有合适候选",
          providerWarnings,
        );
      }

      return fallbackResult("高德没有返回沿途地点", providerWarnings);
    } catch (error) {
      const failureDetail = getAmapFailureDetail(error);

      return fallbackResult(
        failureDetail
          ? `高德沿途候选搜索失败（${failureDetail}）`
          : "高德沿途候选搜索失败",
      );
    }
  }

  async function getPlanningIntent() {
    const intentText = buildIntentText();

    if (!isDeepSeekProxyConfigured()) {
      return parseIntentWithFallback(intentText, draft);
    }

    try {
      return await parseIntentWithDeepSeek(intentText, draft);
    } catch {
      const fallback = parseIntentWithFallback(intentText, draft);

      return {
        ...fallback,
        warnings: [
          "DeepSeek 调用失败，已切回本地规则解析。",
          ...fallback.warnings,
        ],
      };
    }
  }

  async function rankCandidateSuggestions(
    localCandidates: RouteCandidate[],
    intent: ReturnType<typeof parseIntentWithFallback>["data"],
  ) {
    if (!isDeepSeekProxyConfigured()) {
      return rankCandidatesWithFallback(localCandidates, intent, requestText);
    }

    try {
      return await rankCandidatesWithDeepSeek(
        localCandidates,
        intent,
        requestText,
      );
    } catch {
      const fallback = rankCandidatesWithFallback(
        localCandidates,
        intent,
        requestText,
      );

      return {
        ...fallback,
        warnings: [
          "DeepSeek 候选排序失败，已使用本地模板理由。",
          ...fallback.warnings,
        ],
      };
    }
  }

  async function recordAiRuns(
    intent: Awaited<ReturnType<typeof getPlanningIntent>>,
    ranked: Awaited<ReturnType<typeof rankCandidateSuggestions>>,
    inputCandidates: RouteCandidate[],
  ) {
    const routeId = previewRoute.id;
    const inputSummary = JSON.stringify({
      requestText: buildIntentText(),
      draft,
      routeId,
    });

    await Promise.allSettled([
      logAiUsageRun({
        routeId,
        action: "parse_intent",
        usage: intent.usage,
        inputPayload: {
          requestText,
          mealPreferences: includeMeals
            ? { mealParty, mealBudget, mealCuisines }
            : null,
          draft,
        },
        outputPayload: intent.data,
        idempotencyKey: makeAiRunIdempotencyKey(
          "parse_intent",
          routeId,
          inputSummary,
        ),
      }),
      logAiUsageRun({
        routeId,
        action: "rank_candidates",
        usage: ranked.usage,
        inputPayload: {
          intent: intent.data,
          candidateIds: inputCandidates.map((candidate) => candidate.id),
        },
        outputPayload: {
          rankedCandidateIds: ranked.data.map((candidate) => candidate.id),
        },
        idempotencyKey: makeAiRunIdempotencyKey(
          "rank_candidates",
          routeId,
          `${inputSummary}:${inputCandidates.map((candidate) => candidate.id).join(",")}`,
        ),
      }),
    ]);
  }

  function markCandidate(candidateId: string, action: CandidateAction) {
    const nextActions = {
      ...candidateActions,
      [candidateId]: action,
    };

    setCandidateActions(nextActions);
    persistCandidateActions(nextActions, activeCandidates);
  }

  function clearCandidateAction(candidateId: string) {
    setCandidateActions((current) => {
      const next = { ...current };
      delete next[candidateId];
      persistCandidateActions(next);
      return next;
    });
  }

  function toggleCandidateInRoute(candidate: RouteCandidate) {
    setSaved(false);

    if (candidateActions[candidate.id] === "joined") {
      setPreviewRoute((current) =>
        persistPreviewRoute(
          withGeneratedRouteTitle(removeRouteStop(current, candidate.id)),
        ),
      );
      clearCandidateAction(candidate.id);
      return;
    }

    setPreviewRoute((current) =>
      persistPreviewRoute(
        withGeneratedRouteTitle(insertCandidateIntoRoute(current, candidate)),
      ),
    );
    markCandidate(candidate.id, "joined");
  }

  function removePreviewStop(stopId: string) {
    setSaved(false);
    setPreviewRoute((current) =>
      persistPreviewRoute(withGeneratedRouteTitle(removeRouteStop(current, stopId))),
    );
    clearCandidateAction(stopId);
  }

  function movePreviewStop(fromIndex: number, toIndex: number) {
    setSaved(false);
    setPreviewRoute((current) =>
      persistPreviewRoute(moveRouteStop(current, fromIndex, toIndex)),
    );
  }

  function changeStayMinutes(stopId: string, stayMinutes: number) {
    setSaved(false);
    setPreviewRoute((current) =>
      persistPreviewRoute(updateStopStayMinutes(current, stopId, stayMinutes)),
    );
  }

  function changeLegTravelMode(
    stopId: string,
    mode: (typeof routeTravelModes)[number],
  ) {
    setSaved(false);
    setPreviewRoute((current) =>
      persistPreviewRoute(updateRouteLegTravelMode(current, stopId, mode)),
    );
  }

  function changeLegMinutes(stopId: string, minutes: number) {
    setSaved(false);
    setPreviewRoute((current) =>
      persistPreviewRoute(updateRouteLegMinutes(current, stopId, minutes)),
    );
  }

  function toggleCandidateType(type: CandidatePlaceType) {
    setSelectedCandidateTypes((current) => {
      if (current.length === 1 && current.includes(type)) {
        return candidatePlaceTypes;
      }

      return current.includes(type)
        ? current.filter((item) => item !== type)
        : [...current, type];
    });
  }

  function toggleMealCuisine(cuisine: string) {
    setMealCuisines((current) =>
      current.includes(cuisine)
        ? current.filter((item) => item !== cuisine)
        : [...current, cuisine],
    );
  }

  function buildIntentText() {
    const mealText = includeMeals
      ? `需要安排餐厅：${mealParty}，人均${mealBudget}，偏好${mealCuisines.join("、") || "不限"}，请优先考虑午餐/晚餐时间、顺路程度和餐厅评分。`
      : "不需要强制安排餐厅。";

    return [requestText.trim(), mealText].filter(Boolean).join("\n");
  }

  function normalizeMealRequirement(
    value: string | null,
    routeGoal: string,
  ): RestaurantPreferences["mealRequirement"] {
    if (value === "lunch" || value === "dinner") {
      return value;
    }

    if (matchesAny(routeGoal, ["晚餐", "晚饭", "傍晚", "晚上吃", "收官餐"])) {
      return "dinner";
    }

    if (matchesAny(routeGoal, ["午餐", "午饭", "中午吃"])) {
      return "lunch";
    }

    return null;
  }

  async function collectMealPlacesAroundRoute(
    route: RoutePlan,
    options: {
      restaurantPreferences?: RestaurantPreferences;
      mealRequirement?: RestaurantPreferences["mealRequirement"];
      searchPlacesAround: NonNullable<MapProvider["searchPlacesAround"]>;
    },
  ) {
    if (!includeMeals) {
      return {
        places: [] as PlaceCandidate[],
        warnings: [] as string[],
        searched: false,
        label: "正餐时段",
      };
    }

    const centers = collectMealSearchCenters(
      route,
      options.mealRequirement ?? options.restaurantPreferences?.mealRequirement,
    );

    if (centers.length === 0) {
      return {
        places: [] as PlaceCandidate[],
        warnings: ["含餐已开启，但路线缺少可用于餐厅专项搜索的坐标。"],
        searched: false,
        label: "正餐时段",
      };
    }

    const label =
      (options.mealRequirement ?? options.restaurantPreferences?.mealRequirement) ===
      "dinner"
        ? "晚餐时段附近"
        : (options.mealRequirement ??
              options.restaurantPreferences?.mealRequirement) === "lunch"
          ? "午餐时段附近"
          : "正餐时段附近";
    const result = await collectAmapPlacesAround({
      centers,
      city: route.city,
      types: getAmapCandidateTypes(["餐厅"]),
      radiusMeters: 1800,
      limit: 15,
      searchPlacesAround: options.searchPlacesAround,
    });
    const warnings =
      result.failedCount > 0
        ? [
            `高德餐厅专项搜索部分采样点失败（${result.failedCount}/${centers.length}），已使用成功返回的餐厅继续筛选。`,
          ]
        : [];

    return {
      places: result.places,
      warnings: result.places.length > 0 ? [`已围绕${label}补充餐厅专项搜索。`, ...warnings] : warnings,
      searched: true,
      label,
    };
  }

  function collectMealSearchCenters(
    route: RoutePlan,
    mealRequirement?: RestaurantPreferences["mealRequirement"],
  ): Coordinate[] {
    const timeline = calculateTimeline(route.stops);
    const targetMinutes =
      mealRequirement === "lunch"
        ? 12 * 60
        : mealRequirement === "dinner"
          ? 18 * 60 + 30
          : 18 * 60;
    const coordinatedStops = timeline.filter(
      (stop) =>
        stop.coordinate?.system === "gcj02" &&
        Number.isFinite(stop.coordinate.lng) &&
        Number.isFinite(stop.coordinate.lat),
    );

    return coordinatedStops
      .sort((a, b) => {
        const aMinutes = parseTime(a.calculatedTime) ?? targetMinutes;
        const bMinutes = parseTime(b.calculatedTime) ?? targetMinutes;
        const aDistance = Math.abs(aMinutes - targetMinutes);
        const bDistance = Math.abs(bMinutes - targetMinutes);

        if (aDistance !== bDistance) {
          return aDistance - bDistance;
        }

        return mealRequirement === "dinner"
          ? route.stops.findIndex((stop) => stop.id === b.id) -
              route.stops.findIndex((stop) => stop.id === a.id)
          : 0;
      })
      .map((stop) => stop.coordinate)
      .filter((coordinate): coordinate is Coordinate => Boolean(coordinate))
      .slice(0, 3);
  }

  function ensureMealCandidates(
    currentCandidates: RouteCandidate[],
    route: RoutePlan,
    places: PlaceCandidate[],
    options: {
      themes: Theme[];
      acceptedTypes: CandidatePlaceType[];
      maxResults: number;
      restaurantPreferences?: RestaurantPreferences;
      routeGoal?: string;
    },
  ) {
    if (!includeMeals) {
      return currentCandidates;
    }

    const restaurants = generateRouteCandidatesFromPlaces(route, places, {
      themes: [...new Set([...options.themes, "美食" as Theme])],
      acceptedTypes: ["餐厅"],
      maxResults: 5,
      restaurantPreferences: options.restaurantPreferences,
      routeGoal: options.routeGoal,
    });
    const merged = [...currentCandidates, ...restaurants];
    const seen = new Set<string>();

    const deduped = merged
      .filter((candidate) => {
        if (seen.has(candidate.id)) {
          return false;
        }
        seen.add(candidate.id);
        return true;
      })
      .sort((a, b) => b.score - a.score || a.detourMinutes - b.detourMinutes);
    const top = deduped.slice(0, options.maxResults);
    const targetRestaurantCount = Math.min(3, restaurants.length);
    const topRestaurantCount = top.filter(
      (candidate) => candidate.placeType === "餐厅",
    ).length;

    if (topRestaurantCount >= targetRestaurantCount) {
      return top;
    }

    const restaurantsToKeep = restaurants
      .filter((candidate) => !top.some((item) => item.id === candidate.id))
      .slice(0, targetRestaurantCount - topRestaurantCount);

    return [...top.slice(0, options.maxResults - restaurantsToKeep.length), ...restaurantsToKeep]
      .sort((a, b) => b.score - a.score || a.detourMinutes - b.detourMinutes);
  }

  function dedupePlaces(places: PlaceCandidate[]) {
    const seen = new Set<string>();

    return places.filter((place) => {
      const key = place.sourcePlaceId ?? place.id;

      if (seen.has(key)) {
        return false;
      }

      seen.add(key);
      return true;
    });
  }

  function matchesAny(input: string, keywords: string[]) {
    return keywords.some((keyword) => input.includes(keyword));
  }

  function withGeneratedRouteTitle(route: RoutePlan, nextDraft = draft) {
    return {
      ...route,
      title: generateRouteTitle(nextDraft, route.stops, requestText),
    };
  }

  function persistPreviewRoute(route: typeof previewRoute) {
    saveRoutePlan(route);
    return route;
  }

  function persistCandidateActions(
    actions: Record<string, CandidateAction>,
    nextCandidates = activeCandidates,
  ) {
    saveCandidateState({
      routeId: previewRoute.id,
      candidates: nextCandidates,
      actions: actions as Record<string, StoredCandidateAction>,
      updatedAt: new Date().toISOString(),
    });
  }

  function dismissPlanningImportSource() {
    clearPlanningImportSource();
    setPlanningImportSource(null);
  }

  return (
    <section className="plan-shell">
      <div className="conversation">
        {planningImportSource?.routeId === previewRoute.id ? (
          <div className="planning-import-banner">
            <div>
              <p>已从{planningImportSource.label}导入为本地规划副本。</p>
              <span>接下来修改不会覆盖原路线，保存到云端会生成你的个人版本。</span>
            </div>
            <button onClick={dismissPlanningImportSource} type="button">
              知道了
            </button>
          </div>
        ) : null}
        <div className="chat-row">
          <span className="ai-dot">AI</span>
          <div>
            <p>今天去哪座城市？</p>
            <label className="answer-input">
              <input
                aria-label="去哪座城市"
                onChange={(event) => updateCity(event.target.value)}
                value={draft.city}
              />
              <Pencil size={14} aria-hidden="true" />
            </label>
          </div>
        </div>

        <div className="chat-row">
          <span className="ai-dot">AI</span>
          <div>
            <p>从几点开始出发？</p>
            <label className="answer-input compact">
              <input
                aria-label="路线起始时间"
                onChange={(event) => updateStartTime(event.target.value)}
                type="time"
                value={draft.startTime}
              />
              <Clock3 size={14} aria-hidden="true" />
            </label>
          </div>
        </div>

        <div className="chat-row">
          <span className="ai-dot">AI</span>
          <div>
            <p>有一定要去的地方吗？</p>
            <div className="chip-row">
              {plannedPlaces.map((place) => (
                <button
                  aria-label={`移除地点 ${place.name}`}
                  className="chip selected removable"
                  key={place.id}
                  onClick={() => removeMustVisit(place.id)}
                  type="button"
                >
                  <span className="chip-prefix">
                    {placeRoleLabel(place.role)}
                  </span>
                  {place.name}
                  <X size={13} aria-hidden="true" />
                </button>
              ))}
            </div>
            <div className="place-role-row" aria-label="地点分类">
              {placeRoleOptions.map((option) => (
                <button
                  className={placeRole === option.value ? "selected" : ""}
                  key={option.value}
                  onClick={() => setPlaceRole(option.value)}
                  type="button"
                >
                  {option.label}
                </button>
              ))}
            </div>
            <div className="chip-row">
              <div className="must-visit-add">
                <input
                  aria-label="新增必去地点"
                  onChange={(event) => {
                    setMustVisitInput(event.target.value);
                    setMustVisitSuggestions([]);
                    setMustVisitSearchState("idle");
                    setMustVisitSearchMessage("");
                  }}
                  onKeyDown={handleMustVisitKeyDown}
                  placeholder="输入地点"
                  value={mustVisitInput}
                />
                <button
                  className="chip"
                  disabled={
                    mustVisitSearchState === "loading" ||
                    !isAmapWebProxyConfigured()
                  }
                  onClick={searchMustVisitPlaces}
                  type="button"
                >
                  <Search size={14} aria-hidden="true" />
                  {mustVisitSearchState === "loading" ? "搜索中" : "搜高德"}
                </button>
              </div>
            </div>
            {mustVisitSearchMessage ? (
              <span
                className={`must-visit-search-status ${mustVisitSearchState}`}
              >
                {mustVisitSearchMessage}
              </span>
            ) : null}
            {mustVisitSuggestions.length > 0 ? (
              <div className="place-suggestion-list compact">
                {mustVisitSuggestions.map((place) => (
                  <button
                    key={place.id}
                    onClick={() => addMustVisit(place.name, place)}
                    type="button"
                  >
                    <strong>{place.name}</strong>
                    <span>
                      {[place.district, place.address]
                        .filter(Boolean)
                        .join(" · ")}
                    </span>
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        </div>

        <div className="chat-row">
          <span className="ai-dot">AI</span>
          <div>
            <p>更偏向什么？（可多选）</p>
            <div className="chip-grid">
              {allThemes.map((theme) => (
                <button
                  className={
                    draft.themes.includes(theme) ? "chip selected" : "chip"
                  }
                  key={theme}
                  onClick={() => toggleTheme(theme)}
                  type="button"
                >
                  {theme}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="chat-row">
          <span className="ai-dot">AI</span>
          <div>
            <p>步行距离接受多少？</p>
            <div className="chip-row">
              {["5km以内", "5-10 km", "10-15km", "15km以上"].map((range) => (
                <button
                  className={
                    draft.walkingRangeKm === range ? "chip selected" : "chip"
                  }
                  key={range}
                  onClick={() => {
                    setSaved(false);
                    setDraft((current) => ({
                      ...current,
                      walkingRangeKm: range,
                    }));
                  }}
                  type="button"
                >
                  {range}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="chat-row">
          <span className="ai-dot">AI</span>
          <div>
            <p>想要怎样的节奏？</p>
            <div className="chip-row">
              {["轻松漫步", "平衡", "充实紧凑"].map((pace) => (
                <button
                  className={draft.pace === pace ? "chip selected" : "chip"}
                  key={pace}
                  onClick={() => {
                    setSaved(false);
                    setDraft((current) => ({
                      ...current,
                      pace: pace as RouteDraft["pace"],
                    }));
                  }}
                  type="button"
                >
                  {pace}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="chat-row">
          <span className="ai-dot">AI</span>
          <div>
            <p>这次要安排餐厅吗？</p>
            <div className="chip-row">
              <button
                className={includeMeals ? "chip selected" : "chip"}
                onClick={() => setIncludeMeals(true)}
                type="button"
              >
                安排餐厅
              </button>
              <button
                className={!includeMeals ? "chip selected" : "chip"}
                onClick={() => setIncludeMeals(false)}
                type="button"
              >
                不安排
              </button>
            </div>
            {includeMeals ? (
              <div className="meal-preferences">
                <div className="chip-row">
                  {(["一人食", "多人食"] as MealParty[]).map((party) => (
                    <button
                      className={mealParty === party ? "chip selected" : "chip"}
                      key={party}
                      onClick={() => setMealParty(party)}
                      type="button"
                    >
                      {party}
                    </button>
                  ))}
                </div>
                <div className="chip-row">
                  {(
                    [
                      "50元以内",
                      "50-100元",
                      "100-200元",
                      "200元以上",
                    ] as MealBudget[]
                  ).map((budget) => (
                    <button
                      className={
                        mealBudget === budget ? "chip selected" : "chip"
                      }
                      key={budget}
                      onClick={() => setMealBudget(budget)}
                      type="button"
                    >
                      {budget}
                    </button>
                  ))}
                </div>
                <div className="chip-grid compact">
                  {mealCuisineOptions.map((cuisine) => (
                    <button
                      className={
                        mealCuisines.includes(cuisine)
                          ? "chip selected"
                          : "chip"
                      }
                      key={cuisine}
                      onClick={() => toggleMealCuisine(cuisine)}
                      type="button"
                    >
                      {cuisine}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </div>

        <div className="chat-row">
          <span className="ai-dot">AI</span>
          <div>
            <p>用一句话补充这次路线目标。</p>
            <textarea
              className="intent-input"
              onChange={(event) => setRequestText(event.target.value)}
              placeholder=""
              rows={3}
              value={requestText}
            />
            <div className="candidate-toolbar">
              <button
                className="primary-action compact"
                disabled={isGeneratingCandidates}
                onClick={generateSuggestions}
                type="button"
              >
                {isGeneratingCandidates ? "生成中..." : "生成完整建议路线"}
                <Sparkles size={17} />
              </button>
              <span>
                {isDeepSeekProxyConfigured()
                  ? "DeepSeek 已启用，失败时自动回退本地规则。"
                  : "高德与 DeepSeek 未配置时使用本地规则。"}
              </span>
            </div>
          </div>
        </div>

        <section className="candidate-panel" aria-label="路线替换与休息点">
          <div className="candidate-panel-heading">
            <div>
              <p>微调路线</p>
              <h2>替换站点与可选休息点</h2>
            </div>
            {aiUsage ? (
              <span>
                {aiUsage.model} · {aiUsage.estimatedCostCny.toFixed(2)} CNY
              </span>
            ) : (
              <span>待生成</span>
            )}
          </div>

          <div className="candidate-type-filter" aria-label="候选点类型筛选">
            {candidatePlaceTypes.map((type) => (
              <button
                className={
                  effectiveCandidateTypes.includes(type) ? "selected" : ""
                }
                key={type}
                onClick={() => toggleCandidateType(type)}
                type="button"
              >
                {type}
              </button>
            ))}
          </div>

          {aiWarnings.length > 0 ? (
            <div className="candidate-warning">
              {aiWarnings.map((warning) => (
                <span key={warning}>{warning}</span>
              ))}
            </div>
          ) : null}

          <div className="candidate-list">
            {pendingCandidates.length > 0 ? (
              groupedCandidates.map(({ band, candidates: bandCandidates }) =>
                bandCandidates.length > 0 ? (
                  <section className="candidate-group" key={band}>
                    <h3>
                      {getCandidateBandLabel(band)}
                      <span>{bandCandidates.length}</span>
                    </h3>
                    {bandCandidates.map((candidate) => {
                      const action = candidateActions[candidate.id];
                      const isExpanded =
                        expandedCandidateIds[candidate.id] ?? false;
                      const isMapPreviewed =
                        mapPreviewCandidate?.id === candidate.id;

                      return (
                        <article
                          className={candidateItemClassName(
                            isExpanded,
                            isMapPreviewed,
                          )}
                          key={candidate.id}
                          onBlur={(event) => {
                            if (
                              !(event.relatedTarget instanceof Node) ||
                              !event.currentTarget.contains(event.relatedTarget)
                            ) {
                              setPreviewCandidateId((current) =>
                                current === candidate.id ? null : current,
                              );
                            }
                          }}
                          onFocus={() => setPreviewCandidateId(candidate.id)}
                          onMouseEnter={() =>
                            setPreviewCandidateId(candidate.id)
                          }
                          onMouseLeave={() =>
                            setPreviewCandidateId((current) =>
                              current === candidate.id ? null : current,
                            )
                          }
                        >
                          <button
                            aria-expanded={isExpanded}
                            className="candidate-summary-row"
                            onClick={() => {
                              setPreviewCandidateId(candidate.id);
                              setExpandedCandidateIds((current) => ({
                                ...current,
                                [candidate.id]: !isExpanded,
                              }));
                            }}
                            type="button"
                          >
                            <strong>{candidate.place.name}</strong>
                            <span>关联 {candidate.score}</span>
                            <span>
                              距离 {formatCandidateDistance(candidate)}
                            </span>
                            {isExpanded ? (
                              <ChevronUp size={15} />
                            ) : (
                              <ChevronDown size={15} />
                            )}
                          </button>
                          {isExpanded ? (
                            <div className="candidate-detail">
                              <div>
                                <span className="candidate-band">
                                  {candidate.placeType}
                                </span>
                                <h3>{candidate.place.name}</h3>
                                <p>
                                  {[
                                    candidate.place.district,
                                    candidate.place.address,
                                  ]
                                    .filter(Boolean)
                                    .join(" · ") || "地址待核验"}
                                </p>
                                <p>
                                  新增步行约 {candidate.detourMinutes} 分钟 ·
                                  停留 {candidate.stayMinutes} 分钟 · 插入第{" "}
                                  {candidate.insertionIndex + 1} 段后
                                </p>
                              </div>
                              <div className="candidate-tags">
                                {candidate.themes.map((theme) => (
                                  <span key={theme}>{theme}</span>
                                ))}
                                {candidate.place.openingHours ? (
                                  <span>
                                    开放 {candidate.place.openingHours}
                                  </span>
                                ) : null}
                                {candidate.place.telephone ? (
                                  <span>电话 {candidate.place.telephone}</span>
                                ) : null}
                                {candidate.place.providerRating ? (
                                  <span>
                                  高德评分 {candidate.place.providerRating}
                                </span>
                                ) : candidate.placeType === "餐厅" ? (
                                  <span>暂无平台评分</span>
                                ) : null}
                                {candidate.place.providerCost ? (
                                  <span>
                                    人均 {candidate.place.providerCost}
                                  </span>
                                ) : null}
                                {candidate.risks.map((risk) => (
                                  <span key={risk}>{risk}</span>
                                ))}
                              </div>
                              <ul>
                                {candidate.reasons.slice(0, 3).map((reason) => (
                                  <li key={reason}>{reason}</li>
                                ))}
                              </ul>
                              <div className="candidate-actions">
                                <button
                                  className={
                                    action === "joined" ? "selected" : ""
                                  }
                                  onClick={() =>
                                    toggleCandidateInRoute(candidate)
                                  }
                                  type="button"
                                >
                                  {action === "joined" ? (
                                    <Check size={15} />
                                  ) : (
                                    <Plus size={15} />
                                  )}
                                  {action === "joined"
                                    ? "撤销加入"
                                    : "加入路线"}
                                </button>
                                <button
                                  className={
                                    action === "backup" ? "selected" : ""
                                  }
                                  onClick={() =>
                                    markCandidate(candidate.id, "backup")
                                  }
                                  type="button"
                                >
                                  <Bookmark size={15} />
                                  设为备用
                                </button>
                                <button
                                  onClick={() =>
                                    markCandidate(candidate.id, "ignored")
                                  }
                                  type="button"
                                >
                                  <EyeOff size={15} />
                                  忽略
                                </button>
                              </div>
                            </div>
                          ) : null}
                        </article>
                      );
                    })}
                  </section>
                ) : null,
              )
            ) : (
              <div className="candidate-empty">
                <MapPinned size={22} />
                <span>
                  {activeCandidates.length > 0
                    ? "当前筛选下没有未处理候选点。"
                    : "先生成候选点，再决定加入、备用或忽略。"}
                </span>
              </div>
            )}
          </div>

          {processedCandidates.length > 0 ? (
            <section className="candidate-state-section">
              <h3>已处理</h3>
              {processedCandidates.map((candidate) => (
                <article className="candidate-state-item" key={candidate.id}>
                  <div>
                    <strong>{candidate.place.name}</strong>
                    <span>
                      {candidateActions[candidate.id] === "joined"
                        ? "已加入路线"
                        : "备用点"}
                    </span>
                  </div>
                  <button
                    onClick={() => clearCandidateAction(candidate.id)}
                    type="button"
                  >
                    撤回
                  </button>
                </article>
              ))}
            </section>
          ) : null}

          {ignoredCandidates.length > 0 ? (
            <section className="candidate-state-section muted">
              <h3>已忽略</h3>
              {ignoredCandidates.map((candidate) => (
                <article className="candidate-state-item" key={candidate.id}>
                  <div>
                    <strong>{candidate.place.name}</strong>
                    <span>{candidate.placeType}</span>
                  </div>
                  <button
                    onClick={() => clearCandidateAction(candidate.id)}
                    type="button"
                  >
                    恢复
                  </button>
                </article>
              ))}
            </section>
          ) : null}
        </section>

        <div className="plan-actions">
          <button
            className="primary-action"
            onClick={persistDraft}
            type="button"
          >
            {saved ? "草稿已保存" : "保存草稿"}
            {saved ? <Check size={18} /> : <ArrowRight size={18} />}
          </button>
          <Link className="secondary-link" href={routeUrl("demo")}>
            查看生成路线
            <ArrowRight size={16} />
          </Link>
        </div>
      </div>

      <aside className="route-brief">
        <div className="paperclip" aria-hidden="true" />
        <h2>路线摘要</h2>
        <dl>
          <div>
            <dt>城市</dt>
            <dd>{draft.city}</dd>
          </div>
          <div>
            <dt>模式</dt>
            <dd>完善（补全路线）</dd>
          </div>
          <div>
            <dt>时间</dt>
            <dd>
              {draft.startTime} 出发 · 一天（约 {draft.durationHours} 小时）
            </dd>
          </div>
          <div>
            <dt>步行距离</dt>
            <dd>{draft.walkingRangeKm}</dd>
          </div>
          <div>
            <dt>必去地点</dt>
            <dd>
              {draft.mustVisits.length > 0
                ? draft.mustVisits.join("、")
                : "未选择"}
            </dd>
          </div>
          <div>
            <dt>兴趣偏好</dt>
            <dd>{summary}</dd>
          </div>
          <div>
            <dt>含餐</dt>
            <dd>
              {includeMeals
                ? `${mealParty} · ${mealBudget} · ${mealCuisines.join("、") || "不限"}`
                : "不安排"}
            </dd>
          </div>
          <div>
            <dt>预案结束</dt>
            <dd>
              {previewEndTime} · {routeImpactMinutes >= 0 ? "+" : ""}
              {routeImpactMinutes} 分钟
            </dd>
          </div>
          <div>
            <dt>步行变化</dt>
            <dd>
              {(previewKernel.totalWalkingMeters / 1000).toFixed(1)} km ·{" "}
              {routeImpactMeters >= 0 ? "+" : ""}
              {(routeImpactMeters / 1000).toFixed(1)} km
            </dd>
          </div>
        </dl>

        <div className="route-preview-list" aria-label="路线预案站点">
          {previewKernel.stops.map((stop, index) => {
            const openingWarning = getOpeningHoursWarning(
              stop,
              stop.calculatedTime,
              draft.dateLabel,
            );

            return (
              <article className="route-preview-stop" key={stop.id}>
                <div>
                  <strong>
                    {index + 1}. {stop.name}
                  </strong>
                  <span>
                    {stop.calculatedTime}
                    {stop.routeRole === "start" || stop.routeRole === "end"
                      ? ""
                      : ` · 停留 ${stop.stayMinutes} 分钟`}
                    {stop.walkingFromPrevious
                      ? ` · ${getRouteTravelModeLabel(stop.walkingFromPrevious.mode)} ${stop.walkingFromPrevious.minutes} 分钟`
                      : ""}
                  </span>
                  {stop.openingHours ? (
                    <span className={openingWarning ? "opening-warning" : ""}>
                      开放 {stop.openingHours}
                      {openingWarning ? ` · ${openingWarning}` : ""}
                    </span>
                  ) : null}
                </div>
                <div className="route-preview-controls">
                <button
                  aria-label={`上移 ${stop.name}`}
                  disabled={index === 0}
                  onClick={() => movePreviewStop(index, index - 1)}
                  type="button"
                >
                  <ChevronUp size={14} />
                </button>
                <button
                  aria-label={`下移 ${stop.name}`}
                  disabled={index === previewKernel.stops.length - 1}
                  onClick={() => movePreviewStop(index, index + 1)}
                  type="button"
                >
                  <ChevronDown size={14} />
                </button>
                {stop.routeRole === "start" || stop.routeRole === "end" ? (
                  <span className="route-role-note">无停留</span>
                ) : (
                  <label>
                    <Clock3 size={13} />
                    <input
                      aria-label={`${stop.name} 停留分钟`}
                      max={240}
                      min={5}
                      onChange={(event) =>
                        changeStayMinutes(stop.id, Number(event.target.value))
                      }
                      step={5}
                      type="number"
                      value={stop.stayMinutes}
                    />
                  </label>
                )}
                <button
                  aria-label={`删除 ${stop.name}`}
                  disabled={previewKernel.stops.length <= 2}
                  onClick={() => removePreviewStop(stop.id)}
                  type="button"
                >
                  <Trash2 size={14} />
                </button>
                </div>
                {stop.walkingFromPrevious ? (
                  <div
                    className="route-leg-controls"
                    aria-label={`${stop.name} 路途设置`}
                  >
                    <label>
                      方式
                      <select
                        aria-label={`${stop.name} 交通方式`}
                        onChange={(event) =>
                          changeLegTravelMode(
                            stop.id,
                            event.target
                              .value as (typeof routeTravelModes)[number],
                          )
                        }
                        value={stop.walkingFromPrevious.mode ?? "walking"}
                      >
                        {routeTravelModes.map((mode) => (
                          <option key={mode} value={mode}>
                            {routeTravelModeLabels[mode]}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      路途分钟
                      <input
                        aria-label={`${stop.name} 路途分钟`}
                        max={360}
                        min={1}
                        onChange={(event) =>
                          changeLegMinutes(stop.id, Number(event.target.value))
                        }
                        step={1}
                        type="number"
                        value={stop.walkingFromPrevious.minutes}
                      />
                    </label>
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>

        <div className="planning-route-map">
          <RouteMap
            compact
            previewCandidate={mapPreviewCandidate}
            route={previewRoute}
          />
        </div>
      </aside>
    </section>
  );
}

function getRouteEndTime(
  stops: { calculatedTime: string; stayMinutes: number }[],
) {
  const lastStop = stops.at(-1);

  if (!lastStop) {
    return "--:--";
  }

  const lastArrivalMinutes = parseTime(lastStop.calculatedTime);

  return lastArrivalMinutes === null
    ? "--:--"
    : formatTime(lastArrivalMinutes + lastStop.stayMinutes);
}

function formatCandidateDistance(candidate: RouteCandidate) {
  return `${(candidate.detourMeters / 1000).toFixed(1)} km`;
}

function candidateItemClassName(isExpanded: boolean, isMapPreviewed: boolean) {
  return [
    "candidate-item",
    isExpanded ? "expanded" : "",
    isMapPreviewed ? "map-previewed" : "",
  ]
    .filter(Boolean)
    .join(" ");
}

function generateRouteTitle(
  draft: Pick<RouteDraft, "city" | "themes">,
  stops: Array<{ name: string }> = [],
  requestText = "",
) {
  const city = draft.city.trim() || "城市";
  const primaryTheme = draft.themes[0] ?? "城市";
  const secondaryTheme = draft.themes[1];
  const routeTone =
    requestText.includes("轻松") || requestText.includes("慢")
      ? "慢读"
      : requestText.includes("建筑")
        ? "建筑漫游"
        : requestText.includes("历史")
          ? "历史漫游"
          : "细读";

  if (stops.length >= 2) {
    return sanitizeRouteTitle(
      `${city} · ${stops[0].name}到${stops.at(-1)?.name}${routeTone}`,
    );
  }

  const title = secondaryTheme
    ? `${city} · ${primaryTheme}${secondaryTheme}${routeTone}`
    : `${city} · ${primaryTheme}${routeTone}`;

  return sanitizeRouteTitle(title);
}

function sanitizeRouteTitle(title: string) {
  const cleaned = title
    .replace(/[《》"'“”]/g, "")
    .replace(/\s+/g, "")
    .trim();

  return cleaned.length > 32 ? `${cleaned.slice(0, 31)}…` : cleaned;
}

function isSameRouteShape(current: RoutePlan, expected: RoutePlan) {
  if (current.id !== expected.id || current.stops.length !== expected.stops.length) {
    return false;
  }

  return current.stops.every(
    (stop, index) =>
      stop.id === expected.stops[index]?.id &&
      stop.sourcePlaceId === expected.stops[index]?.sourcePlaceId,
  );
}
