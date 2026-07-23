-- Read-only verification for the segment-centric multi-city parking model.

select
  city_code,
  count(*) as segment_count,
  count(*) filter (where "FID" is null) as missing_source_record_id,
  count(*) filter (where shape is null) as missing_source_geometry,
  count(*) filter (where lat is null or lon is null) as missing_coordinates
from public.parking_segments
group by city_code
order by city_code;

select
  count(*) as invalid_city_codes
from public.parking_segments
where city_code is null
   or city_code !~ '^[a-z][a-z0-9_-]*$';

select
  count(*) as invalid_representative_coordinates
from public.parking_segments
where lat is not null
  and lon is not null
  and (lat < -90 or lat > 90 or lon < -180 or lon > 180);

select
  count(*) as segment_summary_count,
  count(*) filter (where city_code is null) as missing_summary_city,
  count(*) filter (where source_geometry is null) as missing_summary_geometry
from public.parking_segment_summaries;

select
  has_table_privilege('anon', 'public.parking_segments', 'select')
    as anon_segment_select,
  has_table_privilege('authenticated', 'public.parking_segments', 'select')
    as authenticated_segment_select,
  has_table_privilege('anon', 'public.parking_segment_summaries', 'select')
    as anon_segment_summary_select,
  has_table_privilege(
    'authenticated',
    'public.parking_segment_summaries',
    'select'
  ) as authenticated_segment_summary_select,
  has_function_privilege(
    'anon',
    'public.fetch_parking_cells(double precision,double precision,double precision,double precision,text,text)',
    'execute'
  ) as anon_cell_execute,
  has_function_privilege(
    'authenticated',
    'public.fetch_parking_cells(double precision,double precision,double precision,double precision,text,text)',
    'execute'
  ) as authenticated_cell_execute;

select
  trigger_info.tgname,
  pg_catalog.pg_get_triggerdef(trigger_info.oid, true) as trigger_definition
from pg_catalog.pg_trigger as trigger_info
where trigger_info.tgrelid = 'public.parking_segments'::regclass
  and not trigger_info.tgisinternal
order by trigger_info.tgname;

select
  to_regclass('public.parking_zones') is null as polygon_table_removed,
  to_regclass('public.parking_zone_raw') is null as polygon_staging_removed,
  to_regclass('public.parking_zone_summaries') is null as polygon_summary_removed,
  not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'parking_segments'
      and column_name = 'parking_zone_id'
  ) as polygon_relationship_removed;
