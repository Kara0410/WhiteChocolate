begin;

-- Broad semantic zoom needs a genuinely coarse segment-derived aggregate.
-- Keep the existing RPC signature so this can be deployed with the
-- segment-only migration before the repaired Expo client.
create or replace function public.fetch_parking_cells(
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
      when 'city' then 5000.0
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

comment on function public.fetch_parking_cells(
  double precision,
  double precision,
  double precision,
  double precision,
  text,
  text
) is
  'Segment-derived projected grid aggregates for city, coarse and fine semantic zoom.';

commit;
