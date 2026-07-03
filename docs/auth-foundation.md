# Auth Foundation Plan (Supabase Auth, anonymous-first)

Status: **email OTP login implemented (2026-07-03).** Session persists via
AsyncStorage; sign-out keeps local data. The SQL in `supabase/migrations/`
is still NOT applied — cloud sync and account deletion remain future phases.

> Supabase dashboard prerequisites for the OTP flow:
> 1. Email provider enabled (Authentication → Providers → Email).
> 2. The "Magic Link" email template must include `{{ .Token }}` so the
>    6-digit code appears in the email — the app verifies codes and does not
>    handle magic-link deep links yet.

## 1. Auth readiness audit (2026-07-03)

### Supabase Auth configuration

Not configured. `src/lib/supabase.ts` calls `createClient` with no `auth`
options: no session storage adapter, no `autoRefreshToken` app-state wiring,
no `detectSessionInUrl: false` (needed in React Native). `supabase.auth` is
never referenced anywhere in `src/`. The anon key + URL come from
`EXPO_PUBLIC_SUPABASE_URL` / `EXPO_PUBLIC_SUPABASE_ANON_KEY`, which is correct
(anon key is safe to ship; RLS is the security boundary).

### Session storage options

- `@react-native-async-storage/async-storage` **2.2.0 installed** (used by
  `src/utils/preferences-storage.ts`).
- `expo-secure-store` **not installed**.
- Constraint from the Expo v56 docs: SecureStore values above ~2048 bytes
  historically fail on iOS. A Supabase session JSON (access + refresh JWT)
  regularly exceeds that, so the session cannot be stored raw in SecureStore.

**Recommendation when auth is implemented:** store the session in
AsyncStorage (Supabase's documented Expo pattern). Optional hardening:
the "LargeSecureStore" pattern — encrypt the session with an AES key that
lives in SecureStore, persist the ciphertext in AsyncStorage. That needs
`npx expo install expo-secure-store aes-js react-native-get-random-values`.
Do not add these dependencies until login is actually built.

### User-owned data inventory

| Data | Where it lives today | Persisted? | Sync after login? |
| --- | --- | --- | --- |
| Vehicles (garage) | `VehicleContext` (in-memory reducer) | **No — lost on restart** | Yes → `user_vehicles` |
| Favorites | `FavoriteParkingContext` (in-memory state) | **No — lost on restart** | Yes → `user_favorites` |
| Preferences (8 keys incl. analytics/crash consent) | AsyncStorage `@white-choclate/preferences/v1` | Yes | Yes → `user_preferences` (opt-in) |
| Consent/privacy state | Only the two booleans inside preferences; no event log, no policy version | Partially | Consent *decisions* → `consent_events` after login |
| Subscription entitlement | Hard-coded `SubscriptionStatus.FREE` in `src/utils/account-state.ts` | No | Server-authoritative → `profiles.subscription_status` (backend writes only) |
| Profile identity | `useAccount` returns `user: null` always | n/a | `profiles` row created on signup |

Audit side-findings (pre-existing, not changed in this phase):

- Vehicles and favorites have **no local persistence at all**. Adding
  AsyncStorage persistence for both is a prerequisite worth doing *before*
  auth — the local-to-cloud migration needs durable local data to migrate.
- The repo runs Expo SDK 54 while `AGENTS.md` points at the v56 docs.
  Flagged for the maintainer; nothing here depends on an upgrade.
- Existing DB has only `parking_segments` / `parking_zones` with public read
  policies (`anon, authenticated`). No user tables exist yet.

### Local-only vs synced

- **Stays local-only:** location permission state, map/session UI state, the
  active session token cache, anything derived from device capabilities.
- **Syncs after login (opt-in):** garage, favorites, preferences, consent
  events, profile identity, entitlement (read-only from the client).
- **Never in the client:** service-role keys, entitlement writes, deletion
  fulfilment.

## 2. Auth model: anonymous-first

- The app is fully usable without an account: map, search, parking, garage,
  favorites, preferences all work anonymously. No forced login anywhere.
- Signing in is optional and only adds: cloud backup/sync of garage +
  favorites + preferences, and (later) premium entitlement + account
  management.
- Method order:
  1. **Email OTP / magic link first** (`supabase.auth.signInWithOtp`). No
     passwords to store or reset; works with the existing Supabase project.
     Magic links need the `whitechoclate://` scheme (already configured in
     `app.config.ts`) registered as a redirect URL in the Supabase dashboard.
  2. **Sign in with Apple** when shipping account creation on iOS — App
     Store Review Guideline 4.8 requires it once any third-party login is
     offered. Native flow via `expo-apple-authentication` +
     `signInWithIdToken`.
  3. **Google Sign-In** only if there is demand; native flow via ID token.
  4. **No password auth** unless a concrete requirement appears.
- `signInWithOtp` should be called with `shouldCreateUser: true` — account
  creation and login are the same flow.

## 3. Database schema (draft migrations, not applied)

Files in `supabase/migrations/` (Supabase CLI naming; the CLI wraps each in a
transaction):

1. `20260703000100_auth_foundation_profiles.sql` — `set_updated_at()` helper,
   `profiles` (PK = `auth.users.id`, cascade delete), signup trigger
   `handle_new_user` (security definer, empty search_path), RLS.
   `subscription_status` has **no client update grant** — entitlements are
   backend-only.
2. `20260703000200_auth_foundation_user_data.sql` — `user_vehicles`
   (generated column `license_plate_normalized` mirroring
   `normalizeLicensePlate` in `src/utils/vehicles.ts`; unique per user;
   partial unique index enforcing one active vehicle), `user_favorites`
   (`segment_id text` = `ParkingClusterResponse.id`, deliberately not a FK so
   favorites survive parking-data reimports; `snapshot jsonb` for offline
   display), `user_preferences` (one row per user, columns mirror
   `src/types/preferences.ts`).
3. `20260703000300_auth_foundation_compliance.sql` — `consent_events`
   (append-only: insert+select policies only, no update/delete grants) and
   `deletion_requests` (insert + cancel-own-pending only; fulfilment via
   service role; `on delete set null` keeps an anonymized audit row after
   erasure).

Conventions used by all tables: `user_id uuid references auth.users(id)`,
`created_at` default `now()`, `updated_at` maintained by trigger where rows
mutate, RLS enabled, `revoke all from anon, authenticated` followed by
explicit minimal grants, and every policy `to authenticated` scoped to
`(select auth.uid())` (the subselect lets Postgres cache it per statement).

After applying, regenerate types:
`npx supabase gen types typescript --project-id <ref> > src/types/database.ts`.

## 4. RLS policy plan

- Every user table: RLS enabled; select/insert/update/delete allowed only
  when `user_id = auth.uid()` (or `id = auth.uid()` for `profiles`).
- `anon` role: **zero grants** on user tables (revoked explicitly, since
  Supabase default privileges would otherwise grant ALL). Anonymous app users
  never touch these tables — their data is local.
- Column-level tightening on top of RLS:
  - `profiles.subscription_status`: not client-writable.
  - `deletion_requests`: client may update only `status`, and the policy pair
    restricts that to pending → cancelled.
  - `consent_events`: no update/delete at all (immutable log).
- Service-role key: server-side only (Edge Functions / backend). It must
  never appear in the app bundle; the app keeps using the anon key.
- Existing public read policies on `parking_segments` / `parking_zones` are
  unchanged — that data is public content, not user data.

## 5. Local-to-cloud migration plan (on first sign-in)

1. **Keep local data untouched.** Sign-in never mutates local state by
   itself.
2. **Ask once:** "Sync your garage and favorites to your account?" with an
   explicit skip option. Record the choice.
3. On accept, upload in this order, all idempotent:
   - vehicles → upsert on `(user_id, license_plate_normalized)`; keep the
     remote row on conflict, preserve local `createdAt` in
     `local_created_at`; after upsert, set `is_active` for the local active
     vehicle only if the user had one.
   - favorites → upsert on `(user_id, segment_id)` with the
     `ParkingClusterResponse` snapshot as `snapshot`.
   - preferences → insert one `user_preferences` row if none exists; if a
     remote row already exists (returning user on a new device), prefer
     remote and offer to overwrite explicitly.
4. **Dedup keys:** normalized license plate (`trim` + collapse whitespace +
   uppercase — same function client and DB) and parking `segment_id`.
5. **Local data is deleted only after the remote write is confirmed** — and
   even then only if the product decision is to stop mirroring locally.
   Default plan: local remains the offline cache; sync is additive.
6. **Sign-out (decision confirmed 2026-07-03):** local cached data (garage,
   favorites, preferences) is kept by default; sign-out only ends the
   session and never deletes remote data. A separate explicit "Remove my
   data from this device" action will be added later.

## 6. `useAccount` future interface

`AuthStatus = 'anonymous' | 'signingIn' | 'authenticated' | 'signingOut' | 'error'`
(in `src/types/account.ts`). Implemented: `useAccount` is backed by
`supabase.auth.getSession()` + `onAuthStateChange`. `'signingIn'` means an
OTP code was sent (`pendingEmail` is set) and verification is pending;
`'error'` is reserved for session-load failures. The Account UI contract is
unchanged (`user`, `isAnonymous`, `isSignedIn`, `status`, `logout`,
`deleteAccount`, `refresh`) plus the new sign-in actions.

## 7. Compliance notes (before shipping auth)

- **In-app account deletion becomes mandatory** the moment accounts exist:
  Apple App Store Guideline 5.1.1(v) and Google Play User Data policy both
  require an in-app deletion path. `deletion_requests` + a service-role
  fulfilment job (delete `auth.users` row → cascades) is the planned path.
- **Google Play additionally requires a public web URL** for account
  deletion (declared in the Data safety form) so users can request deletion
  without reinstalling the app. That web form should write to the same
  `deletion_requests` table.
- **Subscription cancellation ≠ account deletion.** Store subscriptions are
  cancelled through Apple/Google, not by deleting the account. The deletion
  UI must say this explicitly and link to the store subscription settings.
- **Privacy policy must be updated before auth ships:** new data categories
  (email, user content), processor (Supabase), retention (deletion queue,
  anonymized deletion audit rows), and the legal basis for the consent log.
- Consent toggles (analytics/crash reporting) currently gate nothing — no
  SDKs installed. When they become real, every change must also append a
  `consent_events` row for signed-in users.

## 8. Phase status

Done in the login phase (2026-07-03):

- Supabase client auth config (`src/lib/supabase.ts`): AsyncStorage session
  storage on native, `autoRefreshToken` + `persistSession`,
  `detectSessionInUrl` only on web, AppState-driven `start/stopAutoRefresh`.
- `useAccount` (`src/hooks/use-account.ts`): real session load,
  `onAuthStateChange` subscription with cleanup, `startEmailSignIn`,
  `verifyEmailOtp`, `cancelEmailSignIn`, `logout`, truthful `status`.
- Sign-in UI on `/account/profile` (`EmailSignInCard`): email → code →
  verify, loading/error/success states. Anonymous mode stays first-class.
- Sign-out keeps local data (see §5.6) and the UI says so explicitly.

Still deliberately NOT done:

- No Apple/Google sign-in, no magic-link deep linking (OTP codes only).
- No cloud sync — nothing is uploaded; `useAccount` only exposes auth state
  that a later sync phase can build on.
- No new dependencies (`expo-secure-store`, `aes-js`), no RevenueCat.
- Migrations not applied; `src/types/database.ts` not regenerated (it must
  only be regenerated after the migrations actually run).
- No "Delete account" UI — backend deletion flow does not exist yet.
