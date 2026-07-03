-- DRAFT — do not apply automatically.
-- Auth foundation 2/3: synced user data (vehicles, favorites, preferences).
-- Requires 20260703000100_auth_foundation_profiles.sql (set_updated_at).

-- ---------------------------------------------------------------------------
-- user_vehicles — cloud copy of the local garage (src/types/vehicle.ts).
-- ---------------------------------------------------------------------------
create table public.user_vehicles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  nickname text not null check (char_length(nickname) between 1 and 80),
  license_plate text not null check (char_length(license_plate) between 1 and 20),
  -- Mirrors normalizeLicensePlate in src/utils/vehicles.ts:
  -- trim, collapse inner whitespace, uppercase. Sync dedupes on this.
  license_plate_normalized text generated always as (
    upper(regexp_replace(btrim(license_plate), '\s+', ' ', 'g'))
  ) stored,
  is_active boolean not null default false,
  -- Original local createdAt, preserved through the local-to-cloud migration.
  local_created_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, license_plate_normalized)
);

comment on table public.user_vehicles is
  'Synced garage. Deduplicated per user by normalized license plate.';

create index user_vehicles_user_id_idx on public.user_vehicles (user_id);

-- At most one active vehicle per user.
create unique index user_vehicles_one_active_per_user
  on public.user_vehicles (user_id)
  where is_active;

create trigger user_vehicles_set_updated_at
  before update on public.user_vehicles
  for each row execute function public.set_updated_at();

alter table public.user_vehicles enable row level security;

revoke all on public.user_vehicles from anon, authenticated;
grant select, insert, update, delete on public.user_vehicles to authenticated;

create policy "Users read own vehicles"
  on public.user_vehicles
  for select
  to authenticated
  using (user_id = (select auth.uid()));

create policy "Users insert own vehicles"
  on public.user_vehicles
  for insert
  to authenticated
  with check (user_id = (select auth.uid()));

create policy "Users update own vehicles"
  on public.user_vehicles
  for update
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "Users delete own vehicles"
  on public.user_vehicles
  for delete
  to authenticated
  using (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- user_favorites — cloud copy of favorite parking spots.
-- segment_id is the ParkingClusterResponse id (text, not a FK: favorites must
-- survive parking-data reimports). snapshot keeps display data for offline UI.
-- ---------------------------------------------------------------------------
create table public.user_favorites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  segment_id text not null check (char_length(segment_id) between 1 and 128),
  snapshot jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, segment_id)
);

comment on table public.user_favorites is
  'Synced favorite parking spots. Deduplicated per user by segment id.';

create index user_favorites_user_id_idx on public.user_favorites (user_id);

create trigger user_favorites_set_updated_at
  before update on public.user_favorites
  for each row execute function public.set_updated_at();

alter table public.user_favorites enable row level security;

revoke all on public.user_favorites from anon, authenticated;
grant select, insert, update, delete on public.user_favorites to authenticated;

create policy "Users read own favorites"
  on public.user_favorites
  for select
  to authenticated
  using (user_id = (select auth.uid()));

create policy "Users insert own favorites"
  on public.user_favorites
  for insert
  to authenticated
  with check (user_id = (select auth.uid()));

create policy "Users update own favorites"
  on public.user_favorites
  for update
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "Users delete own favorites"
  on public.user_favorites
  for delete
  to authenticated
  using (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- user_preferences — one row per user, mirrors src/types/preferences.ts.
-- Local AsyncStorage stays the source of truth until the user opts into sync.
-- ---------------------------------------------------------------------------
create table public.user_preferences (
  user_id uuid primary key references auth.users (id) on delete cascade,
  analytics boolean not null default false,
  crash_reporting boolean not null default false,
  dark_mode boolean not null default false,
  haptic_feedback boolean not null default true,
  language text not null default 'system' check (language in ('system')),
  notifications boolean not null default false,
  parking_reminders boolean not null default true,
  units text not null default 'metric' check (units in ('metric', 'imperial')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.user_preferences is
  'Synced app preferences, one row per user.';

create trigger user_preferences_set_updated_at
  before update on public.user_preferences
  for each row execute function public.set_updated_at();

alter table public.user_preferences enable row level security;

revoke all on public.user_preferences from anon, authenticated;
grant select, insert, update, delete on public.user_preferences to authenticated;

create policy "Users read own preferences"
  on public.user_preferences
  for select
  to authenticated
  using (user_id = (select auth.uid()));

create policy "Users insert own preferences"
  on public.user_preferences
  for insert
  to authenticated
  with check (user_id = (select auth.uid()));

create policy "Users update own preferences"
  on public.user_preferences
  for update
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "Users delete own preferences"
  on public.user_preferences
  for delete
  to authenticated
  using (user_id = (select auth.uid()));
