import type { Theme } from "@/lib/route";
import { routeUrl, shareUrl } from "@/lib/urls";

export type RoutePace = "轻松" | "平衡" | "紧凑";
export type RouteDuration = "半天" | "一天";

export type RecommendedRoute = {
  id: string;
  city: string;
  title: string;
  summary: string;
  themes: Theme[];
  pace: RoutePace;
  duration: RouteDuration;
  href: string;
};

export const recommendedRoutes: RecommendedRoute[] = [
  {
    id: "nanjing-minguo",
    city: "南京",
    title: "金陵城南 · 民国记忆",
    summary: "从书店、近代建筑和老街区进入南京的城市记忆。",
    themes: ["历史", "建筑", "文学"],
    pace: "平衡",
    duration: "半天",
    href: shareUrl("nanjing-minguo"),
  },
  {
    id: "shanghai-1935",
    city: "上海",
    title: "上海 1935 时间切片",
    summary: "以建筑和街区肌理阅读一段城市现代性。",
    themes: ["历史", "建筑"],
    pace: "紧凑",
    duration: "一天",
    href: routeUrl("demo"),
  },
  {
    id: "wukang-literature",
    city: "上海",
    title: "武康路文学漫游",
    summary: "在街角、书店和老住宅之间寻找文学与生活的交叠。",
    themes: ["文学", "建筑", "书店"],
    pace: "轻松",
    duration: "半天",
    href: routeUrl("demo"),
  },
  {
    id: "gulou-music",
    city: "北京",
    title: "鼓楼声场与胡同",
    summary: "用音乐、旧城空间和日常店铺串起一条松弛路线。",
    themes: ["音乐", "历史"],
    pace: "平衡",
    duration: "半天",
    href: routeUrl("demo"),
  },
  {
    id: "shamian-architecture",
    city: "广州",
    title: "沙面建筑与江岸",
    summary: "沿江岸和街廓观察近代建筑、贸易记忆与城市生活。",
    themes: ["建筑", "历史"],
    pace: "轻松",
    duration: "半天",
    href: routeUrl("demo"),
  },
  {
    id: "hangzhou-lakeside",
    city: "杭州",
    title: "湖滨书店与城市生活",
    summary: "把湖滨、书店和咖啡休息点组织成一条慢行线路。",
    themes: ["书店", "文学", "美食"],
    pace: "轻松",
    duration: "一天",
    href: routeUrl("demo"),
  },
];

export const recommendationThemes: Theme[] = [
  "历史",
  "文学",
  "建筑",
  "音乐",
  "书店",
  "美食",
];

export const recommendationPaces: RoutePace[] = ["轻松", "平衡", "紧凑"];
export const recommendationDurations: RouteDuration[] = ["半天", "一天"];
