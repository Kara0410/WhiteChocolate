-- Read-only verification for Phase 1 city ownership.
--
-- Run this against the intended Supabase project before applying a Phase 1
-- production migration. The linked project used during the repository audit
-- did not match the repository's generated types or semantic-zoom migration;
-- this script is deliberately catalog-driven so optional objects are reported
-- instead of being assumed.
--
-- This script must not mutate data. It starts a read-only transaction and
-- rolls it back at the end.

begin;
set transaction read only;

-- 1. Relevant relations and their RLS state.
select
  n.nspname as schema_name,
  c.relname as object_name,
  case c.relkind
    when 'r' then 'table'
    when 'v' then 'view'
    when 'm' then 'materialized view'
    when 'p' then 'partitioned table'
    when 'S' then 'sequence'
    else c.relkind::text
  end as object_kind,
  pg_get_userbyid(c.relowner) as owner_name,
  c.relrowsecurity as rls_enabled,
  c.relforcerowsecurity as rls_forced
from pg_catalog.pg_class as c
join pg_catalog.pg_namespace as n on n.oid = c.relnamespace
where n.nspname = 'public'
  and (
    c.relname in (
      'cities',
      'parking_segments',
      'parking_zones',
      'parking_zone_raw',
      'parking_segment_summaries',
      'parking_zone_summaries',
      'user_favorites'
    )
    or c.relname ilike '%parking%'
    or c.relname ilike '%cell%'
  )
order by c.relname;

-- 2. Columns, including generated-column metadata where available.
select
  c.table_name,
  c.ordinal_position,
  c.column_name,
  c.data_type,
  c.udt_schema,
  c.udt_name,
  c.is_nullable,
  c.column_default,
  a.attgenerated,
  pg_catalog.pg_get_expr(d.adbin, d.adrelid) as generation_expression
from information_schema.columns as c
join pg_catalog.pg_class as rel
  on rel.oid = (c.table_schema || '.' || c.table_name)::regclass
join pg_catalog.pg_namespace as ns
  on ns.oid = rel.relnamespace
join pg_catalog.pg_attribute as a
  on a.attrelid = rel.oid
 and a.attname = c.column_name
left join pg_catalog.pg_attrdef as d
  on d.adrelid = a.attrelid
 and d.adnum = a.attnum
where c.table_schema = 'public'
  and c.table_name in (
    'cities',
    'parking_segments',
    'parking_zones',
    'parking_zone_raw',
    'user_favorites'
  )
order by c.table_name, c.ordinal_position;

-- 3. Constraints and foreign keys.
select
  n.nspname || '.' || rel.relname as table_name,
  con.conname as constraint_name,
  con.contype as constraint_type,
  pg_catalog.pg_get_constraintdef(con.oid, true) as constraint_definition
from pg_catalog.pg_constraint as con
join pg_catalog.pg_class as rel on rel.oid = con.conrelid
join pg_catalog.pg_namespace as n on n.oid = rel.relnamespace
where n.nspname = 'public'
  and rel.relname in (
    'cities',
    'parking_segments',
    'parking_zones',
    'parking_zone_raw',
    'user_favorites'
  )
order by rel.relname, con.conname;

-- 4. Existing indexes. Do not add a Phase 1 index until this result is known.
select
  schemaname,
  tablename,
  indexname,
  indexdef
from pg_catalog.pg_indexes
where schemaname = 'public'
  and tablename in (
    'cities',
    'parking_segments',
    'parking_zones',
    'parking_zone_raw',
    'user_favorites'
  )
order by tablename, indexname;

-- 5. Policies, grants, and effective read privileges.
select
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual as using_expression,
  with_check as check_expression
from pg_catalog.pg_policies
where schemaname = 'public'
  and tablename in (
    'cities',
    'parking_segments',
    'parking_zones',
    'parking_zone_raw',
    'user_favorites'
  )
order by tablename, policyname;

select
  table_schema,
  table_name,
  grantee,
  privilege_type,
  is_grantable
from information_schema.role_table_grants
where table_schema = 'public'
  and table_name in (
    'cities',
    'parking_segments',
    'parking_zones',
    'parking_zone_raw',
    'user_favorites'
  )
  and grantee in ('anon', 'authenticated')
order by table_name, grantee, privilege_type;

select
  table_name,
  has_table_privilege('anon', 'public.' || table_name, 'select') as anon_can_select,
  has_table_privilege('authenticated', 'public.' || table_name, 'select') as authenticated_can_select,
  has_table_privilege('anon', 'public.' || table_name, 'insert') as anon_can_insert,
  has_table_privilege('authenticated', 'public.' || table_name, 'insert') as authenticated_can_insert,
  has_table_privilege('anon', 'public.' || table_name, 'update') as anon_can_update,
  has_table_privilege('authenticated', 'public.' || table_name, 'update') as authenticated_can_update,
  has_table_privilege('anon', 'public.' || table_name, 'delete') as anon_can_delete,
  has_table_privilege('authenticated', 'public.' || table_name, 'delete') as authenticated_can_delete
from (values
  ('cities'),
  ('parking_segments'),
  ('parking_zones'),
  ('parking_zone_raw'),
  ('user_favorites')
) as objects(table_name)
where to_regclass('public.' || table_name) is not null
order by table_name;

-- 6. Triggers and relevant function definitions.
select
  n.nspname || '.' || rel.relname as table_name,
  trigger_info.tgname as trigger_name,
  pg_catalog.pg_get_triggerdef(trigger_info.oid, true) as trigger_definition
from pg_catalog.pg_trigger as trigger_info
join pg_catalog.pg_class as rel on rel.oid = trigger_info.tgrelid
join pg_catalog.pg_namespace as n on n.oid = rel.relnamespace
where not trigger_info.tgisinternal
  and n.nspname = 'public'
  and (
    rel.relname in ('parking_segments', 'parking_zones', 'cities')
    or pg_catalog.pg_get_triggerdef(trigger_info.oid, true) ilike '%parking%'
  )
order by rel.relname, trigger_info.tgname;

select
  n.nspname as schema_name,
  p.proname as function_name,
  pg_catalog.pg_get_function_identity_arguments(p.oid) as identity_arguments,
  p.prosecdef as security_definer,
  p.proconfig as function_config,
  pg_catalog.pg_get_functiondef(p.oid) as function_definition
from pg_catalog.pg_proc as p
join pg_catalog.pg_namespace as n on n.oid = p.pronamespace
where n.nspname = 'public'
  and (
    p.proname in ('set_updated_at', 'assign_parking_segment_zone', 'fetch_parking_cells')
    or p.proname ilike '%parking%'
    or p.proname ilike '%zone%'
    or p.proname ilike '%cell%'
  )
order by p.proname, identity_arguments;

-- 7. Required row counts and data-quality checks.
select
  (select count(*) from public.parking_segments) as parking_segment_count,
  (select count(*) from public.parking_zones) as parking_zone_count,
  (select count(*) from public.parking_zone_raw) as parking_zone_raw_count,
  (select count(*) from public.user_favorites) as user_favorite_count;

select
  (select count(*) from (select id from public.parking_segments group by id having count(*) > 1) duplicates) as duplicate_segment_ids,
  (select count(*) from public.parking_segments where id is null) as null_segment_ids,
  (select count(*) from (select id from public.parking_zones group by id having count(*) > 1) duplicates) as duplicate_zone_ids,
  (select count(*) from public.parking_zones where id is null) as null_zone_ids,
  (select count(*) from public.parking_segments where lat is null or lon is null) as null_segment_coordinates,
  (select count(*) from public.parking_segments where lat is not null and lon is not null and (lat < -90 or lat > 90 or lon < -180 or lon > 180)) as invalid_segment_coordinates,
  (select count(*) from public.parking_zones where geom is not null and (st_srid(geom) <> 4326 or st_isempty(geom) or not st_isvalid(geom))) as invalid_zone_geometries,
  (select count(*) from public.parking_zones where geom is not null and st_isempty(geom)) as empty_zone_geometries;

-- 8. Optional semantic-zoom and city columns. These notices are intentionally
-- dynamic so the diagnostic itself works before and after the migration.
do $optional_city_checks$
declare
  has_location boolean;
  has_segment_zone boolean;
  has_segment_city boolean;
  has_zone_city boolean;
  has_raw_city boolean;
  has_cities boolean;
  segment_city_nulls bigint;
  zone_city_nulls bigint;
  raw_city_nulls bigint;
  cross_city_assignments bigint;
  location_bad bigint;
begin
  has_location := exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'parking_segments' and column_name = 'location'
  );
  has_segment_zone := exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'parking_segments' and column_name = 'parking_zone_id'
  );
  has_segment_city := exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'parking_segments' and column_name = 'city_id'
  );
  has_zone_city := exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'parking_zones' and column_name = 'city_id'
  );
  has_raw_city := exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'parking_zone_raw' and column_name = 'city_id'
  );
  has_cities := to_regclass('public.cities') is not null;

  raise notice 'optional columns: location=%, parking_zone_id=%, segment_city_id=%, zone_city_id=%, raw_city_id=%, cities_table=%',
    has_location, has_segment_zone, has_segment_city, has_zone_city, has_raw_city, has_cities;

  if has_location then
    execute $query$
      select count(*)
      from public.parking_segments
      where location is not null
        and (st_srid(location) <> 4326 or st_geometrytype(location) <> 'ST_Point' or not st_isvalid(location))
    $query$ into location_bad;
    raise notice 'invalid generated/location geometries: %', location_bad;
  end if;

  if has_segment_city then
    execute 'select count(*) from public.parking_segments where city_id is null' into segment_city_nulls;
    raise notice 'parking_segments null city_id: %', segment_city_nulls;
  end if;
  if has_zone_city then
    execute 'select count(*) from public.parking_zones where city_id is null' into zone_city_nulls;
    raise notice 'parking_zones null city_id: %', zone_city_nulls;
  end if;
  if has_raw_city then
    execute 'select count(*) from public.parking_zone_raw where city_id is null' into raw_city_nulls;
    raise notice 'parking_zone_raw null city_id: %', raw_city_nulls;
  end if;
  if has_segment_zone and has_segment_city and has_zone_city then
    execute $query$
      select count(*)
      from public.parking_segments as segment
      join public.parking_zones as zone on zone.id = segment.parking_zone_id
      where segment.city_id is distinct from zone.city_id
    $query$ into cross_city_assignments;
    raise notice 'cross-city segment/zone assignments: %', cross_city_assignments;
  end if;
end;
$optional_city_checks$;

-- 9. Favorites and identifier preservation checks.
select
  count(*) as favorite_row_count,
  count(distinct segment_id) as unique_favorite_segment_ids,
  count(*) filter (where snapshot is not null) as snapshots_present,
  count(*) filter (
    where snapshot is not null
      and (snapshot ? 'cityId' or snapshot ? 'city_id' or snapshot ? 'city')
  ) as snapshots_with_city_like_keys
from public.user_favorites;

select
  count(distinct favorite.segment_id) as orphan_favorite_segment_ids
from public.user_favorites as favorite
left join public.parking_segments as segment
  on segment.id::text = favorite.segment_id
where segment.id is null;

-- 10. If cities exists, verify the Phase 1 seed and inventory coverage.
do $phase1_city_checks$
declare
  munich_count bigint;
  city_count bigint;
  segment_city_nulls bigint;
  zone_city_nulls bigint;
begin
  if to_regclass('public.cities') is null then
    raise notice 'public.cities is absent; Phase 1 city checks not applicable yet';
    return;
  end if;

  execute $query$select count(*) from public.cities where slug = 'munich'$query$ into munich_count;
  execute $query$select count(*) from public.cities$query$ into city_count;
  raise notice 'cities total: %, munich rows: %', city_count, munich_count;

  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'parking_segments' and column_name = 'city_id') then
    execute $query$select count(*) from public.parking_segments where city_id is null$query$ into segment_city_nulls;
    raise notice 'parking_segments null city_id: %', segment_city_nulls;
  end if;
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'parking_zones' and column_name = 'city_id') then
    execute $query$select count(*) from public.parking_zones where city_id is null$query$ into zone_city_nulls;
    raise notice 'parking_zones null city_id: %', zone_city_nulls;
  end if;
end;
$phase1_city_checks$;

rollback;
