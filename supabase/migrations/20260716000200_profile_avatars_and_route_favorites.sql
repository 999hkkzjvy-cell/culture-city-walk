insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'profile-avatars',
  'profile-avatars',
  true,
  2097152,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "profile_avatars_public_select" on storage.objects
  for select
  using (bucket_id = 'profile-avatars');

create policy "profile_avatars_owner_insert" on storage.objects
  for insert
  with check (
    bucket_id = 'profile-avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "profile_avatars_owner_update" on storage.objects
  for update
  using (
    bucket_id = 'profile-avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'profile-avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "profile_avatars_owner_delete" on storage.objects
  for delete
  using (
    bucket_id = 'profile-avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create table if not exists public.route_favorites (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  source_route_id text not null,
  route_snapshot jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_id, source_route_id)
);

create index if not exists route_favorites_owner_updated_idx
  on public.route_favorites (owner_id, updated_at desc);

create trigger set_route_favorites_updated_at
  before update on public.route_favorites
  for each row execute function public.set_updated_at();

alter table public.route_favorites enable row level security;

create policy "route_favorites_owner_select" on public.route_favorites
  for select using (auth.uid() = owner_id);

create policy "route_favorites_owner_insert" on public.route_favorites
  for insert with check (auth.uid() = owner_id);

create policy "route_favorites_owner_update" on public.route_favorites
  for update using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

create policy "route_favorites_owner_delete" on public.route_favorites
  for delete using (auth.uid() = owner_id);
