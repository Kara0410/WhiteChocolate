-- Read-only checks for public.parking_segments access.
-- Run against the same Supabase project configured by EXPO_PUBLIC_SUPABASE_URL.

select
  policy.schemaname,
  policy.tablename,
  policy.policyname,
  policy.cmd,
  policy.roles,
  policy.qual as using_expression
from pg_policies as policy
where policy.schemaname = 'public'
  and policy.tablename = 'parking_segments'
  and policy.policyname = 'Allow public read parking_segments';

select
  grant_info.grantee,
  grant_info.privilege_type,
  grant_info.is_grantable
from information_schema.role_table_grants as grant_info
where grant_info.table_schema = 'public'
  and grant_info.table_name = 'parking_segments'
  and grant_info.grantee in ('anon', 'authenticated')
order by grant_info.grantee, grant_info.privilege_type;

select
  count(*) as total_rows
from public.parking_segments;

select
  count(*) as mapped_rows
from public.parking_segments
where lat is not null
  and lon is not null;

select
  count(*) as munich_test_bbox_rows
from public.parking_segments
where lat between 48.00 and 48.25
  and lon between 11.35 and 11.75;
