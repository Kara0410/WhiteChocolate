# Account Cloud Sync

Status: **Phase 4A implemented (2026-07-03)** - sync infrastructure, pure
merge helpers, and the sync decision engine. **No live upload/download
exists yet**, and **no sync UI exists yet**; both are Phase 4B.

The saved Garage/user-vehicle feature was removed later. Migration
`20260712000300_remove_user_vehicles.sql` drops the old `user_vehicles` table
without rewriting the historical auth foundation migrations.

## What Exists After Phase 4A

Everything lives in `src/services/sync/` and is free of React and network I/O.
The generated Supabase `Database` type is in `src/types/database.ts`.

| File | Purpose |
| --- | --- |
| `sync-types.ts` | Domains, statuses, strategies, error/result/state shapes |
| `sync-decision.ts` | `determineSyncStrategy()` - pure decision engine |
| `sync-results.ts` | Result/error/state constructors + `combineSyncResults()` |
| `favorite-merge.ts` | `mergeFavorites()` - pure favorites merge |
| `preference-merge.ts` | `mergePreferences()` - pure preferences merge |
| `sync-manager.ts` | Local snapshot loader, remote snapshot placeholder, `determineAccountSyncState()` |
| `index.ts` | Public surface of the sync layer |

## Auth Setup

The app uses Supabase email + password authentication only. Do not enable magic
links, email OTP codes, website callback URLs, or deep-link auth callbacks for
this phase.

For immediate sign-in after registration, disable email confirmation in:
Supabase Dashboard -> Authentication -> Providers -> Email -> Confirm email.

## Sync Domains

Two domains sync independently: `favorites` and `preferences` (plus `'all'` for
aggregate results). Preferences count as "1 item" for decision purposes when
they differ from `DEFAULT_PREFERENCES`, else 0.

## Decision Strategies

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

`remoteOnly` is reserved; no rule currently produces it. Phase 4B must gate
`localUpload`, `remoteRestore`, and `merge` behind an explicit user action on
first login. The engine only says what a sync would do, never triggers one.

## Merge Rules

Common principles: **local data is never deleted by a merge**, malformed remote
rows are dropped instead of corrupting local state, and identical content on
both sides is not a conflict.

### Favorites - key: favorite id (`segment_id` remotely)

- Remote rows are only usable if their `snapshot` passes the same validation as
  locally stored favorites; the row's `segment_id` overrides the snapshot id.
- Content comparison is key-order-insensitive because Postgres jsonb reorders
  keys.
- Differing content: **local wins**. Local favorites carry no timestamp, so a
  remote timestamp alone is not proof of freshness.

### Preferences - wholesale winner, not per-key

- The remote row is validated strictly; any corrupt field rejects the whole row.
- Newest `updatedAt` wins only when both sides have one. Local preferences carry
  no timestamp today, so local wins in practice.
- The result is always a complete `Preferences` object.

## RLS Assumptions

The auth foundation migrations were applied and verified on 2026-07-03.

- User tables have RLS enabled; every policy is scoped to `(select auth.uid())`.
- `anon` has zero grants on user tables and the client code never tries to sync
  anonymous data.
- `authenticated` may select/insert/update/delete only its own rows in
  `user_favorites` and `user_preferences`.
- A later migration, `20260712000300_remove_user_vehicles.sql`, removes the old
  saved-vehicle table.

## What Sync Does Not Do

- No live upload/download yet.
- No sync prompt/UI on the Account page yet.
- Never auto-uploads on first login; a user action is required by design.
- Never deletes local data; sign-out and sync failures leave it untouched.
- No account deletion, no data export, no premium/RevenueCat, no Apple/Google
  sign-in, no analytics.

## Known Limitations

- `pendingLocalCount`/`pendingRemoteCount` are raw item counts, not true deltas.
- Favorites conflict resolution cannot distinguish "remote is genuinely newer"
  until local favorites gain timestamps.

## Phase 4B Contract

Phase 4B implements, without changing the helpers:

1. `getRemoteSnapshot()` - real queries replacing
   `getRemoteSnapshotPlaceholder()` with the same `RemoteDataSnapshot` shape.
2. Upload/upsert of merged candidates per domain, keyed on the relevant unique
   constraints.
3. A `useAccountSync()` coordinator observing `useAccount`, gating first sync
   behind a prompt, and applying merge results back through context/storage
   helpers.
4. Account page Cloud Sync card with statuses mapping to `SyncStatus`.
