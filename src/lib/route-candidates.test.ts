import { describe, expect, it } from "vitest";
import { demoRoute } from "@/lib/route";
import {
  generateRouteCandidates,
  getCandidateBandLabel,
} from "@/lib/route-candidates";

describe("route candidates", () => {
  it("scores and sorts local candidates without duplicate route POIs", () => {
    const candidates = generateRouteCandidates(demoRoute, {
      themes: ["历史", "文学"],
      maxResults: 4,
    });

    expect(candidates).toHaveLength(4);
    expect(candidates.map((candidate) => candidate.score)).toEqual(
      [...candidates.map((candidate) => candidate.score)].sort((a, b) => b - a),
    );
    expect(candidates).not.toContainEqual(
      expect.objectContaining({
        place: expect.objectContaining({
          sourcePlaceId: "librairie",
        }),
      }),
    );
  });

  it("keeps candidate provenance clear while API keys are deferred", () => {
    const [candidate] = generateRouteCandidates(demoRoute, {
      themes: ["历史"],
      maxResults: 1,
    });

    expect(candidate.place.source).toBe("manual");
    expect(candidate.place.verificationStatus).toBe("source_pending");
    expect(candidate.risks).toContain("地点信息待高德复核");
    expect(getCandidateBandLabel(candidate.fitBand)).toMatch(
      /非常顺路|推荐|可考虑/,
    );
  });

  it("filters candidates by accepted place types", () => {
    const candidates = generateRouteCandidates(demoRoute, {
      themes: ["历史"],
      acceptedTypes: ["博物馆"],
      maxResults: 5,
    });

    expect(candidates).toHaveLength(2);
    expect(
      candidates.every((candidate) => candidate.placeType === "博物馆"),
    ).toBe(true);
  });
});
