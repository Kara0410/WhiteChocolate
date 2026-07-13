-- Server-side parking assignment and aggregates for semantic map zoom.
-- This migration is intentionally forward-only and does not modify source
-- parking geometry or grant clients any mutation capability.

begin;

create extension if not exists postgis with schema extensions;
set local search_path = public, extensions, pg_temp;

alter table public.parking_segments
  add column if not exists location geometry(Point, 4326)
  generated always as (
    case
      when lat is null or lon is null then null
      else st_setsrid(st_makepoint(lon, lat), 4326)
    end
  ) stored;

alter table public.parking_segments
  add column if not exists parking_zone_id bigint;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'parking_segments_parking_zone_id_fkey'
      and conrelid = 'public.parking_segments'::regclass
  ) then
    alter table public.parking_segments
      add constraint parking_segments_parking_zone_id_fkey
      foreign key (parking_zone_id)
      references public.parking_zones(id)
      on update cascade
      on delete set null;
  end if;
end;
$$;

create index if not exists parking_segments_location_gix
  on public.parking_segments using gist (location)
  where location is not null;

create index if not exists parking_segments_parking_zone_id_idx
  on public.parking_segments (parking_zone_id);

create index if not exists parking_zones_geom_gix
  on public.parking_zones using gist (geom)
  where geom is not null;

-- ST_Covers includes points exactly on a zone boundary. If source polygons
-- overlap, the smallest covering polygon wins, with id as a stable tie-break.
with assignments as (
  select
    segment.id as segment_id,
    (
      select zone.id::bigint
      from public.parking_zones as zone
      where zone.geom is not null
        and zone.geom && segment.location
        and st_covers(zone.geom, segment.location)
      order by st_area(zone.geom), zone.id
      limit 1
    ) as zone_id
  from public.parking_segments as segment
  where segment.location is not null
)
update public.parking_segments as segment
set parking_zone_id = assignment.zone_id
from assignments as assignment
where segment.id = assignment.segment_id
  and segment.parking_zone_id is distinct from assignment.zone_id;

create or replace function public.assign_parking_segment_zone()
returns trigger
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  point_geometry geometry(Point, 4326);
begin
  if new.lat is null or new.lon is null then
    new.parking_zone_id := null;
    return new;
  end if;

  point_geometry := st_setsrid(st_makepoint(new.lon, new.lat), 4326);

  select zone.id
  into new.parking_zone_id
  from public.parking_zones as zone
  where zone.geom is not null
    and zone.geom && point_geometry
    and st_covers(zone.geom, point_geometry)
  order by st_area(zone.geom), zone.id
  limit 1;

  return new;
end;
$$;

revoke all on function public.assign_parking_segment_zone() from public;

drop trigger if exists assign_parking_segment_zone_trigger
  on public.parking_segments;
create trigger assign_parking_segment_zone_trigger
before insert or update of lat, lon
on public.parking_segments
for each row execute function public.assign_parking_segment_zone();

create or replace view public.parking_segment_summaries
with (security_invoker = true)
as
select
  segment.id,
  segment.parking_zone_id,
  segment.strasse as street_name,
  segment.prm_name as source_area_name,
  segment.lat,
  segment.lon,
  segment.angebot as capacity,
  case
    when segment.angebot is null then null
    when segment.angebot <= 0 then 0
    else mod(
      hashtextextended(segment.id, 0) & 2147483647,
      segment.angebot::bigint + 1
    )::integer
  end as estimated_available_capacity,
  case
    when segment.angebot is null or segment.angebot <= 0 then null
    else round(
      100.0 * mod(
        hashtextextended(segment.id, 0) & 2147483647,
        segment.angebot::bigint + 1
      ) / segment.angebot
    )::integer
  end as estimated_availability_percent,
  case
    when segment.angebot is null then 'unknown'
    else 'estimated'
  end as availability_status,
  case
    when concat_ws(
      ' ',
      segment.parkregel_gruppe,
      segment.parkregel_name,
      segment.parkregel_beschreibung
    ) ~* '\m(kostenlos|geb.hrenfrei|entgeltfrei)\M' then 'free'
    when segment.parkregel_gruppe like 'Kurzzeitparken%' then 'paid'
    when segment.parkregel_gruppe like 'Mischparken%' then 'paid'
    when segment.parkregel_gruppe like 'Altstadt%' then 'paid'
    else 'unknown'
  end as pricing_status,
  case
    when segment.parkregel_gruppe like 'Kurzzeitparken%' then 2.5
    when segment.parkregel_gruppe like 'Mischparken%' then 2.0
    when segment.parkregel_gruppe like 'Altstadt%' then 3.0
    else null
  end::double precision as hourly_rate,
  segment.parkregel_beschreibung as regulation_description,
  segment.parkregel_gruppe as regulation_group_name,
  segment.parkregel_name as regulation_name,
  segment.geoportal_class,
  segment.updated_at
from public.parking_segments as segment
where segment.location is not null;

create or replace view public.parking_zone_summaries
with (security_invoker = true)
as
select
  zone.id::text as zone_id,
  coalesce(nullif(btrim(zone.name), ''), 'Unnamed parking zone') as zone_name,
  zone.status as source_status,
  st_y(st_pointonsurface(zone.geom)) as representative_latitude,
  st_x(st_pointonsurface(zone.geom)) as representative_longitude,
  count(segment.id)::integer as segment_count,
  case
    when count(segment.capacity) = 0 then null
    else sum(segment.capacity)::bigint
  end as total_capacity,
  case
    when count(segment.estimated_available_capacity) = 0 then null
    else sum(segment.estimated_available_capacity)::bigint
  end as available_capacity,
  case
    when coalesce(sum(segment.capacity), 0) <= 0 then null
    else round(
      100.0 * sum(segment.estimated_available_capacity) /
      nullif(sum(segment.capacity), 0)
    )::integer
  end as availability_percent,
  min(segment.hourly_rate) filter (
    where segment.pricing_status = 'paid'
      and segment.hourly_rate is not null
  ) as minimum_hourly_rate,
  max(segment.hourly_rate) filter (
    where segment.pricing_status = 'paid'
      and segment.hourly_rate is not null
  ) as maximum_hourly_rate,
  coalesce(bool_or(segment.pricing_status = 'free'), false) as has_free_parking,
  coalesce(bool_or(segment.pricing_status = 'unknown'), false) as has_unknown_pricing,
  case
    when count(segment.id) = 0 or count(segment.capacity) = 0 then 'unknown'
    when count(segment.capacity) = count(segment.id) then 'estimated'
    else 'mixed'
  end as availability_status,
  max(segment.updated_at) as updated_at
from public.parking_zones as zone
left join public.parking_segment_summaries as segment
  on segment.parking_zone_id = zone.id
where zone.geom is not null
group by zone.id, zone.name, zone.status, zone.geom;

create or replace function public.fetch_parking_cells(
  p_min_lng double precision,
  p_min_lat double precision,
  p_max_lng double precision,
  p_max_lat double precision,
  p_resolution text
)
returns table (
  id text,
  parent_zone_ids text[],
  center_latitude double precision,
  center_longitude double precision,
  min_lng double precision,
  min_lat double precision,
  max_lng double precision,
  max_lat double precision,
  resolution text,
  segment_count integer,
  total_capacity bigint,
  available_capacity bigint,
  availability_percent integer,
  minimum_hourly_rate double precision,
  maximum_hourly_rate double precision,
  has_free_parking boolean,
  has_unknown_pricing boolean,
  availability_status text,
  updated_at timestamptz
)
language sql
stable
set search_path = public, extensions
as $$
  with request as (
    select
      case p_resolution
        when 'coarse' then 500.0
        when 'fine' then 250.0
        else null
      end as cell_size,
      st_transform(
        st_makeenvelope(p_min_lng, p_min_lat, p_max_lng, p_max_lat, 4326),
        3857
      ) as bounds
    where p_min_lng < p_max_lng
      and p_min_lat < p_max_lat
      and p_min_lng between -180 and 180
      and p_max_lng between -180 and 180
      and p_min_lat between -90 and 90
      and p_max_lat between -90 and 90
  ),
  cells as (
    select
      grid.i,
      grid.j,
      grid.geom,
      st_transform(grid.geom, 4326) as geom_4326
    from request
    cross join lateral st_hexagongrid(request.cell_size, request.bounds) as grid
    where request.cell_size is not null
      and st_intersects(grid.geom, request.bounds)
  ),
  -- ST_Covers includes a point on a shared cell boundary. The row number
  -- gives that point to the lowest stable grid coordinate exactly once.
  cell_assignments as (
    select
      cell.i,
      cell.j,
      cell.geom_4326,
      source_segment.id as segment_id,
      row_number() over (
        partition by source_segment.id
        order by cell.i, cell.j
      ) as cell_rank
    from cells as cell
    join public.parking_segments as source_segment
      on source_segment.location && cell.geom_4326
      and st_covers(cell.geom_4326, source_segment.location)
  ),
  aggregates as (
    select
      assignment.i,
      assignment.j,
      assignment.geom_4326,
      count(segment.id)::integer as segment_count,
      array_agg(distinct segment.parking_zone_id::text)
        filter (where segment.parking_zone_id is not null) as parent_zone_ids,
      sum(segment.capacity)::bigint as total_capacity,
      sum(segment.estimated_available_capacity)::bigint as available_capacity,
      min(segment.hourly_rate) filter (
        where segment.pricing_status = 'paid'
      ) as minimum_hourly_rate,
      max(segment.hourly_rate) filter (
        where segment.pricing_status = 'paid'
      ) as maximum_hourly_rate,
      coalesce(bool_or(segment.pricing_status = 'free'), false) as has_free_parking,
      coalesce(bool_or(segment.pricing_status = 'unknown'), false) as has_unknown_pricing,
      count(segment.capacity) as known_capacity_count,
      max(segment.updated_at) as updated_at
    from cell_assignments as assignment
    join public.parking_segment_summaries as segment
      on segment.id = assignment.segment_id::text
    where assignment.cell_rank = 1
    group by assignment.i, assignment.j, assignment.geom_4326
  )
  select
    concat(p_resolution, ':', aggregate.i, ':', aggregate.j) as id,
    coalesce(aggregate.parent_zone_ids, array[]::text[]) as parent_zone_ids,
    st_y(st_centroid(aggregate.geom_4326)) as center_latitude,
    st_x(st_centroid(aggregate.geom_4326)) as center_longitude,
    st_xmin(box3d(aggregate.geom_4326)) as min_lng,
    st_ymin(box3d(aggregate.geom_4326)) as min_lat,
    st_xmax(box3d(aggregate.geom_4326)) as max_lng,
    st_ymax(box3d(aggregate.geom_4326)) as max_lat,
    p_resolution as resolution,
    aggregate.segment_count,
    aggregate.total_capacity,
    aggregate.available_capacity,
    case
      when coalesce(aggregate.total_capacity, 0) <= 0 then null
      else round(
        100.0 * aggregate.available_capacity /
        nullif(aggregate.total_capacity, 0)
      )::integer
    end as availability_percent,
    aggregate.minimum_hourly_rate,
    aggregate.maximum_hourly_rate,
    aggregate.has_free_parking,
    aggregate.has_unknown_pricing,
    case
      when aggregate.known_capacity_count = 0 then 'unknown'
      when aggregate.known_capacity_count = aggregate.segment_count then 'estimated'
      else 'mixed'
    end as availability_status,
    aggregate.updated_at
  from aggregates as aggregate
  order by aggregate.i, aggregate.j
  limit 400;
$$;

grant select on public.parking_segment_summaries
  to anon, authenticated;
grant select on public.parking_zone_summaries
  to anon, authenticated;
grant execute on function public.fetch_parking_cells(
  double precision,
  double precision,
  double precision,
  double precision,
  text
) to anon, authenticated;

comment on column public.parking_segments.parking_zone_id is
  'Administrative zone assigned server-side with ST_Covers; boundary points are included.';
comment on view public.parking_zone_summaries is
  'Complete-zone parking aggregates independent of client viewport bounds.';
comment on function public.fetch_parking_cells is
  'Stable PostGIS hex-cell aggregates for intermediate semantic map zoom.';

commit;
