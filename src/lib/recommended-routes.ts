import type { Theme } from "@/lib/route";
import { curatedRouteDrafts } from "@/lib/curated-route-drafts";
import { humanSmokeRouteId } from "@/lib/published-curated-routes";
import { recommendedRouteDraftUrl, routeUrl } from "@/lib/urls";

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

// 除已通过审核并写入正式路线包的路线外，精选路线仍只作为编辑稿展示。
export const recommendedRoutes: RecommendedRoute[] = curatedRouteDrafts.map(
  (draft) => {
    const published = draft.id === "nanjing-watergate-to-bookstore-draft";

    return {
      id: draft.id,
      city: draft.city,
      title: draft.title,
      centralQuestion: draft.centralQuestion,
      summary: draft.summary,
      previewStops: draft.stops.slice(0, 6).map((stop) => stop.name),
      storyHighlights: draft.storyHighlights,
      bestFor: draft.bestFor,
      themes: draft.themes,
      pace: draft.pace,
      duration: draft.duration,
      status: published ? "published" : draft.status,
      href: published ? routeUrl(humanSmokeRouteId) : recommendedRouteDraftUrl(draft.id),
    };
  },
);

export const recommendationThemes: Theme[] = ["历史", "文学", "建筑", "书店"];
export const recommendationPaces: RoutePace[] = ["轻松", "平衡", "紧凑"];
export const recommendationDurations: RouteDuration[] = ["半天", "一天"];
