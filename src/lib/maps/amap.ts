import type { Coordinate, PlaceCandidate } from "@/lib/maps/types";
import type { RouteTravelMode } from "@/lib/route";

const AMAP_URI_BASE = "https://uri.amap.com";

export function isAmapJsConfigured() {
  return Boolean(process.env.NEXT_PUBLIC_AMAP_JS_KEY?.trim());
}

export function amapPlaceSearchUrl(place: {
  name: string;
  city?: string;
  address?: string;
}) {
  const keyword = [place.name, place.address].filter(Boolean).join(" ");
  const params = new URLSearchParams({
    keyword,
    callnative: "1",
  });

  if (place.city) {
    params.set("city", place.city);
  }

  return `${AMAP_URI_BASE}/search?${params.toString()}`;
}

export function amapWalkingNavigationUrl(input: {
  from?: { name: string; coordinate?: Coordinate | null };
  to: { name: string; coordinate?: Coordinate | null };
  mode?: RouteTravelMode;
}) {
  const params = new URLSearchParams({
    mode: amapUriMode(input.mode),
    policy: "1",
    coordinate: "gaode",
    callnative: "1",
    src: "culture-city-walk",
  });

  const from = formatAmapPoint(input.from);
  const to = formatAmapPoint(input.to);

  if (from) {
    params.set("from", from);
  }

  if (to) {
    params.set("to", to);
    return `${AMAP_URI_BASE}/navigation?${params.toString()}`;
  }

  return amapPlaceSearchUrl({ name: input.to.name });
}

function amapUriMode(mode: RouteTravelMode = "walking") {
  switch (mode) {
    case "cycling":
      return "ride";
    case "transit":
      return "bus";
    case "driving":
    case "taxi":
      return "car";
    case "walking":
      return "walk";
  }
}

export function placeCandidateFromAmapPoi(poi: {
  id: string;
  name: string;
  address?: string;
  cityname?: string;
  adname?: string;
  adcode?: string;
  type?: string;
  location?: string;
  openingHours?: string | null;
  telephone?: string | null;
  providerRating?: string | null;
  providerCost?: string | null;
}): PlaceCandidate {
  return {
    id: `amap:${poi.id}`,
    source: "amap",
    sourcePlaceId: poi.id,
    name: poi.name,
    address: poi.address ?? null,
    city: poi.cityname ?? "",
    district: poi.adname ?? null,
    adcode: poi.adcode ?? null,
    coordinate: parseAmapLocation(poi.location),
    poiType: poi.type ?? null,
    openingHours: poi.openingHours ?? null,
    telephone: poi.telephone ?? null,
    providerRating: poi.providerRating ?? null,
    providerCost: poi.providerCost ?? null,
    verificationStatus: "verified",
  };
}

function formatAmapPoint(place?: {
  name: string;
  coordinate?: Coordinate | null;
}) {
  if (!place?.coordinate || place.coordinate.system !== "gcj02") {
    return null;
  }

  return `${place.coordinate.lng},${place.coordinate.lat},${place.name}`;
}

function parseAmapLocation(location?: string): Coordinate | null {
  if (!location) {
    return null;
  }

  const [lngValue, latValue] = location.split(",");
  const lng = Number(lngValue);
  const lat = Number(latValue);

  if (!Number.isFinite(lng) || !Number.isFinite(lat)) {
    return null;
  }

  return { lng, lat, system: "gcj02" };
}
