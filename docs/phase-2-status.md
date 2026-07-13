# Phase 2 Status

Date: 2026-07-14

## Scope Started

Phase 2 has started in the codebase. The current work prepares Supabase-backed auth, route saving, and read-only sharing, while preserving local fallback behavior.

## Implemented Locally

- Supabase migration for:
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
- Edge Function skeleton for read-only share route lookup.
- Browser Supabase client and typed database definitions.
- Route Repository interface with local fallback and Supabase implementation.
- Email magic-link auth panel.
- `/library/` route archive page.
- `/share/?code=...` read-only share shell.
- Cloud save/share actions on the route reader page.

## Not Yet Done

- No Supabase cloud project has been created by Codex.
- No migration has been applied to a cloud database.
- No Edge Function has been deployed.
- No hosted environment variables have been configured.
- Auth redirect URLs and CORS origins still need to be set in the Supabase project chosen by the user.

## Cloud Project Rule

Do not create or link a Supabase cloud project until the project owner explicitly identifies the intended Supabase organization/project or authorizes project creation.
