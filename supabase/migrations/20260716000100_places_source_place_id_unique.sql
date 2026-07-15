alter table public.places
  add constraint places_source_place_id_unique
  unique (source, source_place_id);
