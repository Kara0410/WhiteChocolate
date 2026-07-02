-- Run against the same Supabase project configured by EXPO_PUBLIC_SUPABASE_URL.
-- It makes the existing public.parking_zones data readable by the app and
-- prints row/geometry checks without modifying zone data.

begin;

alter table public.parking_zones enable row level security;
grant usage on schema public to anon, authenticated;
grant select on public.parking_zones to anon, authenticated;

do $$
begin
  if exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'parking_zones'
      and policyname = 'Allow public read parking_zones'
  ) then
    alter policy "Allow public read parking_zones"
      on public.parking_zones
      to anon, authenticated
      using (true);
  else
    create policy "Allow public read parking_zones"
      on public.parking_zones
      as permissive
      for select
      to anon, authenticated
      using (true);
  end if;
end;
$$;

commit;

select
  count(*) as total_zones,
  count(*) filter (where geojson is not null) as zones_with_geojson,
  count(*) filter (where geojson is null) as zones_without_geojson
from public.parking_zones;

select
  min(st_srid(geom)) as minimum_srid,
  max(st_srid(geom)) as maximum_srid,
  st_xmin(st_extent(geom)) as minimum_longitude,
  st_xmax(st_extent(geom)) as maximum_longitude,
  st_ymin(st_extent(geom)) as minimum_latitude,
  st_ymax(st_extent(geom)) as maximum_latitude
from public.parking_zones
where geom is not null;

select id, name, status, massnahme, geojson
from public.parking_zones
where geojson is not null
order by name nulls last
limit 1;
