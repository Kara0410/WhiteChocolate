-- Read-only diagnostics for Supabase email/password signup failures.
-- Run in the Supabase SQL editor against the intended project.
-- Do not paste secrets, API keys, access tokens, or user passwords into logs.

-- 1. Triggers on auth.users.
select
  trigger_name,
  event_manipulation,
  action_timing,
  action_statement
from information_schema.triggers
where event_object_schema = 'auth'
  and event_object_table = 'users'
order by trigger_name;

-- 2. PostgreSQL trigger definitions touching auth.users.
select
  trigger_name,
  pg_get_triggerdef(trigger_oid, true) as trigger_definition
from (
  select
    t.tgname as trigger_name,
    t.oid as trigger_oid
  from pg_trigger t
  join pg_class c on c.oid = t.tgrelid
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'auth'
    and c.relname = 'users'
    and not t.tgisinternal
) triggers
order by trigger_name;

-- 3. public.handle_new_user() metadata.
select
  n.nspname as schema_name,
  p.proname as function_name,
  pg_get_userbyid(p.proowner) as function_owner,
  p.prosecdef as is_security_definer,
  p.proconfig as function_config,
  pg_get_functiondef(p.oid) as function_definition
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname = 'handle_new_user';

-- 4. public.profiles columns.
select
  column_name,
  data_type,
  is_nullable,
  column_default
from information_schema.columns
where table_schema = 'public'
  and table_name = 'profiles'
order by ordinal_position;

-- 5. public.profiles constraints and foreign keys.
select
  conname as constraint_name,
  contype as constraint_type,
  pg_get_constraintdef(oid, true) as constraint_definition
from pg_constraint
where conrelid = 'public.profiles'::regclass
order by conname;

-- 6. Grants on public.profiles.
select
  grantee,
  privilege_type,
  is_grantable
from information_schema.role_table_grants
where table_schema = 'public'
  and table_name = 'profiles'
order by grantee, privilege_type;

-- 7. Column grants on public.profiles.
select
  grantee,
  column_name,
  privilege_type
from information_schema.column_privileges
where table_schema = 'public'
  and table_name = 'profiles'
order by grantee, column_name, privilege_type;

-- 8. Duplicate or stale signup trigger names.
select
  t.tgname as trigger_name,
  n.nspname as table_schema,
  c.relname as table_name,
  pg_get_triggerdef(t.oid, true) as trigger_definition
from pg_trigger t
join pg_class c on c.oid = t.tgrelid
join pg_namespace n on n.oid = c.relnamespace
where not t.tgisinternal
  and pg_get_triggerdef(t.oid, true) ilike '%handle_new_user%'
order by table_schema, table_name, trigger_name;

-- 9. Recent profile/auth-user consistency sample.
select
  count(*) filter (where p.id is null) as auth_users_without_profile,
  count(*) filter (where u.id is null) as profiles_without_auth_user
from auth.users u
full outer join public.profiles p on p.id = u.id;
