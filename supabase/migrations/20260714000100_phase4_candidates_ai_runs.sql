create table if not exists public.route_ai_runs (
  id uuid primary key default gen_random_uuid(),
  route_id uuid references public.routes(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  action text not null,
  provider text not null,
  model text not null,
  prompt_version text not null,
  schema_version text not null default 'v1',
  status text not null default 'succeeded',
  input_payload jsonb not null default '{}'::jsonb,
  output_payload jsonb,
  error_message text,
  input_tokens integer not null default 0,
  output_tokens integer not null default 0,
  estimated_cost_cny numeric(10, 4) not null default 0,
  elapsed_ms integer not null default 0,
  idempotency_key text,
  created_at timestamptz not null default now(),
  constraint route_ai_runs_action_check check (
    action in ('parse_intent', 'rank_candidates', 'route_summary', 'stop_intro', 'repair')
  ),
  constraint route_ai_runs_provider_check check (provider in ('fallback', 'deepseek')),
  constraint route_ai_runs_status_check check (status in ('succeeded', 'failed', 'repaired')),
  constraint route_ai_runs_tokens_check check (input_tokens >= 0 and output_tokens >= 0),
  constraint route_ai_runs_cost_check check (estimated_cost_cny >= 0),
  constraint route_ai_runs_elapsed_check check (elapsed_ms >= 0)
);

create unique index if not exists route_ai_runs_idempotency_idx
  on public.route_ai_runs (user_id, action, idempotency_key)
  where idempotency_key is not null;

create index if not exists route_ai_runs_route_created_idx
  on public.route_ai_runs (route_id, created_at desc);

create table if not exists public.route_candidates (
  id uuid primary key default gen_random_uuid(),
  route_id uuid not null references public.routes(id) on delete cascade,
  place_id uuid references public.places(id) on delete set null,
  generated_by_run_id uuid references public.route_ai_runs(id) on delete set null,
  source text not null,
  source_place_id text,
  title_snapshot text not null,
  candidate_place jsonb not null default '{}'::jsonb,
  place_type text not null,
  themes jsonb not null default '[]'::jsonb,
  status text not null default 'suggested',
  fit_band text not null,
  score integer not null default 0,
  insertion_index integer not null default 0,
  detour_minutes integer not null default 0,
  detour_meters integer not null default 0,
  stay_minutes integer not null default 30,
  reasons jsonb not null default '[]'::jsonb,
  risks jsonb not null default '[]'::jsonb,
  cache_key text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint route_candidates_source_check check (source in ('amap', 'manual', 'estimated')),
  constraint route_candidates_status_check check (status in ('suggested', 'joined', 'backup', 'ignored')),
  constraint route_candidates_fit_band_check check (fit_band in ('very_along', 'recommended', 'optional')),
  constraint route_candidates_score_check check (score >= 0 and score <= 100),
  constraint route_candidates_insertion_check check (insertion_index >= 0),
  constraint route_candidates_detour_check check (detour_minutes >= 0 and detour_meters >= 0),
  constraint route_candidates_stay_check check (stay_minutes >= 0 and stay_minutes <= 720)
);

create unique index if not exists route_candidates_cache_key_idx
  on public.route_candidates (route_id, cache_key);

create index if not exists route_candidates_route_status_idx
  on public.route_candidates (route_id, status, score desc);

create trigger set_route_candidates_updated_at
  before update on public.route_candidates
  for each row execute function public.set_updated_at();

alter table public.route_ai_runs enable row level security;
alter table public.route_candidates enable row level security;

create policy "route_ai_runs_owner_all" on public.route_ai_runs
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "route_candidates_owner_all" on public.route_candidates
  for all to authenticated
  using (exists (
    select 1 from public.routes
    where routes.id = route_candidates.route_id
      and routes.owner_id = auth.uid()
  ))
  with check (exists (
    select 1 from public.routes
    where routes.id = route_candidates.route_id
      and routes.owner_id = auth.uid()
  ));
