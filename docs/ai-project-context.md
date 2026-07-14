# AI Project Context

Last updated: 2026-07-14

This is the first document future AI agents should read before changing the
Cultural Citywalk codebase. It summarizes product intent, architecture, current
state, and the files that matter most.

## Product In One Paragraph

Cultural Citywalk is a private city-walk planning assistant for reading a city
through history, literature, architecture, music, bookstores, food, and urban
memory. The core principle from the product architecture is: geography first,
theme enhanced, AI collaborative, facts verifiable. Routes must be realistically
walkable before they are thematically rich.

## Source Documents

- Product architecture: `ignore-files/Citywalk-AI-完整产品与技术架构-v3.md`
- UI references: `ignore-files/UI-web.jpg`, `ignore-files/UI-mobile.jpg`
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
- `/library/` - auth panel plus user's cloud route archive.
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
- `src/app/share/page.tsx` - shared route page.
- `src/app/about/page.tsx` - about page.
- `src/app/guide/page.tsx` - usage guide page.
- `src/app/globals.css` - design system, responsive layout, route reader UI.
- `src/app/layout.tsx` - app metadata and font loading.
- `src/components/site-header.tsx` - shared top navigation.
- `src/components/planning-desk.tsx` - planning interaction mock.
- `src/components/auth/auth-panel.tsx` - Supabase magic-link auth UI.
- `src/components/routes/route-library.tsx` - saved route list.
- `src/components/routes/route-cloud-actions.tsx` - save/share controls.
- `src/components/routes/route-reader.tsx` - client route reader that prefers
  the locally saved planning preview and falls back to the demo route.
- `src/components/routes/shared-route-reader.tsx` - read-only share loader.
- `src/components/developer-status-panel.tsx` - planning-page status panel for
  local/API configuration state.
- `src/lib/route.ts` - route types and demo route data.
- `src/lib/route-kernel.ts` - Phase 3 pure route timeline, totals, and
  validation functions.
- `src/lib/route-candidates.ts` - Phase 4 candidate scoring, detour estimation,
  dedupe, and fallback provenance labels.
- `src/lib/route-editing.ts` - pre-API route editing primitives for candidate
  insertion, stop deletion, moving, stay-time edits, and estimated leg
  recalculation.
- `src/lib/ai/route-collaboration.ts` - Phase 5 structured intent, AI proposal,
  and theme-content schemas plus local fallback behavior.
- `src/lib/maps/types.ts` - map provider, coordinate, POI, and walking-leg
  contracts.
- `src/lib/maps/amap.ts` - AMap URI helpers and POI parsing helpers.
- `src/lib/maps/fallback.ts` - local estimated walking-leg fallback.
- `src/lib/repositories/route-repository.ts` - local/Supabase route repository.
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
- Tables: `profiles`, `places`, `routes`, `route_stops`,
  `route_constraints`, `route_snapshots`, `route_shares`,
  `route_candidates`, `route_ai_runs`
- Storage bucket: private `route-media`
- RLS: owner-only access for route data
- Edge Function: `share-route`
- Seed script: `supabase/seed.sql`
- Public seed share code: `nanjing-minguo`
- Seed share URL:
  `https://999hkkzjvy-cell.github.io/culture-city-walk/share/?code=nanjing-minguo`

The `share-route` function is deployed with `verify_jwt=false` because public
share links are read by share code, expiry, and revoked-state checks in the
function body.

## Auth Behavior

Auth is MVP-level email magic-link auth via Supabase:

- The auth UI lives on `/library/`.
- `AuthPanel` calls `supabase.auth.signInWithOtp`.
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
- `NEXT_PUBLIC_BASE_PATH` is set by GitHub Actions for Pages builds.

Server-only / function-side:

- `SUPABASE_SERVICE_ROLE_KEY`
- `SHARE_ALLOWED_ORIGINS`
- `AMAP_WEB_SERVICE_KEY` for future provider-backed walking/POI proxy
- `DEEPSEEK_API_KEY` for future AI provider calls
- `AI_DAILY_USER_LIMIT`
- `AI_PROJECT_COST_LIMIT_CNY`

Never expose service role keys in browser or GitHub Pages variables.

GitHub Actions repository variables required for Pages build:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## Current UX Notes

- Home page has a featured card linking to the seeded南京 route.
- Share links are direct URLs; there is no manual share-code input UI yet. This
  is intentional until a Xiaohongshu/poster/code-sharing use case exists.
- Phase 3 has started on the route reader. It now shows whether walking legs are
  provider-backed or locally estimated, and exposes AMap place/navigation links.
  Current demo legs are still local estimates, not real AMap Web Service results.
- Phase 4/5 pre-API development has started on `/plan/`: Complete mode can
  generate locally seeded along-route candidates, score and classify them, and
  apply add/backup/ignore decisions. Candidate insertion now updates an editable
  route preview with locally estimated leg recalculation, end-time impact, move,
  delete, and stay-time controls. Candidate lists support type filters and
  fit-band grouping. The route preview and candidate actions are persisted in
  localStorage, and `/route/?id=demo` reads that saved preview before falling
  back to the demo route. AI collaboration currently uses schemas and
  deterministic local fallback only; there is no live DeepSeek call yet.
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

- Phase 3 next: AMap Web Service proxy, live POI suggestions, confirmed POI
  persistence, real walking route calculation, marker/polyline rendering, and
  route editing primitives.
- Phase 4/5 next: replace local candidate source with AMap sampled-route POI
  search, add DeepSeek adapter with JSON mode and repair retry, and persist AI
  usage/cost records.
- Finish remaining Phase 2 polish opportunistically: auth redirect verification,
  clearer auth UX, local draft migration after login, route archive empty states.
- Improve mobile fidelity against `ignore-files/UI-mobile.jpg`.
- Keep static export constraints in mind until hosting strategy changes.

## Guardrails

- Preserve local fallback behavior when Supabase is not configured.
- Do not break GitHub Pages static export.
- Do not put secrets into committed files or frontend env vars.
- Keep RLS owner-only behavior for private routes.
- Do not assume seeded data belongs in a user's `/library/`; it is primarily for
  public share-page verification.
