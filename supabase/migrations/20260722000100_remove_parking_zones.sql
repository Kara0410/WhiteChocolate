-- Remove the administrative parking-polygon architecture. Parking segments,
-- their source geometry, representative coordinates, and estimator snapshots
-- remain authoritative.

begin;

create extension if not exists postgis with schema public;
set local search_path = public, extensions, pg_temp;

-- Inventory dependencies before changing anything. Known objects are removed
-- explicitly below; an unknown view or function fails the transaction so it
-- can be reviewed instead of being hidden by CASCADE.
create temporary table parking_zone_dependency_audit on commit drop as
select
  pg_catalog.pg_describe_object(
    dependency.classid,
    dependency.objid,
    dependency.objsubid
  ) as dependent_object,
  dependency.deptype
from pg_catalog.pg_depend as dependency
where dependency.refobjid in (
  coalesce(to_regclass('public.parking_zones'), 0::oid),
  coalesce(to_regclass('public.parking_zone_raw'), 0::oid),
  coalesce(to_regclass('public.parking_segments'), 0::oid)
);

do $$
declare
  unexpected_object text;
begin
  select format('%I.%I', view_row.schemaname, view_row.viewname)
  into unexpected_object
  from pg_catalog.pg_views as view_row
  where view_row.schemaname = 'public'
    and (
      view_row.definition ilike '%parking_zones%'
      or view_row.definition ilike '%parking_zone_id%'
    )
    and view_row.viewname not in (
      'parking_segment_summaries',
      'parking_zone_summaries'
    )
  order by view_row.viewname
  limit 1;

  if unexpected_object is not null then
    raise exception
      'Unexpected parking-zone view dependency: %', unexpected_object;
  end if;

  select format(
    '%I.%I(%s)',
    namespace_row.nspname,
    procedure_row.proname,
    pg_catalog.pg_get_function_identity_arguments(procedure_row.oid)
  )
  into unexpected_object
  from pg_catalog.pg_proc as procedure_row
  join pg_catalog.pg_namespace as namespace_row
    on namespace_row.oid = procedure_row.pronamespace
  where namespace_row.nspname = 'public'
    and procedure_row.prokind = 'f'
    and pg_catalog.pg_get_functiondef(procedure_row.oid) ilike '%parking_zone%'
    and procedure_row.proname not in (
      'assign_parking_segment_zone',
      'fetch_parking_cells'
    )
  order by procedure_row.proname
  limit 1;

  if unexpected_object is not null then
    raise exception
      'Unexpected parking-zone function dependency: %', unexpected_object;
  end if;
end;
$$;

drop function if exists public.fetch_parking_cells(
  double precision,
  double precision,
  double precision,
  double precision,
  text,
  text
);

drop function if exists public.fetch_parking_cells(
  double precision,
  double precision,
  double precision,
  double precision,
  text
);

drop view if exists public.parking_zone_summaries;

drop view if exists public.parking_segment_summaries;

drop trigger if exists assign_parking_segment_zone_trigger
  on public.parking_segments;
drop function if exists public.assign_parking_segment_zone();

do $$
declare
  constraint_row record;
  zone_column_number smallint;
begin
  select attribute_row.attnum
  into zone_column_number
  from pg_catalog.pg_attribute as attribute_row
  where attribute_row.attrelid = 'public.parking_segments'::regclass
    and attribute_row.attname = 'parking_zone_id'
    and attribute_row.attnum > 0
    and not attribute_row.attisdropped;

  if zone_column_number is null then
    return;
  end if;

  for constraint_row in
    select constraint_info.conname
    from pg_catalog.pg_constraint as constraint_info
    where constraint_info.conrelid = 'public.parking_segments'::regclass
      and (
        zone_column_number = any(constraint_info.conkey)
        or constraint_info.confrelid = coalesce(
          to_regclass('public.parking_zones'),
          0::oid
        )
      )
  loop
    execute format(
      'alter table public.parking_segments drop constraint %I',
      constraint_row.conname
    );
  end loop;
end;
$$;

drop index if exists public.parking_segments_parking_zone_id_idx;
drop index if exists public.parking_zones_geom_gix;

do $$
declare
  policy_row record;
  zone_table text;
begin
  for zone_table in
    select table_name
    from (values ('parking_zones'), ('parking_zone_raw')) as tables(table_name)
  loop
    if to_regclass(format('public.%I', zone_table)) is null then
      continue;
    end if;

    for policy_row in
      select policy_info.policyname
      from pg_catalog.pg_policies as policy_info
      where policy_info.schemaname = 'public'
        and policy_info.tablename = zone_table
    loop
      execute format(
        'drop policy %I on public.%I',
        policy_row.policyname,
        zone_table
      );
    end loop;

    execute format(
      'revoke all on table public.%I from public, anon, authenticated',
      zone_table
    );
  end loop;
end;
$$;

alter table public.parking_segments
  drop column if exists parking_zone_id;

-- No CASCADE: an undeclared live dependency aborts this transaction.
drop table if exists public.parking_zones;
drop table if exists public.parking_zone_raw;

-- Existing rows are the Munich import. The temporary default safely backfills
-- them, then is removed so every future city import must declare ownership.
alter table public.parking_segments
  add column if not exists city_code text;
update public.parking_segments
set city_code = 'munich'
where city_code is null;
alter table public.parking_segments
  alter column city_code set not null;
alter table public.parking_segments
  alter column city_code drop default;

do $$
begin
  if not exists (
    select 1
    from pg_catalog.pg_constraint as constraint_row
    where constraint_row.conrelid = 'public.parking_segments'::regclass
      and constraint_row.conname = 'parking_segments_city_code_valid'
  ) then
    alter table public.parking_segments
      add constraint parking_segments_city_code_valid
      check (city_code ~ '^[a-z][a-z0-9_-]*$');
  end if;
end;
$$;

create index if not exists parking_segments_city_code_idx
  on public.parking_segments (city_code);

create view public.parking_segment_summaries
with (security_barrier = true)
as
select
  segment.id::text as id,
  segment.city_code,
  segment."FID" as source_record_id,
  segment.strasse as street_name,
  segment.prm_name as source_area_name,
  segment.geoportal_class as source_classification,
  segment.shape as source_geometry,
  segment.lat,
  segment.lon,
  segment.angebot as capacity,
  estimate.available_spaces as estimated_available_capacity,
  estimate.availability_percent as estimated_availability_percent,
  coalesce(estimate.status, 'unknown') as availability_status,
  estimate.confidence as availability_confidence,
  estimate.generated_at as estimate_generated_at,
  estimate.valid_until as estimate_valid_until,
  estimate.estimator_version,
  estimate.factor_summary as estimate_factors,
  case
    when concat_ws(
      ' ',
      segment.parkregel_gruppe,
      segment.parkregel_name,
      segment.parkregel_beschreibung
    ) ~* '\m(kostenlos|gebührenfrei|gebuhrenfrei|entgeltfrei|free)\M' then 'free'
    when concat_ws(
      ' ',
      segment.parkregel_gruppe,
      segment.parkregel_name,
      segment.parkregel_beschreibung
    ) ~* '\m(kurzzeitparken|mischparken|altstadt|kostenpflichtig|paid)\M' then 'paid'
    else 'unknown'
  end as pricing_status,
  case
    when segment.parkregel_gruppe like 'Kurzzeitparken%' then 2.5
    when segment.parkregel_gruppe like 'Mischparken%' then 2.0
    when segment.parkregel_gruppe like 'Altstadt%' then 3.0
    else null
  end::double precision as hourly_rate,
  segment.parkregel_id as regulation_source_id,
  segment.parkregel_beschreibung as regulation_description,
  segment.parkregel_gruppe as regulation_group_name,
  segment.parkregel_name as regulation_name,
  segment.updated_at
from public.parking_segments as segment
left join lateral (
  select
    snapshot.available_spaces,
    snapshot.availability_percent,
    snapshot.status,
    snapshot.confidence,
    snapshot.generated_at,
    snapshot.valid_until,
    snapshot.estimator_version,
    snapshot.factor_summary
  from public.parking_availability_estimates as snapshot
  where snapshot.segment_id = segment.id
    and snapshot.valid_until > now()
  order by snapshot.generated_at desc, snapshot.created_at desc
  limit 1
) as estimate on true
where segment.location is not null;

create function public.fetch_parking_cells(
  p_min_lng double precision,
  p_min_lat double precision,
  p_max_lng double precision,
  p_max_lat double precision,
  p_resolution text,
  p_context_hash text
)
returns table (
  id text,
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
  estimated_segment_count integer,
  unknown_segment_count integer,
  estimate_coverage_ratio double precision,
  oldest_estimate_generated_at timestamptz,
  newest_estimate_generated_at timestamptz,
  updated_at timestamptz
)
language sql
stable
security definer
set search_path = public, extensions, pg_temp
as $$
  with request as (
    select case p_resolution
      when 'coarse' then 1000.0
      when 'fine' then 250.0
      else null
    end as cell_size
    where p_min_lng < p_max_lng
      and p_min_lat < p_max_lat
      and p_min_lng between -180 and 180
      and p_max_lng between -180 and 180
      and p_min_lat between -90 and 90
      and p_max_lat between -90 and 90
      and (p_context_hash is null or p_context_hash ~ '^[0-9a-f]{64}$')
  ),
  segment_values as (
    select
      floor(st_x(projected.point) / request.cell_size)::bigint as cell_x,
      floor(st_y(projected.point) / request.cell_size)::bigint as cell_y,
      request.cell_size,
      segment.id,
      segment.angebot as capacity,
      segment.updated_at,
      case
        when concat_ws(
          ' ',
          segment.parkregel_gruppe,
          segment.parkregel_name,
          segment.parkregel_beschreibung
        ) ~* '\m(kostenlos|gebührenfrei|gebuhrenfrei|entgeltfrei|free)\M' then 'free'
        when concat_ws(
          ' ',
          segment.parkregel_gruppe,
          segment.parkregel_name,
          segment.parkregel_beschreibung
        ) ~* '\m(kurzzeitparken|mischparken|altstadt|kostenpflichtig|paid)\M' then 'paid'
        else 'unknown'
      end as pricing_status,
      case
        when segment.parkregel_gruppe like 'Kurzzeitparken%' then 2.5
        when segment.parkregel_gruppe like 'Mischparken%' then 2.0
        when segment.parkregel_gruppe like 'Altstadt%' then 3.0
        else null
      end::double precision as hourly_rate,
      estimate.available_spaces,
      estimate.status as estimate_status,
      estimate.generated_at
    from request
    join public.parking_segments as segment
      on segment.lat between p_min_lat and p_max_lat
     and segment.lon between p_min_lng and p_max_lng
     and segment.location is not null
    cross join lateral (
      select st_transform(segment.location, 3857) as point
    ) as projected
    left join lateral (
      select
        snapshot.available_spaces,
        snapshot.status,
        snapshot.generated_at
      from public.parking_availability_estimates as snapshot
      where snapshot.segment_id = segment.id
        and snapshot.context_hash = p_context_hash
        and snapshot.valid_until > now()
      order by snapshot.generated_at desc, snapshot.created_at desc
      limit 1
    ) as estimate on true
    where request.cell_size is not null
  ),
  aggregates as (
    select
      value.cell_x,
      value.cell_y,
      value.cell_size,
      count(value.id)::integer as segment_count,
      sum(value.capacity)::bigint as total_capacity,
      sum(value.available_spaces) filter (
        where value.estimate_status = 'estimated'
      )::bigint as available_capacity,
      sum(value.capacity) filter (
        where value.estimate_status = 'estimated' and value.capacity > 0
      )::bigint as estimated_capacity,
      min(value.hourly_rate) filter (
        where value.pricing_status = 'paid'
      ) as minimum_hourly_rate,
      max(value.hourly_rate) filter (
        where value.pricing_status = 'paid'
      ) as maximum_hourly_rate,
      coalesce(bool_or(value.pricing_status = 'free'), false) as has_free_parking,
      coalesce(bool_or(value.pricing_status = 'unknown'), false) as has_unknown_pricing,
      count(value.id) filter (
        where value.estimate_status = 'estimated'
      )::integer as estimated_segment_count,
      min(value.generated_at) filter (
        where value.estimate_status = 'estimated'
      ) as oldest_estimate_generated_at,
      max(value.generated_at) filter (
        where value.estimate_status = 'estimated'
      ) as newest_estimate_generated_at,
      max(value.updated_at) as updated_at
    from segment_values as value
    group by value.cell_x, value.cell_y, value.cell_size
  ),
  cell_geometry as (
    select
      aggregate.*,
      st_transform(
        st_setsrid(
          st_makepoint(
            (aggregate.cell_x + 0.5) * aggregate.cell_size,
            (aggregate.cell_y + 0.5) * aggregate.cell_size
          ),
          3857
        ),
        4326
      ) as center,
      st_transform(
        st_setsrid(
          st_makepoint(
            aggregate.cell_x * aggregate.cell_size,
            aggregate.cell_y * aggregate.cell_size
          ),
          3857
        ),
        4326
      ) as minimum_corner,
      st_transform(
        st_setsrid(
          st_makepoint(
            (aggregate.cell_x + 1) * aggregate.cell_size,
            (aggregate.cell_y + 1) * aggregate.cell_size
          ),
          3857
        ),
        4326
      ) as maximum_corner
    from aggregates as aggregate
  )
  select
    concat(p_resolution, ':', cell.cell_x, ':', cell.cell_y) as id,
    st_y(cell.center) as center_latitude,
    st_x(cell.center) as center_longitude,
    st_x(cell.minimum_corner) as min_lng,
    st_y(cell.minimum_corner) as min_lat,
    st_x(cell.maximum_corner) as max_lng,
    st_y(cell.maximum_corner) as max_lat,
    p_resolution as resolution,
    cell.segment_count,
    cell.total_capacity,
    cell.available_capacity,
    case
      when coalesce(cell.estimated_capacity, 0) <= 0 then null
      else round(
        100.0 * cell.available_capacity
        / nullif(cell.estimated_capacity, 0)
      )::integer
    end as availability_percent,
    cell.minimum_hourly_rate,
    cell.maximum_hourly_rate,
    cell.has_free_parking,
    cell.has_unknown_pricing,
    case
      when cell.estimated_segment_count = 0 then 'unknown'
      when cell.estimated_segment_count = cell.segment_count then 'estimated'
      else 'mixed'
    end as availability_status,
    cell.estimated_segment_count,
    cell.segment_count - cell.estimated_segment_count as unknown_segment_count,
    round(
      cell.estimated_segment_count::numeric / nullif(cell.segment_count, 0),
      4
    )::double precision as estimate_coverage_ratio,
    cell.oldest_estimate_generated_at,
    cell.newest_estimate_generated_at,
    cell.updated_at
  from cell_geometry as cell
  order by cell.cell_x, cell.cell_y
  limit 400;
$$;

grant select on public.parking_segments to anon, authenticated;
grant select on public.parking_segment_summaries to anon, authenticated;
revoke all on function public.fetch_parking_cells(
  double precision,
  double precision,
  double precision,
  double precision,
  text,
  text
) from public;
grant execute on function public.fetch_parking_cells(
  double precision,
  double precision,
  double precision,
  double precision,
  text,
  text
) to anon, authenticated;

comment on column public.parking_segments.city_code is
  'Canonical import-owned city identity; never inferred from a polygon.';
comment on view public.parking_segment_summaries is
  'Segment-centric parking inventory with current estimator snapshots and source metadata.';
comment on function public.fetch_parking_cells(
  double precision,
  double precision,
  double precision,
  double precision,
  text,
  text
) is
  'Segment-derived projected grid aggregates for broad and intermediate semantic zoom.';

do $$
begin
  if to_regclass('public.parking_zones') is not null
     or to_regclass('public.parking_zone_raw') is not null
     or to_regclass('public.parking_zone_summaries') is not null then
    raise exception 'Parking polygon objects remain after migration';
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'parking_segments'
      and column_name = 'parking_zone_id'
  ) then
    raise exception 'parking_segments.parking_zone_id remains after migration';
  end if;

  if exists (
    select 1
    from pg_catalog.pg_trigger as trigger_row
    where trigger_row.tgrelid = 'public.parking_segments'::regclass
      and not trigger_row.tgisinternal
      and pg_catalog.pg_get_triggerdef(trigger_row.oid, true) ilike '%zone%'
  ) then
    raise exception 'A zone-related parking segment trigger remains';
  end if;
end;
$$;

commit;
