import { describe, expect, it } from "vitest";
import { isCloudRouteId } from "@/lib/validation/route-schemas";

describe("route schema helpers", () => {
  it("distinguishes cloud route UUIDs from local route ids", () => {
    expect(isCloudRouteId("caa0155b-419b-4afd-a1d8-7f92703882a2")).toBe(
      true,
    );
    expect(isCloudRouteId("demo")).toBe(false);
    expect(isCloudRouteId("local-import-1784136701757")).toBe(false);
    expect(isCloudRouteId("share-nanjing-minguo")).toBe(false);
  });
});
