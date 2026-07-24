import { parseShareCode } from "./validation/route-schemas";

export function routeUrl(routeId: string) {
  return `/route/?id=${encodeURIComponent(routeId)}`;
}

export function journeyUrl(routeId: string) {
  return `/journey/?id=${encodeURIComponent(routeId)}`;
}

export function journeyArchiveUrl() {
  return "/journeys/";
}

export function shareUrl(code: string) {
  return `/share/?code=${encodeURIComponent(code)}`;
}

export function libraryUrl() {
  return "/library/";
}

export function recommendedRoutesUrl() {
  return "/recommendations/";
}

export function recommendedRouteDraftUrl(draftId: string) {
  return `/recommendations/?draft=${encodeURIComponent(draftId)}`;
}

export function readRecommendedRouteDraftId(searchParams: URLSearchParams) {
  return normalizeParam(searchParams.get("draft"));
}

export function readRouteId(searchParams: URLSearchParams) {
  return normalizeParam(searchParams.get("id"));
}

export function readShareCode(searchParams: URLSearchParams) {
  return parseShareCode(searchParams.get("code"));
}

function normalizeParam(value: string | null) {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}
