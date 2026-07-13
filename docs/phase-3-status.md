# Phase 3 Status

Date: 2026-07-14

## Scope

Phase 3 has started. The goal is to build the map and route kernel before adding
AI: real POI confirmation, real walking-route calculation, clear data-source
labels, and manual route editing.

## Implemented In First Slice

- Route kernel pure functions:
  - timeline recalculation from walking legs and stay time
  - total walking distance, walking time, stay time, and route duration
  - duplicate POI detection
  - fixed appointment conflict detection
  - missing start/end and missing leg warnings
- Map provider boundary:
  - shared coordinate and POI types
  - explicit coordinate system labels, including `gcj02`
  - AMap URL helpers for place search and walking navigation
  - local fallback walking-leg estimator marked as `estimated`
- Route reader integration:
  - top-level route source label
  - per-leg `高德` / `估算` source badge
  - route validation alert area
  - "打开高德步行导航" / "在高德查看地点" links
  - map source note explaining that current demo legs are local estimates
- Tests:
  - timeline pure-function test
  - fixed appointment conflict test
  - duplicate POI test
  - start/end requirement test
  - estimated-vs-provider source test
  - AMap URL and POI parsing tests

## Not Yet Done

- Configure actual AMap JS API key and domain allowlist.
- Add AMap Web Service proxy; do not expose the Web Service key in the browser.
- Implement live place input suggestions.
- Persist confirmed AMap POIs into `places`.
- Calculate real walking legs from AMap Web Service.
- Draw real AMap markers and polylines.
- Add manual place creation UI.
- Add drag sorting, add/delete stops, and recalculation UI.
- Save route-kernel conflict results into the route editing flow.

## Guardrails

- Do not present estimated walking time or distance as provider truth.
- Keep all map coordinates explicitly labeled with their coordinate system.
- For MVP, AMap POIs, map display, and walking routes should stay in GCJ-02.
- The AMap JS browser key can be public with domain restrictions.
- The AMap Web Service key must remain server-side only.
