-- Read-only verification for the UUID semantic-zoom reconciliation.
-- Run after the reconciliation migration against the same target database.
-- This script never mutates data and rolls back its read-only transaction.

begin;
set transaction read only;

select
  extname as extension_name,
  extversion as extension_version,
  n.nspname as extension_schema
from pg_catalog.pg_extension as e
join pg_catalog.pg_namespace as n on n.oid = e.extnamespace
where extname in ('postgis', 'pgcrypto')
order by extname;

select
  n.nspname as schema_name,
  c.relname as object_name,
  case c.relkind when 'r' then 'table' when 'v' then 'view' else c.relkind::text end as object_kind,
  c.relrowsecurity as rls_enabled
from pg_catalog.pg_class as c
join pg_catalog.pg_namespace as n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname in (
    'parking_segments',
    'parking_zones',
    'parking_segment_summaries',
    'parking_zone_summaries'
  )
order by c.relname;

select
  'parking_zone_raw' as object_name,
  count(*) as row_count
from public.parking_zone_raw;

select
  schemaname,
  tablename,
  policyname,
  roles,
  cmd,
  qual,
  with_check
from pg_catalog.pg_policies
where schemaname = 'public'
  and tablename in ('parking_segments', 'parking_zones')
order by tablename, policyname;

select
  n.nspname || '.' || p.proname as function_name,
  pg_catalog.pg_get_function_identity_arguments(p.oid) as identity_arguments,
  pg_catalog.pg_get_function_result(p.oid) as return_type,
  p.prosecdef as security_definer
from pg_catalog.pg_proc as p
join pg_catalog.pg_namespace as n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in ('assign_parking_segment_zone', 'fetch_parking_cells')
order by p.proname;

select
  t.tgname as trigger_name,
  pg_catalog.pg_get_triggerdef(t.oid, true) as trigger_definition
from pg_catalog.pg_trigger as t
where t.tgrelid = 'public.parking_segments'::regclass
  and not t.tgisinternal
order by t.tgname;

-- Counts and order-independent fingerprints. Compare fingerprints with the
-- deployment baseline captured before migration to prove exact ID preservation.
select
  count(*) as segment_count,
  md5(string_agg(id::text, ',' order by id)) as segment_uuid_set_fingerprint,
  count(*) filter (where location is not null) as generated_location_count,
  count(*) filter (
    where location is not null
      and st_geometrytype(location) = 'ST_Point'
      and st_srid(location) = 4326
      and st_isvalid(location)
      and not st_isempty(location)
      and st_x(location) = lon
      and st_y(location) = lat
  ) as valid_generated_location_count,
  count(*) filter (where parking_zone_id is not null) as assigned_segment_count,
  count(*) filter (where parking_zone_id is null) as unassigned_segment_count
from public.parking_segments;

select
  count(*) as zone_count,
  md5(string_agg(id::text, ',' order by id)) as zone_id_set_fingerprint,
  count(*) filter (
    where geom is not null
      and st_geometrytype(geom) = 'ST_MultiPolygon'
      and st_srid(geom) = 4326
      and st_isvalid(geom)
      and not st_isempty(geom)
  ) as valid_zone_geometry_count
from public.parking_zones;

-- Baseline captured from the linked target immediately before reconciliation:
-- segments=13,340 / fd2aaf3f0ae66820a7b3dd6201db4965
-- zones=82 / 658f172deb6a7aae1f97014095735b30
select
  (select count(*) from public.parking_segments) = 13340 as segment_count_matches_baseline,
  (select md5(string_agg(id::text, ',' order by id)) from public.parking_segments)
    = 'fd2aaf3f0ae66820a7b3dd6201db4965' as segment_uuid_set_matches_baseline,
  (select count(*) from public.parking_zones) = 82 as zone_count_matches_baseline,
  (select md5(string_agg(id::text, ',' order by id)) from public.parking_zones)
    = '658f172deb6a7aae1f97014095735b30' as zone_id_set_matches_baseline;

select
  count(*) filter (where covering_zone_count = 0) as uncovered_segment_count,
  count(*) filter (where covering_zone_count = 1) as uniquely_covered_segment_count,
  count(*) filter (where covering_zone_count > 1) as multiply_covered_segment_count,
  coalesce(max(covering_zone_count), 0) as largest_overlap_count
from (
  select
    segment.id,
    count(zone.id) as covering_zone_count
  from public.parking_segments as segment
  left join public.parking_zones as zone
    on segment.location is not null
   and zone.geom is not null
   and zone.geom && segment.location
   and st_covers(zone.geom, segment.location)
  group by segment.id
) as coverage;

select
  count(*) as invalid_assigned_segment_count
from public.parking_segments as segment
join public.parking_zones as zone on zone.id = segment.parking_zone_id
where segment.location is null
   or zone.geom is null
   or not (zone.geom && segment.location)
   or not st_covers(zone.geom, segment.location);

select
  count(*) as invalid_summary_percentage_count
from public.parking_zone_summaries
where availability_percent is not null
  and (availability_percent < 0 or availability_percent > 100);

select
  count(*) as invalid_summary_capacity_count
from public.parking_zone_summaries
where available_capacity is not null
   and available_capacity < 0;

select
  'parking_segment_summaries' as object_name,
  count(*) as row_count,
  min(estimated_availability_percent) as minimum_percentage,
  max(estimated_availability_percent) as maximum_percentage,
  min(estimated_available_capacity) as minimum_available_capacity,
  max(estimated_available_capacity) as maximum_available_capacity
from public.parking_segment_summaries
union all
select
  'parking_zone_summaries',
  count(*),
  min(availability_percent),
  max(availability_percent),
  min(available_capacity),
  max(available_capacity)
from public.parking_zone_summaries;

select
  'parking_segment_summaries' as object_name,
  count(*) as row_count,
  count(*) filter (where id is null) as null_id_count
from public.parking_segment_summaries
union all
select
  'parking_zone_summaries',
  count(*),
  count(*) filter (where zone_id is null)
from public.parking_zone_summaries;

-- Reconcile zone aggregates with the segment summary source.
with expected as (
  select
    parking_zone_id::text as zone_id,
    count(*)::integer as segment_count,
    case when count(capacity) = 0 then null else sum(capacity)::bigint end as total_capacity,
    case when count(estimated_available_capacity) = 0 then null else sum(estimated_available_capacity)::bigint end as available_capacity
  from public.parking_segment_summaries
  where parking_zone_id is not null
  group by parking_zone_id
), mismatches as (
  select summary.zone_id
  from public.parking_zone_summaries as summary
  join expected on expected.zone_id = summary.zone_id
  where expected.segment_count is distinct from summary.segment_count
     or expected.total_capacity is distinct from summary.total_capacity
     or expected.available_capacity is distinct from summary.available_capacity
)
select count(*) as zone_aggregate_mismatch_count from mismatches;

select
  resolution,
  count(*) as cell_count,
  min(availability_percent) as minimum_percentage,
  max(availability_percent) as maximum_percentage,
  min(available_capacity) as minimum_available_capacity,
  max(available_capacity) as maximum_available_capacity,
  bool_and(
    availability_percent is null
    or availability_percent between 0 and 100
  ) as percentages_in_range,
  bool_and(
    available_capacity is null
    or available_capacity >= 0
  ) as capacities_in_range
from (
  select 'coarse' as resolution, *
  from public.fetch_parking_cells(11.35, 48.00, 11.75, 48.25, 'coarse')
  union all
  select 'fine' as resolution, *
  from public.fetch_parking_cells(11.35, 48.00, 11.75, 48.25, 'fine')
) as cells
group by resolution
order by resolution;

select
  has_table_privilege('anon', 'public.parking_segment_summaries', 'select') as anon_segment_summary_select,
  has_table_privilege('authenticated', 'public.parking_segment_summaries', 'select') as authenticated_segment_summary_select,
  has_table_privilege('anon', 'public.parking_zone_summaries', 'select') as anon_zone_summary_select,
  has_table_privilege('authenticated', 'public.parking_zone_summaries', 'select') as authenticated_zone_summary_select,
  has_function_privilege('anon', 'public.fetch_parking_cells(double precision, double precision, double precision, double precision, text)', 'execute') as anon_cell_rpc_execute,
  has_function_privilege('authenticated', 'public.fetch_parking_cells(double precision, double precision, double precision, double precision, text)', 'execute') as authenticated_cell_rpc_execute,
  (
    select exists (
      select 1
      from pg_catalog.pg_proc as assignment_function
      cross join lateral aclexplode(
        coalesce(
          assignment_function.proacl,
          acldefault('f', assignment_function.proowner)
        )
      ) as privilege
      where assignment_function.oid = 'public.assign_parking_segment_zone()'::regprocedure
        and privilege.grantee = 0
        and privilege.privilege_type = 'EXECUTE'
    )
  ) as public_assignment_execute,
  has_table_privilege('anon', 'public.parking_segments', 'insert') as anon_inventory_insert,
  has_table_privilege('anon', 'public.parking_segments', 'update') as anon_inventory_update,
  has_table_privilege('anon', 'public.parking_segments', 'delete') as anon_inventory_delete,
  has_table_privilege('authenticated', 'public.parking_segments', 'insert') as authenticated_inventory_insert,
  has_table_privilege('authenticated', 'public.parking_segments', 'update') as authenticated_inventory_update,
  has_table_privilege('authenticated', 'public.parking_segments', 'delete') as authenticated_inventory_delete,
  has_table_privilege('anon', 'public.parking_zones', 'insert') as anon_zone_insert,
  has_table_privilege('anon', 'public.parking_zones', 'update') as anon_zone_update,
  has_table_privilege('anon', 'public.parking_zones', 'delete') as anon_zone_delete,
  has_table_privilege('authenticated', 'public.parking_zones', 'insert') as authenticated_zone_insert,
  has_table_privilege('authenticated', 'public.parking_zones', 'update') as authenticated_zone_update,
  has_table_privilege('authenticated', 'public.parking_zones', 'delete') as authenticated_zone_delete;

rollback;
