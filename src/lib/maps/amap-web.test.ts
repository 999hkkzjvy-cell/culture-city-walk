import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  createAmapWebServiceProvider,
  isAmapWebProxyConfigured,
} from "./amap-web";

const mocks = vi.hoisted(() => ({
  invoke: vi.fn(),
}));

vi.mock("@/lib/supabase/client", () => ({
  createBrowserSupabaseClient: () =>
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      ? {
          functions: {
            invoke: mocks.invoke,
          },
        }
      : null,
  isSupabaseConfigured: () =>
    Boolean(
      process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    ),
}));

describe("amap web service provider", () => {
  const originalUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const originalAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  beforeEach(() => {
    mocks.invoke.mockReset();
  });

  afterEach(() => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = originalUrl;
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = originalAnonKey;
  });

  it("requires Supabase configuration before calling the Edge Function", () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    expect(isAmapWebProxyConfigured()).toBe(false);

    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-key";

    expect(isAmapWebProxyConfigured()).toBe(true);
  });

  it("searches nearby places through the Edge Function proxy", async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-key";
    mocks.invoke.mockResolvedValueOnce({
      data: {
        places: [
          {
            id: "B001",
            name: "六朝博物馆",
            address: "长江路 302 号",
            cityname: "南京市",
            adname: "玄武区",
            adcode: "320102",
            type: "科教文化服务;博物馆",
            location: "118.797000,32.043800",
            openingHours: "09:00-17:00",
            telephone: "025-12345678",
            providerRating: "4.8",
            providerCost: "35.00",
          },
        ],
      },
      error: null,
    });

    const provider = createAmapWebServiceProvider();
    const places = await provider?.searchPlacesAround?.({
      center: { lng: 118.7953, lat: 32.0454, system: "gcj02" },
      city: "南京",
      types: "科教文化服务",
      radiusMeters: 1200,
      limit: 6,
    });

    expect(mocks.invoke).toHaveBeenCalledWith("amap-proxy", {
      body: {
        action: "place-around",
        center: { lng: 118.7953, lat: 32.0454 },
        city: "南京",
        types: "科教文化服务",
        radiusMeters: 1200,
        limit: 6,
      },
    });
    expect(places?.[0]).toEqual(
      expect.objectContaining({
        source: "amap",
        sourcePlaceId: "B001",
        name: "六朝博物馆",
        city: "南京市",
        verificationStatus: "verified",
        openingHours: "09:00-17:00",
        telephone: "025-12345678",
        providerRating: "4.8",
        providerCost: "35.00",
      }),
    );
  });
});
