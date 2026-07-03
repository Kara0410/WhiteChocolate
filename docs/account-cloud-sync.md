# Account Cloud Sync

Status: **Phase 4A implemented (2026-07-03)** — sync infrastructure, pure
merge helpers, and the sync decision engine. **No live upload/download
exists yet**, and **no sync UI exists yet**; both are Phase 4B.

## What exists after Phase 4A

Everything lives in `src/services/sync/` and is free of React and network
I/O. The only Supabase artifact used is the generated `Database` type
(`src/types/database.ts`, regenerated after the auth foundation migrations
were applied — verified live on 2026-07-03).

| File | Purpose |
| --- | --- |
| `sync-types.ts` | Domains, statuses, strategies, error/result/state shapes |
| `sync-decision.ts` | `determineSyncStrategy()` — pure decision engine |
| `sync-results.ts` | Result/error/state constructors + `combineSyncResults()` |
| `vehicle-merge.ts` | `mergeVehicles()` — pure garage merge |
| `favorite-merge.ts` | `mergeFavorites()` — pure favorites merge |
| `preference-merge.ts` | `mergePreferences()` — pure preferences merge |
| `sync-manager.ts` | Local snapshot loader, remote snapshot placeholder, `determineAccountSyncState()` |
| `index.ts` | Public surface of the sync layer |

## Sync domains

Three domains sync independently: `vehicles`, `favorites`, `preferences`
(plus `'all'` for aggregate results). Preferences count as "1 item" for
decision purposes when they differ from `DEFAULT_PREFERENCES`, else 0.

## Decision strategies

`determineSyncStrategy({ isAuthenticated, localCount, remoteCount, ... })`:

| Situation | Strategy |
| --- | --- |
| Not authenticated | `localOnly` (never touches Supabase user tables) |
| Nothing on either side | `noAction` |
| User tapped "Not now" this session | `localOnly` (re-evaluated next session) |
| Both sides explicitly unchanged since last sync | `noAction` |
| Local data, empty account | `localUpload` |
| Empty device, account has data | `remoteRestore` |
| Data on both sides | `merge` |

`remoteOnly` is a reserved strategy no rule currently produces (Phase 4B's
restore flow may use it transiently). Phase 4B must gate `localUpload`,
`remoteRestore`, and `merge` behind an explicit user action on first login —
the engine only says what a sync *would* do, never triggers one.

## Merge rules (all pure, no I/O, inputs never mutated)

Common principles: **local data is never deleted by a merge**, malformed
remote rows are dropped instead of corrupting local state, and identical
content on both sides is not a conflict.

### Vehicles — key: normalized license plate

- Local-only plates are kept and become `uploadedCandidates`.
- Remote-only rows are mapped to local `Vehicle` shape (`local_created_at`
  preferred over `created_at`) and become `downloadedCandidates`.
- Same plate, same nickname: the **local instance** is kept so local ids and
  the active-vehicle id stay stable.
- Same plate, different nickname: newer `updatedAt` wins if both sides have
  one, otherwise **local wins**; local wins are re-uploaded.
- Active vehicle: follows the local active vehicle's plate through the merge
  (even if the remote version won and the id changed); falls back to the
  remote `is_active` row, then the first vehicle, then null.

### Favorites — key: favorite id (`segment_id` remotely)

- Remote rows are only usable if their `snapshot` passes the same validation
  as locally stored favorites; the row's `segment_id` overrides the snapshot
  id. Unusable rows are skipped (they stay in the cloud untouched).
- Content comparison is key-order-insensitive (Postgres jsonb reorders
  keys). Differing content: **local wins** — local favorites carry no
  timestamp, so a remote timestamp alone is not proof of freshness.

### Preferences — wholesale winner, not per-key

- The remote row is validated strictly: any corrupt field rejects the whole
  row (field-level defaulting could otherwise let a garbage row overwrite
  real local preferences with defaults).
- Newest `updatedAt` wins **only when both sides have one**; local
  preferences carry no timestamp today, so **local wins** in practice.
- The result is always a complete `Preferences` object.

## RLS assumptions (verified in migrations, applied 2026-07-03)

- All user tables have RLS enabled; every policy is scoped to
  `(select auth.uid())`.
- `anon` has zero grants on user tables — anonymous users cannot touch them,
  and the client code never tries (`localOnly` strategy).
- `authenticated` may select/insert/update/delete only its own rows in
  `user_vehicles`, `user_favorites`, `user_preferences`.
- `user_vehicles.license_plate_normalized` is a generated column mirroring
  `normalizeLicensePlate()`, with a per-user unique constraint — uploads can
  rely on `on conflict (user_id, license_plate_normalized)` upserts.

## What sync does NOT do (current and planned)

- No live upload/download yet (Phase 4B).
- No sync prompt/UI on the Account page yet (Phase 4B).
- Never auto-uploads on first login — a user action is required by design.
- Never deletes local data; sign-out and sync failures leave it untouched.
- No account deletion, no data export, no premium/RevenueCat, no
  Apple/Google sign-in, no analytics.

## Known limitations

- Local vehicles/favorites/preferences carry no reliable `updatedAt`, so
  "newest wins" only activates for vehicles (which may have one) and
  otherwise local wins — deliberate for the first implementation.
- `pendingLocalCount`/`pendingRemoteCount` are raw item counts, not true
  deltas; Phase 4B can refine once it knows what is already synced.
- Favorites conflict resolution cannot distinguish "remote is genuinely
  newer" until local favorites gain timestamps.

## Phase 4B contract

Phase 4B implements, without changing the helpers:

1. `getRemoteSnapshot()` — real queries replacing
   `getRemoteSnapshotPlaceholder()` (same `RemoteDataSnapshot` shape).
2. Upload/upsert of `uploadedCandidates` per domain (idempotent, keyed on
   the unique constraints above).
3. A `useAccountSync()` coordinator observing `useAccount`, gating first
   sync behind the prompt, applying merge results back through the context
   `replace*`/storage helpers.
4. Account page Cloud Sync card (statuses map 1:1 to `SyncStatus`).
