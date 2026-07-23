# Phase 1 city-ownership implementation report

> Historical report (2026-07-16). This records a superseded pre-migration
> state and does not describe the current segment-centric architecture. See
> `parking-data-and-prediction-readiness-audit.md` and migration
> `20260722000100_remove_parking_zones.sql` for the active design.

Date: 2026-07-16  
Repository: WhiteChocolate  
Branch: `master`

## Result

Phase 1 production migration was stopped before any production write or migration file was created.

The linked Supabase project does not match the repository architecture that this phase is required to preserve. Applying the requested constraints now would create an unsafe split between the client contract, generated database types, migration history, and live database.

Only the reusable read-only diagnostic was added:

- `supabase/diagnostics/multi_city_phase_1_verification.sql`

No production SQL migration, application code, generated database types, views, RPCs, policies, or live data were changed.

## Stop-condition evidence

The linked project was inspected through Supabase's read-only Management API SQL endpoint. The Supabase CLI dump path was also attempted, but it requires a running Docker Desktop database container and failed before connecting to the remote schema.

Confirmed live state:

| Object or check | Live result |
|---|---|
| `parking_segments` rows | 13,340 |
| `parking_segments.id` | `uuid` primary key, generated default `gen_random_uuid()` |
| `parking_segments.location` | Absent |
| `parking_segments.parking_zone_id` | Absent |
| `parking_zones` rows | 82 |
| `parking_zones.id` | `bigint` primary key |
| `parking_zones.geom` | Present; observed SRID/empty/validity checks passed for all 82 rows |
| `parking_zone_raw` rows | 82; table is populated |
| `user_favorites` rows | 0 |
| Duplicate segment IDs | 0 |
| Duplicate zone IDs | 0 |
| Null segment IDs | 0 |
| Null zone IDs | 0 |
| Null/invalid segment coordinates | 0 |
| Orphan favorite IDs | 0 |
| `public.cities` | Absent |
| `parking_segment_summaries` | Absent from live public relations |
| `parking_zone_summaries` | Absent from live public relations |
| `fetch_parking_cells` | Absent from live public functions |
| `assign_parking_segment_zone()` | Absent from live public functions |
| `set_updated_at()` | Present and security-invoker with empty `search_path` |
| Segment/zone RLS | Enabled, not forced |
| Anonymous/authenticated inventory reads | Effective `SELECT` privilege true for both roles |
| Existing inventory read policies | Present; `parking_segments` has public read, `parking_zones` has two public/anonymous read policies |

The repository-generated `src/types/database.ts` and `20260713000100_parking_semantic_zoom_backend.sql` describe a different schema: they expect text segment IDs, generated `location`, `parking_zone_id`, parking summary views, and `fetch_parking_cells`. This is the material conflict required by the task's stop conditions.

## Files inspected

Repository and configuration:

- `AGENTS.md`
- `package.json`
- `README.md`
- `.env.example` and environment-variable names from `.env` (secret values not printed)
- `app.config.ts`
- `src/lib/supabase.ts`
- `src/types/database.ts`
- `src/types/parking-domain.ts`
- `src/types/parking-segment.ts`
- `src/types/parking-map.ts`

Parking runtime and consumers:

- `src/services/parkingSegments.ts`
- `src/services/parkingZones.ts`
- `src/services/parkingMapData.ts`
- `src/hooks/use-parking-map-data.ts`
- `src/context/FavoriteParkingContext.tsx`
- `src/utils/favorite-parking-storage.ts`
- parking/map/detail/favorite/synchronization tests listed by `package.json`
- the repository architecture audit `docs/multi-city-parking-architecture-migration-plan.md`

Supabase sources:

- every file under `supabase/migrations`
- every file under `supabase/diagnostics`
- `supabase/functions/delete-account/index.ts`
- `supabase/parking_segments_prepare.sql`
- `supabase/parking_zones_read_policy.sql`
- `supabase/.temp/project-ref`
- `supabase/.temp/linked-project.json`

The graphify architecture query was run against the existing `graphify-out/graph.json`; source files and live catalog results were treated as authoritative where the graph or generated types differed.

## Objects that would be changed after reconciliation

No objects were changed in this task. Once the target database is confirmed, the intended Phase 1 change set is:

1. Add `public.cities` with Munich configuration and public read-only RLS.
2. Add nullable `city_id` to `parking_zones`, `parking_segments`, and the populated `parking_zone_raw` table.
3. Backfill all existing rows to one idempotently resolved Munich row.
4. Validate counts, IDs, geometry, and inventory coverage.
5. Add foreign keys, `NOT NULL`, and indexes only after validation.
6. Add the city-consistency rule only if `parking_zone_id` exists in the reconciled target schema.
7. Update the assignment function/trigger only if the semantic-zoom objects are present in that target schema.
8. Leave views, RPC signatures, client queries, favorites, routes, and availability logic unchanged.

## Safe adjusted plan

### Gate A — identify the target database

Determine whether the linked project is the intended production/development database or an older Supabase project. The live project reference is present in `supabase/.temp/linked-project.json`, but the repository has no `supabase/config.toml` or migration-deployment workflow that proves which environment is authoritative.

### Gate B — reconcile the schema contract

Choose one safe path:

- Apply and verify the existing semantic-zoom migration chain to the intended database, including its base-table prerequisites; or
- Treat the live schema as canonical, first create a separate migration to restore/version the missing views/RPC and reconcile the generated types, then rerun this Phase 1 audit.

Do not add a composite segment-zone foreign key until `parking_segments.parking_zone_id` and its intended type are verified in the target database.

### Gate C — regenerate types from the same database

Use the project’s authenticated Supabase CLI/type-generation workflow against the reconciled target. Review the generated diff for segment ID type, `parking_zone_id`, `location`, views, and RPCs. The current repository comment identifies `supabase gen types typescript`; no executable project script is documented.

### Gate D — implement Phase 1

After the live/repository contract matches, create the additive city migration and run `multi_city_phase_1_verification.sql` before and after deployment. The migration must fail closed on unexpected pre-existing city assignments and must not overwrite existing non-Munich ownership.

## Rollback posture

No production changes were made, so no rollback is required for this task.

After the schema conflict is resolved, Phase 1 should remain forward-only until no later city/provider/prediction objects depend on `cities`. Before that point, rollback can remove city constraints, indexes, columns, and the Munich row in reverse dependency order. After later phases depend on city ownership, disable later features and keep the additive city schema rather than dropping it.

## Remaining risks

- The current linked database may be an older environment, not the target used to run the mobile app.
- The live database has no semantic-zoom views/RPC despite the client calling them; this must be resolved independently of city ownership.
- The generated TypeScript file is not a reliable live-schema snapshot for this linked project.
- `parking_zone_raw` is populated but has no visible primary key or repository migration provenance; adding city ownership is reasonable only after confirming its importer lifecycle.
- Existing `parking_zones` read policies are duplicated by name/purpose; Phase 1 should preserve them and avoid unrelated policy cleanup.

## Validation status

- Read-only live database inspection: completed; evidence above.
- Supabase CLI linked dump: attempted; blocked because Docker Desktop is not running.
- Production migration: intentionally not created or applied due stop condition.
- Generated database types: unchanged.
- Runtime behavior: unchanged.
- Tests/lint: not rerun because no implementation was made after the stop condition.

Recommended next implementation phase: reconcile the linked database and repository schema contract, then rerun this Phase 1 task from the live-verification gate.
