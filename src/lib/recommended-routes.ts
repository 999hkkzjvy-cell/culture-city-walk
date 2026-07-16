import type { Theme } from "@/lib/route";
import { routeUrl, shareUrl } from "@/lib/urls";

export type RoutePace = "轻松" | "平衡" | "紧凑";
export type RouteDuration = "半天" | "一天";

export type RecommendedRoute = {
  id: string;
  city: string;
  title: string;
  summary: string;
  previewStops: string[];
  shareCopy: string;
  bestFor: string;
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
    previewStops: ["先锋书店", "总统府", "熙南里"],
    shareCopy: "适合发给想用半天读懂南京近代街区的朋友。",
    bestFor: "第一次来南京，想兼顾历史与晚餐",
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
    previewStops: ["外滩源", "沙美大楼", "南京路片区"],
    shareCopy: "一条适合讨论上海现代性和街区尺度的路线。",
    bestFor: "建筑观察、城市摄影、朋友半日同行",
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
    previewStops: ["武康大楼", "衡山路", "街角书店"],
    shareCopy: "适合慢慢走，也适合把路上的句子写进手帐。",
    bestFor: "轻松散步、书店停留、午后咖啡",
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
    previewStops: ["鼓楼", "钟楼", "胡同唱片店"],
    shareCopy: "适合把北京旧城当成一段声音地图来走。",
    bestFor: "音乐主题、胡同观察、夜色前散步",
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
    previewStops: ["沙面大街", "露德圣母堂", "珠江岸线"],
    shareCopy: "适合发给喜欢树影、骑楼和江风的人。",
    bestFor: "建筑入门、江岸散步、轻松拍照",
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
    previewStops: ["湖滨步行街", "南山路", "书店休息点"],
    shareCopy: "一条不急着打卡、适合把湖边留给傍晚的路线。",
    bestFor: "慢行、阅读、轻食休息",
    themes: ["书店", "文学", "美食"],
    pace: "轻松",
    duration: "一天",
    href: routeUrl("demo"),
  },
  {
    id: "suzhou-garden-reading",
    city: "苏州",
    title: "园林边界与旧城阅读",
    summary: "从园林、书店和老街巷观察苏州的空间层次。",
    previewStops: ["平江路", "拙政园外街巷", "苏州博物馆片区"],
    shareCopy: "适合第一次把苏州从景点清单变成一条可走的线。",
    bestFor: "园林观察、旧城慢走、书店补点",
    themes: ["历史", "建筑", "书店"],
    pace: "平衡",
    duration: "一天",
    href: routeUrl("demo"),
  },
  {
    id: "chengdu-teahouse-food",
    city: "成都",
    title: "茶馆、街巷与晚餐",
    summary: "把茶馆、市井街巷和一顿晚餐组织成松弛路线。",
    previewStops: ["人民公园", "宽窄巷子边线", "晚餐片区"],
    shareCopy: "适合不赶景点，只想把成都的生活节奏走出来。",
    bestFor: "美食、茶馆、市井观察",
    themes: ["美食", "历史"],
    pace: "轻松",
    duration: "半天",
    href: routeUrl("demo"),
  },
  {
    id: "xian-city-wall-memory",
    city: "西安",
    title: "城墙内外的时间层",
    summary: "沿城墙、碑林和街区边界看古都的日常更新。",
    previewStops: ["南门城墙", "碑林片区", "书院门"],
    shareCopy: "适合把西安从宏大历史拉回到可步行的街区细节。",
    bestFor: "历史线索、建筑边界、夜游前半日",
    themes: ["历史", "建筑"],
    pace: "平衡",
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
