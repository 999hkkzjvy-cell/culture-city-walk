# Phase 4/5 Status

Date: 2026-07-15

## Scope

Phase 4/5 development has a key split:

- Product flow, data contracts, validation, scoring, and fallback UI can be
  developed before external API keys are available.
- Real AMap POI search, real detour calculation, and DeepSeek calls still need
  API configuration before they can be treated as provider-backed output.

## Implemented Before API Configuration

- Complete-mode route candidate pipeline:
  - candidate type taxonomy
  - repeated route POIs are allowed so loops and return-to-origin routes can be planned
  - best insertion-point estimation
  - detour, theme, and diversity scoring
  - `非常顺路` / `推荐` / `可考虑` bands
  - candidate cache keys
  - provenance and risk labels for locally seeded candidates
- Planning page Complete-mode UI:
  - natural-language route goal input
  - city changes reset stale route preview and candidate state so old-city stops
    are not reused as new-city route context
  - generate along-route candidates
  - candidate type filters
  - grouped candidate bands
  - separate pending, processed, and ignored candidate sections
  - restore ignored candidates and withdraw processed candidate decisions
  - add to route plan, mark as backup, or ignore
  - undo candidate insertion
  - editable route preview with move, delete, and stay-time controls
  - recalculated timeline, walking distance, end time, and route impact summary
  - local persistence for route preview and candidate actions
  - local template source and zero-cost usage label
- Route editing foundation:
  - pure candidate insertion function
  - estimated leg recalculation after insert, delete, move, or stay-time edits
  - repeated POI support with distinct route-stop identities
  - minimum two-stop route guard for established routes, while one-stop fresh
    city drafts can still be cleared
- Route reader local preview:
  - route reader prefers the locally saved planning preview
  - saved candidate insertions, ordering, and stay-time edits survive refresh
  - route reader falls back to the demo route when no local preview exists
- Cloud/local bridge:
  - route-page save/share actions now use the current local route preview
  - route-page cloud actions now expose the same share manager as route library,
    including create/copy/revoke states after the route has a cloud ID
  - save/share/snapshot creation migrates local `demo` previews to the saved
    cloud route ID before follow-up operations, preventing repeated cloud route
    creation after a partial candidate-state sync failure
  - cloud route stops persist coordinate/source/verification fields in
    `route_stops.note`, so map rendering and AMap walking recalculation survive
    cloud reloads
  - library-page save action now saves the current local route preview
  - signed-in auth panel can sync the current local preview to cloud storage
  - signed-in auth panel prompts when the local preview has not been synced yet
  - route-candidate snapshots and `joined` / `backup` / `ignored` actions are
    saved through the route repository
- Route reader editing:
  - route reader exposes an edit mode
  - stop stay time and note can be edited from the reader
  - stops can be deleted from the reader while preserving the two-stop minimum
  - edits are saved to the local route preview and survive refresh
- Route reader fallback content:
  - route title and summary can be generated from deterministic templates
  - stop-level history/literature style content uses template fallback
  - fallback story content is labeled as source-pending
  - middle-stop expandable deep-read sections show concrete observation angles
    and practical verification tips; start/end stops do not show deep-read UI
  - when DeepSeek proxy is enabled, middle-stop deep reads can generate longer
    architecture/history/anecdote content and check-in tasks on demand
- Share experience:
  - route-page share button scrolls to cloud share actions
  - generated share links can be copied and revoked from route page or library
  - share reader shows expiry state and source-verification note when connected
- Repository candidate persistence:
  - local repository stores candidate snapshots in localStorage
  - Supabase repository replaces the current route's `route_candidates` rows on
    save
  - candidate rows include source, source POI ID, score, fit band, insertion
    point, detour, stay time, reasons, risks, cache key, and status
- Developer status panel:
  - Supabase client configuration state
  - AMap JS key configuration state
  - AMap Web Service and AI provider pending states
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
  - local route plan and candidate-state storage tests
  - route-reader local edit smoke test
  - candidate processed-state smoke test
  - route-reader fallback story smoke test
  - local intent parsing test
  - invalid AI-created POI rejection test
  - fallback candidate ranking test
  - AI usage logging test
  - Playwright Complete-mode candidate insertion smoke test
  - Playwright saved-preview-to-route-reader smoke test

## AMap Integration Status

- AMap JS browser map rendering is implemented when the public JS key and
  domain allowlist are configured.
- AMap Web Service proxy is implemented through `amap-proxy`.
- Live POI suggestions for must-visit places are implemented through the proxy.
- Route polyline sampling and nearby POI search along sampled route points are
  implemented for candidate generation.
- Local seeded candidate fallback is Nanjing-only. Other cities only show
  provider-returned same-city POIs; if AMap returns no usable same-city POIs,
  the UI explains that the current city has no local fallback candidates instead
  of showing Nanjing places.

Still pending:

- Provider-backed detour calculation.
- Persisting confirmed AMap POIs into `places`.
- Provider-backed cycling/transit/driving/taxi route APIs.
- Opening-hours/facts verification beyond provider category/name/address
  filtering.

## DeepSeek Integration Status

- `deepseek-proxy` Edge Function proxies DeepSeek JSON-mode requests for
  planning intent parsing and candidate ranking.
- The planning page uses DeepSeek when
  `NEXT_PUBLIC_DEEPSEEK_PROXY_ENABLED=true`, and falls back to local templates
  on missing config or provider failure.
- Signed-in users' planning intent and candidate ranking runs are logged to
  `route_ai_runs` with prompt version, model, token counts, latency, estimated
  cost, and idempotency key.

Still pending:

- One repair retry on schema validation failure.
- Enforcing daily user/project AI limits from the logged usage records.

## Guardrails

- Locally seeded candidates are marked `source_pending` and must not be
  presented as verified AMap results.
- Locally seeded candidates must stay city-scoped; do not show the Nanjing seed
  set for Shanghai or other city drafts.
- AI fallback reasons are templates, not factual claims.
- AI proposals must only reference route stops or candidates supplied by the
  application.
- AI failure must not block route saving or sharing.
