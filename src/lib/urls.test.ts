import { describe, expect, it } from "vitest";
import {
  readRecommendedRouteDraftId,
  readRouteId,
  readShareCode,
  recommendedRouteDraftUrl,
  routeUrl,
  shareUrl,
} from "./urls";

describe("url helpers", () => {
  it("creates static-export friendly route and share urls", () => {
    expect(routeUrl("demo route")).toBe("/route/?id=demo%20route");
    expect(shareUrl("abc1234567")).toBe("/share/?code=abc1234567");
    expect(recommendedRouteDraftUrl("nanjing-draft")).toBe(
      "/recommendations/?draft=nanjing-draft",
    );
  });

  it("reads route ids and validates share codes", () => {
    expect(readRouteId(new URLSearchParams("id=demo"))).toBe("demo");
    expect(readShareCode(new URLSearchParams("code=abc1234567"))).toBe("abc1234567");
    expect(readShareCode(new URLSearchParams("code=short"))).toBeNull();
    expect(readShareCode(new URLSearchParams("code=<script>bad</script>"))).toBeNull();
    expect(
      readRecommendedRouteDraftId(new URLSearchParams("draft=nanjing-draft")),
    ).toBe("nanjing-draft");
  });
});
