-- DRAFT — do not apply automatically.
-- Auth foundation 1/3: shared helpers + profiles.
-- Apply with the Supabase CLI (`supabase db push`) or the SQL editor once
-- auth is actually being implemented. The CLI wraps each migration in a
-- transaction, so no explicit begin/commit here.

-- Shared updated_at trigger, reused by every user table in this set.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- One profile row per auth user, created by trigger on signup.
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text check (display_name is null or char_length(display_name) between 1 and 80),
  avatar_url text,
  -- Mirrors SubscriptionStatus in src/types/account.ts. Server-authoritative:
  -- the authenticated role has no update grant on this column.
  subscription_status text not null default 'FREE'
    check (subscription_status in ('FREE', 'PREMIUM', 'LIFETIME', 'UNKNOWN')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.profiles is
  'App profile per auth user. Entitlements are written by backend only.';

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- Auto-create the profile row when a user signs up.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data ->> 'display_name',
      new.raw_user_meta_data ->> 'full_name'
    ),
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

alter table public.profiles enable row level security;

-- Tight grants: no anon access, and clients may only touch identity columns.
-- subscription_status stays writable only by service role / triggers.
revoke all on public.profiles from anon, authenticated;
grant select on public.profiles to authenticated;
grant insert (id, display_name, avatar_url) on public.profiles to authenticated;
grant update (display_name, avatar_url) on public.profiles to authenticated;

create policy "Users read own profile"
  on public.profiles
  for select
  to authenticated
  using (id = (select auth.uid()));

-- Fallback for users created before the signup trigger existed.
create policy "Users insert own profile"
  on public.profiles
  for insert
  to authenticated
  with check (id = (select auth.uid()));

create policy "Users update own profile"
  on public.profiles
  for update
  to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- No delete policy: profiles are removed via the auth.users cascade when the
-- account itself is deleted (service role / admin API).
