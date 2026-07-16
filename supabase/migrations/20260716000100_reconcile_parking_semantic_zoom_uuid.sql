-- Reconcile the live UUID-based parking inventory with the semantic-zoom
-- backend contract consumed by the Expo application.
--
-- The live contract is authoritative: parking_segments.id is uuid. This
-- migration never changes, copies, prefixes, or regenerates segment IDs.
-- Availability remains the existing deterministic compatibility estimate until
-- a later prediction phase replaces it with published backend data.

begin;

create extension if not exists postgis with schema public;
set local search_path = public, extensions, pg_temp;

-- Fail closed if this migration is pointed at a different base schema or at a
-- database that already contains unreviewed semantic-zoom objects.
do $$
declare
  segment_id_type text;
  zone_id_type text;
  location_type text;
  location_generated "char";
  location_not_null boolean;
  parking_zone_not_null boolean;
begin
  if to_regclass('public.parking_segments') is null
     or to_regclass('public.parking_zones') is null then
    raise exception
      'Parking reconciliation requires public.parking_segments and public.parking_zones';
  end if;

  select pg_catalog.format_type(a.atttypid, a.atttypmod)
  into segment_id_type
  from pg_catalog.pg_attribute as a
  where a.attrelid = 'public.parking_segments'::regclass
    and a.attname = 'id'
    and a.attnum > 0
    and not a.attisdropped;

  if segment_id_type <> 'uuid' then
    raise exception
      'Refusing reconciliation: parking_segments.id is %, expected uuid',
      coalesce(segment_id_type, '<missing>');
  end if;

  select pg_catalog.format_type(a.atttypid, a.atttypmod)
  into zone_id_type
  from pg_catalog.pg_attribute as a
  where a.attrelid = 'public.parking_zones'::regclass
    and a.attname = 'id'
    and a.attnum > 0
    and not a.attisdropped;

  if zone_id_type <> 'bigint' then
    raise exception
      'Refusing reconciliation: parking_zones.id is %, expected bigint',
      coalesce(zone_id_type, '<missing>');
  end if;

  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'parking_zones'
      and column_name = 'geom'
  ) then
    raise exception 'Refusing reconciliation: parking_zones.geom is missing';
  end if;

  if exists (
    select 1
    from public.parking_zones
    where geom is not null
      and (
        st_geometrytype(geom) <> 'ST_MultiPolygon'
        or st_srid(geom) <> 4326
        or st_isempty(geom)
        or not st_isvalid(geom)
      )
  ) then
    raise exception
      'Refusing reconciliation: parking_zones contains invalid or unexpected geometry';
  end if;

  if exists (
    select 1
    from public.parking_segments
    where lat is not null
      and lon is not null
      and (lat < -90 or lat > 90 or lon < -180 or lon > 180)
  ) then
    raise exception
      'Refusing reconciliation: parking_segments contains invalid coordinates';
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'parking_segments'
      and column_name = 'location'
  ) then
    select
      pg_catalog.format_type(a.atttypid, a.atttypmod),
      a.attgenerated
    into location_type, location_generated
    from pg_catalog.pg_attribute as a
    where a.attrelid = 'public.parking_segments'::regclass
      and a.attname = 'location'
      and a.attnum > 0
      and not a.attisdropped;

    select a.attnotnull
    into location_not_null
    from pg_catalog.pg_attribute as a
    where a.attrelid = 'public.parking_segments'::regclass
      and a.attname = 'location'
      and a.attnum > 0
      and not a.attisdropped;

    if location_type <> 'geometry(Point,4326)'
       or location_generated <> 's'
       or location_not_null then
      raise exception
        'Refusing reconciliation: existing parking_segments.location is %, generated=%, not_null=%; manual review required',
        coalesce(location_type, '<missing>'),
        coalesce(location_generated::text, '<none>'),
        coalesce(location_not_null::text, '<none>');
    end if;
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'parking_segments'
      and column_name = 'parking_zone_id'
  ) then
    select
      pg_catalog.format_type(a.atttypid, a.atttypmod),
      a.attnotnull
    into zone_id_type, parking_zone_not_null
    from pg_catalog.pg_attribute as a
    where a.attrelid = 'public.parking_segments'::regclass
      and a.attname = 'parking_zone_id'
      and a.attnum > 0
      and not a.attisdropped;

    if zone_id_type <> 'bigint' then
      raise exception
        'Refusing reconciliation: existing parking_segments.parking_zone_id is %, expected bigint',
        coalesce(zone_id_type, '<missing>');
    end if;

    if parking_zone_not_null then
      raise exception
        'Refusing reconciliation: existing parking_segments.parking_zone_id is NOT NULL; expected nullable';
    end if;

    if exists (
      select 1
      from public.parking_segments as segment
      left join public.parking_zones as zone on zone.id = segment.parking_zone_id
      where segment.parking_zone_id is not null
        and zone.id is null
    ) then
      raise exception
        'Refusing reconciliation: existing parking_zone_id values contain invalid foreign keys';
    end if;

    if exists (
      select 1
      from pg_catalog.pg_constraint as constraint_row
      where constraint_row.conrelid = 'public.parking_segments'::regclass
        and constraint_row.conname = 'parking_segments_parking_zone_id_fkey'
    )
    and not exists (
      select 1
      from pg_catalog.pg_constraint as constraint_row
      join pg_catalog.pg_attribute as segment_column
        on segment_column.attrelid = constraint_row.conrelid
       and segment_column.attname = 'parking_zone_id'
       and segment_column.attnum > 0
       and not segment_column.attisdropped
      join pg_catalog.pg_attribute as zone_column
        on zone_column.attrelid = constraint_row.confrelid
       and zone_column.attname = 'id'
       and zone_column.attnum > 0
       and not zone_column.attisdropped
      where constraint_row.conrelid = 'public.parking_segments'::regclass
        and constraint_row.conname = 'parking_segments_parking_zone_id_fkey'
        and constraint_row.contype = 'f'
        and constraint_row.confrelid = 'public.parking_zones'::regclass
        and constraint_row.conkey = array[segment_column.attnum]::smallint[]
        and constraint_row.confkey = array[zone_column.attnum]::smallint[]
        and constraint_row.confupdtype = 'c'
        and constraint_row.confdeltype = 'n'
    ) then
      raise exception
        'Refusing reconciliation: existing parking_segments_parking_zone_id_fkey has an incompatible definition';
    end if;
  end if;

  if to_regclass('public.parking_segment_summaries') is not null
     or to_regclass('public.parking_zone_summaries') is not null
     or to_regprocedure(
       'public.fetch_parking_cells(double precision,double precision,double precision,double precision,text)'
     ) is not null
     or to_regprocedure('public.assign_parking_segment_zone()') is not null then
    raise exception
      'Refusing reconciliation: one or more semantic-zoom objects already exist; compare their active definitions first';
  end if;
end;
$$;

do $$
begin
  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'parking_segments'
      and column_name = 'location'
  ) then
    alter table public.parking_segments
      add column location geometry(Point, 4326)
      generated always as (
        case
          when lat is null or lon is null then null
          else st_setsrid(st_makepoint(lon, lat), 4326)
        end
      ) stored;

    comment on column public.parking_segments.location is
      'Phase 1A managed column: generated WGS84 point from lon/lat for semantic parking zoom.';
  end if;

  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'parking_segments'
      and column_name = 'parking_zone_id'
  ) then
    alter table public.parking_segments
      add column parking_zone_id bigint;

    comment on column public.parking_segments.parking_zone_id is
      'Phase 1A managed column: administrative zone assigned server-side with ST_Covers.';
  end if;
end;
$$;

do $$
declare
  invalid_locations bigint;
begin
  select count(*)
  into invalid_locations
  from public.parking_segments
  where location is not null
    and (
      st_geometrytype(location) <> 'ST_Point'
      or st_srid(location) <> 4326
      or st_isempty(location)
      or not st_isvalid(location)
      or st_x(location) is distinct from lon
      or st_y(location) is distinct from lat
    );

  if invalid_locations > 0 then
    raise exception
      'Generated location validation failed for % parking segments',
      invalid_locations;
  end if;
end;
$$;

-- Index existence is checked by access method and indexed column, not only by
-- a preferred name. Newly created indexes receive ownership comments so the
-- manual rollback cannot remove an equivalent pre-existing index.
do $$
begin
  if not exists (
    select 1
    from pg_catalog.pg_index as index_row
    join pg_catalog.pg_class as index_class
      on index_class.oid = index_row.indexrelid
    join pg_catalog.pg_am as access_method
      on access_method.oid = index_class.relam
    join pg_catalog.pg_attribute as column_row
      on column_row.attrelid = index_row.indrelid
     and column_row.attname = 'location'
     and column_row.attnum > 0
     and not column_row.attisdropped
    where index_row.indrelid = 'public.parking_segments'::regclass
      and index_row.indisvalid
      and index_row.indnatts = 1
      and index_row.indkey[0] = column_row.attnum
      and access_method.amname = 'gist'
  ) then
    create index parking_segments_location_gix
      on public.parking_segments using gist (location)
      where location is not null;

    comment on index public.parking_segments_location_gix is
      'Phase 1A managed index: generated segment locations.';
  end if;

  if not exists (
    select 1
    from pg_catalog.pg_index as index_row
    join pg_catalog.pg_class as index_class
      on index_class.oid = index_row.indexrelid
    join pg_catalog.pg_am as access_method
      on access_method.oid = index_class.relam
    join pg_catalog.pg_attribute as column_row
      on column_row.attrelid = index_row.indrelid
     and column_row.attname = 'parking_zone_id'
     and column_row.attnum > 0
     and not column_row.attisdropped
    where index_row.indrelid = 'public.parking_segments'::regclass
      and index_row.indisvalid
      and index_row.indnatts = 1
      and index_row.indkey[0] = column_row.attnum
      and access_method.amname = 'btree'
  ) then
    create index parking_segments_parking_zone_id_idx
      on public.parking_segments (parking_zone_id);

    comment on index public.parking_segments_parking_zone_id_idx is
      'Phase 1A managed index: segment-to-zone relationship.';
  end if;

  if not exists (
    select 1
    from pg_catalog.pg_index as index_row
    join pg_catalog.pg_class as index_class
      on index_class.oid = index_row.indexrelid
    join pg_catalog.pg_am as access_method
      on access_method.oid = index_class.relam
    join pg_catalog.pg_attribute as column_row
      on column_row.attrelid = index_row.indrelid
     and column_row.attname = 'geom'
     and column_row.attnum > 0
     and not column_row.attisdropped
    where index_row.indrelid = 'public.parking_zones'::regclass
      and index_row.indisvalid
      and index_row.indnatts = 1
      and index_row.indkey[0] = column_row.attnum
      and access_method.amname = 'gist'
  ) then
    create index parking_zones_geom_gix
      on public.parking_zones using gist (geom)
      where geom is not null;

    comment on index public.parking_zones_geom_gix is
      'Phase 1A managed index: parking zone geometries.';
  end if;
end;
$$;

do $$
begin
  if not exists (
    select 1
    from pg_catalog.pg_constraint
    where conname = 'parking_segments_parking_zone_id_fkey'
      and conrelid = 'public.parking_segments'::regclass
  ) then
    alter table public.parking_segments
      add constraint parking_segments_parking_zone_id_fkey
      foreign key (parking_zone_id)
      references public.parking_zones(id)
      on update cascade
      on delete set null;

    comment on constraint parking_segments_parking_zone_id_fkey
      on public.parking_segments is
      'Phase 1A managed constraint: preserves segment-zone referential integrity.';
  end if;
end;
$$;

-- Deployment diagnostics: report coverage before assigning anything. The
-- migration remains set-based and does not force uncovered segments into a
-- nearest zone.
do $$
declare
  uncovered bigint;
  uniquely_covered bigint;
  multiply_covered bigint;
  largest_overlap bigint;
begin
  with coverage as (
    select
      segment.id,
      count(zone.id) as covering_zone_count
    from public.parking_segments as segment
    left join public.parking_zones as zone
      on zone.geom is not null
     and segment.location is not null
     and zone.geom && segment.location
     and st_covers(zone.geom, segment.location)
    group by segment.id
  )
  select
    count(*) filter (where covering_zone_count = 0),
    count(*) filter (where covering_zone_count = 1),
    count(*) filter (where covering_zone_count > 1),
    coalesce(max(covering_zone_count), 0)
  into uncovered, uniquely_covered, multiply_covered, largest_overlap
  from coverage;

  raise notice
    'parking reconciliation coverage: uncovered=%, uniquely_covered=%, multiply_covered=%, largest_overlap=%',
    uncovered, uniquely_covered, multiply_covered, largest_overlap;
end;
$$;

-- Existing segments receive the smallest covering zone, then the lowest zone
-- ID. UUID segment identity is never used as a replacement or key rewrite.
with assignments as (
  select
    segment.id as segment_id,
    (
      select zone.id
      from public.parking_zones as zone
      where zone.geom is not null
        and segment.location is not null
        and zone.geom && segment.location
        and st_covers(zone.geom, segment.location)
      order by st_area(zone.geom), zone.id
      limit 1
    ) as zone_id
  from public.parking_segments as segment
)
update public.parking_segments as segment
set parking_zone_id = assignment.zone_id
from assignments as assignment
where segment.id = assignment.segment_id
  and segment.parking_zone_id is distinct from assignment.zone_id;

do $$
declare
  invalid_assignments bigint;
  unassigned bigint;
begin
  select count(*)
  into invalid_assignments
  from public.parking_segments as segment
  join public.parking_zones as zone on zone.id = segment.parking_zone_id
  where segment.location is null
     or zone.geom is null
     or not (zone.geom && segment.location)
     or not st_covers(zone.geom, segment.location);

  select count(*)
  into unassigned
  from public.parking_segments
  where parking_zone_id is null;

  if invalid_assignments > 0 then
    raise exception
      'Segment-zone validation failed for % assignments',
      invalid_assignments;
  end if;

  raise notice 'parking reconciliation unassigned segments: %', unassigned;
end;
$$;

create or replace function public.assign_parking_segment_zone()
returns trigger
language plpgsql
security definer
set search_path = public, extensions, pg_temp
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
revoke all on function public.assign_parking_segment_zone() from anon, authenticated;

drop trigger if exists assign_parking_segment_zone_trigger
  on public.parking_segments;

create trigger assign_parking_segment_zone_trigger
before insert or update of lat, lon
on public.parking_segments
for each row
execute function public.assign_parking_segment_zone();

-- Compatibility summary view. Availability is deterministic synthetic data,
-- retained only so the existing client contract works before predictions exist.
create view public.parking_segment_summaries
with (security_invoker = true)
as
select
  segment.id::text as id,
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
      hashtextextended(segment.id::text, 0) & 2147483647,
      segment.angebot::bigint + 1
    )::integer
  end as estimated_available_capacity,
  case
    when segment.angebot is null or segment.angebot <= 0 then null
    else round(
      100.0 * mod(
        hashtextextended(segment.id::text, 0) & 2147483647,
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

create view public.parking_zone_summaries
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
      100.0 * sum(segment.estimated_available_capacity)
      / nullif(sum(segment.capacity), 0)
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

create function public.fetch_parking_cells(
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
set search_path = public, extensions, pg_temp
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
        100.0 * aggregate.available_capacity
        / nullif(aggregate.total_capacity, 0)
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

grant select on public.parking_segment_summaries to anon, authenticated;
grant select on public.parking_zone_summaries to anon, authenticated;
revoke all on function public.fetch_parking_cells(
  double precision,
  double precision,
  double precision,
  double precision,
  text
) from public;
grant execute on function public.fetch_parking_cells(
  double precision,
  double precision,
  double precision,
  double precision,
  text
) to anon, authenticated;

comment on view public.parking_segment_summaries is
  'Compatibility summary over the UUID inventory; availability is deterministic synthetic development data.';
comment on view public.parking_zone_summaries is
  'Complete-zone compatibility aggregates independent of client viewport bounds.';
comment on function public.fetch_parking_cells(
  double precision,
  double precision,
  double precision,
  double precision,
  text
) is
  'Legacy bbox-derived hex aggregates for semantic zoom; cell IDs are not persistent prediction-cell identities.';

-- Final object/data-quality validation inside the same transaction.
do $$
declare
  bad_fk bigint;
  bad_percent bigint;
  bad_available bigint;
begin
  if to_regclass('public.parking_segment_summaries') is null
     or to_regclass('public.parking_zone_summaries') is null
     or to_regprocedure(
       'public.fetch_parking_cells(double precision,double precision,double precision,double precision,text)'
     ) is null
     or not exists (
       select 1
       from pg_catalog.pg_trigger
       where tgrelid = 'public.parking_segments'::regclass
         and tgname = 'assign_parking_segment_zone_trigger'
         and not tgisinternal
     ) then
    raise exception 'Semantic-zoom reconciliation object validation failed';
  end if;

  select count(*)
  into bad_fk
  from public.parking_segments as segment
  left join public.parking_zones as zone on zone.id = segment.parking_zone_id
  where segment.parking_zone_id is not null
    and zone.id is null;

  select count(*)
  into bad_percent
  from public.parking_zone_summaries
  where availability_percent is not null
    and (availability_percent < 0 or availability_percent > 100);

  select count(*)
  into bad_available
  from public.parking_zone_summaries
  where available_capacity is not null
    and available_capacity < 0;

  if bad_fk > 0 or bad_percent > 0 or bad_available > 0 then
    raise exception
      'Semantic-zoom data validation failed: invalid_fk=%, invalid_percent=%, invalid_available=%',
      bad_fk, bad_percent, bad_available;
  end if;
end;
$$;

commit;
