# Phase 4/5 Status

Date: 2026-07-14

## Scope

Phase 4/5 development has a key split:

- Product flow, data contracts, validation, scoring, and fallback UI can be
  developed before external API keys are available.
- Real AMap POI search, real detour calculation, and DeepSeek calls still need
  API configuration before they can be treated as provider-backed output.

## Implemented Before API Configuration

- Complete-mode route candidate pipeline:
  - candidate type taxonomy
  - duplicate POI exclusion
  - best insertion-point estimation
  - detour, theme, and diversity scoring
  - `非常顺路` / `推荐` / `可考虑` bands
  - candidate cache keys
  - provenance and risk labels for locally seeded candidates
- Planning page Complete-mode UI:
  - natural-language route goal input
  - generate along-route candidates
  - candidate type filters
  - grouped candidate bands
  - add to route plan, mark as backup, or ignore
  - undo candidate insertion
  - editable route preview with move, delete, and stay-time controls
  - recalculated timeline, walking distance, end time, and route impact summary
  - local template source and zero-cost usage label
- Route editing foundation:
  - pure candidate insertion function
  - estimated leg recalculation after insert, delete, move, or stay-time edits
  - duplicate insertion guard
  - minimum two-stop route guard
- Supabase schema foundation:
  - `route_candidates` table for suggested / joined / backup / ignored states
  - `route_ai_runs` table for prompt version, schema version, token, cost,
    latency, and idempotency tracking
  - owner-scoped RLS policies for both tables
- AI collaboration fallback:
  - structured intent schema
  - route proposal schema
  - stop theme-content schema
  - local intent parser
  - template candidate ranking and recommendation reasons
  - proposal validation that rejects POI IDs outside the supplied set
  - deterministic route title and summary fallback
- Tests:
  - candidate sorting and provenance tests
  - candidate type-filter test
  - route candidate insertion, move, delete, and stay-time tests
  - local intent parsing test
  - invalid AI-created POI rejection test
  - fallback candidate ranking test
  - Playwright Complete-mode candidate insertion smoke test

## Still Requires AMap Configuration

- AMap JS browser key and domain allowlist.
- AMap Web Service proxy.
- Live POI suggestions.
- Route polyline sampling.
- Nearby POI search along sampled route points.
- Provider-backed detour calculation.
- Persisting confirmed AMap POIs into `places`.
- Replacing estimated preview legs with provider-backed leg recalculation after
  each edit.

## Still Requires AI API Configuration

- DeepSeek provider adapter.
- JSON mode request/response handling.
- One repair retry on schema validation failure.
- Prompt version persistence.
- Token, latency, and cost logging against user/project limits.
- Idempotency keys for identical route-generation requests.

## Guardrails

- Locally seeded candidates are marked `source_pending` and must not be
  presented as verified AMap results.
- AI fallback reasons are templates, not factual claims.
- AI proposals must only reference route stops or candidates supplied by the
  application.
- AI failure must not block route saving or sharing.
