-- MANUAL ROLLBACK ONLY.
-- Do not place this file under supabase/migrations or run it automatically.
-- Use only before city/prediction objects depend on this spatial foundation.
--
-- This script removes only columns, constraints, and indexes marked as owned
-- by the Phase 1A reconciliation migration. It never deletes inventory rows,
-- zone rows, UUID IDs, PostGIS, or existing unrelated indexes. Do not run it
-- after later city or prediction phases depend on these objects; use feature
-- flags/publication rollback instead.

begin;
set local search_path = public, extensions, pg_temp;

revoke all on function public.fetch_parking_cells(
  double precision,
  double precision,
  double precision,
  double precision,
  text
) from public, anon, authenticated;

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
begin
  if (
    select obj_description(constraint_row.oid, 'pg_constraint')
    from pg_catalog.pg_constraint as constraint_row
    where constraint_row.conrelid = 'public.parking_segments'::regclass
      and constraint_row.conname = 'parking_segments_parking_zone_id_fkey'
  ) = 'Phase 1A managed constraint: preserves segment-zone referential integrity.' then
    alter table public.parking_segments
      drop constraint parking_segments_parking_zone_id_fkey;
  end if;
end;
$$;

do $$
begin
  if to_regclass('public.parking_segments_parking_zone_id_idx') is not null
     and obj_description(
       to_regclass('public.parking_segments_parking_zone_id_idx'),
       'pg_class'
     ) = 'Phase 1A managed index: segment-to-zone relationship.' then
    drop index public.parking_segments_parking_zone_id_idx;
  end if;

  if to_regclass('public.parking_segments_location_gix') is not null
     and obj_description(
       to_regclass('public.parking_segments_location_gix'),
       'pg_class'
     ) = 'Phase 1A managed index: generated segment locations.' then
    drop index public.parking_segments_location_gix;
  end if;

  if to_regclass('public.parking_zones_geom_gix') is not null
     and obj_description(
       to_regclass('public.parking_zones_geom_gix'),
       'pg_class'
     ) = 'Phase 1A managed index: parking zone geometries.' then
    drop index public.parking_zones_geom_gix;
  end if;
end;
$$;

do $$
begin
  if col_description(
    'public.parking_segments'::regclass,
    (
      select attnum
      from pg_catalog.pg_attribute
      where attrelid = 'public.parking_segments'::regclass
        and attname = 'parking_zone_id'
        and not attisdropped
    )
  ) = 'Phase 1A managed column: administrative zone assigned server-side with ST_Covers.' then
    alter table public.parking_segments drop column parking_zone_id;
  end if;

  if col_description(
    'public.parking_segments'::regclass,
    (
      select attnum
      from pg_catalog.pg_attribute
      where attrelid = 'public.parking_segments'::regclass
        and attname = 'location'
        and not attisdropped
    )
  ) = 'Phase 1A managed column: generated WGS84 point from lon/lat for semantic parking zoom.' then
    alter table public.parking_segments drop column location;
  end if;
end;
$$;

commit;
