import { z } from "zod";
import type { RouteCandidate } from "@/lib/route-candidates";
import type { RouteDraft, RoutePlan, RouteStop, Theme } from "@/lib/route";

export const promptVersion = "route-collaboration-v0.5";

export const planningIntentSchema = z.object({
  mode: z.enum(["discover", "complete", "refine"]).default("complete"),
  city: z.string().min(1),
  date: z.string().nullable(),
  mustVisitPlaceIds: z.array(z.string()).default([]),
  themeFilters: z
    .array(z.enum(["历史", "文学", "建筑", "音乐", "书店", "美食"]))
    .default([]),
  pace: z.enum(["轻松漫步", "平衡", "充实紧凑"]).default("平衡"),
  maxWalkingKm: z.number().positive().max(30),
  mealRequirement: z.string().nullable(),
});

export const routeProposalSchema = z.object({
  title: z.string().min(1).max(80),
  orderedPlaceIds: z.array(z.string()).min(2),
  candidatePlaceIds: z.array(z.string()).default([]),
  stayMinutes: z.record(z.string(), z.number().int().min(5).max(240)),
  reasoningSummary: z.string().min(1).max(500),
  warnings: z.array(z.string()).default([]),
});

export const routeTitleSchema = z.object({
  title: z.string().min(2).max(32),
  warnings: z.array(z.string()).default([]),
});

export const stopThemeContentSchema = z.object({
  placeId: z.string().min(1),
  shortIntro: z.string().min(20).max(700),
  themeConnections: z
    .array(
      z.object({
        theme: z.enum(["历史", "文学", "建筑", "音乐", "书店", "美食"]),
        text: z.string().min(10).max(520),
      }),
    )
    .min(3)
    .max(5),
  practicalTips: z.array(z.string()).default([]),
  checkInTasks: z.array(z.string().min(4).max(160)).length(2),
  sourceClaims: z.array(z.string()).default([]),
  sourceStatus: z
    .enum(["unverified", "partial", "verified"])
    .default("unverified"),
  sourceReferences: z
    .array(
      z.object({
        id: z.string().min(1),
        label: z.string().min(1).max(160),
        href: z.string().url(),
        kind: z.enum(["official", "authority", "academic", "map"]),
      }),
    )
    .max(6)
    .default([]),
  verifiedAt: z.string().datetime().nullable().default(null),
});

export type PlanningIntent = z.infer<typeof planningIntentSchema>;
export type RouteProposal = z.infer<typeof routeProposalSchema>;
export type RouteTitleSuggestion = z.infer<typeof routeTitleSchema>;
export type StopThemeContent = z.infer<typeof stopThemeContentSchema>;

export type AiUsageRecord = {
  promptVersion: string;
  provider: "fallback" | "deepseek";
  model: string;
  inputTokens: number;
  outputTokens: number;
  elapsedMs: number;
  estimatedCostCny: number;
};

export type CollaborationResult<T> = {
  data: T;
  usage: AiUsageRecord;
  warnings: string[];
};

export function parseIntentWithFallback(
  input: string,
  draft: RouteDraft,
): CollaborationResult<PlanningIntent> {
  const startedAt = performanceNow();
  const themes = inferThemes(input, draft.themes);
  const maxWalkingKm = inferMaxWalkingKm(draft.walkingRangeKm);
  const parsed = planningIntentSchema.parse({
    mode: draft.mode,
    city: inferCity(input) ?? draft.city,
    date: draft.dateLabel === "暂不确定" ? null : draft.dateLabel,
    mustVisitPlaceIds: draft.mustVisits,
    themeFilters: themes,
    pace: draft.pace,
    maxWalkingKm,
    mealRequirement: inferMealRequirement(input),
  });

  return {
    data: parsed,
    usage: fallbackUsage(input, JSON.stringify(parsed), startedAt),
    warnings: ["AI API 未配置，当前使用本地规则解析。"],
  };
}

export function rankCandidatesWithFallback(
  candidates: RouteCandidate[],
  intent: PlanningIntent,
  routeGoal = "",
): CollaborationResult<RouteCandidate[]> {
  const startedAt = performanceNow();
  const ranked = [...candidates].sort((a, b) => {
    const aThemeBoost = countThemeMatches(a.themes, intent.themeFilters) * 8;
    const bThemeBoost = countThemeMatches(b.themes, intent.themeFilters) * 8;
    const aGoalBoost = scoreCandidateAgainstGoal(a, routeGoal, intent);
    const bGoalBoost = scoreCandidateAgainstGoal(b, routeGoal, intent);

    return (
      b.score + bThemeBoost + bGoalBoost - (a.score + aThemeBoost + aGoalBoost)
    );
  });

  return {
    data: ranked.map((candidate) => ({
      ...candidate,
      reasons: [
        ...candidate.reasons,
        templateAiReason(candidate, intent.themeFilters, routeGoal, intent),
      ],
    })),
    usage: fallbackUsage(
      JSON.stringify(intent),
      ranked.map((candidate) => candidate.id).join(","),
      startedAt,
    ),
    warnings: ["AI 推荐理由来自模板，待 DeepSeek 接入后可替换。"],
  };
}

export function validateRouteProposal(raw: unknown, allowedPlaceIds: string[]) {
  const parsed = routeProposalSchema.safeParse(raw);

  if (!parsed.success) {
    return {
      success: false as const,
      issues: parsed.error.issues.map((issue) => issue.message),
    };
  }

  const allowed = new Set(allowedPlaceIds);
  const unknownIds = [
    ...parsed.data.orderedPlaceIds,
    ...parsed.data.candidatePlaceIds,
    ...Object.keys(parsed.data.stayMinutes),
  ].filter((id) => !allowed.has(id));

  if (unknownIds.length > 0) {
    return {
      success: false as const,
      issues: [
        `AI 输出包含不存在的 POI ID：${[...new Set(unknownIds)].join("、")}`,
      ],
    };
  }

  return {
    success: true as const,
    data: parsed.data,
  };
}

export function generateRouteSummaryWithFallback(route: RoutePlan) {
  const primaryThemes = route.themes.slice(0, 2).join("、") || "城市文化";

  return {
    title: `${route.city} · ${primaryThemes}漫游`,
    summary: `从${route.stops[0]?.name ?? "起点"}出发，串联${route.stops.length}个站点，以${primaryThemes}为线索，保留人工复核和实地调整空间。`,
    sourceStatus: "template" as const,
  };
}

export function generateStopThemeContentWithFallback(
  stop: RouteStop,
): StopThemeContent {
  const stopKind = inferStopDeepReadingKind(stop);
  const theme = stop.themes[0] ?? primaryThemeForKind(stopKind);
  const shortIntro = buildDeepReadingIntro(stop, stopKind, theme).slice(0, 700);
  const themeConnections = buildThemeConnectionsForStop(stop, stopKind, theme);

  return stopThemeContentSchema.parse({
    placeId: stop.sourcePlaceId ?? stop.id,
    shortIntro,
    themeConnections,
    practicalTips: [
      ...buildPracticalTips(stop, stopKind),
      "出门前看一眼当天的开放、预约和现场安排，免得扑空。",
    ],
    checkInTasks: buildCheckInTasks(stop, stopKind),
    sourceClaims: [],
    sourceStatus: "unverified",
  });
}

type StopDeepReadingKind =
  "restaurant" | "museum" | "architecture" | "literary" | "history" | "city";

function inferStopDeepReadingKind(stop: RouteStop): StopDeepReadingKind {
  const text = [
    stop.name,
    stop.area,
    stop.address,
    stop.note,
    stop.themes.join(" "),
    stop.providerCost ?? "",
  ].join(" ");

  if (
    stop.themes.includes("美食") ||
    Boolean(stop.providerCost) ||
    matchesAny(text, ["餐厅", "菜馆", "酒楼", "饭店", "小吃", "面馆", "茶馆"])
  ) {
    return "restaurant";
  }

  if (
    matchesAny(text, [
      "博物馆",
      "纪念馆",
      "美术馆",
      "展览馆",
      "陈列馆",
      "馆藏",
      "展陈",
    ])
  ) {
    return "museum";
  }

  if (
    stop.themes.includes("建筑") ||
    matchesAny(text, ["建筑", "公馆", "故居", "旧址", "街区", "院落", "门楼"])
  ) {
    return "architecture";
  }

  if (
    stop.themes.includes("文学") ||
    stop.themes.includes("书店") ||
    matchesAny(text, ["书店", "图书馆", "作家", "诗人", "文学", "出版"])
  ) {
    return "literary";
  }

  if (stop.themes.includes("历史")) {
    return "history";
  }

  return "city";
}

function primaryThemeForKind(kind: StopDeepReadingKind): Theme {
  switch (kind) {
    case "restaurant":
      return "美食";
    case "museum":
    case "history":
      return "历史";
    case "architecture":
      return "建筑";
    case "literary":
      return "文学";
    case "city":
      return "历史";
  }
}

function buildDeepReadingIntro(
  stop: RouteStop,
  kind: StopDeepReadingKind,
  theme: Theme,
) {
  const opening = pickStopPhrase(stop, [
    "脚步慢下来时",
    "刚走近的时候",
    "在这里停一会儿",
    "拐过街角以后",
    "把手机先收起来的那一刻",
    "不妨先站在原地看看",
  ]);

  switch (kind) {
    case "restaurant":
      return `${opening}，${stop.name}最先让人留意到的，往往不是一道菜，而是门口的人怎么等、桌边的人怎么聊。先别急着点单，看看菜单、店招和出餐的节奏；一顿饭落在这条路线里，也像在尝这座城的日常。`;
    case "museum":
      return `${opening}，先别急着把${stop.name}当成一间需要赶着看完的屋子。挑一件让你愿意靠近的展品，看看它旁边的照片、地图或几行文字；城市很大的故事，常常就藏在这样一小块玻璃后面。`;
    case "architecture":
      return `${opening}，${stop.name}不用急着一眼看完。先看看门、墙、屋檐和树影怎样挨在一起，再退两步看看它和街道的距离；有些地方的气质，就是在你来回走两遍时才慢慢显出来。`;
    case "literary":
      return `${opening}，${stop.name}最适合慢一点读。看看书架、路名、橱窗或一张活动海报，哪一个让你想起一段自己的阅读；城市和书的关系，往往不在大声说话，而在有人愿意停下来翻两页。`;
    case "history":
      return `${opening}，${stop.name}会让人发现，历史其实离日常很近。找找门牌、旧照片或一处被反复保留下来的细节，再想想当时的人会从哪里进来、又会在哪里停下；那些大事，原来也发生在这样可以走到的地方。`;
    case "city":
      return `${opening}，先别急着给${stop.name}下定义。看看门面、路边的声音和人停下来的方式，哪一个最像这里的${theme}气质；把这一小段记住，后面路过别处时会忽然发现它们在彼此呼应。`;
  }
}

function buildThemeConnectionsForStop(
  stop: RouteStop,
  kind: StopDeepReadingKind,
  theme: Theme,
) {
  const themes = uniqueThemes([
    ...stop.themes,
    theme,
    primaryThemeForKind(kind),
    kind === "restaurant" ? "美食" : "历史",
    kind === "architecture" ? "建筑" : "文学",
  ]).slice(0, 4);

  return themes.slice(0, Math.max(3, themes.length)).map((item) => ({
    theme: item,
    text: buildThemeConnection(stop, item, kind).slice(0, 300),
  }));
}

function uniqueThemes(themes: Theme[]): Theme[] {
  const result: Theme[] = [];

  for (const theme of themes) {
    if (!result.includes(theme)) {
      result.push(theme);
    }
  }

  return result.length >= 3
    ? result
    : uniqueThemes([...result, "历史", "建筑", "文学"]);
}

function buildPracticalTips(stop: RouteStop, kind: StopDeepReadingKind) {
  const stayTip = `在这儿留 ${stop.stayMinutes} 分钟就够：先慢慢看，再挑一个细节拍下来或记在心里。`;

  switch (kind) {
    case "restaurant":
      return [
        stayTip,
        "准备吃饭的话，先看看排队、预约和当天供应；不赶时间，味道会更好。",
      ];
    case "museum":
      return [
        stayTip,
        "进馆后先扫一眼导览图，只挑 1-2 件想多看一会儿的东西就好。",
      ];
    case "architecture":
      return [
        stayTip,
        "拍照时别挡住路，也别越过未开放的地方；退两步往往能找到更好的角度。",
      ];
    default:
      return [
        stayTip,
        "想多知道一点，就在现场的说明、旧照片和周边街道里慢慢找，不必赶着看完。",
      ];
  }
}

function buildCheckInTasks(stop: RouteStop, kind: StopDeepReadingKind) {
  const stopName = compactStopName(stop.name);

  switch (kind) {
    case "restaurant":
      return normalizeCheckInTasks([
        `在${stopName}的菜单或招牌里找一道最吸引你的菜，在允许拍摄处把它拍下来。`,
        "点单前坐三分钟看看周围：大家是匆匆吃完就走，还是慢慢聊天？猜猜这家店更像谁的日常。",
      ]);
    case "museum":
      return normalizeCheckInTasks([
        `在${stopName}里找一件最想讲给朋友听的展品，在允许拍摄处拍下它或它的说明牌。`,
        "找一张地图、旧照片或时间表，看看它和上一站之间有没有一件意外相连的小事。",
      ]);
    case "architecture":
      return normalizeCheckInTasks([
        `找一处最像${stopName}的门、墙、屋檐或树影，在不影响通行的位置拍下来。`,
        "沿着这面墙走一小段，再回头看看：哪一个角度让它和街道最有默契？",
      ]);
    case "literary":
      return normalizeCheckInTasks([
        `在${stopName}找一个书脊、名字、海报或橱窗，把最想带走的画面拍下来。`,
        "用眼前的三个物件，给这一站写一句不超过 20 字的旁白；读给同行的人听听。",
      ]);
    case "history":
      return normalizeCheckInTasks([
        `在${stopName}找一块说明牌、门牌、旧照片或年代标识，在允许拍摄处记下它。`,
        "挑一个人物、机构或事件名，和同行的人聊聊：它会把你带回这条路线的哪一段？",
      ]);
    case "city":
      return normalizeCheckInTasks([
        `在${stopName}周边找一个最像这里气质的细节，可以是门牌、树影、橱窗或人流，在允许拍摄处拍下来。`,
        "想想这一站和上一站最不一样的地方：是声音、气味、街道，还是人的节奏？",
      ]);
  }
}

function compactStopName(name: string) {
  return name.length > 18 ? `${name.slice(0, 18)}...` : name;
}

function pickStopPhrase(stop: RouteStop, choices: string[]) {
  const seed = `${stop.id}:${stop.name}`;
  const hash = [...seed].reduce(
    (value, character) => (value * 31 + character.charCodeAt(0)) >>> 0,
    0,
  );

  return choices[hash % choices.length] ?? choices[0] ?? "走到这里时";
}

function normalizeCheckInTasks(tasks: [string, string]) {
  return tasks.map((task) => task.slice(0, 160));
}

function buildThemeConnection(
  stop: RouteStop,
  theme: Theme,
  kind: StopDeepReadingKind = "city",
) {
  switch (theme) {
    case "历史":
      if (kind === "museum") {
        return `别急着把${stop.name}里的每件东西都看完。挑一件让你停住脚步的展品，再看看它旁边的日期、照片或几行说明；一座城的大故事，有时就从这里慢慢展开。`;
      }
      if (kind === "restaurant") {
        return `一顿饭也会记住一座城。看看${stop.name}里大家怎么点、怎么等、怎么聊天；你会发现街区的日常，比一串年份更容易让人记住。`;
      }
      return `有意思的是，${stop.name}把很远的往事留在了可以走到的地方。找找门牌、旧照片或一处被反复保留下来的细节，再想想当时的人会怎样经过这里。`;
    case "文学":
      return `把这里当作一页摊开的城市笔记就好。看看店招、路名、橱窗和路过的人，哪一个细节最像一句还没写完的话。`;
    case "建筑":
      if (kind === "architecture") {
        return `你注意到没有，${stop.name}的门、墙和屋檐并不是各做各的。往前走几步、再退回来看看，光线和街道会把它们悄悄连在一起。`;
      }
      return `别只盯着一栋楼。看看入口、墙面和周围街道怎样接在一起；有时退远一点，才看得见这里留给人的呼吸。`;
    case "音乐":
      return `在这里停十秒，先听一听。车声、脚步、说话声和风从哪个方向来？声音会先告诉你，这个地方是匆忙的还是愿意让人停下来的。`;
    case "书店":
      return `如果眼前有书、海报或一张正在被人翻看的纸，就多停一会儿。看看人们怎么挑、怎么坐、怎么离开；一间书店的性格常常藏在这些小动作里。`;
    case "美食":
      return `先别急着谈味道。看看门口的队伍、桌上的菜和路过的人为什么会停下；吃什么固然重要，和谁一起吃、在哪条街上吃，也会留在记忆里。`;
  }
}

function inferThemes(input: string, fallbackThemes: Theme[]) {
  const themeWords: Theme[] = ["历史", "文学", "建筑", "音乐", "书店", "美食"];
  const inferred = themeWords.filter((theme) => input.includes(theme));

  return inferred.length > 0 ? inferred : fallbackThemes;
}

function inferCity(input: string) {
  return ["南京", "上海", "北京", "杭州", "苏州", "广州"].find((city) =>
    input.includes(city),
  );
}

function inferMaxWalkingKm(label: string) {
  const match = /(\d+)(?:\s*-\s*(\d+))?\s*km/i.exec(label);

  if (!match) {
    return 10;
  }

  return Number(match[2] ?? match[1]);
}

function inferMealRequirement(input: string) {
  if (matchesAny(input, ["晚餐", "晚饭", "傍晚", "晚上吃", "收官餐"])) {
    return "dinner";
  }

  if (matchesAny(input, ["午餐", "午饭", "中午吃"])) {
    return "lunch";
  }

  return null;
}

function countThemeMatches(candidateThemes: Theme[], targetThemes: Theme[]) {
  return candidateThemes.filter((theme) => targetThemes.includes(theme)).length;
}

function templateAiReason(
  candidate: RouteCandidate,
  themes: Theme[],
  routeGoal = "",
  intent?: PlanningIntent,
) {
  const matchedThemes = candidate.themes.filter((theme) =>
    themes.includes(theme),
  );

  if (
    candidate.placeType === "餐厅" &&
    (routeGoal.includes("晚餐") || intent?.mealRequirement === "dinner")
  ) {
    return "它更适合作为晚餐候选，能把路线收束到用餐和休息节奏上。";
  }

  if (candidate.placeType === "餐厅" && routeGoal.includes("午餐")) {
    return "它适合作为午餐候选，能在路线中段提供明确的用餐停顿。";
  }

  const goalKeywords = getGoalKeywords(routeGoal);
  const matchedGoalKeywords = goalKeywords.filter((keyword) =>
    [
      candidate.place.name,
      candidate.place.address ?? "",
      candidate.place.poiType ?? "",
    ]
      .join(" ")
      .includes(keyword),
  );

  if (matchedGoalKeywords.length > 0) {
    return `它呼应你补充的${matchedGoalKeywords.slice(0, 2).join("、")}目标，同时保持路线连续。`;
  }

  if (matchedThemes.length === 0) {
    return "作为备选点，它主要补充路线节奏和空间连续性。";
  }

  return `它能加强${matchedThemes.join("、")}线索，同时不明显拉长步行时间。`;
}

function scoreCandidateAgainstGoal(
  candidate: RouteCandidate,
  routeGoal: string,
  intent: PlanningIntent,
) {
  const text = [
    candidate.place.name,
    candidate.place.address ?? "",
    candidate.place.poiType ?? "",
    candidate.placeType,
    candidate.themes.join(" "),
  ].join(" ");
  const keywordScore = getGoalKeywords(routeGoal).filter((keyword) =>
    text.includes(keyword),
  ).length;
  const dinnerScore =
    candidate.placeType === "餐厅" &&
    (routeGoal.includes("晚餐") || intent.mealRequirement === "dinner")
      ? 36
      : 0;
  const lunchScore =
    candidate.placeType === "餐厅" &&
    (routeGoal.includes("午餐") || intent.mealRequirement === "lunch")
      ? 24
      : 0;

  return Math.min(16, keywordScore * 5) + dinnerScore + lunchScore;
}

function getGoalKeywords(routeGoal: string) {
  return [
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
  ].filter((keyword) => routeGoal.includes(keyword));
}

function matchesAny(input: string, keywords: string[]) {
  return keywords.some((keyword) => input.includes(keyword));
}

function fallbackUsage(
  input: string,
  output: string,
  startedAt: number,
): AiUsageRecord {
  return {
    promptVersion,
    provider: "fallback",
    model: "local-template",
    inputTokens: estimateTokens(input),
    outputTokens: estimateTokens(output),
    elapsedMs: Math.round(performanceNow() - startedAt),
    estimatedCostCny: 0,
  };
}

function estimateTokens(value: string) {
  return Math.ceil(value.length / 2);
}

function performanceNow() {
  return typeof performance === "undefined" ? Date.now() : performance.now();
}
