export type CoordinateSystem = "gcj02" | "wgs84" | "bd09" | "unknown";

export type Coordinate = {
  lng: number;
  lat: number;
  system: CoordinateSystem;
};

export type PlaceVerificationStatus =
  "verified" | "user_confirmed" | "source_pending" | "possibly_outdated";

export type MapDataSource = "amap" | "manual" | "estimated";

export type PlaceCandidate = {
  id: string;
  source: MapDataSource;
  sourcePlaceId: string | null;
  name: string;
  address: string | null;
  city: string;
  district: string | null;
  adcode: string | null;
  coordinate: Coordinate | null;
  poiType: string | null;
  verificationStatus: PlaceVerificationStatus;
};

export type WalkingRouteLeg = {
  fromPlaceId: string;
  toPlaceId: string;
  distanceMeters: number;
  durationMinutes: number;
  source: "provider" | "estimated";
  provider: "amap" | "local";
  polyline?: Coordinate[];
};

export type MapProviderErrorCode =
  | "not_configured"
  | "network_error"
  | "provider_error"
  | "invalid_place"
  | "route_not_found";

export class MapProviderError extends Error {
  constructor(
    public readonly code: MapProviderErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "MapProviderError";
  }
}

export interface MapProvider {
  suggestPlaces(input: {
    keyword: string;
    city?: string;
  }): Promise<PlaceCandidate[]>;
  calculateWalkingRoute(input: {
    origin: PlaceCandidate;
    destination: PlaceCandidate;
  }): Promise<WalkingRouteLeg>;
}
