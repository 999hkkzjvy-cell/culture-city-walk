create table if not exists public.route_checkin_photos (
  id uuid primary key default gen_random_uuid(),
  route_id uuid not null references public.routes(id) on delete cascade,
  stop_id text not null,
  storage_path text not null,
  file_name text not null,
  mime_type text not null,
  byte_size integer not null default 0,
  created_by uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint route_checkin_photos_mime_check check (mime_type in ('image/jpeg', 'image/png', 'image/webp')),
  constraint route_checkin_photos_byte_size_check check (byte_size >= 0 and byte_size <= 10485760)
);

create index if not exists route_checkin_photos_route_stop_idx
  on public.route_checkin_photos (route_id, stop_id, created_at desc);

alter table public.route_checkin_photos enable row level security;

create policy "route_checkin_photos_owner_select" on public.route_checkin_photos
  for select to authenticated
  using (exists (
    select 1 from public.routes
    where routes.id = route_checkin_photos.route_id
      and routes.owner_id = auth.uid()
  ));

create policy "route_checkin_photos_owner_insert" on public.route_checkin_photos
  for insert to authenticated
  with check (
    created_by = auth.uid()
    and exists (
      select 1 from public.routes
      where routes.id = route_checkin_photos.route_id
        and routes.owner_id = auth.uid()
    )
  );

create policy "route_checkin_photos_owner_delete" on public.route_checkin_photos
  for delete to authenticated
  using (exists (
    select 1 from public.routes
    where routes.id = route_checkin_photos.route_id
      and routes.owner_id = auth.uid()
  ));

create policy "route_media_owner_select" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'route-media'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "route_media_owner_insert" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'route-media'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "route_media_owner_delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'route-media'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
