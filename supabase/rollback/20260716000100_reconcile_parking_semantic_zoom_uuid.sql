-- MANUAL ROLLBACK ONLY.
-- Do not place this file under supabase/migrations or run it automatically.
-- Use only before city/prediction objects depend on this spatial foundation.

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

alter table public.parking_segments
  drop constraint if exists parking_segments_parking_zone_id_fkey;

drop index if exists public.parking_segments_parking_zone_id_idx;
drop index if exists public.parking_segments_location_gix;

alter table public.parking_segments
  drop column if exists parking_zone_id;
alter table public.parking_segments
  drop column if exists location;

commit;
