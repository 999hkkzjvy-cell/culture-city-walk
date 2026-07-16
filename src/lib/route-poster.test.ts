import { describe, expect, it } from "vitest";
import { demoRoute } from "@/lib/route";
import { buildRoutePosterSvg, routePosterFileName } from "@/lib/route-poster";

describe("route poster", () => {
  it("builds a downloadable SVG poster from a route", () => {
    const svg = buildRoutePosterSvg(demoRoute);

    expect(svg).toContain("<svg");
    expect(svg).toContain("书页与旧城之间");
    expect(svg).toContain("先锋书店");
    expect(svg).toContain("出发前请再次核验");
    expect(routePosterFileName(demoRoute)).toMatch(/poster\.svg$/);
  });
});
