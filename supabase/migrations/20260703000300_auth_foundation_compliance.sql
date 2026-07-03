-- DRAFT — do not apply automatically.
-- Auth foundation 3/3: compliance tables (consent audit log, deletion requests).
-- Requires 20260703000100_auth_foundation_profiles.sql (set_updated_at).

-- ---------------------------------------------------------------------------
-- consent_events — append-only audit log of consent decisions.
-- Clients can insert and read their own events; no update/delete policies or
-- grants exist, so the log is immutable from the app. Rows are erased with the
-- account via the auth.users cascade (GDPR erasure).
-- ---------------------------------------------------------------------------
create table public.consent_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  consent_type text not null check (
    consent_type in ('analytics', 'crash_reporting', 'terms_of_service', 'privacy_policy')
  ),
  granted boolean not null,
  -- Version of the policy text the user saw, e.g. '2026-07-01'.
  policy_version text,
  source text not null default 'app' check (source in ('app', 'web', 'support')),
  created_at timestamptz not null default now()
);

comment on table public.consent_events is
  'Append-only consent audit log. Immutable from the client.';

create index consent_events_user_id_idx
  on public.consent_events (user_id, created_at desc);

alter table public.consent_events enable row level security;

revoke all on public.consent_events from anon, authenticated;
grant select, insert on public.consent_events to authenticated;

create policy "Users read own consent events"
  on public.consent_events
  for select
  to authenticated
  using (user_id = (select auth.uid()));

create policy "Users insert own consent events"
  on public.consent_events
  for insert
  to authenticated
  with check (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- deletion_requests — account deletion queue (app + Play Store web URL both
-- write here). Fulfilment is backend-only via service role. user_id is set
-- null (not cascaded) when the account is deleted so an anonymized record of
-- the completed request survives as an audit trail; reason must be scrubbed
-- by the fulfilment job if it contains personal data.
-- ---------------------------------------------------------------------------
create table public.deletion_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete set null,
  status text not null default 'pending' check (
    status in ('pending', 'processing', 'completed', 'cancelled')
  ),
  reason text check (reason is null or char_length(reason) <= 1000),
  requested_at timestamptz not null default now(),
  processed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.deletion_requests is
  'Account deletion queue. Clients create and cancel; backend fulfils.';

create index deletion_requests_user_id_idx on public.deletion_requests (user_id);

-- One open request per user at a time.
create unique index deletion_requests_one_open_per_user
  on public.deletion_requests (user_id)
  where status in ('pending', 'processing');

create trigger deletion_requests_set_updated_at
  before update on public.deletion_requests
  for each row execute function public.set_updated_at();

alter table public.deletion_requests enable row level security;

revoke all on public.deletion_requests from anon, authenticated;
grant select, insert on public.deletion_requests to authenticated;
-- Clients may only flip status (pending -> cancelled per the update policy).
grant update (status) on public.deletion_requests to authenticated;

create policy "Users read own deletion requests"
  on public.deletion_requests
  for select
  to authenticated
  using (user_id = (select auth.uid()));

create policy "Users insert own deletion requests"
  on public.deletion_requests
  for insert
  to authenticated
  with check (user_id = (select auth.uid()) and status = 'pending');

create policy "Users cancel own pending deletion requests"
  on public.deletion_requests
  for update
  to authenticated
  using (user_id = (select auth.uid()) and status = 'pending')
  with check (user_id = (select auth.uid()) and status = 'cancelled');

-- No delete policy: requests are an audit trail. Status transitions to
-- processing/completed happen through the service role, which bypasses RLS.
