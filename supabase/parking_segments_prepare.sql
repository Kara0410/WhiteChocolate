-- One-time preparation workflow for the Munich parking_segments import.
-- Source geometry: ETRS89 / UTM zone 32N (EPSG:25832).
-- Stored marker coordinate: midpoint of each LINESTRING in WGS84 (EPSG:4326).

begin;

create extension if not exists postgis with schema extensions;
set local search_path = public, extensions, pg_temp;

-- Invalid or empty WKT must not abort the whole import. This helper exists
-- only for the current SQL session and disappears automatically afterwards.
create or replace function pg_temp.try_parking_linestring(wkt text)
returns geometry
language plpgsql
immutable
strict
as $$
declare
  parsed geometry;
begin
  if btrim(wkt) = '' then
    return null;
  end if;

  parsed := st_geomfromtext(wkt, 25832);

  if st_geometrytype(parsed) <> 'ST_LineString' or st_isempty(parsed) then
    return null;
  end if;

  return parsed;
exception
  when others then
    return null;
end;
$$;

with parsed as (
  select
    id,
    pg_temp.try_parking_linestring(shape) as line
  from public.parking_segments
),
transformed as (
  select
    id,
    st_transform(st_lineinterpolatepoint(line, 0.5), 4326) as midpoint
  from parsed
)
update public.parking_segments as segment
set
  lat = case
    when transformed.midpoint is null then null
    else st_y(transformed.midpoint)
  end,
  lon = case
    when transformed.midpoint is null then null
    else st_x(transformed.midpoint)
  end,
  updated_at = now()
from transformed
where transformed.id = segment.id;

create index if not exists parking_segments_strasse_idx
  on public.parking_segments (strasse);

create index if not exists parking_segments_lat_lon_idx
  on public.parking_segments (lat, lon)
  where lat is not null and lon is not null;

create index if not exists parking_segments_geoportal_class_idx
  on public.parking_segments (geoportal_class);

alter table public.parking_segments enable row level security;
grant select on public.parking_segments to anon;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'parking_segments'
      and policyname = 'Allow public read parking_segments'
  ) then
    create policy "Allow public read parking_segments"
      on public.parking_segments
      for select
      to anon
      using (true);
  end if;
end;
$$;

commit;

-- Verification: malformed/empty shapes remain null and are excluded by the app.
select
  count(*) as total_rows,
  count(*) filter (where lat is not null and lon is not null) as mapped_rows,
  count(*) filter (where lat is null or lon is null) as unmapped_rows
from public.parking_segments;

select id, strasse, angebot, lat, lon
from public.parking_segments
where lat is not null and lon is not null
order by id
limit 5;
