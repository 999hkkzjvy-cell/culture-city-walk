# Phase 2 Status

Date: 2026-07-14

## Scope

Phase 2 is implemented as a working foundation. The app now has Supabase-backed auth, route saving, and read-only sharing, while preserving local fallback behavior.

## Implemented

- Supabase cloud project:
  - Project name: `culture-city-walk`
  - Project ref: `wedwvcmdbrnbzjwlllgl`
  - Region: `ap-southeast-1`
- Applied Supabase migration for:
  - `profiles`
  - `places`
  - `routes`
  - `route_stops`
  - `route_constraints`
  - `route_snapshots`
  - `route_shares`
  - private `route-media` storage bucket
- RLS policies for owner-only route access.
- URL-safe share code generation.
- Deployed Edge Function `share-route` for read-only share route lookup.
- Browser Supabase client and typed database definitions.
- Route Repository interface with local fallback and Supabase implementation.
- Email magic-link auth panel.
- `/library/` route archive page.
- `/share/?code=...` read-only share shell.
- Cloud save/share actions on the route reader page.
- GitHub Pages build variables for Supabase URL and publishable key.
- Demo seed data based on the legacy Nanjing route:
  - Script: `supabase/seed.sql`
  - Share code: `nanjing-minguo`
  - URL: `https://999hkkzjvy-cell.github.io/culture-city-walk/share/?code=nanjing-minguo`
- Home page featured card links to the seeded Nanjing route.

## Not Yet Done

- Confirm Supabase Auth URL configuration in the dashboard:
  - Site URL: `https://999hkkzjvy-cell.github.io/culture-city-walk/`
  - Redirect URL: `https://999hkkzjvy-cell.github.io/culture-city-walk/**`
  - Local redirect URL: `http://localhost:3000/**`
- Full account onboarding is not done.
- Local draft migration after login is not done.
- Route archive empty/loading/error states are still basic.
- Email templates have not been customized.

## Notes

- Public sharing is handled by `share-route` with `verify_jwt=false`; access is controlled by share code, revoked state, and expiry checks.
- Private route data remains protected by RLS owner policies.
- See `docs/ai-project-context.md` for the current high-level project map.
