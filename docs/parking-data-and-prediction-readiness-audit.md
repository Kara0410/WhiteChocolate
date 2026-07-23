# Parking data and prediction readiness

Updated: 2026-07-22

## Current architecture

Parking segments are the canonical parking inventory. Each row keeps its stable
segment ID, import-owned `city_code`, raw source identity (`FID`), raw source
geometry (`shape`), representative `lat`/`lon`, street and source-area labels,
classification, regulation fields, capacity, and timestamps.

`source_area_name` is descriptive source metadata only. It is not ownership,
does not reference an application object, and is not used to group or assign
segments.

The read flow is:

1. `parking_segment_summaries` exposes segment inventory and the newest valid
   availability snapshot.
2. `fetch_parking_cells(...)` bins representative points into projected coarse
   or fine grid cells and aggregates the segments in each cell.
3. Broad map levels render coarse cells; intermediate levels render fine cells.
4. Detailed levels render spatial segment clusters and individual segments.
5. Search, favorites, navigation, and detail selection retain stable segment
   identities.

No municipal boundary dataset is required for Munich, Vienna, Zurich, or a new
city. Import configuration must set `city_code`; ownership is never inferred
from geometry or a source-area label.

## Availability estimator

Availability snapshots remain keyed by stable segment ID plus request context,
estimator version, and validity window. Destination and traffic context can
change an estimate, but no administrative boundary participates in grouping,
priors, response identity, or cache identity.

The current estimator remains heuristic. Values must be presented as estimates,
not live occupancy or observed availability. Improving prediction quality
requires observations, validation data, and model evaluation; removing the old
administrative-boundary layer does not reduce estimator input quality because
the estimator did not use it.

## Database rollout

The forward migration
`supabase/migrations/20260722000100_remove_parking_zones.sql` preserves segment
rows, source geometry, representative coordinates, city ownership, and
availability snapshots. It recreates the public segment view and cell RPC and
retains read access for `anon` and `authenticated`.

After applying the migration to an approved Supabase environment, regenerate
the checked-in TypeScript contract:

```bash
npx supabase gen types typescript --linked --schema public
```

Run `supabase/diagnostics/multi_city_phase_1_verification.sql` to verify city
ownership, source-field preservation, public reads, RPC execution, and removal
postconditions.
