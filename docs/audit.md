# Supabase Database Audit

> Historical pre-removal inventory. This snapshot describes the linked schema
> before `20260722000100_remove_parking_zones.sql` is applied and must not be
> used as the current application contract. See
> `parking-data-and-prediction-readiness-audit.md` for the segment-centric model.

Audit date: 2026-07-22  
Project: `white_choclate`  
Scope: Supabase/PostgreSQL structure, relationships, constraints, indexes, RLS, grants, views, functions, triggers, migration reproducibility, and application access paths.

## 1. Executive summary

The current application contract contains **10 public tables**, **2 application views**, **2 PostGIS metadata views**, **5 application functions (counting the two RPC overloads separately)**, and **3 application triggers**. A historical `user_vehicles` table was created and later dropped, so it is not part of the current schema.

All **10 repository migrations are present in the linked remote migration ledger**. There is no migration-version drift as of the audit date. However, the repository is **not a complete, reproducible database definition**: `parking_segments`, `parking_zones`, and `parking_zone_raw` were created before the tracked migration chain, and important parking setup exists in standalone SQL files rather than migrations. A clean `supabase db reset` or deployment to a new project cannot reconstruct the database from this repository alone.

Overall assessment: **sound user-data RLS design and good estimator constraint coverage, with material reproducibility, availability, compliance, and operational-retention gaps.**

### Priority findings

| ID | Severity | Finding | Recommended action |
|---|---|---|---|
| F-01 | Critical | The migration chain has no baseline creation migration for the three core parking tables. Fresh environments cannot be rebuilt reliably. | Capture the authoritative live definitions, grants, policies, constraints, indexes, and seed/import procedure in an idempotent baseline migration. Test with a clean reset. |
| F-02 | High | Public `fetch_parking_cells` RPCs accept any valid world-coordinate bounding box but impose no maximum area/cell count. The final `LIMIT 400` does not prevent a very large grid from being generated and joined first. | Reject oversized boxes before `ST_HexagonGrid`; cap projected area, width/height, and estimated cell count. Add statement timeout and abuse tests. |
| F-03 | High | The signup trigger inserts raw profile metadata into a column constrained to 1–80 characters. Empty or overlong provider/user metadata can make the trigger fail and roll back signup. | Normalize with `nullif(btrim(...), '')`, truncate or validate to 80 characters, and add trigger tests for malformed metadata. |
| F-04 | High | `deletion_requests` is designed as a durable deletion audit queue, but the deployed app path directly calls `auth.admin.deleteUser()` and never inserts or completes a request row. | Either integrate the table transactionally into account deletion or remove/redefine it. Ensure completion survives the `auth.users` deletion via `ON DELETE SET NULL`. |
| F-05 | High | RLS/grants for `parking_zone_raw` and the exact live definition of all pre-migration parking objects are not version-controlled. | Query and capture the live catalog. Explicitly revoke client access to the raw staging table and add verification tests. |
| F-06 | Medium | Estimate rows have a logical TTL but no cleanup job. New destination/time contexts can grow the table without bound and retain Google Place IDs indefinitely. | Define retention, schedule deletion using `valid_until`, and document the privacy basis for stored place IDs. |
| F-07 | Medium | PostGIS is installed in `public`, exposing `spatial_ref_sys` and a large extension function surface in generated API types. | Prefer an extension schema for new environments; review PostgREST exposed schemas and function execution grants before relocating an existing extension. |
| F-08 | Medium | Standalone setup SQL (`parking_segments_prepare.sql`, `parking_zones_read_policy.sql`) is outside the remote migration ledger. | Convert the required parts into numbered migrations; keep diagnostics separate and read-only. |
| F-09 | Medium | `parking_segments` has no tracked coordinate range constraints, while the zone-assignment trigger trusts new `lat`/`lon` values. | Add latitude/longitude checks and validate geometry/coordinate coherence at write time. |
| F-10 | Medium | `user_favorites` and `user_preferences` are provisioned for client CRUD, but application sync is still a placeholder. This is unused mutable surface. | Finish and test sync or temporarily narrow grants until the feature is active. |

## 2. Evidence and confidence

This audit used:

- `src/types/database.ts`, which reflects the latest estimator schema and PostgREST `14.5` contract.
- All SQL under `supabase/migrations/`.
- Standalone setup, rollback, and diagnostic SQL under `supabase/`.
- Both Edge Functions and the app's Supabase query/service layer.
- The existing project relationship graph in `graphify-out/graph.json`.
- `npx supabase migration list --linked`, which confirmed local/remote parity for all 10 migrations.

The linked CLI reached the remote database, but a live schema dump could not be completed because the CLI requires a Supabase PostgreSQL Docker image and Docker Desktop was not running. Live table/index statistics also timed out. Therefore:

- **High confidence:** objects represented by the latest generated types and the applied migration chain.
- **Medium confidence:** exact base constraints, policies, grants, and indexes of the three parking tables that predate migrations.
- **Not assessed:** live row counts, table sizes, index usage, bloat, slow queries, backups/PITR, Vault secrets, Auth provider settings, Storage buckets, and production connection/role configuration.

No data rows or secrets were copied into this report.

## 3. Current schema inventory

### 3.1 Public tables

| Table | Purpose | Ownership/access model | Current status |
|---|---|---|---|
| `consent_events` | Append-only consent history | Authenticated users read/insert their own rows | Active |
| `deletion_requests` | Account deletion workflow/audit record | Authenticated users read/create/cancel their own pending requests; backend fulfills | Active but not used by the app deletion path |
| `parking_availability_estimates` | Short-lived heuristic estimate cache | Service role only; results are projected through views/RPCs | Active |
| `parking_segments` | Parking inventory and point locations | Public read; backend/import mutations | Active; baseline DDL missing |
| `parking_zone_raw` | Raw parking-zone import/staging data | Unknown from version-controlled SQL | Active; baseline DDL and access policy missing |
| `parking_zones` | Processed administrative parking polygons | Public read | Active; baseline DDL missing |
| `profiles` | One app profile per Auth user | Authenticated users access only their row; entitlement is backend-owned | Active |
| `spatial_ref_sys` | PostGIS coordinate reference catalog | Extension-managed | Active because PostGIS resides in `public` |
| `user_favorites` | Cloud copy of favorite parking segments | Authenticated owner CRUD | Active schema; app sync not implemented |
| `user_preferences` | One cloud preference row per user | Authenticated owner CRUD | Active schema; app sync not implemented |

Historical: `user_vehicles` was created in `20260703000200` and dropped with `CASCADE` in `20260712000300`.

### 3.2 Application views

| View | Security/property | Purpose |
|---|---|---|
| `parking_segment_summaries` | `security_barrier = true`; selected by `anon` and `authenticated` | Joins inventory to the newest non-expired estimate and derives pricing metadata. |
| `parking_zone_summaries` | `security_barrier = true`; selected by `anon` and `authenticated` | Aggregates segment capacity, available spaces, coverage, estimate timestamps, and pricing by zone. |

PostGIS also exposes `geography_columns` and `geometry_columns` metadata views.

The estimator migration intentionally changed the two app views from `security_invoker = true` to owner-executed `security_barrier` views. This allows public clients to receive a limited projection of service-only estimate rows. That is a valid design only if every exposed column is intentional; future additions to the views require security review.

### 3.3 Application functions and triggers

| Object | Mode/access | Purpose |
|---|---|---|
| `set_updated_at()` | Trigger function, security invoker, empty `search_path` | Sets `NEW.updated_at = now()`. |
| `handle_new_user()` | Trigger function, security definer, empty `search_path` | Creates a profile after insertion into `auth.users`. |
| `assign_parking_segment_zone()` | Trigger function, security definer, pinned `search_path`; no client execute grant | Assigns the smallest polygon covering a segment point. |
| `fetch_parking_cells(minLng,minLat,maxLng,maxLat,resolution,contextHash)` | Stable SQL, security definer; executable by `anon` and `authenticated` | Returns context-specific 250 m or 500 m PostGIS hex-cell aggregates. |
| `fetch_parking_cells(minLng,minLat,maxLng,maxLat,resolution)` | Stable SQL, security definer; executable by `anon` and `authenticated` | Backward-compatible overload that deliberately returns unknown availability. |
| `profiles_set_updated_at` | Before update on `profiles` | Maintains timestamp. |
| `user_favorites_set_updated_at` | Before update on `user_favorites` | Maintains timestamp. |
| `user_preferences_set_updated_at` | Before update on `user_preferences` | Maintains timestamp. |
| `deletion_requests_set_updated_at` | Before update on `deletion_requests` | Maintains timestamp. |
| `on_auth_user_created` | After insert on `auth.users` | Invokes profile creation. |
| `assign_parking_segment_zone_trigger` | Before insert or lat/lon update on `parking_segments` | Recomputes `parking_zone_id`. |

The table above counts six triggers because four reuse the same timestamp function. The executive count of three refers to the three distinct trigger behaviors.

## 4. Detailed table audit

### 4.1 `profiles`

Purpose: one-to-one application profile for `auth.users`.

| Column | Type | Null/default | Rules |
|---|---|---|---|
| `id` | `uuid` | Required | PK; FK to `auth.users(id)`; `ON DELETE CASCADE`. |
| `display_name` | `text` | Nullable | If present, length must be 1–80. |
| `avatar_url` | `text` | Nullable | No URL/length validation. |
| `subscription_status` | `text` | Required; `FREE` | One of `FREE`, `PREMIUM`, `LIFETIME`, `UNKNOWN`. |
| `created_at` | `timestamptz` | Required; `now()` | Client cannot update through granted columns. |
| `updated_at` | `timestamptz` | Required; `now()` | Maintained by trigger. |

RLS and grants:

- No anonymous access.
- Authenticated users may select only their profile.
- Authenticated users may insert only `id`, `display_name`, and `avatar_url` for their own ID.
- Authenticated users may update only `display_name` and `avatar_url` on their own row.
- `subscription_status` is protected by column-level grants and is backend-authoritative.
- No client delete policy; deletion follows the Auth cascade.

Assessment: the entitlement protection is strong. The signup trigger should sanitize metadata before inserting because the display-name constraint can turn malformed metadata into an Auth signup failure. `avatar_url` should have a documented length limit even if strict URL validation is intentionally avoided.

### 4.2 `user_preferences`

Purpose: one row per user for synced app preferences.

| Column | Type | Null/default | Rules |
|---|---|---|---|
| `user_id` | `uuid` | Required | PK and FK to `auth.users(id)`; `ON DELETE CASCADE`. |
| `analytics` | `boolean` | Required; `false` | — |
| `crash_reporting` | `boolean` | Required; `false` | — |
| `dark_mode` | `boolean` | Required; `false` | — |
| `haptic_feedback` | `boolean` | Required; `true` | — |
| `language` | `text` | Required; `system` | Only `system`, matching current app type. |
| `notifications` | `boolean` | Required; `false` | — |
| `parking_reminders` | `boolean` | Required; `true` | — |
| `units` | `text` | Required; `metric` | `metric` or `imperial`. |
| `created_at` | `timestamptz` | Required; `now()` | — |
| `updated_at` | `timestamptz` | Required; `now()` | Maintained by trigger. |

RLS permits owner-only select/insert/update/delete. The schema matches `src/types/preferences.ts`. The main concern is product state: the current sync manager explicitly says remote reads/writes are a future phase, so the table and grants are active before the feature is wired.

### 4.3 `user_favorites`

Purpose: synced favorite parking spots.

| Column | Type | Null/default | Rules |
|---|---|---|---|
| `id` | `uuid` | Required; `gen_random_uuid()` | PK. |
| `user_id` | `uuid` | Required | FK to `auth.users(id)`; `ON DELETE CASCADE`. |
| `segment_id` | `text` | Required | Length 1–128; deliberately not an FK so favorites survive reimports. |
| `snapshot` | `jsonb` | Nullable | No shape or size constraint. |
| `created_at` | `timestamptz` | Required; `now()` | — |
| `updated_at` | `timestamptz` | Required; `now()` | Maintained by trigger. |

Constraints/indexes: unique `(user_id, segment_id)` and an index on `user_id`. RLS permits owner-only CRUD.

Assessment: preserving favorites across inventory reimports is a reasonable reason to avoid an FK. Add an application/schema version inside `snapshot`, constrain accepted shape if it becomes trusted input, and consider per-user quotas because authenticated clients may create arbitrarily many rows and JSON payloads.

### 4.4 `consent_events`

Purpose: client-append-only consent audit history.

| Column | Type | Null/default | Rules |
|---|---|---|---|
| `id` | `uuid` | Required; `gen_random_uuid()` | PK. |
| `user_id` | `uuid` | Required | FK to `auth.users(id)`; `ON DELETE CASCADE`. |
| `consent_type` | `text` | Required | `analytics`, `crash_reporting`, `terms_of_service`, or `privacy_policy`. |
| `granted` | `boolean` | Required | — |
| `policy_version` | `text` | Nullable | Intended to identify the text shown. |
| `source` | `text` | Required; `app` | `app`, `web`, or `support`. |
| `created_at` | `timestamptz` | Required; `now()` | — |

Index: `(user_id, created_at DESC)`. Authenticated users can select and insert their own rows; there are no client update/delete grants or policies.

Assessment: client immutability is well enforced. For legal-policy consent events, nullable `policy_version` weakens audit evidence. Consider requiring it for `terms_of_service` and `privacy_policy`. The Auth cascade intentionally erases the consent log during account deletion, so it is an account-scoped history rather than a durable compliance record.

### 4.5 `deletion_requests`

Purpose: deletion workflow and anonymized post-deletion record.

| Column | Type | Null/default | Rules |
|---|---|---|---|
| `id` | `uuid` | Required; `gen_random_uuid()` | PK. |
| `user_id` | `uuid` | Nullable | FK to `auth.users(id)`; `ON DELETE SET NULL`. |
| `status` | `text` | Required; `pending` | `pending`, `processing`, `completed`, or `cancelled`. |
| `reason` | `text` | Nullable | Maximum 1000 characters. |
| `requested_at` | `timestamptz` | Required; `now()` | — |
| `processed_at` | `timestamptz` | Nullable | No status/timestamp consistency constraint. |
| `created_at` | `timestamptz` | Required; `now()` | — |
| `updated_at` | `timestamptz` | Required; `now()` | Maintained by trigger. |

Indexes: `user_id`; unique partial index on `user_id` while status is `pending` or `processing`.

RLS allows users to read and create their own pending requests and change only `status` from `pending` to `cancelled`. Processing/completion is service-role-only.

Assessment: the relational design is sensible, but it is disconnected from the actual delete-account Edge Function. Also add consistency checks such as `processed_at IS NOT NULL` for completed requests and scrub `reason` before the Auth row is deleted, as the migration comment already requires.

### 4.6 `parking_segments`

Purpose: imported parking-segment inventory.

| Column | Type | Null/default | Notes |
|---|---|---|---|
| `id` | `uuid` | Required in the live contract | Stable segment identity; referenced by estimates. Base PK/default DDL is not tracked. |
| `FID` | `text` | Nullable | Source identifier, unusually case-sensitive identifier name. |
| `strasse` | `text` | Nullable | Street. |
| `angebot` | numeric/integer API number | Nullable | Capacity. Exact base type is absent from tracked DDL. |
| `parkregel_id` | numeric/integer API number | Nullable | Regulation ID. |
| `parkregel_gruppe` | `text` | Nullable | Used for price classification. |
| `parkregel_name` | `text` | Nullable | Used for price classification. |
| `parkregel_beschreibung` | `text` | Nullable | Used for price classification. |
| `prm_name` | `text` | Nullable | Source area. |
| `geoportal_class` | `text` | Nullable | Source classification. |
| `shape` | `text` | Nullable | Source WKT LineString in EPSG:25832. |
| `lat`, `lon` | `double precision`/API number | Nullable | WGS84 midpoint computed by the preparation script. |
| `location` | `geometry(Point,4326)` | Nullable, stored generated | Built from `lon` and `lat`. |
| `parking_zone_id` | `bigint` | Nullable | FK to `parking_zones(id)`; update cascade, delete set null. |
| `created_at`, `updated_at` | `timestamptz` | Nullable | Source/import timestamps. |

Tracked indexes:

- GiST on `location` where non-null.
- B-tree on `parking_zone_id`.
- Standalone preparation SQL also creates `strasse`, partial `(lat, lon)`, and `geoportal_class` indexes, but their live presence is not guaranteed by the migration ledger.

RLS: enabled. `anon` and `authenticated` receive select through the `Allow public read parking_segments` policy. No client mutation grant is tracked.

Assessment: nullable source fields are reasonable for imported open data. Add tracked checks for latitude, longitude, nonnegative capacity where semantically valid, and coordinate/location coherence. The generated TypeScript type incorrectly permits supplying the stored generated `location` on insert/update; do not rely on generated types as mutation authorization.

### 4.7 `parking_zones`

Purpose: processed administrative parking-zone polygons.

| Column | Type | Null/default | Notes |
|---|---|---|---|
| `id` | `bigint` | Generated/not client-insertable | Segment FK target. Base PK/identity DDL is not tracked. |
| `fid` | `text` | Nullable | Source identifier. |
| `name` | `text` | Nullable | Display name; view falls back to “Unnamed parking zone”. |
| `status` | `text` | Nullable | Source status. |
| `massnahme` | `text` | Nullable | Source measure/category. |
| `eroeffnung` | `text` | Nullable | Source opening information. |
| `ueberwachung` | `text` | Nullable | Source monitoring information. |
| `einzeluebersicht_link` | `text` | Nullable | Source detail link. |
| `geojson` | `jsonb` | Nullable | Client-friendly geometry representation. |
| `geom` | PostGIS geometry | Required in generated contract | Applied migrations validate existing rows as nonempty, valid `MultiPolygon` SRID 4326, but base typmod/check DDL is missing. |

Tracked index: GiST on `geom` where non-null. RLS/public read configuration exists only in `supabase/parking_zones_read_policy.sql`, not a numbered migration.

Assessment: capture the original table definition and turn the read-policy script into a migration. Add database-level geometry type/SRID/validity checks if they are not already present in the live baseline.

### 4.8 `parking_zone_raw`

Purpose: raw import/staging table containing `FID`, `shape`, `name`, `status`, `massnahme`, `eroeffnung`, `ueberwachung`, and `einzeluebersicht_link`; every generated-contract column is nullable.

There is no key, constraint, index, RLS policy, or grant definition for this table in the tracked migrations. A raw staging table should normally not be exposed in the PostgREST public schema. Confirm live privileges and either move it to a non-exposed import schema or explicitly revoke `anon`/`authenticated` access.

### 4.9 `parking_availability_estimates`

Purpose: service-owned deterministic heuristic cache, not observed/live occupancy.

| Column | Type | Null/default | Rules |
|---|---|---|---|
| `id` | `uuid` | Required; `gen_random_uuid()` | PK. |
| `segment_id` | `uuid` | Required | FK to `parking_segments(id)`; `ON DELETE CASCADE`. |
| `availability_percent` | `integer` | Nullable | 0–100. Required when status is `estimated`. |
| `available_spaces` | `integer` | Nullable | Nonnegative; optional for percentage-only estimates. |
| `status` | `text` | Required | `estimated` or `unknown`. |
| `confidence` | `text` | Required | `low` or `medium`. |
| `estimator_version` | `text` | Required | Part of unique cache identity. |
| `generated_at` | `timestamptz` | Required | — |
| `valid_until` | `timestamptz` | Required | Must be at or after `generated_at`. |
| `context_hash` | `text` | Required | Exactly 64 lowercase hexadecimal characters. |
| `factor_summary` | `jsonb` | Required; `[]` | Must be a JSON array. |
| `destination_place_id` | `text` | Nullable | Google Place ID only. |
| `destination_category` | `text` | Nullable | — |
| `destination_is_open` | `boolean` | Nullable | — |
| `traffic_ratio` | `double precision` | Nullable | No range check. |
| `created_at` | `timestamptz` | Required; `now()` | Used as tie-breaker. |

Constraints/indexes:

- Unique `(segment_id, context_hash, estimator_version)`.
- `(segment_id, generated_at DESC)`.
- `valid_until`.
- `(context_hash, estimator_version, valid_until DESC)`.
- `unknown` rows must have no percentage or space count; `estimated` rows require a percentage.

RLS is enabled, all public/anon/authenticated privileges are revoked, and only `service_role` receives CRUD. No client policy exists, which is appropriate. Public views and security-definer RPCs expose selected aggregates.

Assessment: constraints are unusually thorough and correctly distinguish percentage-only estimates. Remaining gaps are retention, a maximum validity window, bounds for `traffic_ratio`, optional consistency between spaces/percent/capacity, JSON size/shape, and privacy retention for destination identifiers.

### 4.10 `spatial_ref_sys`

PostGIS-managed table with `srid` PK-like identifier plus authority and projection fields. Application code should not mutate it. Its presence in generated public API types is a consequence of installing PostGIS into `public`.

## 5. Relationships and delete behavior

```text
auth.users
├── profiles.id                         ON DELETE CASCADE (1:0..1)
├── user_preferences.user_id            ON DELETE CASCADE (1:0..1)
├── user_favorites.user_id              ON DELETE CASCADE (1:N)
├── consent_events.user_id              ON DELETE CASCADE (1:N)
└── deletion_requests.user_id           ON DELETE SET NULL (1:N)

parking_zones.id
└── parking_segments.parking_zone_id    ON UPDATE CASCADE / ON DELETE SET NULL

parking_segments.id
└── parking_availability_estimates.segment_id ON DELETE CASCADE
```

`user_favorites.segment_id` is intentionally not a foreign key. Generated Supabase types show empty `Relationships` arrays for Auth-linked tables because `auth.users` is outside the generated `public` schema, not because the database FKs are absent.

## 6. RLS and privilege matrix

| Object | RLS | `anon` | `authenticated` | `service_role`/owner |
|---|---|---|---|---|
| `profiles` | Enabled | None | Own select/insert/limited update | Full/backend |
| `user_preferences` | Enabled | None | Own CRUD | Full/backend |
| `user_favorites` | Enabled | None | Own CRUD | Full/backend |
| `consent_events` | Enabled | None | Own select/insert | Full/backend |
| `deletion_requests` | Enabled | None | Own select/insert; status-only pending→cancelled | Full/backend processing |
| `parking_availability_estimates` | Enabled | None | None | Service-role CRUD |
| `parking_segments` | Enabled | Public select | Public select | Import/backend mutation |
| `parking_zones` | Enabled by standalone SQL | Public select | Public select | Import/backend mutation |
| `parking_zone_raw` | Unknown | Unknown | Unknown | Unknown |
| `parking_segment_summaries` | View | Select | Select | Owner execution exposes curated estimate fields |
| `parking_zone_summaries` | View | Select | Select | Owner execution exposes aggregates |
| `fetch_parking_cells` overloads | Security definer | Execute | Execute | Reads inventory and estimates with owner rights |

Positive observations:

- User ownership predicates consistently use `(select auth.uid())`, avoiding repeated function evaluation per row.
- Profile entitlement writes are additionally protected with column-level grants.
- Consent events are append-only to clients.
- The estimate cache is isolated from direct clients.
- Security-definer functions pin `search_path`, reducing object-shadowing risk.

Required verification:

- Catalog-query every public table for `relrowsecurity`, grants, and policies, especially `parking_zone_raw`.
- Confirm no default execute grants remain on unintended public/PostGIS functions.
- Confirm the two public views expose only reviewed columns after every schema change.

## 7. Views and availability semantics

### `parking_segment_summaries`

The view returns only segments with a non-null generated location. For each segment it chooses the newest non-expired estimate, regardless of context hash, ordered by `generated_at` and then `created_at`. It exposes estimate percentage/count, confidence, timestamps, estimator version, and factor summary.

Important semantic distinction: the direct segment view may show the latest estimate from any destination context. The context-aware RPC filters estimates by a caller-provided context hash. Consumers must not treat the direct view as destination-specific.

Pricing is rule-derived from German/free/paid keywords and hard-coded hourly rates for selected regulation groups. These are heuristics, not normalized tariff data.

### `parking_zone_summaries`

The view aggregates capacity-weighted availability across the newest current segment snapshots. Unknown segments are excluded from the availability denominator. It reports estimated/unknown segment counts and a coverage ratio, which is good transparency.

### `fetch_parking_cells`

The RPC creates 500 m (`coarse`) or 250 m (`fine`) Web Mercator hexagons, assigns each segment to one stable cell, aggregates availability, and returns at most 400 result rows. It rejects invalid coordinate order/ranges and invalid context-hash format.

Risks:

- No maximum geographic extent exists before grid generation.
- Web Mercator distortion grows toward the poles even though latitude inputs permit ±90°.
- Cell IDs are derived from resolution/grid coordinates and are not persistent prediction entities.
- The context hash is an identifier, not an authorization secret.
- Both overloads are public security-definer functions and therefore need explicit resource-abuse controls.

## 8. Index and performance audit

Confirmed from migrations:

| Table | Index |
|---|---|
| `consent_events` | `(user_id, created_at DESC)` |
| `deletion_requests` | `(user_id)`; unique partial `(user_id)` for open statuses |
| `user_favorites` | `(user_id)`; unique `(user_id, segment_id)` |
| `user_preferences` | PK on `user_id` |
| `profiles` | PK on `id` |
| `parking_segments` | GiST partial `location`; B-tree `parking_zone_id` |
| `parking_zones` | GiST partial `geom` |
| `parking_availability_estimates` | segment/generated; expiry; context/version/expiry; unique context identity |

Expected only if the standalone preparation script ran: `parking_segments(strasse)`, partial `(lat, lon)`, and `geoportal_class`.

Performance concerns:

1. The estimator Edge Function filters by `lat` and `lon`. The optional partial `(lat, lon)` index is not guaranteed by migrations and may not optimally support independent range predicates. Confirm the live plan with `EXPLAIN (ANALYZE, BUFFERS)` and consider a GiST bounding query on `location`.
2. The segment summary uses a lateral latest-valid-estimate lookup. The `(segment_id, generated_at DESC)` index helps, but adding `valid_until` and possibly `created_at` to a purpose-built index may reduce filtering/tie-break work. Validate before adding.
3. The context RPC query pattern filters by `(segment_id, context_hash, valid_until)`; the current unique and context indexes may still require extra work per segment. Measure with real cardinality.
4. Expired estimates remain indexed forever without retention.
5. `ST_HexagonGrid` work is not bounded by the final result limit.

No live statistics were available, so these are query-shape findings, not claims of observed slowness.

## 9. Migration and deployment audit

### Applied migration ledger

| Version | Purpose | Local = remote |
|---|---|---|
| `20260703000100` | Profiles, shared timestamp trigger, Auth signup trigger | Yes |
| `20260703000200` | Vehicles, favorites, preferences | Yes |
| `20260703000300` | Consent events and deletion requests | Yes |
| `20260712000100` | Recreate/harden Auth profile trigger | Yes |
| `20260712000200` | Public/authenticated parking-segment read | Yes |
| `20260712000300` | Drop `user_vehicles` | Yes |
| `20260713000100` | First semantic-zoom backend | Yes |
| `20260716000100` | Reconcile semantic zoom to UUID segment IDs | Yes |
| `20260718000100` | Replace synthetic estimates with estimator snapshots | Yes |
| `20260719000100` | Permit percentage-only estimates | Yes |

### Reproducibility problems

- The first three migration files still say “DRAFT — do not apply automatically,” yet they are applied remotely. The comments are now misleading operational documentation.
- `20260712000200` assumes `parking_segments` already exists.
- `20260713000100` assumes both core parking tables and their source columns already exist.
- `parking_zone_raw` and the source import/transform pipeline have no numbered baseline migration.
- `parking_zones_read_policy.sql` changes production authorization but is not tracked in the migration ledger.
- `parking_segments_prepare.sql` changes data, creates indexes, and changes authorization but is not tracked in the migration ledger.
- The July 16 migration correctly fails closed around type/object mismatches and validates UUID/geometry assumptions. This is a strong corrective migration, but it cannot substitute for a baseline.

Recommended migration repair sequence:

1. Start Docker or use a trusted `pg_dump --schema-only` path and capture the linked project's authoritative catalog.
2. Diff the dump against generated types and all migrations.
3. Add a baseline migration for missing core objects. If existing remote projects must not recreate them, use catalog-checked idempotent DDL or Supabase's documented baseline/squash workflow.
4. Convert both standalone authorization/index scripts into migrations.
5. Add read-only verification SQL for tables, columns, FKs, checks, indexes, RLS, policies, grants, view security options, and function ACLs.
6. Prove a clean project can run the complete migration chain and generate the same TypeScript schema.

## 10. Edge Function and application access audit

### `estimate-parking-availability`

- Supabase config requires JWT verification.
- The function uses the service-role key for database reads/writes.
- It reads segments inside a caller-provided bounding box, caps returned input at `MAX_ESTIMATION_SEGMENTS + 1`, reuses matching context/version snapshots, obtains demand context, and upserts estimates.
- The unique key makes repeat requests for the same segment/context/version overwrite the cache row rather than append.

Risks: every authenticated user can potentially trigger database writes and external Maps calls; there is no visible per-user rate limit, quota, or durable abuse control. Database and provider-cost protection should not depend only on a maximum segment count.

### `delete-account`

- Requires a JWT at the function gateway and validates the token with `auth.getUser()`.
- Uses `auth.admin.deleteUser()` via service role.
- Cascades remove profile, preferences, favorites, and consent events.
- Deletion requests would survive with null `user_id`, but this function never creates or completes one.

### App database usage

- Public map services read `parking_segments`, `parking_segment_summaries`, `parking_zone_summaries`, and both RPC shapes.
- `user_favorites` and `user_preferences` types and merge logic exist, but the sync manager still returns a remote placeholder and performs no network I/O.
- Account deletion uses the Edge Function directly.
- The generated database aliases match current active tables and correctly omit the dropped vehicle alias.

## 11. Data quality and privacy

Positive controls:

- Estimate percent/count/status, confidence, window, hash, and JSON top-level type are constrained.
- Zone reconciliation validates UUID identity, geometry validity/SRID, coordinate range for existing rows, FK integrity, and summary output ranges during migration.
- Boundary points use `ST_Covers`, and overlapping zones resolve deterministically by smallest area then ID.
- Google raw responses are not stored; only selected derived fields and Place ID are persisted.

Gaps:

- Existing-row migration checks are not ongoing table constraints.
- There is no documented estimate retention or deletion schedule.
- Destination Place IDs and context hashes may reveal repeated destination interest if service-role data is accessed; treat them as potentially personal/pseudonymous data.
- `factor_summary` and favorites `snapshot` have no payload-size controls.
- Consent policy version is optional.
- Deletion `reason` may survive anonymized and must be scrubbed, but no fulfillment implementation is present.
- Raw imported source strings and URLs have no explicit size limits.

## 12. Recommended action plan

### Immediate (before the next database feature)

1. Produce and version a complete baseline for the parking tables and their authorization.
2. Add bounding-box/cell-count protection to both public cell RPCs.
3. Harden `handle_new_user()` against empty/overlong metadata and add signup integration tests.
4. Decide whether `deletion_requests` is authoritative; wire it into deletion or remove the unused compliance claim.
5. Verify and lock down `parking_zone_raw` live RLS/grants.

### Near term

6. Add estimate retention and monitor table/index growth.
7. Add rate limits/quotas for estimator invocation and external provider calls.
8. Add tracked coordinate/geometry constraints for future writes.
9. Review the two security-definer RPCs and owner-executed views with catalog-based privilege tests.
10. Remove “DRAFT” comments from applied migrations or replace them with accurate historical notes.

### Before enabling cloud sync

11. Finish real reads/upserts/deletes for favorites/preferences and test RLS with two users plus anonymous access.
12. Define quotas and JSON schema/versioning for favorite snapshots.
13. Test conflict resolution, timestamp trust, account deletion cascades, and offline retry/idempotency.

### Operational follow-up

14. Run live `table-stats`, `index-stats`, query outlier, and `EXPLAIN` analysis once the inspection endpoint is available.
15. Verify backups/PITR, recovery objectives, migration CI, and clean reset parity.
16. Regenerate `src/types/database.ts` in CI and fail on uncommitted schema drift.

## 13. Suggested verification queries

Run these through a privileged, read-only SQL session and retain the output as deployment evidence:

```sql
-- Tables, RLS and forced-RLS state
select n.nspname as schema_name, c.relname, c.relkind,
       c.relrowsecurity, c.relforcerowsecurity
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relkind in ('r', 'p', 'v', 'm')
order by c.relkind, c.relname;

-- RLS policies
select schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
from pg_policies
where schemaname = 'public'
order by tablename, policyname;

-- Table and column grants
select grantee, table_name, privilege_type
from information_schema.role_table_grants
where table_schema = 'public'
order by table_name, grantee, privilege_type;

select grantee, table_name, column_name, privilege_type
from information_schema.role_column_grants
where table_schema = 'public'
order by table_name, grantee, column_name;

-- Constraints and definitions
select conrelid::regclass as relation, conname, contype,
       pg_get_constraintdef(oid) as definition
from pg_constraint
where connamespace = 'public'::regnamespace
order by conrelid::regclass::text, conname;

-- Index definitions and validity
select schemaname, tablename, indexname, indexdef
from pg_indexes
where schemaname = 'public'
order by tablename, indexname;

-- Function security and ACLs
select p.oid::regprocedure as function_name,
       p.prosecdef as security_definer,
       p.proconfig as settings,
       p.proacl
from pg_proc p
where p.pronamespace = 'public'::regnamespace
order by p.oid::regprocedure::text;
```

## 14. Conclusion

The database has a strong foundation for owner-scoped user data and a thoughtfully constrained parking-estimate model. The most important weakness is not an individual table definition: it is that the repository cannot reproduce the database it describes. Closing that baseline gap, bounding public spatial work, hardening signup, and aligning the deletion audit model with actual behavior should precede further schema expansion.
