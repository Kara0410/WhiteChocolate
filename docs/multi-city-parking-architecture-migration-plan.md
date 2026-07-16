# WhiteChocolate parking architecture audit and multi-city migration plan

**Status:** read-only repository audit; no production code, migration, or Supabase function was changed  
**Audit date:** 2026-07-16  
**Repository:** `White_choclate`  
**Current target:** preserve Munich behavior while preparing for Munich, Vienna, Zurich, and further cities

## Evidence labels

- **FACT** means confirmed in the checked repository, generated database types, SQL, or tests.
- **RECOMMENDATION** means the migration direction proposed by this report.
- **VERIFY** means an external database state, product decision, or source-data contract must be confirmed before implementation.

## 1. Executive summary

**FACT:** The current app is a React Native/Expo SDK 54 app using Expo Router, TypeScript, NativeWind, Supabase JS, PostGIS-backed parking data, semantic map zoom, and local/cloud account data foundations. The runtime parking path already has three server-backed levels:

`parking_zone_summaries` → `fetch_parking_cells` → `parking_segment_summaries`

The app also retains a legacy direct read from `parking_segments` as a fallback. The current availability value is not an observation or model output. It is a deterministic synthetic estimate derived from the segment ID and capacity, implemented in SQL and repeated in the TypeScript legacy parser. Zone and cell percentages aggregate this synthetic value.

**FACT:** The current database is Munich-shaped but not yet explicitly city-scoped. `parking_segments` and `parking_zones` are publicly readable through permissive RLS policies. `parking_segments.parking_zone_id` is assigned using PostGIS `ST_Covers` with a smallest-zone/tie-break rule. The cell RPC currently generates 250 m or 500 m hexagons from the requested bounding box. Its returned `resolution:i:j` identifier looks stable to the client, but the grid origin is derived from the request envelope, so the same physical cell can receive different IDs across differently shaped requests.

**FACT:** Favorites are intentionally decoupled from the inventory database by storing `user_favorites.segment_id` as text without a foreign key and by storing a display snapshot. This protects favorites from reimports, but it also means the migration must preserve the existing segment ID contract and must not treat snapshots as current predictions.

**RECOMMENDATION:** Use an additive expand–migrate–switch–cleanup migration. First introduce city configuration and backfill the existing Munich records while leaving current views, RPCs, and client queries unchanged. Then introduce provider lineage and a stable city-scoped prediction-cell registry. Add prediction runs and stored predictions before changing the app. Only after backend-generated predictions have coverage and freshness monitoring should the client switch its data contract. Remove the deterministic synthetic calculation last, after a rollback window.

**RECOMMENDATION:** Keep existing Munich segment and zone IDs wherever possible. Add city/provider identity around them rather than regenerating them. For new canonical objects use UUIDs or deterministic scoped keys according to the object’s role; prediction-cell IDs must be deterministic and city/resolution scoped.

**VERIFY before implementation:** The repository does not contain the original creation migrations for `parking_segments`, `parking_zones`, or `parking_zone_raw`, and the generated `database.ts` reflects a live schema snapshot rather than the complete migration history. The production database must be introspected before any backfill or constraint is applied.

## 2. Current repository and runtime inventory

### Confirmed project configuration

| Area | Confirmed state | Migration implication |
|---|---|---|
| Runtime | Expo `~54.0.0`, React Native `0.81.5`, React `19.1`, Expo Router `~6.0.24` | Do not introduce an Expo SDK change as part of the data migration. |
| Data client | `@supabase/supabase-js ^2.109.0`, typed as `Database` | Regenerated database types are a client-contract event. |
| Map/clustering | `expo-maps`, `supercluster ^8.0.1`, `react-native-svg` | Existing dependencies cover map rendering, clustering, and simple chart/ring UI. |
| Styling | NativeWind 4 / Tailwind configuration | No data-model impact. |
| ML/chart packages | No ML runtime, chart library, queue, scheduler, or secure-store package was found in `package.json` | No dependency should be added now. Backend model execution should not be assumed to run in the Expo bundle. |
| Environment | Supabase URL/anon key in `.env.example`; Google Places and native Maps keys are read separately | City configuration must not be hidden in an environment variable intended for credentials. |
| App identity | `APP_NAME` and `APP_DISPLAY_NAME` are Munich-specific (`Munich Parking`) | Must become product/city configuration before multi-city distribution. |
| Error handling | `src/utils/app-errors.ts` normalizes network, timeout, authorization, and parking-data errors | Prediction failures should use the same safe error boundary and distinguish stale data from no data. |
| Tests | `npm test` passed: 215 tests, 0 failures | Tests are primarily pure/unit tests; database integration coverage is missing. |

### Important source files inspected

The implementation paths inspected include:

- `package.json`, `app.config.ts`, `README.md`, `.env.example` and `src/lib/supabase.ts`;
- `src/types/database.ts`, `src/types/parking-domain.ts`, `src/types/parking-segment.ts`, `src/types/parking-map.ts`, and related parking-zone/preferences types;
- `src/services/parkingSegments.ts`, `src/services/parkingZones.ts`, `src/services/parkingMapData.ts`, `src/services/parking-feature-clustering.ts`, `src/services/parking-clustering.ts`, `src/services/googlePlaces.ts`, and `src/services/sync/*`;
- `src/hooks/use-parking-map-data.ts`, `src/hooks/use-parking-zones.ts`, `src/hooks/use-map-location.ts`;
- `src/utils/parking-segments.ts`, `src/utils/parking-map-data-normalizers.ts`, `src/utils/parking-feature-adapters.ts`, `src/utils/parking-domain.ts`, `src/utils/parkingSearch.ts`, `src/utils/parking-map-geo.ts`, `src/utils/favorite-parking-storage.ts`, and `src/utils/app-errors.ts`;
- the parking map component directory, including the map, marker pipeline/overlay, list/search/bottom-sheet components and the availability demo;
- `src/app/parking/[id].tsx`, `src/context/FavoriteParkingContext.tsx`, and the account deletion service/function;
- all files under `supabase/migrations`, `supabase/diagnostics`, `supabase/functions`, plus `supabase/parking_segments_prepare.sql` and `supabase/parking_zones_read_policy.sql`;
- all parking tests and the favorite/synchronization tests;
- `graphify-out/graph.json` and `graphify-out/GRAPH_REPORT.md` as secondary navigation material. The graph is stale/incomplete for the newer semantic-zoom paths, so source inspection is authoritative.

## 3. Current database inventory

### 3.1 Parking tables

| Object | Purpose and confirmed columns | Source / consumer | Data classification | Ownership and permissions | Disposition |
|---|---|---|---|---|---|
| `public.parking_segments` | Canonical-looking street segment records: text `id`, `FID`, `shape`, street/source/rule fields, `angebot` capacity, `lat`, `lon`, `parking_zone_id`, timestamps, and generated `location geometry(Point,4326)` | Base table is pre-existing outside the checked migrations. Read by `parkingSegments.ts` legacy path, detail fallback, and the semantic-zoom views/RPC | Imported source data plus a synthetic availability calculation in dependent views; not a prediction store | RLS enabled by `20260712000200`; policy `Allow public read parking_segments` permits `anon` and `authenticated` reads with `USING (true)`. No client write grant was found. Import/service role is expected to write | Retain as the compatibility inventory during migration; extend additively with city/provider lineage before considering replacement |
| `public.parking_zones` | Administrative/source zones: bigint `id`, `fid`, name/status/massnahme, raw metadata, `geojson`, PostGIS `geom` | Base table is pre-existing; read by `parkingZones.ts`, zone summaries, zone polygon rendering, and segment-zone assignment | Imported/derived spatial inventory; summaries are derived elsewhere | `parking_zones_read_policy.sql` enables RLS, grants `SELECT` to `anon`/`authenticated`, and creates `Allow public read parking_zones` using `true` | Retain initially; add `city_id` and provider identity; later evolve into canonical city-owned zones or expose a compatibility view |
| `public.parking_zone_raw` | Raw Munich zone import fields such as `FID`, name, status, measure, opening, supervision, shape, and source link | Generated types show it; no current app consumer was found | Raw provider/import data | No parking-zone-specific policy or migration was found for this table | Keep as raw lineage only if it is still the authoritative source; otherwise freeze and replace with versioned raw imports |

**VERIFY:** The creation DDL, primary-key declarations, current grants, row counts, and existing non-repository indexes for the three base tables must be obtained from the live database. The repository proves their current generated shape and downstream use, but not their complete historical DDL.

### 3.2 Parking views and RPC

| Object | Confirmed behavior | Consumers | Classification / disposition |
|---|---|---|---|
| `public.parking_segment_summaries` | `security_invoker` view exposing segment identity, coordinates, zone, capacity, pricing fields, regulation fields, `estimated_available_capacity`, `estimated_availability_percent`, status, and `updated_at`. The SQL derives availability using `mod(hashtextextended(segment.id, 0) & 2147483647, angebot + 1)` when capacity is positive. | `fetchParkingSegmentSummaries` and `fetchParkingSegmentDetails` in `parkingMapData.ts`; normalizers; map/list/search/detail UI | Derived view containing synthetic availability. Retain as a compatibility view during rollout; replace its synthetic columns with published prediction fields only after a parallel contract exists |
| `public.parking_zone_summaries` | `security_invoker` aggregate over `parking_segments`/segment summaries. It calculates total/available capacity, percentage, pricing range/flags, status, representative point, segment count, and latest update | `fetchParkingZoneSummaries`, zone semantic stage, zone markers/polygons | Derived synthetic aggregate today. Retain and evolve behind a versioned view or add a prediction-aware view |
| `public.fetch_parking_cells` | SQL function accepting bbox and `p_resolution` (`coarse` 500 m or `fine` 250 m), generating PostGIS hexagons in EPSG:3857, assigning each segment to one cell, aggregating capacity/synthetic availability/pricing, returning center/bounds/parent zones/status/update and `limit 400`. | `fetchParkingCells` and cell semantic stage in `parkingMapData.ts` | Derived viewport response, not a stable prediction-cell store today. Keep as legacy compatibility RPC; add a new city-scoped stable-cell contract |

The generated database types also list PostGIS system functions and system views (`spatial_ref_sys`, `geometry_columns`, `geography_columns`). They are database infrastructure, not application parking objects.

### 3.3 Parking triggers, generated columns, indexes, and foreign keys

Confirmed in the checked SQL:

| Object | Behavior |
|---|---|
| Generated column `parking_segments.location` | `geometry(Point,4326)` generated from non-null `lon`/`lat`; null when coordinates are incomplete. Added in `20260713000100_parking_semantic_zoom_backend.sql`. |
| FK `parking_segments_parking_zone_id_fkey` | `parking_segments.parking_zone_id → parking_zones.id`, `ON UPDATE CASCADE`, `ON DELETE SET NULL`. |
| Function `public.assign_parking_segment_zone()` | `SECURITY DEFINER`; searches covering zones with `ST_Covers`, chooses smallest area and then lowest zone ID; returns null when coordinates are missing/no zone. Public execution is revoked. |
| Trigger `assign_parking_segment_zone_trigger` | Before insert/update of `lat` or `lon`, calls the assignment function. |
| Index `parking_segments_location_gix` | Partial GiST on `location` where non-null. |
| Index `parking_segments_parking_zone_id_idx` | B-tree on the zone FK. |
| Index `parking_zones_geom_gix` | Partial GiST on `parking_zones.geom` where non-null. |
| Import/preparation indexes | `parking_segments_prepare.sql` creates indexes on `strasse`, partial `lat,lon`, and `geoportal_class`; this is an operational preparation script, not a versioned migration. |
| One-time backfill | The semantic-zoom migration assigns existing segments to the smallest covering zone only when the assignment differs. |

The same migration installs/configures PostGIS in the `extensions` schema and uses a restricted search path in its security-sensitive function.

### 3.4 RLS and grants

Parking data has a public-read model today:

- `parking_segments`: RLS enabled, public read policy for `anon` and `authenticated`, no client writes found.
- `parking_zones`: RLS/read grant script permits public reads for `anon` and `authenticated`.
- The two summary views are `security_invoker`, so their reads inherit the underlying table policies.
- `fetch_parking_cells` is executable by `anon` and `authenticated`.
- No city predicate exists because no `city_id` exists on the current parking tables.

Account/security tables are separate:

- `profiles`: authenticated users read and update their own identity-safe fields; subscription status is server-authoritative; no anonymous read.
- `user_favorites`: authenticated users CRUD only their own rows; `segment_id` is text and intentionally has no FK.
- `user_preferences`: authenticated users CRUD only their own row.
- `consent_events`: authenticated users select/insert their own append-only events.
- `deletion_requests`: authenticated users select/insert their own request and can cancel pending requests; service-side processing handles deletion.

The account deletion Edge Function validates the caller with the bearer token and deletes the auth user through the service-role client. It does not own parking inventory or prediction writes.

### 3.5 Other database objects found

The auth migrations define `public.set_updated_at()`, `public.handle_new_user()`, profile/favorite/preferences/compliance triggers, and their RLS policies. The old `user_vehicles` table was created in an earlier migration and removed by `20260712000300_remove_user_vehicles.sql`; it is not present in the current generated database type. This is an example of why the generated type file and graph report must not be treated as the full migration history.

## 4. Current parking data-flow map

### 4.1 Runtime flow

```text
Supabase parking_segments / parking_zones
          │
          ├── parking_zone_summaries ──> zone stage ──> zone polygons + zone markers
          │
          ├── fetch_parking_cells(bbox, resolution)
          │       └──> coarse/fine cell stage ──> cell markers
          │
          └── parking_segment_summaries ──> segment/cluster stage
                  │
                  └──> normalize -> domain aggregate -> supercluster/feature adapters
                                      │
                                      ├── map markers and bottom sheets
                                      ├── list and nearest-search ranking
                                      ├── local favorites and cached snapshots
                                      └── /parking/[id] detail lookup
```

`useParkingMapData` selects the request based on semantic zoom. Zone summaries are used for city/zone stages, the cell RPC for cell stage, and segment summaries for segment/segment-cluster stages. Stage caches are approximately 10 minutes for zones, 60 seconds for cells, and 30 seconds for segments. Request keys are based on stage/tile/bounds but do not contain a city identifier.

### 4.2 Fallback paths

1. `fetchParkingSegmentDetails` reads `parking_segment_summaries`; on missing-view errors (`42P01`/`PGRST205`) it falls back to the direct `parking_segments` row.
2. `useParkingMapData` falls back from the segment summary view to direct segment reads and then applies a client-side zone matcher when the legacy row lacks a zone ID.
3. Direct segment reads page around the Supabase 1,000-row request limit and cap the returned data at 2,000 rows. Summary reads request 2,001 rows to detect truncation and expose a 2,000-row cap.
4. If an aggregate availability value is null, `parking-feature-adapters.ts` maps the legacy `availabilityPercent` to `0` and `availableSpots` to `0`, while preserving a status/color that may indicate unknown. This is a presentation compatibility behavior and can be misread as zero availability by consumers that only inspect the numeric fields.
5. Favorites first use local AsyncStorage. `FavoriteParkingContext` refreshes stored references by fetching segment details, then preserves the cached snapshot if the network path cannot materialize a current item. Cloud sync is scaffolded but `sync-manager.ts` still returns an empty remote placeholder; Phase 4B network I/O is not implemented.
6. Search is client-side over loaded legacy responses. It ranks distance, then availability, then price and groups nearby same-zone items. There is no server-side destination/search parking RPC.
7. The detail route `/parking/[id].tsx` uses the summary/detail service and legacy fallback. It displays regulation, district, capacity, coordinates, and a map marker; current availability is not a separate authoritative detail response.

### 4.3 Exact synthetic availability entry points

There are two matching implementations:

- SQL in `20260713000100_parking_semantic_zoom_backend.sql`: `hashtextextended(segment.id, 0)` modulo `angebot + 1`.
- TypeScript in `src/utils/parking-segments.ts`: FNV-1a-like `hashString(id)` modulo `capacity + 1` in `availabilityFor`.

The SQL and client fallback are both labeled `estimated`, not `live`; tests explicitly protect that status. They are deterministic for a given ID/capacity, not time-varying, observation-backed, or model-generated. The exact hash implementation is not a safe future model interface: it should be retained only behind a temporary compatibility flag and removed after stored predictions are live.

## 5. Munich-specific assumptions

| Location | Confirmed assumption | Classification |
|---|---|---|
| `app.config.ts`, `src/constants/app.ts`, onboarding/consent/billing copy | Product/app name is Munich Parking; copy refers to Munich and a Munich pilot; native permission text uses the Munich name | **Must become city/product configuration** |
| `src/hooks/use-map-location.ts` and map component | Default center `48.1351, 11.582`, overview camera around Munich, `munichOverview` mode, Munich accessibility labels | **Must become city configuration/default selection**. Keep Munich as the initial default. |
| `src/services/parkingSegments.ts` | Diagnostic bbox `11.35–11.75 / 48.00–48.25` is Munich-only | **Can remain a Munich test/import diagnostic**, but should not gate production queries. |
| `src/services/googlePlaces.ts` | Default Places bias is Munich; language is `de`; region is `DE`; radius 50 km | **Must become city configuration** for bias/locale/region, with user-search behavior explicitly decided. |
| `src/utils/parking-segments.ts`, `parking-domain.ts`, UI formatters | Pricing currency is hardcoded to EUR; rates are inferred from German rule group/text names | Currency and localization **must become city configuration**; current German rule mapping **can remain a Munich importer detail** until regulations are normalized. |
| `supabase/parking_segments_prepare.sql` | Source data is Munich Open Data and source geometry is handled as ETRS89 UTM32 / EPSG:25832 before WGS84 coordinates are written | **Can remain a Munich-specific importer detail**; future providers need explicit source CRS metadata. |
| `src/hooks/use-parking-zones.ts`, diagnostics | Logging and diagnostic copy says Munich parking zones | **Removable/replaceable copy**, not a data-model dependency. |
| Tests under `tests/` | Most fixtures use Munich coordinates and names such as Altstadt | **Can remain Munich fixtures**, but add city-parametrized fixtures before enabling more cities. |
| Google Places `de`/`DE` defaults | Assumes German language/region | **Default can remain for Munich**, but should be overridden per city/user locale. |
| Holiday/timezone logic | No public-holiday or timezone feature extraction was found; the weekday chart is static UI data | No current assumption in the data pipeline. **Prediction design must explicitly add city timezone/holiday inputs later.** |
| `src/constants/zones.ts` and design mock source | Four static Munich zones and percentages/prices exist in mock/design data | **Obsolete for runtime data**; retain only as design fixture until removed from the design artifact. |

No Vienna or Zurich configuration, provider, timezone, currency, boundary, or source import was found.

## 6. Synthetic and hardcoded data inventory

### Synthetic/derived values that currently reach the UI

- Segment availability: deterministic hash/modulo estimate in SQL and TypeScript.
- Zone and cell availability: capacity-weighted aggregation of the same synthetic segment values.
- Pricing: inferred from German rule groups (`Kurzzeitparken`, `Mischparken`, `Altstadt`) and free-text regexes; it is not a provider price table.
- Map legacy adapter: null percentage/capacity becomes numeric zero in `ParkingClusterResponse` compatibility fields.
- Freshness/fallback language: `fresh-check.tsx` has a timer and navigation behavior but no backend freshness report.

### Hardcoded/detail mock values

`ParkingBottomSheet` currently contains static historical weekday usage values, EV connector counts/type/power, security/vehicle restrictions/payment methods, “Spot Chance 92%”, public/paved labels, “Just now” freshness, 2-hour/24-hour defaults, a walking-distance default, and a daily-price multiplier (`hourly × 7.2`). `ParkingAvailabilityBubbleDemo.tsx` contains fixed demo percentages. These are not database fields and must not be used as training labels or prediction features.

`src/constants/zones.ts` and `Munich-Parking-App-Design/source/App.jsx` contain static zone/mock data. The current runtime map path uses the Supabase semantic-zoom services instead, but the design artifact can create confusion during migration.

## 7. Multi-city canonical data model recommendation

The following is a target model, not an implementation. Required-now means it should exist before the client consumes backend predictions; later means it should not block the first safe migration.

| Proposed table | Required | Key strategy / city ownership | Relationships and retention |
|---|---|---|---|
| `cities` | Now | Stable text slug (`munich`, `vienna`, `zurich`) as public identifier; internal UUID is optional, not necessary if slug uniqueness is enforced | One row per supported city. Stores display name, country, timezone, currency, locale, default center/bounds, active flag, default cell resolutions. Long-lived configuration. |
| `city_configs` or configuration columns on `cities` | Now | One-to-one with `cities`; version config changes if auditability matters | Places bias, source/provider settings, public-holiday source, default map camera, regulation normalization, prediction freshness policy. Long-lived; keep secrets out of this table. |
| `parking_provider_sources` | Before second city | UUID or identity PK; unique `(provider, provider_city_key)` | Defines source/provider, city, CRS, refresh schedule, licensing, and importer version. Long-lived lineage. |
| `parking_provider_records` / raw import tables | Before second city; can start as provider-specific raw tables | UUID import batch + provider record key; unique by source/batch/record according to provider semantics | Immutable raw payload/geometry, import batch, observed source time, parse status. Retain raw payload according to licensing/storage policy; never make the mobile client read it. |
| Existing `parking_zones` extended as canonical zones | Now | Preserve existing bigint IDs. Add `city_id`, source, provider record key, stable source key, active/version fields | `cities 1→many zones`; segments reference zones. Keep existing Munich IDs and geometry. Long-lived canonical inventory. |
| Existing `parking_segments` extended as canonical segments | Now | Preserve existing text IDs. Add `city_id`, provider source/record identity, canonical status, source validity/version | `cities 1→many segments`; optional zone FK; later facility relation. Long-lived current inventory, with history handled by validity/version fields or an inventory history table. |
| `parking_facilities` | Later, or before garages | UUID PK; city-owned; unique provider identity | Garages/lot facilities can contain many bays/segments and facility metadata. Do not force current street segments into this table until the product has a facility contract. |
| `parking_regulations` | Later | UUID or versioned identity; city-owned; source-linked | Normalized time windows, max stay, permit/payment rules and language variants. Current German fields remain compatibility data until this is ready. Long-lived/versioned. |
| `prediction_cells` | Now, before stored predictions | Deterministic city/resolution/grid-coordinate key, or UUID plus immutable `cell_key`; geometry stored once | `cities 1→many cells`; every prediction references one cell. Long-lived spatial registry. |
| `prediction_runs` | Now, before hourly generation | UUID PK; city, model version, input cutoff, generated/published times, status | One run per city/model/window. Retain operational history for audit and rollback; retention decision required. |
| `predictions` | Now, before client switch | UUID/identity PK or composite `(run_id, cell_id, forecast_time)`; unique that tuple | Stores conservative percentage/range, available capacity/range, confidence/calibration, status, generated time, valid-for time. Append runs; do not overwrite published history. |
| `contextual_features` | Later, before serious model training | UUID/run-scoped or time-series key `(city_id, feature_time, feature_name)` | Weather/events/holidays/traffic/regulation context, source and quality. Retention and licensing-sensitive. |
| `user_observations` | Later, but needed for feedback loop | UUID PK; nullable user ID for anonymous design, city/segment/cell, observed time | User-reported availability or corrections, validation/moderation status, provenance. User-owned writes or controlled RPC; retention and abuse limits required. |
| `journey_events` | Later | UUID event PK; pseudonymous session/user ID | Search/open/navigate/arrival/feedback events, consent-gated. Strict privacy/retention policy; not required to replace mock data. |
| `model_training_data` | Later | Prefer a versioned materialized view/export rather than a client-facing table; run/dataset UUID | Derived labels/features with lineage to observations/predictions. Retain according to model governance; never expose raw training data through public RLS. |

### Recommended prediction contract

The app should eventually receive a stored prediction with explicit semantics, not an overloaded `estimated` number:

```text
city_id
cell_id
prediction_run_id
valid_for_start / valid_for_end
available_percent_lower / available_percent_estimate / available_percent_upper
available_capacity_lower / estimate / upper
status: predicted | stale | unknown
confidence or calibration_band
generated_at
source_quality / feature_cutoff (optional public metadata)
```

Segment and zone UI summaries should either reference the relevant prediction cells or be materialized from them in the backend. The mobile app should never reconstruct a prediction from a segment-ID hash.

## 8. Identifier strategy

### Current identifiers

- `parking_segments.id` is a text ID and is used by routes, map features, direct detail lookup, client caches, local favorites, remote favorite `segment_id`, and snapshots.
- `parking_zones.id` is a bigint and is converted to string in domain types and cell parent-zone arrays.
- Current cell IDs are text in the form `resolution:i:j`.
- `user_favorites.segment_id` has no FK by design; it is an externally referenced identifier even though it is internal to this product.

### Recommended rules

1. Preserve existing Munich segment IDs exactly. Do not prefix them with a city slug in the first migration. Add `city_id` beside the existing ID and use `(city_id, segment_id)` at query/uniqueness boundaries if cross-city collisions are possible.
2. Preserve existing Munich zone bigint IDs. Add `city_id` and provider identity. New zones may continue using bigint IDs if the existing database sequence is authoritative; do not change the existing PK type in place.
3. Use stable lowercase city slugs for public routing/configuration. The exact allowed slug set and whether city slugs are globally immutable are open decisions.
4. Give new prediction runs, observations, provider batches, and facilities UUID primary keys. They are event/version objects and should not be based on viewport coordinates.
5. Give a prediction cell an immutable, city-scoped `cell_key`, such as `munich:500m:<grid_i>:<grid_j>`, backed by stored geometry and a unique constraint on `(city_id, resolution, grid_i, grid_j)`. The exact encoding is a decision, but it must not depend on the requested bbox.
6. Add `city_id` to `user_favorites` before a second city is exposed. Backfill existing rows to Munich using the current segment ID. Keep `segment_id` and cached snapshots during the compatibility period. If `entity_type = facility` is activated later, add a typed reference rather than overloading `segment_id`.
7. Keep old route/deep-link IDs working. If a future global ID is needed, create an alias table (`legacy_id`, `city_id`, `canonical_id`) and dual-read it; do not silently regenerate IDs.

**VERIFY:** Before adding uniqueness constraints, check whether existing `parking_segments.id` is globally unique and whether any favorite/snapshot IDs are not present in the current segment table.

## 9. Spatial and prediction-cell strategy

### Current PostGIS facts

- Segment point is a generated `geometry(Point,4326)` from WGS84 longitude/latitude.
- Zone geometry is stored in `parking_zones.geom`; the repository verifies geometry SRID/extent diagnostically but does not show the original creation DDL.
- Partial GiST indexes exist on segment points and zone geometry; a B-tree exists on `parking_zone_id`; import scripts add coordinate/source indexes.
- Segment-to-zone assignment uses `ST_Covers`, not a strict interior-only predicate, and chooses the smallest covering zone with a stable ID tie-break.
- `fetch_parking_cells` transforms request geometry to EPSG:3857 and uses 500 m/250 m hexagon sizes. It assigns each segment once using a row number over grid indices and aggregates the synthetic values.
- The RPC returns at most 400 rows. Current app request bounds are viewport/tile-derived and can differ between calls.

### Cell stability risk

The current RPC’s `resolution:i:j` values are not guaranteed to identify a physical cell globally because the generated grid is based on the request bounding box. A changed bbox can shift the grid origin and therefore change `i,j`, even when the map location is unchanged. The normalizer test proves that the client preserves an ID returned by the server; it does not prove that the database returns the same ID across requests or hourly runs.

### Recommendation

Use PostGIS for a stable, stored city grid in the first prediction implementation:

1. Store one immutable grid definition per city and resolution, including a fixed origin, cell size, CRS, and valid city envelope.
2. Generate and persist `prediction_cells` once using that definition. Store the WGS84 display geometry and a projected geometry/index for assignment/query performance.
3. Assign each canonical segment to exactly one cell using a documented point/boundary rule. Preserve unassigned records for data-quality monitoring.
4. Use a deterministic coordinate key derived from fixed grid indices and city/resolution, not from request bounds.
5. Make the viewport RPC filter the stored cell table by bbox. It may return the same current response shape during compatibility, but its IDs must come from the stored registry.
6. Add a stable-cell validation query that requests overlapping/different bboxes and asserts identical `(city_id, cell_key)` coverage for the overlap.

An H3/S2-style global index could be evaluated later, but it is not required for the first safe migration. `supercluster` is a client marker clustering dependency, not a prediction grid. No new dependency should be added now.

## 10. RLS and security implications

The current `USING (true)` policies are appropriate only while the database contains one public Munich dataset. Once multiple cities share tables, every public view/RPC must be city-aware, even if all currently supported cities are public.

Recommended policy boundary:

- Public/anonymous/authenticated `SELECT` may read active canonical inventory, public zones, stable cells, and published predictions for enabled cities.
- Raw provider imports, import batches, model features, prediction-run internals, and unpublished predictions must be service-role/backend-only.
- Prediction publication should be atomic: one completed run is marked published only after coverage, freshness, and value-range checks pass.
- User favorites/preferences remain identity-owned. Add city to favorites, but do not make public inventory rows user-owned.
- User observations need a deliberate anonymous policy. If anonymous reports are supported, use a controlled insert RPC/rate limit/moderation path rather than broad table insert. If not, require authentication.
- Do not expose model inputs, private provider payloads, or raw user journey events through the mobile anon key.
- `security_invoker` compatibility views should keep underlying RLS behavior explicit. Test both anon and authenticated reads after every policy change.
- All new RPCs must require a city parameter or derive it from an explicit scoped cell/segment key; never return all cities by accident.

## 11. Database migration risks

| Risk | Why it matters | Mitigation |
|---|---|---|
| Adding non-null `city_id` | Existing rows have no value; a failed/partial backfill can block writes or create null leakage | Add nullable, backfill Munich in batches, validate zero nulls, then add FK/check/not-null only after dual-write is ready. |
| Segment ID preservation | Routes, local storage, snapshots, and `user_favorites.segment_id` depend on text IDs | Preserve IDs; add aliasing only if a new canonical key is unavoidable. |
| Favorites | No FK means database cannot tell whether an ID is still valid; snapshots may contain synthetic values | Snapshot all favorite rows, backfill city from segment ID, verify orphan counts, keep fallback resolution and snapshots. |
| Zone relationships | Adding city to zones can expose duplicate IDs or ambiguous assignments; changing zone geometry can change assignments | Validate uniqueness, record pre/post mapping, compare `ST_Covers` assignments, and retain null/unassigned reporting. |
| Geometry | Reprojection or malformed imports can invalidate polygons/points | Validate SRID, `ST_IsValid`, non-empty geometry, coordinate ranges, and GiST index health before switch. |
| Generated views | Changing view columns or aliases can break PostgREST clients and generated types | Add versioned views/RPCs first; keep old columns/types until client rollout completes. |
| RPC return type | Postgres functions with fixed return types are hard to alter safely; PostgREST schema cache may lag | Add `fetch_parking_cells_v2` first, regenerate types, deploy client after schema cache verification. |
| Generated TypeScript types | The generated file has no migration provenance and type changes affect all services | Regenerate after additive DDL; review diff manually; do not hand-edit generated types as the migration mechanism. |
| RLS | Public policies currently expose all parking rows; new city tables could unintentionally expose raw/unpublished data | Separate public published views from service tables and run anon/auth integration tests. |
| Row limits | Legacy direct reads cap at 2,000 and cell RPC at 400 | Keep server aggregation; measure per-city coverage and define explicit truncation/continuation behavior. |
| Partial deployment | New backend jobs, views, and mobile clients may be deployed in different orders | Expand schema and compatibility contracts first; dual-read/feature-flag; switch only after both contracts are live. |
| Rollback | Dropping/rekeying columns early is irreversible for favorites and snapshots | No destructive cleanup until a measured rollback window and backups/exports exist. |
| Source licensing/retention | Raw provider payloads may have different storage rights per city | Record provider/source/license metadata and decide retention before raw tables are populated. |

## 12. Exact phased migration sequence

This sequence is intentionally additive. Each phase must be independently deployable and observable.

### Phase 0 — Freeze the current contract and measure it

**Objects:** no production schema change. Add migration validation scripts/tests in a separate implementation task.

**Backfill:** none. Export or snapshot row counts, segment IDs, zone IDs, segment→zone mappings, valid geometries, and all favorite references/snapshots.

**Validation:** counts by table; duplicate/null IDs; null/invalid coordinates; `ST_IsValid`; current zone assignment; orphan favorite IDs; current view/RPC response samples; anon/auth read checks; repeated cell RPC response comparison to document current instability.

**Client impact:** none.

**Rollback:** none required; retain the baseline snapshot.

**Dependencies/types:** none; generated types not required.

### Phase 1 — Add city configuration and scope current Munich data

**Objects added/changed:** add `cities` (and preferably versioned `city_configs` or configuration columns). Add nullable `city_id` to existing `parking_zones` and `parking_segments`; add indexes. Do not change existing views, RPCs, or RLS policies yet.

**Backfill:** insert the Munich city configuration; set all current zones and segments to Munich. Verify whether raw zones also need city ownership.

**Validation query set:** zero null `city_id`; every segment/zone references an active city; row counts unchanged; IDs unchanged; favorite references resolve to Munich or are explicitly orphaned; zone assignment mapping unchanged; geometries valid and SRIDs unchanged.

**Client impact:** none. Existing queries continue to work.

**Rollback:** remove only the new city metadata/columns if no later object depends on them. If later objects exist, disable them and retain the additive columns.

**Dependencies/types:** production DDL must precede regenerated `src/types/database.ts`; client does not need to consume the new fields yet.

### Phase 2 — Add provider lineage and canonical inventory boundaries

**Objects added/changed:** add provider/source/import-batch tables. Add nullable provider source/record keys, source CRS, canonical status, and validity/version metadata to zones/segments. Add uniqueness constraints only after duplicate analysis.

**Backfill:** create one Munich provider source and one lineage record per existing imported row using the current `FID`/source identifiers where reliable. Preserve the existing canonical IDs.

**Validation:** source-key uniqueness within a provider/city; every active canonical row has lineage; row/geometry/ID counts match baseline; import re-run is idempotent; segment→zone mappings remain stable.

**Client impact:** none. Importer/backend only.

**Rollback:** stop dual-write/import, mark new lineage rows inactive, and leave legacy columns/queries intact.

**Dependencies/types:** regenerate types for server tooling; no mobile type switch required.

### Phase 3 — Create a stable city-scoped prediction grid

**Objects added:** `prediction_cells` and a new RPC/view such as `fetch_prediction_cells_v2`. Keep `fetch_parking_cells` unchanged. Add fixed-origin/resolution metadata and spatial indexes.

**Backfill:** generate stable 250 m/500 m cells for Munich; assign current segments deterministically; record unassigned/ambiguous counts.

**Validation:** repeated and overlapping bbox requests return identical cell IDs; each active segment maps to at most one cell per resolution; cell geometries are valid/non-overlapping within expected tolerance; counts and capacity reconcile with canonical inventory; row limits are explicit.

**Client impact:** none initially. Use a server-side comparison job or diagnostic to compare old/new cell coverage.

**Rollback:** stop using the new RPC and drop only unreferenced cell tables after investigation. Do not delete legacy RPC or synthetic summaries.

**Dependencies/types:** regenerate database types when the new RPC/table is created. No package dependency.

### Phase 4 — Add prediction runs and published prediction storage

**Objects added:** `prediction_runs`, `predictions`, and optionally a public published-predictions view. Add model version, input cutoff, generated/published times, valid window, conservative bounds, status, and quality metadata.

**Backfill:** do not backfill synthetic values as real predictions. If a compatibility view needs values, label them explicitly as legacy estimated data and keep their provenance.

**Validation:** unique run/cell/forecast keys; values in range; lower ≤ estimate ≤ upper; no prediction without a valid cell/run; atomic publication; stale/coverage checks; one published run per city/time policy.

**Client impact:** none until a read contract is verified.

**Rollback:** leave prediction rows but unpublish/disable the new view; current summaries/RPC continue serving labeled synthetic estimates.

**Dependencies/types:** regenerate types and review the diff; backend scheduler/model runner is still a separate implementation decision.

### Phase 5 — Add contextual features and observation capture

**Objects added:** contextual feature storage, user observations, and consent/rate-limit/moderation fields as product requirements dictate. Do not make these prerequisites for the initial client switch unless the model needs them.

**Backfill:** only sources with trustworthy historical timestamps and licensing may be backfilled. Never infer observations from the current hash.

**Validation:** timezone-normalized timestamps, city ownership, privacy policy, RLS anon/auth behavior, abuse controls, and lineage from feature/observation to prediction run.

**Client impact:** optional feedback/report UI later; current favorites and account flows remain unchanged.

**Rollback:** disable writes/feature flags while retaining audit data according to policy.

**Dependencies/types:** database types required for any client-accessed observation contract; no dependency required for storage.

### Phase 6 — Generate and publish hourly conservative predictions

**Objects changed:** backend job/importer/model publisher writes runs and predictions; public view/RPC exposes only the selected published run. Existing summary views may gain a prediction-aware parallel version.

**Backfill:** generate forward-looking runs only. Historical replay is a separate model-validation project, not a production backfill.

**Validation:** per-city job success, freshness SLA, coverage percentage, bounds/range checks, fallback coverage, run atomicity, and comparison against a simple baseline model. Confirm the backend never labels a synthetic value as predicted.

**Client impact:** still behind a remote feature flag; existing app can keep legacy estimates.

**Rollback:** unpublish the latest run and return the public view to the prior published run/legacy compatibility path.

**Dependencies/types:** scheduler/model runtime belongs to backend infrastructure; regenerate types after final public contract is stable.

### Phase 7 — Switch the client to published predictions

**Files likely affected:** `src/types/parking-domain.ts`, `parking-map.ts`, `database.ts`, `parkingMapData.ts`, `use-parking-map-data.ts`, normalizers/adapters, `parkingSearch.ts`, map marker/list/bottom-sheet components, detail route, cache/request-key utilities, and city/location configuration.

**Change:** include `city_id` in service arguments, cache keys, feature identity, favorite references, and all summary/cell responses. Prefer the new prediction-aware RPC/view. Preserve old segment route IDs and local snapshots. Keep a temporary legacy fallback with an explicit `legacy-estimated` status, never silently convert it to `predicted`.

**Validation:** client contract fixtures for every semantic stage; unknown/stale/predicted states; zero/null distinction; multi-city isolation; search/list/detail/favorite round trips; offline/stale cache behavior.

**Rollback:** remote feature flag returns reads to the existing summary/RPC path; old columns and RPC remain available.

**Dependencies/types:** regenerate types before changing service selects; no new package.

### Phase 8 — Enable additional cities

**Objects:** add Vienna/Zurich configuration, provider sources, boundaries, stable cells, import jobs, and prediction coverage. No code path should assume Munich once city selection is enabled.

**Backfill:** import each city into city-scoped canonical rows; do not copy Munich synthetic values into other cities.

**Validation:** city isolation queries, provider lineage, timezone/currency/locale, geometry/zone assignment, cell stability, prediction freshness, and cross-city favorite behavior.

**Client impact:** add city selection/deep-link/default behavior; retain Munich as the default only if that is a deliberate product decision.

**Rollback:** deactivate the new city in configuration and stop its importer/publisher; Munich continues independently.

**Dependencies/types:** regenerate types only for schema changes; no mobile dependency required.

### Phase 9 — Cleanup after the rollback window

Remove the deterministic hash, obsolete synthetic columns, legacy RPC/view fallback, Munich-only default branches, mock UI values, and temporary compatibility fields only after all of the following are true: predictions have met freshness/coverage thresholds, client adoption is complete, favorite/reference audits are clean, rollback has been rehearsed, and historical snapshots/backups exist.

Destructive drops must be separate migrations with a documented restore path. Never combine cleanup with the first city or prediction release.

## 13. Test coverage audit and required additions

### Existing protection

The current tests protect:

- semantic zoom stages, hysteresis, cache behavior, map bounds, marker density and clustering;
- deterministic estimated availability, capacity weighting, unknown versus zero capacity, pricing parsing, zone matching, and geometry normalization;
- client pagination/row caps and service-row validation;
- search distance/availability/price ranking;
- detail entitlement gating;
- local favorite storage, legacy snapshot migration, merge behavior, and conflict handling;
- account, RLS-adjacent client assumptions, preferences, and sync decision logic.

Tests use mostly Munich coordinates and synthetic rows. `parking-map-data.test.ts` checks that a returned cell ID is retained, but does not verify database ID stability.

### Missing tests required before migration

**Database migration/SQL integration:**

- row count preservation for every existing parking table;
- exact segment-ID set preservation;
- exact zone-ID set preservation;
- favorite `segment_id` and snapshot preservation;
- segment→zone assignment before/after backfill;
- generated point geometry validity, SRID, and coordinate equality;
- zone geometry validity and index-backed bbox behavior;
- null/zero/negative capacity handling;
- view and RPC response contract compatibility;
- generated TypeScript type diff review in CI.

**Security:**

- anonymous read access to only published public inventory/predictions;
- authenticated read parity;
- anonymous denial of raw imports/model internals;
- user isolation for favorites/preferences/observations;
- cross-city filtering and no accidental all-city RPC results;
- service-role-only prediction publication.

**Multi-city/configuration:**

- Munich/Vienna/Zurich configuration fixtures;
- city timezone and daylight-saving boundaries;
- per-city currency/locale/Places bias;
- inactive city behavior;
- provider source CRS conversion and importer idempotency.

**Stable cells/predictions:**

- same cell IDs across repeated hourly runs;
- same IDs for overlapping requests with different bbox origins;
- 250 m versus 500 m parent/child relationship;
- one segment assigned once per city/resolution;
- prediction run atomic publication and rollback to the prior run;
- stale, unknown, conservative bounds, and partial coverage behavior.

**Legacy compatibility:**

- old route `/parking/[id]` still resolves after city columns are added;
- old favorite snapshots still render and refresh;
- direct legacy service fallback remains labeled legacy-estimated;
- no null availability is silently rendered as a trustworthy zero;
- remote feature-flag rollback restores old map/list/search behavior.

## 14. Expected affected files per phase

| Phase | Expected repository areas |
|---|---|
| 0 | New SQL validation/CI fixtures; `tests/` additions only. |
| 1–2 | New Supabase migrations; generated `src/types/database.ts`; later, importer/server tooling if added. Existing `parkingSegments.ts`/`parkingZones.ts` should remain compatible. |
| 3–4 | New migrations/functions and generated types; `src/services/parkingMapData.ts` only when the new RPC is selected. |
| 5–6 | Supabase functions/backend job code, prediction contracts, error mapping, operational configuration; no required map UI change yet. |
| 7 | `src/types/parking-domain.ts`, `parking-map.ts`, `parking-segment.ts`, database types, `src/services/parkingMapData.ts`, `parkingSegments.ts`, `parkingZones.ts`, `use-parking-map-data.ts`, normalizers, adapters, clustering/search, map marker/list/bottom-sheet components, `/src/app/parking/[id].tsx`, favorites/storage/context, request/cache utilities, and tests. |
| 8 | `app.config.ts`, app/city configuration, location defaults, Places configuration, onboarding/consent/product copy, city-selection route/state, provider/import configuration, and multi-city tests. |
| 9 | Only after rollout: synthetic helper/hash, mock constants/design artifacts, legacy fallback branches, compatibility views/RPCs and unused fields. |

`src/services/sync/*` is not an inventory synchronization implementation yet. When Phase 4B is later implemented, it must add city-aware favorite references without letting cloud sync rewrite a canonical parking ID or overwrite a current prediction with a cached synthetic snapshot.

## 15. Rollback strategy

Use three independent rollback controls:

1. **Database compatibility:** old columns, views, RPC, IDs, and RLS read paths remain available through Phases 1–8. New tables are additive and can be disabled without deleting current data.
2. **Backend publication:** predictions are append-only by run. A publisher marks one run active per city; rollback unpublishes the new run and selects the previous run or legacy view. Never update prediction rows in place to simulate rollback.
3. **Client feature flag:** the app chooses legacy versus prediction-aware reads. The flag must be part of request/cache keys and must preserve old route/favorite IDs.

Before cleanup, rehearse:

- disabling a city;
- selecting the previous prediction run;
- restoring the old RPC/view response;
- opening a pre-migration favorite and detail deep link;
- handling a stale prediction response while the backend is unavailable.

Backups/exports must cover canonical rows, mapping tables, favorites, snapshots, published-run metadata, and provider lineage. The report does not assume Supabase point-in-time recovery settings; **VERIFY** the project’s actual backup/restore capability.

## 16. Dependency guidance

No dependency should be added for this audit or for the first schema phases.

- `supercluster` already solves client marker clustering; it should not be reused as a prediction grid.
- `react-native-svg` is already present for the current availability ring; a simple prediction visualization does not require a chart package initially.
- Supabase JS and PostGIS already cover typed reads, RLS, spatial queries, and RPC access.
- `tsx` and TypeScript already cover the current unit-test/data-contract workflow.
- A global cell library such as H3 could be evaluated later if fixed-origin PostGIS cells become insufficient. It would need a server/mobile compatibility decision and should be owned by the stable-grid phase, not installed speculatively.
- A machine-learning runtime should be owned by backend infrastructure/model training. It should not be bundled into Expo unless a later product decision explicitly requires on-device inference. No current package confirms such support.
- A scheduler/queue is not present in `package.json` or `supabase/functions`; the hourly job needs a deployment/platform decision rather than an assumed npm dependency.

## 17. Open architectural decisions

1. Is a city a user-selected product scope, an automatically inferred location scope, or both?
2. Are current street segments the canonical inventory, or should a provider-normalized inventory/alias layer become canonical?
3. Are `parking_zones` administrative policy zones, operational source zones, or both? Can one segment belong to multiple policy zones?
4. Should facilities/garages be introduced before or after street-segment predictions?
5. Which prediction target is required: segment, stable cell, zone, or cell first with derived segment/zone summaries?
6. What does “conservative” mean operationally: lower-bound availability, calibrated interval, capped optimism, or a product threshold?
7. What forecast horizon does an hourly run publish, and how are valid windows represented?
8. Which timezone and public-holiday source is authoritative per city?
9. What are the accepted provider sources, refresh schedules, licensing/retention rules, and source CRS contracts for Munich, Vienna, and Zurich?
10. Are anonymous observations allowed? If yes, what rate limit, abuse review, and privacy model applies?
11. Should user favorites acquire a mandatory `city_id` now, or should an alias table resolve legacy IDs indefinitely?
12. How long are prediction runs, contextual features, observations, journey events, and raw provider payloads retained?
13. What publishes a run and what is the freshness/coverage SLA for marking a city degraded?
14. Should the current 250 m/500 m grid remain, and what is the exact fixed-origin/grid indexing convention?
15. What API shape should the client consume: versioned view, RPC, or a backend HTTP/Edge Function endpoint?
16. Which current bottom-sheet fields are real product requirements versus prototype-only mock content?
17. Is `APP_NAME = Munich Parking` an app-store/product identity that remains, or should city branding be runtime-configurable?

## 18. Final audit summary

### Files inspected

The audit inspected the project/package configuration, Supabase client, generated database types, parking domain/map/segment types, parking services, map-data hook, parking utilities and adapters, map components and detail route, favorites context/storage, synchronization services, error utilities, environment patterns, all parking-related tests, related favorite/sync tests, account deletion code, diagnostics, and the graphify reports listed in Section 2.

### Migrations/scripts inspected

- `supabase/migrations/20260703000100_auth_foundation_profiles.sql`
- `supabase/migrations/20260703000200_auth_foundation_user_data.sql`
- `supabase/migrations/20260703000300_auth_foundation_compliance.sql`
- `supabase/migrations/20260712000100_harden_auth_profile_trigger.sql`
- `supabase/migrations/20260712000200_parking_segments_public_read_authenticated.sql`
- `supabase/migrations/20260712000300_remove_user_vehicles.sql`
- `supabase/migrations/20260713000100_parking_semantic_zoom_backend.sql`
- `supabase/parking_segments_prepare.sql`
- `supabase/parking_zones_read_policy.sql`
- `supabase/diagnostics/parking_segments_public_read_verification.sql`
- `supabase/diagnostics/auth_signup_diagnostics.sql`
- `supabase/functions/delete-account/index.ts`

### Current parking objects found

The repository exposes **3 parking tables** (`parking_segments`, `parking_zones`, `parking_zone_raw`), **2 application summary views** (`parking_segment_summaries`, `parking_zone_summaries`), **1 application RPC** (`fetch_parking_cells`), **1 parking assignment function** (`assign_parking_segment_zone`), **1 assignment trigger**, **1 generated segment point column**, **1 parking segment→zone FK**, and the confirmed parking spatial/relationship indexes listed in Section 3.3. It also contains the two public parking RLS policies, one on segments and one on zones. The live schema may contain additional pre-existing objects not represented in repository migrations; that is a required verification step.

### Unresolved questions

The highest-risk unresolved facts are the live base-table DDL/index/grant state, exact row counts and ID uniqueness, favorite orphan count, source/provider identity quality, zone geometry SRIDs/validity, whether current IDs are globally unique, the actual production Supabase backup/restore capability, and the desired prediction/city/observation semantics in Section 17.

### Recommended first implementation phase

Start with **Phase 0: freeze and measure the current contract**, followed by **Phase 1: additive city configuration and Munich backfill**. Phase 1 should be the first production schema implementation only after a live Supabase introspection confirms the assumptions above. It should not change the current views, cell RPC, client services, synthetic availability behavior, favorite IDs, or map behavior.

