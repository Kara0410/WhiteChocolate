# Parking Data and Prediction Readiness Audit

**Audit date:** 2026-07-16  
**Scope:** Expo app source, mock/demo data, Supabase migrations/types, parking API clients, and the current map/detail data flow.

## Executive summary

The project is already wired to Supabase for real parking inventory and geometry, but it is not yet wired to a real occupancy or prediction model.

The current availability percentages are synthetic estimates:

- The primary Supabase view derives available spaces from a deterministic hash of `parking_segments.id` and `angebot` (capacity).
- The legacy client fallback uses the same idea in `src/utils/parking-segments.ts`.
- The percentage is therefore stable for a segment, but it does not change with time, traffic, reports, weather, events, or observed occupancy.

The premium detail chart and several premium detail fields are still hardcoded UI demo values. They are not backed by Supabase or an API.

The repository has enough static data to build a sensible first baseline and to define the model input contract. It does **not** currently have enough labelled historical data to train or validate a trustworthy parking prediction model.

## Current data flow

```text
Google Places API
  └─ destination/address → coordinates only

Supabase parking_zones
  └─ zone geometry and metadata → map polygons

Supabase parking_segments
  ├─ legacy detailed query → client parser → deterministic synthetic availability
  └─ spatial backend/view path
       └─ parking_segment_summaries → normalized segment data

Supabase parking_zone_summaries
  └─ complete-zone aggregates → city/zone map markers

Supabase fetch_parking_cells RPC
  └─ PostGIS hex-cell aggregates → intermediate semantic zoom markers

normalized features
  └─ clustering/adapters → ParkingClusterResponse
       ├─ map bubbles and percentages
       ├─ list/search/favorites
       └─ ParkingBottomSheet detail header

parking segment details
  └─ /parking/[id] route → regulation, capacity, price, coordinates
```

Relevant entry points: [`parkingMapData.ts`](../src/services/parkingMapData.ts), [`parkingSegments.ts`](../src/services/parkingSegments.ts), [`parkingZones.ts`](../src/services/parkingZones.ts), [`use-parking-map-data.ts`](../src/hooks/use-parking-map-data.ts), and [`parking-feature-adapters.ts`](../src/utils/parking-feature-adapters.ts).

## Supabase inventory and connectivity

### Parking tables and views

| Object | Data available | Connected to app? | Prediction value |
|---|---|---:|---|
| `public.parking_segments` | Segment ID, street, source area, capacity (`angebot`), parking rules, coordinates, Geoportal class, timestamps, assigned zone ID | Yes, direct legacy fallback and detail route | Strong static features; no occupancy history |
| `public.parking_zones` | Zone ID, name, status, measure/action, GeoJSON and PostGIS geometry | Yes, direct zone polygon fetch | Useful spatial context and aggregation boundary |
| `public.parking_zone_raw` | Raw zone import fields | No app query found | Possible import provenance; not a model source until verified |
| `public.parking_segment_summaries` view | Segment fields plus derived availability, pricing status/rate, regulation fields, zone ID, timestamp | Yes, primary map/detail path | Useful API contract, but current availability is synthetic |
| `public.parking_zone_summaries` view | Segment count, total capacity, available capacity, availability %, price range, free/unknown flags, status, latest timestamp | Yes, city/zone map path | Useful aggregate features; availability inherits synthetic segment values |
| `public.fetch_parking_cells(...)` RPC | PostGIS hex cells with bounds, parent zones, aggregate capacity/availability/pricing | Yes, cell semantic zoom | Useful spatial aggregate response; not a historical prediction source |

The backend migration creates `parking_segments.location`, assigns `parking_zone_id` using `ST_Covers`, and aggregates segments into zones/cells. This is a good spatial foundation.

### Account and storage tables

| Object | Current role | Model-data relevance |
|---|---|---|
| `profiles` | Created by auth trigger and stores display name/avatar/subscription status | No occupancy data; the app currently maps the Supabase Auth user and does not query this table for model inputs |
| `user_favorites` | Stores a user’s favorite segment plus a display snapshot | Consumer/cache data, not reliable ground truth; snapshots can contain synthetic availability |
| `user_preferences` | App settings | No occupancy value |
| `consent_events` | Consent audit log | Could support consent for future crowd reports/analytics, but is not an observation table |
| `deletion_requests` | Account deletion workflow | Not model data |
| `auth.users` | Supabase Auth identity | Not model data |

The generated [`database.ts`](../src/types/database.ts) confirms there is no occupancy-observation, parking-report, prediction, weather, event, or historical availability table in the current public schema types.

## Data audit by field

### Real or usable now

These fields are present in the source database and already reach the app in at least one path:

- Stable segment ID.
- Segment latitude/longitude.
- Street name and source area/district.
- Capacity / number of spaces, when `angebot` is populated.
- Parking regulation group, name, and description.
- Parsed maximum stay when the regulation description contains an hour value.
- GeoPortal class.
- Zone membership from the spatial assignment.
- Zone name/status and polygon geometry.
- Source `created_at` / `updated_at` timestamps.
- Heuristic pricing status and hourly rate.
- Aggregated capacity, segment counts, price range, and zone/cell membership.
- Destination coordinates from Google Places, which can support distance/walking/ranking features.

### Derived but currently synthetic or heuristic

These values look like live/predicted data at the UI level, but are not observations:

- `estimated_available_capacity`.
- `estimated_availability_percent`.
- `available_capacity` and `availability_percent` on zone/cell summaries.
- `availabilityStatus = 'estimated'`.
- Client fallback availability in `availabilityFor()`.
- Hourly rates inferred from regulation group names (`Kurzzeitparken`, `Mischparken`, `Altstadt`).
- Aggregated percentages calculated from those values.

The SQL and client fallback use different implementations of the same placeholder idea. This makes the values deterministic and repeatable, but not predictive.

### Not present in a trustworthy form

The app currently has no source for:

- Timestamped occupied/free observations.
- User-submitted parking reports, despite UI copy referring to reports.
- A fresh occupancy-check request or response. [`fresh-check.tsx`](../src/app/fresh-check.tsx) only runs a 75-second timer and then navigates back.
- Historical hourly/daily occupancy data.
- Forecast horizons such as “in 30 minutes” or “at 18:00”.
- Model confidence or calibration data.
- Weather, public holidays, events, traffic, road closures, or nearby demand signals.
- EV charger inventory or charger availability.
- Security features, payment methods, open hours, surface, vehicle dimensions, or overnight restrictions as structured fields.

## Mock and hardcoded UI audit

### Zone mock data

[`src/constants/zones.ts`](../src/constants/zones.ts) contains four static Munich zones:

| Zone | Mock percentage | Mock freshness/reports | Other mock fields |
|---|---:|---|---|
| Haidhausen Nord | 72% | 3 min / 4 reports | EV, price, rule, coordinates |
| Glockenbachviertel | 43% | 18 min / 2 reports | price, rule, coordinates |
| Maxvorstadt | null | no reports / 0 | EV, price, rule, coordinates |
| Sendling Tor | 61% | 7 min / 3 reports | EV, price, rule, coordinates |

This module is not imported by the current `src` map flow, so it appears to be legacy/design mock data rather than the active runtime source. The same data is duplicated in [`Munich-Parking-App-Pages-App-2026-06-22-072318/source/App.jsx`](../Munich-Parking-App-Pages-App-2026-06-22-072318/source/App.jsx).

### Active parking detail mock data

[`ParkingBottomSheet.tsx`](../src/components/parking-map/ParkingBottomSheet.tsx) still contains hardcoded values in the premium detail experience:

- Historical Usage bars: `76, 68, 84, 72, 91, 58, 44` for Mon–Sun.
- EV chargers: `6 / 10 available`, Type 2 AC, 22 kW.
- Security: CCTV, lighting, staff, and gated entry all marked available.
- Vehicle limits: 2.10 m height and 2.40 m width.
- Restrictions: no overnight parking, no trucks, resident-only zones.
- Payment methods: VISA, Mastercard, Apple Pay, Google Pay.
- Spot Chance: `92%`.
- Surface: `Paved`.
- Zone Type: `Public parking`.
- Last Updated: `Just now`.

Some values are partially dynamic but still unsafe to present as facts:

- Missing distance falls back to `3 min walk · 250 m`.
- Max stay is hardcoded to `2 hours` in the free detail card, although regulation text can provide a parsed value elsewhere.
- Open hours are hardcoded to `24 hours` / `Open now`.
- Daily price is calculated as hourly price × `7.2`, not read from a database field.

### UI-only demo values

[`ParkingAvailabilityBubbleDemo.tsx`](../src/components/parking-map/ParkingAvailabilityBubbleDemo.tsx) uses fixed percentages `72`, `46`, and `28` to demonstrate marker states and sizes. This is safe as a visual demo but should never be used as a data source.

## What the current UI actually consumes

The active map uses semantic zoom stages:

1. **City/zone:** `parking_zone_summaries` gives complete-zone aggregates.
2. **Cell:** `fetch_parking_cells` gives PostGIS hex-cell aggregates.
3. **Segment:** `parking_segment_summaries` gives individual segments and derived availability.
4. **Fallback:** if the summary view is unavailable, the client queries `parking_segments` directly and synthesizes availability locally.

The map and search/list layers consume the normalized fields below:

```text
availabilityPercent
availableSpots / availableCapacity
totalCapacity
availabilityStatus
segmentCount / count
price range and pricingStatus
coordinates
zoneId / zoneName
distanceToDestination (computed client-side)
```

The bottom-sheet header uses `availabilityPercent`, while the detail screen at [`src/app/parking/[id].tsx`](../src/app/parking/[id].tsx) can show real segment metadata: regulation, district, capacity, and coordinates.

## Prediction-model readiness

### Good inputs already available

The current schema can immediately support a baseline model with:

- segment/zone identity;
- latitude/longitude and spatial neighborhood;
- capacity;
- street/source area and zone;
- parking rule group/name/description;
- heuristic price category/rate;
- source update age;
- destination distance and map context;
- nearby segment density and aggregate capacity, calculated from existing data.

### Critical missing training data

The missing piece is a labelled target over time. A model needs observations such as:

```text
segment_id
observed_at
available_spaces or occupied_spaces
total_capacity
source (sensor, user_report, imported_feed, operator)
quality/confidence/reliability
```

The current `updated_at` is an inventory/source timestamp, not an occupancy observation timestamp. The existing synthetic estimate must not be used as the label: training on it would teach the model to reproduce the hash formula, not parking behavior.

## Recommended path from here

### Phase 1: make the data contract honest

- Keep the existing static inventory and map aggregation.
- Rename or clearly label the current deterministic values as `estimated_placeholder` during development.
- Do not show them as “live”, “fresh”, “reports agree”, or calibrated confidence.
- Stop rendering hardcoded premium details as factual parking attributes; show “data unavailable” until backed by fields.

### Phase 2: collect observations

Add a dedicated append-only observation/report table rather than putting history on `parking_segments`. A practical first version would include:

```text
parking_availability_observations
  id
  segment_id or zone_id
  observed_at
  available_spaces
  total_capacity_snapshot
  source
  reporter/user reference where applicable
  confidence/reliability
  created_at
```

Use RLS and consent-aware retention for user reports. Keep raw observations separate from the current prediction so the data can be audited and reprocessed.

### Phase 3: start with a baseline before ML

Use a confidence-weighted historical baseline:

1. segment × weekday × time bucket;
2. back off to zone × weekday × time bucket;
3. back off to city/overall bucket when sparse;
4. return unknown when there is insufficient evidence.

This creates a useful benchmark and makes the first “prediction” explainable. A later model can add weather, events, traffic, and spatial features once those sources exist.

### Phase 4: expose predictions as time-aware data

The current `ParkingAvailability` type already has room for `predicted`, `confidence`, and `observedAt`, but the API shape needs more information for plots:

```text
prediction_for
availability_percent
available_spaces
confidence
model_version
source_observation_at
generated_at
```

For the historical/prediction chart, return an array of timestamped points. Do not reuse the current seven hardcoded weekday values.

## Main risks to resolve

1. **Synthetic data leakage:** the current deterministic percentages can be mistaken for real labels.
2. **Duplicate estimation logic:** SQL and client fallback can diverge as soon as the placeholder formula changes.
3. **Timestamp ambiguity:** `updated_at` does not mean “occupancy observed at”.
4. **Unsupported detail claims:** premium UI currently displays EV, security, restriction, payment, and usage facts absent from the schema.
5. **Status semantics:** the type supports `live` and `predicted`, but the active backend currently produces `estimated`; there is no model version or confidence payload.
6. **No feedback loop:** the fresh-check screen has no report endpoint, persistence, or result handling.
7. **Sparse data policy:** the UI needs an explicit unknown/insufficient-data state instead of fallback percentages.

## Bottom line

The project is ready to replace the mock UI in layers, but not ready to claim that it has a trained parking prediction dataset. The best immediate use of the existing data is:

- real map geometry and parking inventory;
- real regulations, capacity, coordinates, and zone relationships;
- a clearly labelled deterministic demo estimate for visual development only;
- a new observation pipeline that can create the historical data needed for a real baseline/model.

Until observations are collected, the historical chart, confidence values, fresh reports, Spot Chance, and advanced parking attributes should remain explicitly unavailable or demo-only.

