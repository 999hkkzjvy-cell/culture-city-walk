import { placeCandidateFromAmapPoi } from "@/lib/maps/amap";
import {
  MapProviderError,
  type Coordinate,
  type MapProvider,
  type PlaceCandidate,
} from "@/lib/maps/types";
import {
  createBrowserSupabaseClient,
  isSupabaseConfigured,
} from "@/lib/supabase/client";

type AmapProxyPlace = {
  id: string;
  name: string;
  address: string | null;
  cityname: string;
  adname: string | null;
  adcode: string | null;
  type: string | null;
  location: string | null;
};

type AmapWalkingProxyResponse = {
  distanceMeters: number;
  durationSeconds: number;
  polyline: Coordinate[];
};

export function isAmapWebProxyConfigured() {
  return isSupabaseConfigured();
}

export function createAmapWebServiceProvider(): MapProvider | null {
  const client = createBrowserSupabaseClient();

  if (!client) {
    return null;
  }

  return {
    async suggestPlaces(input) {
      const data = await invokeAmapProxy<{ places: AmapProxyPlace[] }>(
        "place-text",
        {
          keyword: input.keyword,
          city: input.city,
          limit: 8,
        },
      );

      return data.places.map(mapProxyPlaceToCandidate);
    },

    async calculateWalkingRoute(input) {
      const origin = toAmapPoint(input.origin);
      const destination = toAmapPoint(input.destination);

      if (!origin || !destination) {
        throw new MapProviderError(
          "invalid_place",
          "Walking route requires GCJ-02 coordinates.",
        );
      }

      const data = await invokeAmapProxy<AmapWalkingProxyResponse>("walking", {
        origin,
        destination,
      });

      return {
        fromPlaceId: input.origin.id,
        toPlaceId: input.destination.id,
        distanceMeters: data.distanceMeters,
        durationMinutes: Math.max(1, Math.round(data.durationSeconds / 60)),
        source: "provider",
        provider: "amap",
        polyline: data.polyline,
      };
    },
  };
}

async function invokeAmapProxy<T>(action: string, payload: object): Promise<T> {
  const client = createBrowserSupabaseClient();

  if (!client) {
    throw new MapProviderError("not_configured", "Supabase is not configured.");
  }

  const { data, error } = await client.functions.invoke("amap-proxy", {
    body: {
      action,
      ...payload,
    },
  });

  if (error) {
    throw new MapProviderError("provider_error", error.message);
  }

  if (!data) {
    throw new MapProviderError("provider_error", "Empty AMap proxy response.");
  }

  return data as T;
}

function mapProxyPlaceToCandidate(place: AmapProxyPlace): PlaceCandidate {
  return placeCandidateFromAmapPoi({
    id: place.id,
    name: place.name,
    address: place.address ?? undefined,
    cityname: place.cityname,
    adname: place.adname ?? undefined,
    adcode: place.adcode ?? undefined,
    type: place.type ?? undefined,
    location: place.location ?? undefined,
  });
}

function toAmapPoint(place: PlaceCandidate) {
  if (!place.coordinate || place.coordinate.system !== "gcj02") {
    return null;
  }

  return {
    id: place.sourcePlaceId,
    lng: place.coordinate.lng,
    lat: place.coordinate.lat,
  };
}
