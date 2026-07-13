create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.generate_share_code()
returns text
language sql
as $$
  select lower(substr(encode(gen_random_bytes(8), 'hex'), 1, 16));
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.places (
  id uuid primary key default gen_random_uuid(),
  source text not null,
  source_place_id text,
  name text not null,
  address text,
  city text not null,
  district text,
  adcode text,
  amap_lng numeric,
  amap_lat numeric,
  coordinate_system text not null default 'gcj02',
  poi_type text,
  verification_status text not null default 'source_pending',
  raw_provider_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint places_coordinate_system_check check (coordinate_system in ('gcj02', 'wgs84', 'bd09', 'unknown')),
  constraint places_verification_status_check check (
    verification_status in ('verified', 'user_confirmed', 'source_pending', 'possibly_outdated')
  )
);

create unique index if not exists places_source_place_id_idx
  on public.places (source, source_place_id)
  where source_place_id is not null;

create table if not exists public.routes (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  explore_mode text not null,
  title text not null,
  city text not null,
  route_date date,
  start_time time,
  end_time time,
  status text not null default 'draft',
  visibility text not null default 'private',
  theme_filters jsonb not null default '[]'::jsonb,
  preferences jsonb not null default '{}'::jsonb,
  generation_summary jsonb,
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint routes_explore_mode_check check (explore_mode in ('discover', 'complete', 'refine')),
  constraint routes_status_check check (status in ('draft', 'ready', 'archived')),
  constraint routes_visibility_check check (visibility in ('private', 'shared'))
);

create table if not exists public.route_stops (
  id uuid primary key default gen_random_uuid(),
  route_id uuid not null references public.routes(id) on delete cascade,
  place_id uuid references public.places(id) on delete set null,
  sort_order integer not null,
  arrival_time time,
  stay_minutes integer not null default 30,
  constraint_type text not null default 'recommended',
  source_type text not null default 'user',
  title_snapshot text not null,
  note jsonb not null default '{}'::jsonb,
  walking_from_previous jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint route_stops_stay_minutes_check check (stay_minutes >= 0 and stay_minutes <= 720),
  constraint route_stops_sort_order_check check (sort_order >= 0),
  constraint route_stops_constraint_type_check check (constraint_type in ('start', 'end', 'must_visit', 'recommended', 'meal', 'rest')),
  constraint route_stops_source_type_check check (source_type in ('user', 'rule', 'candidate', 'imported', 'ai_assisted'))
);

create unique index if not exists route_stops_route_order_idx
  on public.route_stops (route_id, sort_order);

create table if not exists public.route_constraints (
  id uuid primary key default gen_random_uuid(),
  route_id uuid not null references public.routes(id) on delete cascade,
  type text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.route_snapshots (
  id uuid primary key default gen_random_uuid(),
  route_id uuid not null references public.routes(id) on delete cascade,
  version integer not null,
  snapshot jsonb not null,
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles(id) on delete set null
);

create unique index if not exists route_snapshots_route_version_idx
  on public.route_snapshots (route_id, version);

create table if not exists public.route_shares (
  id uuid primary key default gen_random_uuid(),
  route_id uuid not null references public.routes(id) on delete cascade,
  share_code text not null default public.generate_share_code(),
  route_version integer not null default 1,
  allow_copy boolean not null default false,
  expires_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  created_by uuid not null references public.profiles(id) on delete cascade,
  constraint route_shares_code_length_check check (char_length(share_code) between 10 and 24)
);

create unique index if not exists route_shares_share_code_idx
  on public.route_shares (share_code);

create index if not exists routes_owner_updated_idx on public.routes (owner_id, updated_at desc);
create index if not exists route_shares_route_idx on public.route_shares (route_id);

create trigger set_profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

create trigger set_places_updated_at
  before update on public.places
  for each row execute function public.set_updated_at();

create trigger set_routes_updated_at
  before update on public.routes
  for each row execute function public.set_updated_at();

create trigger set_route_stops_updated_at
  before update on public.route_stops
  for each row execute function public.set_updated_at();

create trigger set_route_constraints_updated_at
  before update on public.route_constraints
  for each row execute function public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.places enable row level security;
alter table public.routes enable row level security;
alter table public.route_stops enable row level security;
alter table public.route_constraints enable row level security;
alter table public.route_snapshots enable row level security;
alter table public.route_shares enable row level security;

create policy "profiles_select_own" on public.profiles
  for select to authenticated
  using (id = auth.uid());

create policy "profiles_insert_own" on public.profiles
  for insert to authenticated
  with check (id = auth.uid());

create policy "profiles_update_own" on public.profiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

create policy "places_select_authenticated" on public.places
  for select to authenticated
  using (true);

create policy "places_insert_authenticated" on public.places
  for insert to authenticated
  with check (true);

create policy "places_update_authenticated" on public.places
  for update to authenticated
  using (true)
  with check (true);

create policy "routes_select_owner" on public.routes
  for select to authenticated
  using (owner_id = auth.uid());

create policy "routes_insert_owner" on public.routes
  for insert to authenticated
  with check (owner_id = auth.uid());

create policy "routes_update_owner" on public.routes
  for update to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

create policy "routes_delete_owner" on public.routes
  for delete to authenticated
  using (owner_id = auth.uid());

create policy "route_stops_owner_all" on public.route_stops
  for all to authenticated
  using (exists (select 1 from public.routes where routes.id = route_stops.route_id and routes.owner_id = auth.uid()))
  with check (exists (select 1 from public.routes where routes.id = route_stops.route_id and routes.owner_id = auth.uid()));

create policy "route_constraints_owner_all" on public.route_constraints
  for all to authenticated
  using (exists (select 1 from public.routes where routes.id = route_constraints.route_id and routes.owner_id = auth.uid()))
  with check (exists (select 1 from public.routes where routes.id = route_constraints.route_id and routes.owner_id = auth.uid()));

create policy "route_snapshots_owner_select" on public.route_snapshots
  for select to authenticated
  using (exists (select 1 from public.routes where routes.id = route_snapshots.route_id and routes.owner_id = auth.uid()));

create policy "route_snapshots_owner_insert" on public.route_snapshots
  for insert to authenticated
  with check (created_by = auth.uid() and exists (
    select 1 from public.routes where routes.id = route_snapshots.route_id and routes.owner_id = auth.uid()
  ));

create policy "route_shares_owner_all" on public.route_shares
  for all to authenticated
  using (exists (select 1 from public.routes where routes.id = route_shares.route_id and routes.owner_id = auth.uid()))
  with check (
    created_by = auth.uid()
    and exists (select 1 from public.routes where routes.id = route_shares.route_id and routes.owner_id = auth.uid())
  );

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'route-media',
  'route-media',
  false,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do nothing;
