# Phase 1A semantic-zoom reconciliation report

> Historical report (2026-07-16). The administrative-boundary design recorded
> below was superseded by the segment-centric migration
> `20260722000100_remove_parking_zones.sql`. Referenced rollback and diagnostic
> scripts were intentionally removed to prevent use against the active model.

Date: 2026-07-16  
Repository: WhiteChocolate  
Branch: `feat/phase-1a-semantic-zoom-reconciliation`

## Status

The UUID-compatible reconciliation migration and post-migration diagnostic are authored, but the migration was not applied to the linked Supabase project.

The app target is confirmed by project identity, but the remote environment tier is not explicitly documented as development, staging, or production. The repository contains local `.env` configuration and EAS development profiles, but no Supabase environment mapping or non-production project reference. Per the task stop conditions, remote writes and type regeneration are gated until the project is explicitly approved as a non-production validation target.

Prepared files:

- `supabase/migrations/20260716000100_reconcile_parking_semantic_zoom_uuid.sql`
- `supabase/diagnostics/semantic_zoom_reconciliation_verification.sql`
- `supabase/rollback/20260716000100_reconcile_parking_semantic_zoom_uuid.sql` (manual only)
- `tests/parking-segments.test.ts` UUID regression coverage
- `tests/parking-map-data.test.ts` UUID summary-normalization coverage

The prepared files were already present in commit `313a2b3` on `master` when
this review began, contrary to the expected uncommitted starting state. The
dedicated review branch preserves that history and contains only follow-up
safety hardening from this review. An unrelated untracked
`.claude/settings.local.json` file was not touched or staged.

No city ownership, prediction, provider, stable-cell, UI, favorite-schema, or dependency changes were made.

## Prepared

Complete locally. The UUID-compatible migration, read-only diagnostic, manual
rollback, and focused UUID regression tests exist and have been reviewed. Local
validation passed, but no remote database was changed.

Types regenerated: no. Regeneration remains blocked until an approved staging
database receives the migration.

## Applied to staging

Not started. No approved staging project reference, staging URL, or
environment-to-Supabase mapping exists in the repository documentation or
approved configuration. The only discovered Supabase target is
`bzankvuvrbhqizzeyzyg`, which is the current app target and has not been
explicitly approved as non-production.

Per the Phase 1A.2 stop condition, the current linked project must not be
silently repurposed as staging. A staging project must be created and its
reference explicitly approved before any remote write.

## Staging diagnostics

Not run. A pre-reconciliation staging baseline cannot be recorded until an
isolated staging project exists and contains the representative inventory.

The required baseline is:

- 13,340 parking segments;
- 82 parking zones;
- 82 raw parking-zone rows;
- segment fingerprint `fd2aaf3f0ae66820a7b3dd6201db4965`;
- zone fingerprint `658f172deb6a7aae1f97014095735b30`;
- UUID segment IDs, bigint zone IDs, valid WGS84 multipolygon geometry;
- no `location`, `parking_zone_id`, semantic-zoom views, RPC, function, or
  assignment trigger.

## Runtime verified against staging

Not run. The Expo data layer has only been validated locally against mocks and
repository contracts. No staging environment was available for direct segment,
summary, zone, cell, detail-route, or semantic-zoom verification.

## Rollback rehearsed

Not run. Rollback rehearsal is blocked until the reconciliation migration has
been applied to an approved staging database. It must be performed in staging
before production approval.

## Ready for production

No. The production-readiness gates remain open: isolated staging identity,
inventory copy, pre-migration fingerprints, migration execution, post-migration
diagnostics, runtime verification, type regeneration, and rollback rehearsal.

## Applied to production

No. The current linked project `bzankvuvrbhqizzeyzyg` was not modified by this
phase.

## Staging setup and validation runbook

The following is the exact operator sequence once a staging project is approved.
It is intentionally not executed by this task.

### 1. Create and approve an isolated project

Create a new Supabase project in the same organization, for example
`WhiteChoclate-staging`, with a separate generated database password and a
region appropriate for development validation. Confirm that its project ref is
not `bzankvuvrbhqizzeyzyg`, and record the ref and database URL in the approved
deployment record without committing keys or passwords.

Project creation can be performed in the Supabase Dashboard or by an operator
using the CLI project-creation workflow. The CLI supports
`supabase projects create`; project creation is an operator action and was not
performed here. See the [Supabase CLI project reference](https://supabase.com/docs/reference/cli/supabase-seed).

The operator must explicitly confirm:

- the new project is non-production;
- no real authentication users or personal data are present;
- destructive migration and rollback testing are approved;
- the supplied staging ref is different from the current linked ref.

### 2. Keep local and production configuration isolated

Do not overwrite `.env` or any production-like environment file. Use the
repository's ignored `.env*.local` pattern for a temporary staging file, such
as `.env.staging.local`, containing only the staging URL and anon key. Never
commit that file.

The repository has no Supabase `config.toml` or staging profile. If a linked CLI
workflow is needed, use a temporary worktree or an explicitly isolated operator
checkout:

```text
git worktree add ..\WhiteChoclate-staging-ops master
cd ..\WhiteChoclate-staging-ops
npx supabase init
npx supabase link --project-ref <STAGING_PROJECT_REF>
```

Confirm the link with `supabase status` or the generated
`supabase/.temp/project-ref`. Do not run these commands in the current checkout
until the staging ref has been approved, and do not commit staging state.

### 3. Reproduce the authoritative pre-Phase-1A schema

The repository does not contain complete base-table creation migrations, so a
new empty project cannot safely be populated by blindly running the full
historical migration directory. First inspect the staging migration history and
the current source schema. If a full push would apply unrelated or incompatible
migrations, stop and use an approved targeted schema-copy workflow.

Use one of these approved methods:

1. Prefer an isolated database duplicate/restore workflow when available and
   approved by the operator, followed by removal/verification of all account
   data.
2. Otherwise export only the required public schema and inventory data from the
   source using a temporary export outside the repository, then restore it into
   staging with explicit table and column lists.

The copy must reproduce PostGIS, pgcrypto where required, `parking_segments`,
`parking_zones`, and `parking_zone_raw`, including their live UUID/bigint key
types, defaults, RLS, grants, geometry definitions, source fields, and relevant
indexes. Copy exactly the 13,340 segment UUIDs, 82 zone IDs, and 82 raw-zone
rows. Reset bigint sequences only after import if the live schema uses them.

Do not copy `auth.users`, profiles, consent, deletion requests, personal
favorites, API keys, service-role keys, or unrelated logs. Create an empty
`user_favorites` table only if required for dependency or runtime checks. Review
the selected parking columns for private data before exporting.

Keep temporary dumps in `.staging-exports/` or outside the repository. The
repository `.gitignore` now excludes staging export directories and dump files;
still verify `git status` before committing.

### 4. Record the pre-migration baseline

Against the staging project, run the existing read-only
`supabase/diagnostics/multi_city_phase_1_verification.sql` plus explicit
fingerprint queries for the segment UUID set and zone ID set. Record counts,
types, constraints, indexes, RLS, grants, coordinate quality, geometry quality,
and absence of the semantic-zoom objects. Do not proceed if the counts or
fingerprints differ from the verified source without an approved explanation.

### 5. Apply only the reconciliation migration

Do not run a blind `supabase db push` if migration history would apply the
incompatible historical text-ID migration or other unrelated migrations. The
operator must inspect `supabase_migrations.schema_migrations` and use an
approved targeted workflow that executes only:

```text
supabase/migrations/20260716000100_reconcile_parking_semantic_zoom_uuid.sql
```

Record the command, start/end time, duration, notices, and migration-history
result. The migration must be applied to staging before any type generation or
production discussion. Supabase documents `supabase db push` and its dry-run
workflow, but the repository's incomplete base-table history makes the
target-specific safety check mandatory; see the [Supabase db push reference](https://supabase.com/docs/reference/cli/supabase-db-push).

### 6. Run post-migration diagnostics

Run `supabase/diagnostics/semantic_zoom_reconciliation_verification.sql` in a
read-only transaction. Record inventory counts and fingerprints, generated
location validity, assignment coverage/overlap, FK/index/function/trigger
existence, summary rows, coarse/fine cell results, percentage/capacity ranges,
UUID serialization, and anon/authenticated read/execute/write checks.

### 7. Generate and review database types

Generate from the staging project, not from the current linked project:

```text
npx supabase gen types typescript --project-id <STAGING_PROJECT_REF> --schema public > <reviewed-output-path>\database.ts
```

Review the generated diff before replacing `src/types/database.ts`. Confirm
UUID transport IDs remain TypeScript strings, `location` is represented,
`parking_zone_id` is nullable numeric, the segment-zone relationship is present,
and the summary views/RPC are present. Do not hand-edit generated output to hide
a schema mismatch. The project's existing hand-maintained aliases, if still
needed after generation, must be handled as a reviewed follow-up rather than
used to conceal a failed generation.

### 8. Verify the Expo runtime against staging

With only `.env.staging.local` active, run the existing direct segment fetch,
summary segment fetch, zone summary fetch, coarse/fine cell fetch, UUID detail
route lookup, normalizers, and semantic-zoom map path. Confirm the missing-view
fallback is no longer used for the reconciled backend, statuses remain
`estimated`, and production-like `.env` values remain unchanged.

Run the repository checks:

```text
npm test
npm run lint
npx tsc --noEmit
```

Record exact results; do not claim staging runtime success from local tests.

### 9. Rehearse rollback and reapply

Capture the post-migration baseline, run the manual rollback file
`supabase/rollback/20260716000100_reconcile_parking_semantic_zoom_uuid.sql`, and
verify unchanged counts/fingerprints, removed location/zone relationship/views/
RPC/function/trigger, and restored public base-table reads. Then reapply only
the reconciliation migration and rerun the post-migration diagnostic. Do not
run the rollback on the current linked project or production.

## Production rollout checklist

Production rollout is a separate, explicitly approved operation. The checklist
must be completed in order:

- [ ] Commit and review all Phase 1A files, including the follow-up ownership
      markers and diagnostic hardening on this branch.
- [ ] Confirm a successful staging run and rollback/reapply rehearsal.
- [ ] Confirm a current backup/restore path for the target project. Supabase
      documents dashboard backups and logical dump options in its
      [backup documentation](https://supabase.com/docs/guides/platform/backups).
- [ ] Record the target project ref and explicitly approve it as the intended
      environment; never infer this from the local link alone.
- [ ] Record baseline counts, fingerprints, geometry quality, RLS, grants, and
      migration history.
- [ ] Obtain the approval owner and an agreed maintenance/rollback window if
      operational policy requires one.
- [ ] Run a dry-run or approved targeted migration review; do not apply the
      incompatible historical text-ID migration.
- [ ] Apply only
      `20260716000100_reconcile_parking_semantic_zoom_uuid.sql`.
- [ ] Run both diagnostics and record exact outputs.
- [ ] Run direct segment, summary, zone, cell, detail-route, and RLS smoke tests.
- [ ] Regenerate and review database types from the target project.
- [ ] Roll back only if the documented criteria are met: ID/fingerprint change,
      inventory loss, invalid geometry/assignment, missing objects, broken
      public reads, or runtime contract failure.
- [ ] Use the manual rollback file only before later city/prediction tables
      depend on these objects.

Approval owner: not assigned in repository documentation.

Current linked project status: untouched by this phase.

## Gate 1: linked project identity

Confirmed without printing secrets:

| Check | Result |
|---|---|
| Linked project ref | `bzankvuvrbhqizzeyzyg` |
| Linked project name | `WhiteChoclate` |
| App Supabase URL host | `bzankvuvrbhqizzeyzyg.supabase.co` |
| Ref/host match | Yes |
| Repository product evidence | README identifies the app as ParkMunich and reads Supabase parking data |
| EAS profiles | Development, development-simulator, preview, and production profiles exist |
| Remote environment tier | Not explicitly encoded; requires operational approval before write |

The project identity matches the application configuration. The environment cannot be safely classified from repository evidence alone.

## Gate 2: live verification

The read-only Supabase catalog/data-quality check was rerun against the matching project.

| Object/check | Result |
|---|---|
| PostGIS | 3.3.7, schema `public` |
| `pgcrypto` | 1.3, schema `extensions` |
| `parking_segments` | 13,340 rows |
| Segment primary key | `uuid`, `gen_random_uuid()` default |
| Segment duplicate/null IDs | 0 / 0 |
| Segment null/invalid coordinates | 0 / 0 |
| `parking_zones` | 82 rows |
| Zone primary key | `bigint` |
| Zone geometry | 82 `ST_MultiPolygon`, SRID 4326, valid and non-empty |
| `parking_zone_raw` | 82 rows |
| `user_favorites` | 0 rows |
| Orphan favorites | 0 |
| Existing `location` | Absent |
| Existing `parking_zone_id` | Absent |
| Existing semantic-zoom views | Absent |
| Existing cell RPC | Absent |
| Existing assignment function | Absent |
| Inventory RLS | Enabled on segments and zones |
| Effective public reads | `anon` and `authenticated` can select segments and zones |

Baseline identifier fingerprints captured before reconciliation:

- Segment UUID set: 13,340 rows, `fd2aaf3f0ae66820a7b3dd6201db4965`
- Zone ID set: 82 rows, `658f172deb6a7aae1f97014095735b30`

## Migration design

`20260716000100_reconcile_parking_semantic_zoom_uuid.sql` is additive and forward-only. It:

1. Verifies UUID segment IDs, bigint zone IDs, valid WGS84 multipolygon zones, and absent/unreviewed semantic objects.
2. Adds generated `parking_segments.location geometry(Point,4326)` from `lon`/`lat`.
3. Adds nullable `parking_zone_id bigint`.
4. Adds the location GiST, zone FK B-tree, and existing-zone geometry GiST indexes only when absent.
5. Backfills assignments set-wise using `ST_Covers`, smallest zone area, then lowest zone ID.
6. Creates the UUID-safe security-definer assignment function and lat/lon trigger.
7. Restores `parking_segment_summaries` and `parking_zone_summaries` with security invoker semantics.
8. Restores `fetch_parking_cells` with the existing signature, coarse/fine resolutions, bbox validation, and 400-row cap.
9. Uses `segment.id::text` only at view/RPC boundaries; the base UUID column remains unchanged.
10. Preserves deterministic synthetic availability as explicitly estimated compatibility data.
11. Grants summary reads and RPC execution to `anon` and `authenticated` while leaving inventory write privileges untouched.
12. Fails closed if an incompatible location, zone FK, or semantic-zoom object already exists.

The legacy bbox-derived cell IDs remain compatibility-only and are not promoted to persistent prediction-cell identities.

## Diagnostics

`semantic_zoom_reconciliation_verification.sql` is read-only and verifies:

- exact row counts and ID-set fingerprints;
- generated point validity and coordinate agreement;
- zone geometry validity;
- uncovered, uniquely covered, multiply covered, and largest-overlap counts;
- invalid assignments;
- summary-view counts and percentage/capacity ranges;
- zone aggregate reconciliation;
- coarse/fine Munich-bbox cell output;
- required views/functions/triggers;
- effective read/execute privileges and inventory write absence.

The existing `multi_city_phase_1_verification.sql` remains unchanged and continues to cover the later city-ownership gate.

## Application and generated types

No runtime application file or generated database type was changed. The current domain and normalizer contracts already represent IDs as strings, so the UUID response boundary requires no client-facing ID redesign.

Type regeneration is intentionally pending migration approval and application:

```text
npx supabase gen types typescript --linked > src/types/database.ts
```

The generated diff must be reviewed for `location`, `parking_zone_id`, summary views, the cell RPC, and the segment-zone relationship before committing it.

## Tests and validation

Added unit coverage for UUID-shaped IDs flowing through:

- direct segment row normalization;
- deterministic estimated availability;
- summary-row normalization;
- numeric zone IDs becoming domain string zone IDs.

Repository validation after the local changes:

- `npm test`: 217 tests passed, 0 failed.
- `npm run lint`: passed.
- `npx tsc --noEmit`: passed.
- Remote migration: not run.
- Post-migration diagnostic: not run because migration was not applied.

## Deployment gate and commands

Do not run the following until the linked project is explicitly approved as a non-production validation target and a backup/rollback path is confirmed:

```text
npx supabase link --project-ref bzankvuvrbhqizzeyzyg
npx supabase db push --linked
npx supabase gen types typescript --linked > src/types/database.ts
```

Then run:

```text
npm test
npm run lint
npx tsc --noEmit
```

Run both SQL diagnostics in the Supabase SQL editor or approved migration workflow and record their outputs.

## Rollback

No remote changes were made, so no rollback was executed. Before city or prediction phases depend on the reconciliation, rollback must be performed manually in reverse order: revoke view/RPC grants, drop the cell RPC and views, drop the trigger/function, remove the FK and indexes, then remove `parking_zone_id` and generated `location`. Never remove inventory rows or UUID IDs.

## Can city-ownership Phase 1 be rerun?

Not yet. It can be rerun after:

1. the linked project is explicitly approved as the intended non-production target;
2. the reconciliation migration is applied successfully;
3. the post-migration diagnostic confirms the baseline counts/fingerprints, object contracts, RLS, grants, and runtime queries;
4. generated database types are regenerated and reviewed.
