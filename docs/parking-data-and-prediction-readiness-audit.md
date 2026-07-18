# Parking Data and Prediction Readiness Audit

**Audit date:** 2026-07-18
**Scope:** Current Expo source, Supabase migrations/generated types, parking services/hooks/normalizers, map/detail UI, demo data, tests, TypeScript, and lint.
**Method note:** Repository audit only. No live Supabase query or production-data sample was available; migrations are treated as intended contract, not proof of deployment.

## Executive verdict

The project has a useful static parking-inventory foundation, but it is not prediction-ready and must not claim live occupancy, historical usage, confidence, fresh reports, or a calculated “spot chance.”

| Capability | Readiness | Finding |
|---|---:|---|
| Static inventory and map geometry | **Ready with integration work** | Coordinates, capacity, regulations, zone geometry, and spatial assignment are represented. |
| Honest live availability | **Not ready** | Summary views generate a deterministic estimate from segment ID and capacity. |
| Historical occupancy dataset | **Not started** | No append-only observation/report table or persisted occupancy target exists. |
| Prediction model | **Not started** | No feature pipeline, training set, model artifact, serving contract, or evaluation is present. |
| Prediction UI | **Demo-only** | Premium charts, Spot Chance, fresh-check copy, and several parking facts are hardcoded. |
| Current client/backend build contract | **Blocked in this worktree** | The modified generated database type file is UTF-16LE, lint sees it as binary, and `tsc` cannot see the summary views/RPC. |

The right product status today is: **static parking inventory plus clearly labelled deterministic development estimates**.

## What is in the repository

The base schema represented in [`src/types/database.ts`](../src/types/database.ts) includes `parking_segments` (stable ID, latitude/longitude, `angebot` capacity, street/source-area names, regulation fields, GeoPortal class, source fields, and inventory timestamps), `parking_zones` (numeric ID, metadata, GeoJSON, and PostGIS geometry), and `parking_zone_raw`. User/account tables and `consent_events` are present, but none are occupancy observations.

The semantic-zoom migration adds a generated WGS84 point, nullable `parking_zone_id`, a foreign key, spatial indexes, boundary-inclusive `ST_Covers` assignment, and a trigger for later coordinate updates ([migration](../supabase/migrations/20260716000100_reconcile_parking_semantic_zoom_uuid.sql:215)). This is a sound spatial foundation.

The intended read contract is:

| Object | Role | Availability source |
|---|---|---|
| `parking_segment_summaries` | Segment map/detail rows | `estimated_available_capacity` and `estimated_availability_percent` |
| `parking_zone_summaries` | Complete-zone aggregates | Capacity-weighted sums of the segment estimate |
| `fetch_parking_cells(...)` | Coarse/fine semantic-zoom cells | Aggregates of the same estimate; max 400 cells |

The migration explicitly calls this compatibility data retained “before predictions exist” and “deterministic synthetic development data” ([view](../supabase/migrations/20260716000100_reconcile_parking_semantic_zoom_uuid.sql:513), [comment](../supabase/migrations/20260716000100_reconcile_parking_semantic_zoom_uuid.sql:774)).

## Current data flow

The active path is implemented by [`parkingMapData.ts`](../src/services/parkingMapData.ts:33) and [`use-parking-map-data.ts`](../src/hooks/use-parking-map-data.ts:132):

1. City/zone stages query `parking_zone_summaries`.
2. Cell stage calls `fetch_parking_cells` with coarse 500 m or fine 250 m cells.
3. Segment stage queries `parking_segment_summaries`, capped at 2,000 rows.
4. A view failure falls back to the legacy `parking_segments` query and client-side zone matching.
5. Segments are clustered by zone, adapted to the legacy `ParkingClusterResponse`, then consumed by map/list/search/detail UI.

The cache uses 10-minute zone, 60-second cell, and 30-second segment TTLs ([hook](../src/hooks/use-parking-map-data.ts:53)). These are cache controls, not evidence that occupancy was observed at those times.

## Availability audit

### Primary SQL path: synthetic

The summary view hashes `segment.id` and takes the result modulo capacity. It does not read occupancy, sensors, reports, traffic, weather, time of day, or events ([migration](../supabase/migrations/20260716000100_reconcile_parking_semantic_zoom_uuid.sql:525)). The result is stable for a segment and behaves like a fixture, not a live estimate or forecast.

Zone and cell percentages inherit this value through sums and capacity-weighted division ([zone aggregation](../supabase/migrations/20260716000100_reconcile_parking_semantic_zoom_uuid.sql:584), [cell aggregation](../supabase/migrations/20260716000100_reconcile_parking_semantic_zoom_uuid.sql:701)). Aggregation improves display scalability but adds no predictive information.

### Fallback path: a different synthetic algorithm

The client fallback also returns `status: 'estimated'`, but uses an FNV-style JavaScript hash in [`availabilityFor`](../src/utils/parking-segments.ts:176), while SQL uses PostgreSQL `hashtextextended` ([SQL](../supabase/migrations/20260716000100_reconcile_parking_semantic_zoom_uuid.sql:529)). These are not the same calculation. If the view fails, the same segment can show a different percentage.

This is a P1 correctness issue: use one development placeholder implementation, or make the fallback return unknown.

### Timestamp semantics are unsafe

The normalizer assigns `updated_at` to `availability.observedAt` for estimated rows ([normalizer](../src/utils/parking-map-data-normalizers.ts:167)). That is an inventory/source timestamp, not the time an available-space count was observed. The domain type supports `live`, `predicted`, `estimated`, confidence, and observation time ([domain type](../src/types/parking-domain.ts:23)), but the current path only produces `estimated` or `unknown`; no confidence or real observation time is supplied.

### Unknown can become zero

The legacy adapter converts a null aggregate percentage to `0` ([adapter](../src/utils/parking-feature-adapters.ts:45)). Some list components check `availabilityStatus`, but detail/header and sharing paths receive the coerced percentage. This can make “unknown” look like 0% and influence color, copy, or shared messages. Unknown must remain null through every adapter.

## UI and demo-data audit

[`ParkingBottomSheet.tsx`](../src/components/parking-map/ParkingBottomSheet.tsx:434) renders unsupported premium claims: seven hardcoded Historical Usage bars; `6 / 10 available` EV chargers and Type 2/22 kW details; CCTV, lighting, staff, and gated-entry availability; vehicle height/width limits; overnight, truck, and resident restrictions; payment methods; a hardcoded Spot Chance of 92%; `Public parking`, `Paved`, and `Just now` details.

The free detail path hardcodes `2 hours` and `24 hours`/`Open now`, and derives daily price as hourly price × 7.2 ([details](../src/components/parking-map/ParkingBottomSheet.tsx:294), [calculation](../src/components/parking-map/ParkingBottomSheet.tsx:614)). Regulation text only supports a limited parsed maximum-stay value.

[`fresh-check.tsx`](../src/app/fresh-check.tsx:18) runs a 75-second interval and navigates back. It does not call Supabase, submit a report, poll an endpoint, receive an observation, or update map state. Its “fresh report” and “standing prediction” copy describes unimplemented behavior.

[`src/constants/zones.ts`](../src/constants/zones.ts) contains four fixed Munich demo zones with percentages, ages, report counts, EV flags, and prices. The archived/demo [`App.jsx`](../Munich-Parking-App-Pages-App-2026-06-22-072318/source/App.jsx) duplicates the same product story. These are fixtures, not the active Supabase source.

## Prediction-data readiness

### Available inputs for a future baseline

Static features available today include segment/zone identity, coordinates, capacity, segment density, street/source area, regulation group/name/description, parsed maximum stay, heuristic pricing, inventory timestamps, destination distance, and nearby spatial context.

These describe supply and rules. They do not describe demand or current occupancy.

### Missing targets and features

No repository schema or runtime path was found for timestamped occupied/free-space observations, user “found one”/“no spots” reports, source/quality/confidence, deduplication IDs, forecast horizon, historical hourly/daily occupancy, weather, holidays, events, traffic, road closures, demand signals, model version, generated time, calibration, or evaluation metrics. EV inventory/availability, security, payment methods, surface, opening hours, and vehicle dimensions are also not structured data.

The deterministic estimate must not be used as a training label. Training on it would teach a model to reproduce the hash formula rather than parking behavior.

## Current-worktree contract blocker

The working tree has an uncommitted change to [`src/types/database.ts`](../src/types/database.ts). It is UTF-16LE with embedded null bytes, so ESLint reports “File appears to be binary.” Its current content also lacks the app-facing `parking_segment_summaries`, `parking_zone_summaries`, and `fetch_parking_cells` definitions and compatibility aliases present in the committed version.

Validation results:

- `npm test`: **217 passed**.
- `npx tsc --noEmit`: **fails** on missing summary view/RPC typings, missing `ParkingSegmentRow`/favorite aliases, and resulting row-type errors.
- `npm run lint`: **fails** because `src/types/database.ts` is parsed as binary.

This is not a model gap, but it blocks reliable implementation until the generated type file is restored/regenerated as UTF-8 and synchronized with deployed migration state. It was not modified because it is an existing user change outside this documentation audit.

## Recommended delivery sequence

### P0 — Make current claims and contracts truthful

1. Restore/regenerate UTF-8 Supabase types from the actual deployed schema, including summary views, the cell RPC, and app aliases.
2. Verify migration deployment before treating semantic-zoom objects as live.
3. Keep `estimated` labelled as a development placeholder; never call it live, fresh, observed, or predicted.
4. Preserve unknown as null through adapters and UI; remove null-to-zero conversion.
5. Gate unsupported detail claims with “data unavailable.” Remove Spot Chance and Historical Usage as facts.
6. Make SQL and fallback placeholder behavior identical, or have fallback return unknown.
7. Stop mapping inventory `updated_at` to `observedAt`.

### P1 — Build an observation pipeline

Add an append-only `parking_availability_observations` table, separate from inventory and predictions, with: `id`, `segment_id`/`zone_id`, `observed_at`, `submitted_at`, `available_spaces` (one canonical target), capacity snapshot, source, source event ID, confidence/quality, pseudonymous reporter/device reference, and `created_at`.

Validate non-negative counts, available ≤ capacity, valid references, timezone-aware timestamps, idempotency, retention, and RLS. The fresh-check screen should submit or poll this pipeline and return a new observation only when one exists.

### P2 — Establish an explainable baseline

Use a time-aware baseline with backoff: segment × weekday × time bucket, then zone × weekday × time bucket, then city/overall; return unknown when support is insufficient. Use time-based holdouts, compare against naive persistence, and report sample count, MAE/RMSE for spaces, and calibration/Brier score for “at least one space.” Never train on synthetic estimates or randomly split rows from the same time series.

### P3 — Publish a time-aware prediction contract

Expose `segment_id`/`zone_id`, `prediction_for`, `horizon_minutes`, availability percent/spaces, confidence, `model_version`, `generated_at`, `source_observation_at`, and `training_window_end`. Historical charts must consume timestamped API points, not seven static weekday values.

## Readiness gates before launch

- Real observations cover multiple weekdays, time buckets, zones, and capacity sizes.
- Provenance, duplicates, missingness, quality, privacy, and retention are documented.
- A baseline beats persistence on a time-based holdout, or is labelled experimental.
- Confidence is calibrated and shown with support/freshness.
- Sparse areas return “not enough data,” not a synthetic percentage.
- UI, generated types, migration state, and API contract pass one end-to-end test.

## Bottom line

The project is ready to continue building the **static map and inventory experience**. It is not ready to claim a real parking prediction system. Repair the current schema/type contract, remove misleading claims, and start collecting auditable occupancy observations before introducing a complex model.
