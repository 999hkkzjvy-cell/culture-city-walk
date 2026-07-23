import type { Theme } from "@/lib/route";
import { routeUrl } from "@/lib/urls";

export type RoutePace = "轻松" | "平衡" | "紧凑";
export type RouteDuration = "半天" | "一天";

export type RecommendedRoute = {
  id: string;
  city: string;
  title: string;
  centralQuestion: string;
  summary: string;
  previewStops: string[];
  storyHighlights: string[];
  bestFor: string;
  themes: Theme[];
  pace: RoutePace;
  duration: RouteDuration;
  status: "review" | "published";
  href: string;
};

// 三条路线只作为待审核编辑稿展示。站点顺序、开放信息与深读内容须经资料复核后才可发布。
export const recommendedRoutes: RecommendedRoute[] = [
  {
    id: "nanjing-modern-history-draft",
    city: "南京",
    title: "近代南京的几次转身",
    centralQuestion: "一座城市如何在近代政治、战争与日常生活之间不断改变自己？",
    summary: "从近代历史现场进入南京，不把宏大事件和街区生活拆开讲。",
    previewStops: ["总统府", "梅园新村纪念馆", "拉贝故居", "南京大屠杀遇难同胞纪念馆"],
    storyHighlights: ["政权与城市空间", "战时普通人的选择", "纪念如何留在今天"],
    bestFor: "第一次想系统理解南京近代史的人",
    themes: ["历史", "建筑"],
    pace: "平衡",
    duration: "一天",
    status: "review",
    href: routeUrl("demo"),
  },
  {
    id: "nanjing-republican-architecture-draft",
    city: "南京",
    title: "民国建筑与城市生活",
    centralQuestion: "建筑怎样塑造一座城市的日常尺度、居住方式与公共生活？",
    summary: "以街区、公馆与公共建筑为线索，读懂民国南京留在街道里的秩序。",
    previewStops: ["颐和路公馆区", "拉贝故居", "五台山片区", "先锋书店（五台山店）"],
    storyHighlights: ["公馆区的街道尺度", "居住与公共空间", "旧建筑的当代使用"],
    bestFor: "喜欢建筑、摄影与街区观察的人",
    themes: ["建筑", "历史"],
    pace: "轻松",
    duration: "半天",
    status: "review",
    href: routeUrl("demo"),
  },
  {
    id: "nanjing-literature-bookstores-draft",
    city: "南京",
    title: "书页里的南京",
    centralQuestion: "文学、出版和阅读空间怎样把一座城市写进人的日常？",
    summary: "从书店、图书馆与文学记忆出发，慢慢走近南京的阅读生活。",
    previewStops: ["先锋书店（五台山店）", "南京图书馆", "江宁织造博物馆", "鸡鸣寺路片区"],
    storyHighlights: ["阅读空间的来路", "文学记忆与城市", "今天还能怎样阅读南京"],
    bestFor: "想把书店停留放进城市漫游的人",
    themes: ["文学", "书店", "历史"],
    pace: "轻松",
    duration: "半天",
    status: "review",
    href: routeUrl("demo"),
  },
];

export const recommendationThemes: Theme[] = ["历史", "文学", "建筑", "书店"];
export const recommendationPaces: RoutePace[] = ["轻松", "平衡", "紧凑"];
export const recommendationDurations: RouteDuration[] = ["半天", "一天"];
