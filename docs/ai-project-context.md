# AI Project Context

Last updated: 2026-07-15

This is the first document future AI agents should read before changing the
Cultural Citywalk codebase. It summarizes product intent, architecture, current
state, and the files that matter most.

## Agent Workflow Rules

- Read this file before product, data, auth, Supabase, deployment, or UI
  changes.
- Commit messages must be written in Chinese.
- Before every commit, update `ignore-files/项目提交日志.md` with a Chinese
  summary of the changes and update this file when the project state,
  architecture, setup, or priorities changed.
- `ignore-files/项目提交日志.md` is intentionally tracked even though
  `ignore-files/` is ignored, so future agents can quickly understand the
  project's commit history. Do not force-add other files from `ignore-files/`
  unless the user explicitly asks.
- The homepage hero title in `src/app/page.tsx` is intentionally simplified to
  `细读一座城`. Do not revert it to the earlier question-style headline.

## Product In One Paragraph

Cultural Citywalk is a private city-walk planning assistant for reading a city
through history, literature, architecture, music, bookstores, food, and urban
memory. The core principle from the product architecture is: geography first,
theme enhanced, AI collaborative, facts verifiable. Routes must be realistically
walkable before they are thematically rich.

## Source Documents

- Product architecture: `ignore-files/Citywalk-AI-完整产品与技术架构-v3.md`
- UI references: `ignore-files/UI-web.jpg`, `ignore-files/UI-mobile.jpg`
- Commit/change log: `ignore-files/项目提交日志.md`
- Phase 1 audit: `docs/phase-1-audit.md`
- Phase 2 status: `docs/phase-2-status.md`
- Phase 4/5 status: `docs/phase-4-5-status.md`
- User-facing setup: `README.md`
- Agent rule: `AGENTS.md`

Important: `ignore-files/` is intentionally ignored by git, but exists locally
as product/design reference material.

## Current Technical Shape

- Framework: Next.js App Router, React, TypeScript.
- Deployment: static export to GitHub Pages.
- Styling: global CSS in `src/app/globals.css`, using paper/archive design
  tokens and `next/font` Noto Sans SC / Noto Serif SC.
- Tests: Vitest for pure functions, Playwright for desktop/mobile smoke tests.
- Data: local demo/localStorage fallback plus Supabase-backed auth, routes,
  shares, read-only share lookup, and the first Phase 3 route-kernel/map-provider
  abstractions.
- Icons: `lucide-react`.

## Important Next.js Note

This project uses a Next.js version with breaking changes relative to many
pretrained assumptions. Before changing Next.js APIs, routing, static export, or
font/image behavior, read the relevant docs in `node_modules/next/dist/docs/`.

## Main Routes

- `/` - home page with planning mode cards and featured themes.
- `/plan/` - planning conversation mock and route summary.
- `/route/?id=demo` - route reader for the local demo route.
- `/library/` - user's route workspace. Signed-out users see the same
  email-password login/register form as `/login/`; signed-in users get a
  two-column route library with left navigation for `我的规划` and `我的收藏`.
- `/recommendations/` - two-column recommended-route explorer with city,
  theme, pace, and duration filters.
- `/login/` - standalone login/register page for Supabase email-password auth.
- `/profile/` - signed-in profile center for display name, location, WeChat,
  signature, and avatar URL.
- `/share/?code=...` - read-only shared route loaded from Supabase Edge Function.
- `/about/` - product purpose and principles page.
- `/guide/` - short usage guide for planning, candidates, editing, and sharing.

Because the app is statically exported for GitHub Pages, dynamic route IDs are
passed through query strings rather than dynamic App Router segments.

## Key Files

- `src/app/page.tsx` - home page and featured route entry.
- `src/app/plan/page.tsx` - planning page shell.
- `src/app/route/page.tsx` - route reader page and map/timeline layout.
- `src/app/library/page.tsx` - auth and saved route archive page.
- `src/app/recommendations/page.tsx` - recommended-route explorer page.
- `src/app/login/page.tsx` - login/register page.
- `src/app/profile/page.tsx` - profile center page.
- `src/app/share/page.tsx` - shared route page.
- `src/app/about/page.tsx` - about page.
- `src/app/guide/page.tsx` - usage guide page.
- `src/app/globals.css` - design system, responsive layout, route reader UI.
- `src/app/layout.tsx` - app metadata and font loading.
- `src/components/site-header.tsx` - shared top navigation.
- `src/components/planning-desk.tsx` - planning interaction mock.
- `src/components/auth/auth-panel.tsx` - Supabase magic-link auth UI.
- `src/components/auth/auth-nav.tsx` - header login/avatar entry.
- `src/components/auth/login-form.tsx` - email-password login/register form.
- `src/components/auth/profile-center.tsx` - profile editing form.
- `src/components/routes/library-workspace.tsx` - library auth gate, left
  navigation, and theme-filtered route workspace.
- `src/components/routes/route-library.tsx` - saved route list.
- `src/components/routes/recommended-routes-explorer.tsx` - city/theme/pace/
  duration filtering UI for recommended routes.
- `src/components/routes/route-cloud-actions.tsx` - save/share controls.
- `src/components/routes/route-reader.tsx` - client route reader that prefers
  the locally saved planning preview and falls back to the demo route. It also
  exposes local reader-side edit controls for stay time, notes, and deletion.
- `src/components/routes/shared-route-reader.tsx` - read-only share loader.
- `src/components/developer-status-panel.tsx` - planning-page status panel for
  local/API configuration state.
- `src/lib/route.ts` - route types and demo route data.
- `src/lib/recommended-routes.ts` - static recommended-route catalog used by
  `/recommendations/`.
- `src/lib/route-kernel.ts` - Phase 3 pure route timeline, totals, and
  validation functions.
- `src/lib/route-candidates.ts` - Phase 4 candidate scoring, detour estimation,
  AMap POI-to-candidate conversion, type inference, dedupe, and fallback
  provenance labels.
- `src/lib/route-editing.ts` - pre-API route editing primitives for candidate
  insertion, stop deletion, moving, stay-time edits, leg travel-mode edits,
  manual leg-minute edits, and estimated leg recalculation.
- `src/lib/transport.ts` - local route travel-mode labels and estimated
  duration rules for walking, cycling, transit, driving, and taxi legs.
- `src/lib/ai/route-collaboration.ts` - Phase 5 structured intent, AI proposal,
  and theme-content schemas plus local fallback behavior.
- `src/lib/maps/types.ts` - map provider, coordinate, POI, and walking-leg
  contracts.
- `src/lib/maps/amap.ts` - AMap URI helpers and POI parsing helpers.
- `src/lib/maps/amap-web.ts` - browser-side AMap Web Service provider that
  calls the Supabase `amap-proxy` Edge Function instead of exposing the Web
  Service key.
- `src/lib/maps/route-candidate-search.ts` - AMap along-route candidate search
  helpers, including stable POI type-code mapping, per-sample timeout, and
  partial-failure collection.
- `src/lib/maps/fallback.ts` - local estimated walking-leg fallback.
- `src/lib/repositories/route-repository.ts` - local/Supabase route repository.
  It also persists route-candidate snapshots and candidate action states through
  localStorage or the `route_candidates` table.
- `src/lib/supabase/client.ts` - browser Supabase client.
- `src/lib/supabase/database.types.ts` - generated/hand-maintained DB types.
- `src/lib/urls.ts` - static-export URL helpers.
- `src/lib/storage.ts` - localStorage draft persistence.
- `src/lib/storage.ts` also stores the current local `RoutePlan` preview and
  route-candidate action state.
- `src/lib/validation/route-schemas.ts` - Zod URL/input validation.

## Supabase State

Remote project:

- Name: `culture-city-walk`
- Project ref: `wedwvcmdbrnbzjwlllgl`
- Region: `ap-southeast-1`
- URL: `https://wedwvcmdbrnbzjwlllgl.supabase.co`

Implemented:

- Migration: `supabase/migrations/20260713000100_phase2_routes_auth.sql`
- Migration: `supabase/migrations/20260714000100_phase4_candidates_ai_runs.sql`
- Migration: `supabase/migrations/20260715000100_profile_details.sql`
- Tables: `profiles`, `places`, `routes`, `route_stops`,
  `route_constraints`, `route_snapshots`, `route_shares`,
  `route_candidates`, `route_ai_runs`
- Storage bucket: private `route-media`
- RLS: owner-only access for route data
- Edge Function: `share-route`
- Edge Function: `amap-proxy` for AMap POI keyword search, nearby POI search,
  and walking-route proxy calls. Keep `AMAP_WEB_SERVICE_KEY` in Supabase
  Function secrets only.
- Edge Function: `deepseek-proxy` for DeepSeek JSON-mode intent parsing and
  candidate ranking. Keep `DEEPSEEK_API_KEY` in Supabase Function secrets only.
- Seed script: `supabase/seed.sql`
- Public seed share code: `nanjing-minguo`
- Seed share URL:
  `https://999hkkzjvy-cell.github.io/culture-city-walk/share/?code=nanjing-minguo`

The `share-route` function is deployed with `verify_jwt=false` because public
share links are read by share code, expiry, and revoked-state checks in the
function body.

## Auth Behavior

Auth is MVP-level Supabase Auth:

- The legacy sync auth panel lives on `/library/` and calls
  `supabase.auth.signInWithOtp`.
- The main header also exposes `/login/` and `/profile/`.
- `/login/` supports email-password login/register through Supabase Auth.
- `/profile/` updates `profiles.display_name`, `avatar_url`, `location`,
  `wechat_id`, and `bio`.
- Registration and login are the same flow.
- Sessions are persisted by Supabase JS in the browser.
- After login, users can save demo route data, list their own cloud routes, and
  generate share links. Route-page and library-page save actions now use the
  current locally edited route preview when present.

Supabase Auth URL configuration must allow GitHub Pages redirects:

- Site URL: `https://999hkkzjvy-cell.github.io/culture-city-walk/`
- Redirect URL: `https://999hkkzjvy-cell.github.io/culture-city-walk/**`
- Local redirect URL: `http://localhost:3000/**`

## Environment Variables

Local `.env.local` is ignored by git. `.env.example` documents expected keys.

Client-side:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_AMAP_JS_KEY` enables AMap JS route-map rendering in the browser.
- `NEXT_PUBLIC_AMAP_SECURITY_JS_CODE` is used for AMap JS API browser loading
  when the chosen Web key requires a security code.
- `NEXT_PUBLIC_DEEPSEEK_PROXY_ENABLED` enables browser calls to the
  `deepseek-proxy` function when set to `true`.
- `NEXT_PUBLIC_BASE_PATH` is set by GitHub Actions for Pages builds.

Server-only / function-side:

- `SUPABASE_SERVICE_ROLE_KEY`
- `SHARE_ALLOWED_ORIGINS`
- `AMAP_WEB_SERVICE_KEY` for future provider-backed walking/POI proxy
- `DEEPSEEK_API_KEY` for DeepSeek provider calls
- `DEEPSEEK_MODEL` defaults to `deepseek-v4-flash`
- `AI_DAILY_USER_LIMIT`
- `AI_PROJECT_COST_LIMIT_CNY`

Never expose service role keys in browser or GitHub Pages variables.

GitHub Actions repository variables required for Pages build:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_AMAP_JS_KEY`
- `NEXT_PUBLIC_AMAP_SECURITY_JS_CODE`
- `NEXT_PUBLIC_DEEPSEEK_PROXY_ENABLED`

## Current UX Notes

- Home page uses the simplified hero title `细读一座城` and has a featured card
  linking to the seeded南京 route.
- Top navigation is normalized to six entries: `首页`, `开始规划`, `我的路线`,
  `推荐路线`, `关于我们`, and `如何使用`. `/recommendations/` is the static
  recommended-route entry.
- `/library/` now gates signed-out users to the email-password login/register
  card. Signed-in users see a left sidebar (`我的规划`, `我的收藏`) and a right
  content area with multi-select theme filters.
- `/recommendations/` shows curated route cards in a two-column layout with a
  left filter rail for city text, theme tags, pace tags, and duration tags.
- Share links are direct URLs; there is no manual share-code input UI yet. This
  is intentional until a Xiaohongshu/poster/code-sharing use case exists.
- Phase 3 has started on the route reader. It now shows whether walking legs are
  provider-backed or locally estimated, renders an AMap JS map with route
  markers and provider/estimated polyline layers when `NEXT_PUBLIC_AMAP_JS_KEY`
  is configured, exposes AMap place/navigation links, and can recalculate
  walking legs through the `amap-proxy` Edge Function when coordinates and
  Supabase configuration are available. The AMap JS map reads route coordinates
  only and does not persist confirmed POIs into `places`; local estimates remain
  the fallback.
- Phase 4/5 development has started on `/plan/`: Complete mode can generate
  along-route candidates, score and classify them, and apply add/backup/ignore
  decisions. When `amap-proxy` is configured, candidate generation samples route
  stops, midpoints, and provider polyline points, searches nearby AMap POIs, maps
  them into route candidates, and then scores them by detour and theme fit. AMap
  POI searches use category codes and per-sample timeouts, so one failed sampled
  point no longer forces the whole candidate generation to local fallback. If
  AMap is unavailable, every sampled search fails, or the returned POIs do not
  match the route constraints, the app falls back to local seeded candidates
  with a more specific warning.
- Candidate insertion updates an editable route preview with leg recalculation,
  end-time impact, move, delete, and stay-time controls. Candidate lists support
  type filters and fit-band grouping. The route preview and candidate actions
  are persisted in localStorage, and `/route/?id=demo` reads that saved preview
  before falling back to the demo route. Signed-in users are prompted to sync
  unsynced local previews.
- Route legs support selectable travel modes: `步行`, `骑行`, `公共交通`,
  `驾车`, and `打车`. The planning preview and route reader edit mode both allow
  changing the mode for each "previous stop to this stop" leg and manually
  overriding the leg minutes. Old route data without a leg mode defaults to
  walking. AMap walking recalculation only replaces walking legs; non-walking
  legs keep local estimates or manual overrides until provider-backed mode APIs
  are added.
- The planning page's must-visit flow now lives in the left conversation column:
  users can select `出发`, `必去`, or `终点`, search AMap or manually add a place,
  and the chosen place automatically appears in the right-side route preview.
  Duplicate occurrences of the same place are allowed so loop routes are not
  constrained by de-duplication.
- AI collaboration can call the Supabase `deepseek-proxy` Edge Function when
  `NEXT_PUBLIC_DEEPSEEK_PROXY_ENABLED=true`; otherwise it keeps deterministic
  local fallback behavior.
- Auth MVP is present: header login/avatar entry, `/login/` email-password
  login/register, `/profile/` profile editing, and cloud route save/list/share
  flows after login.
- Mobile fonts and route reader layout have been adjusted to more closely match
  the UI reference. Route reader mobile uses a horizontal two-column reader so
  timeline and map remain related instead of fully stacking.
- UI is still not a pixel-perfect match to the design images. Known gaps:
  homepage mode cards use line icons rather than rich object imagery; planning
  page mobile summary is not yet the right-side paper card shown in the mock.

## Validation Commands

Use these before committing meaningful changes:

```bash
npx tsc --noEmit
npm test
npm run build
npm run e2e
```

Notes:

- In this environment, `npm run build` may need elevated permissions because
  Turbopack creates local processes/binds ports.
- `npm run e2e` starts or reuses a local dev server.
- GitHub Pages workflow runs unit tests, Playwright, static build, and deploy.

## Development Priorities

Near-term likely work:

- Phase 3 next: richer map viewport behavior, provider-backed
  cycling/transit/driving/taxi route APIs, and confirmed POI persistence beyond
  local route previews.
- Phase 4/5 next: improve sampled-route candidate quality with route polyline
  density controls, add candidate opening-hours/facts verification, and persist
  richer AI usage/cost records.
- Finish remaining Phase 2 polish opportunistically: auth redirect verification,
  clearer auth UX, local draft migration after login, route archive empty states,
  and avatar upload instead of avatar URL only.
- Improve mobile fidelity against `ignore-files/UI-mobile.jpg`.
- Keep static export constraints in mind until hosting strategy changes.

## Guardrails

- Preserve local fallback behavior when Supabase is not configured.
- Do not break GitHub Pages static export.
- Do not put secrets into committed files or frontend env vars.
- Keep RLS owner-only behavior for private routes.
- Do not assume seeded data belongs in a user's `/library/`; it is primarily for
  public share-page verification.
