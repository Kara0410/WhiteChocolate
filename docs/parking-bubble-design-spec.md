# Parking Bubble & Map Marker Design Specification

## 1. Purpose

This document is a designer-facing audit of the parking bubble and map-marker system currently implemented in WhiteChocolate. It records what the application renders today; it is not a redesign proposal. Treat the values below as a source-of-truth snapshot for Figma recreation and future design review.

- Generated: 2026-08-21
- Repository: `Kara0410/WhiteChocolate`
- Branch: `master`
- Commit: `16735a680013145ebb2395196d5e54b4ff8f64a6`
- Audit scope: production marker components, their visual utilities, semantic-zoom pipeline, map layering, Tailwind/NativeWind tokens, and adjacent availability palettes

Primary sources: `src/components/parking-map/ParkingAvailabilityBubble.tsx`, `parking-availability-status.ts`, `marker-visuals.ts`, `parking-marker-card.tsx`, `parking-marker-overlay.tsx`, `cell-summary-marker.tsx`, `search-destination-marker.tsx`, `user-location-marker.tsx`, `marker-density.ts`, `map-detail-level.ts`, `use-parking-marker-pipeline.ts`, `parking-map.tsx`, `map-layers.ts`, `src/utils/parking-availability.ts`, and `tailwind.config.js`.

# Designer Quick Reference

| Item | Current implementation |
|---|---|
| High availability | `#22C55E` / rgb(34, 197, 94) |
| Medium availability | `#FF9500` / rgb(255, 149, 0) |
| Low availability | `#FF2D2D` / rgb(255, 45, 45) |
| Unknown spot | fill `#F8FAFC`, text `#64748B`, border `#CBD5E1` |
| Production spot | 78 × 50 canvas; 68 × 36 pill; 18/20 px type |
| Cluster, large | 132 × 52 canvas; min 86 × 44 pill; 15/17 px type |
| Cluster, medium | 124 × 50 canvas; min 80 × 42 pill; 14/16 px type |
| Cluster, small | 116 × 48 canvas; min 74 × 40 pill; 13/15 px type |
| Spot border | 3 px default; 3.5 px selected; white for known states |
| Cluster border | 1 px `#DBEAFE`; 2 px selected `#2563EB` |
| Spot shadow | `0 3px 9px rgba(15, 23, 42, 0.24)` |
| Selected spot shadow | `0 7px 18px 2px` using the status strong-glow color |
| Cluster shadow | `0 8px 18px rgba(15, 23, 42, 0.22)` |
| Selected cluster shadow | `0 9px 20px rgba(37, 99, 235, 0.26)` |
| Typeface | Platform system sans; weight 900 for bubbles; tabular numerals |
| Selected scale | Spot 1.12×; cluster 1.05× |
| Touch-down scale | Spot 0.95×; cluster 0.97× |
| Availability thresholds | High ≥ 66%; medium 33–65%; low ≤ 32%, after rounding and clamping |
| Press spring | damping 18; stiffness 260; mass 0.65; system reduced-motion aware |
| Selection transition | 160 ms timing; system reduced-motion aware |

Sources: `ParkingAvailabilityBubble.tsx`, `parking-availability-status.ts`, `parking-availability.ts`, `marker-visuals.ts`.

## 2. Executive Design Summary

The primary individual parking marker is a saturated, status-colored pill containing a bold availability percentage. Known values use white text and a white outline. The selected state enlarges the pill, adds a status-colored aura and stronger glow, and reveals a two-layer downward pointer. An unknown marker instead uses a near-white fill, slate text, and a pale slate outline.

Cluster markers deliberately use a different hierarchy: a white pill, dark count label, small status-colored accent dot, and pale-blue outline. Selection enlarges the cluster slightly and changes the border and shadow to blue. Cluster text describes a count of parking areas rather than an availability percentage.

At wider zoom levels, a separate semantic aggregate marker replaces availability bubbles. It is a pale-blue outlined pill with a blue dot and either capacity or parking-area count. Search destinations use a red map pin; the user's location uses a blue core with a pulsing blue halo.

The system reduces shadows and suppresses selected aura/tail and marker-entry animation while the camera is moving. Normal marker content is also replaced across four semantic zoom stages: city, cell, segment cluster, and individual segment.

## 3. Component and Building-Block Map

```text
ParkingMap
└── ParkingMarkerOverlay
    ├── semantic stage wrapper (FadeIn/FadeOut)
    ├── ParkingMarkerCard
    │   └── ParkingAvailabilityBubble
    │       ├── fixed marker canvas / Pressable
    │       ├── selected aura (spots only)
    │       ├── pill body
    │       │   ├── cluster accent dot (clusters only)
    │       │   └── percentage or area-count text
    │       └── two-layer pointer (selected spots only)
    └── recommendation wrapper (ZoomIn/FadeOut)

ParkingMap
├── CellSummaryMarker (city/cell semantic aggregates)
├── SearchDestinationMarker
└── UserLocationMarker
```

| Building block | Purpose | Source file | Designer-relevant responsibility |
|---|---|---|---|
| `ParkingMarkerOverlay` | Projects and layers marker items | `parking-marker-overlay.tsx` | Canvas centering, selected z-order, semantic-stage and recommendation transitions |
| `ParkingMarkerCard` | Adapts marker data into bubble props | `parking-marker-card.tsx` | Entry animation, tier-to-size mapping, availability/status handoff |
| `ParkingAvailabilityBubble` | Renders interactive spot/cluster | `ParkingAvailabilityBubble.tsx` | Exact geometry, typography, shadow, aura, pointer, press/selection motion, accessibility |
| Availability theme | Maps status to colors | `parking-availability-status.ts` | Active high/medium/low/unknown palette and glow recipes |
| Availability utility | Normalizes percentage/status | `src/utils/parking-availability.ts` | Rounding, clamping, thresholds |
| Marker visuals | Maps zoom/tier to dimensions | `marker-visuals.ts` | Canvas dimensions and cluster size tiers |
| Marker density | Clustering and collision caps | `marker-density.ts` | Visible marker counts, cluster radius, priority, collision footprint |
| Marker pipeline | Chooses semantic representation | `use-parking-marker-pipeline.ts` | Cell summaries vs clusters vs segments; selected/search substitution |
| `CellSummaryMarker` | Semantic aggregate pill | `cell-summary-marker.tsx` | Aggregate geometry, blue palette, shadow, press motion |
| `SearchDestinationMarker` | Marks selected Google destination | `search-destination-marker.tsx` | Red pin geometry and shadow |
| `UserLocationMarker` | Marks current device position | `user-location-marker.tsx` | Blue core and animated pulse |
| Map layer constants | Establish overlap priority | `map-layers.ts` | Marker, highlight, and floating-control z-index/elevation |

Data and marker selection originate in `parking-map.tsx`; marker visual state and interaction remain inside the marker components. The projection pipeline owns on-screen coordinates, semantic stage, collision selection, and performance mode.

## 4. Parking Bubble Families

### A. Individual parking spot/segment bubble

- Fully rounded status-colored pill.
- Known content: rounded/clamped percentage followed by `%`.
- Unknown content: em dash `—`.
- White outline for known values; pale slate outline for unknown.
- Selected only: colored aura, stronger status glow, 1.12× scale, and downward pointer.
- Production `spot` tier always maps to the bubble's `large` size, even though reusable medium and small spot geometries exist.

### B. Parking cluster bubble

- White pill with dark slate text.
- Status is communicated by a 7 × 7 px colored dot.
- Default pale-blue border; selected strong-blue border.
- Text is `N area(s)`, capped at `999+ areas`.
- No pointer or aura. Selection uses scale, border, and blue shadow only.

### C. City/cell summary marker

- Semantic zoom aggregate, not an availability bubble.
- Pale-blue/white pill with blue dot and dark navy label.
- Shows total capacity when available; otherwise number of parking areas.

### D. Search destination marker

- Red Lucide map pin with a white center dot.
- Identifies the searched destination, not a parking facility.

### E. Current-user-location marker

- Blue circular core with white ring and expanding translucent pulse.
- Identifies the user's coordinate, not parking availability.

## 5. Exact Active Color System

### Availability themes used by `ParkingAvailabilityBubble`

| Semantic role | State | HEX | RGB/RGBA | Opacity | Source |
|---|---|---:|---|---:|---|
| Fill/ring/tint/moving fill | High | `#22C55E` | rgb(34, 197, 94) | 100% | `parking-availability-status.ts` |
| Ring track | High | — | rgba(34, 197, 94, 0.20) | 20% | same |
| Glow | High | — | rgba(34, 197, 94, 0.42) | 42% | same |
| Strong glow | High selected | — | rgba(34, 197, 94, 0.58) | 58% | same |
| Fill/ring/tint/moving fill | Medium | `#FF9500` | rgb(255, 149, 0) | 100% | same |
| Ring track | Medium | — | rgba(255, 149, 0, 0.20) | 20% | same |
| Glow | Medium | — | rgba(255, 149, 0, 0.42) | 42% | same |
| Strong glow | Medium selected | — | rgba(255, 149, 0, 0.58) | 58% | same |
| Fill/ring/tint/moving fill | Low | `#FF2D2D` | rgb(255, 45, 45) | 100% | same |
| Ring track | Low | — | rgba(255, 45, 45, 0.20) | 20% | same |
| Glow | Low | — | rgba(255, 45, 45, 0.42) | 42% | same |
| Strong glow | Low selected | — | rgba(255, 45, 45, 0.58) | 58% | same |
| Theme fill/ring/tint/moving | Unknown | `#64748B` | rgb(100, 116, 139) | 100% | same |
| Ring track | Unknown | — | rgba(148, 163, 184, 0.24) | 24% | same |
| Glow | Unknown | — | rgba(100, 116, 139, 0.26) | 26% | same |
| Strong glow | Unknown selected | — | rgba(100, 116, 139, 0.34) | 34% | same |
| Theme ring | Unknown | `#94A3B8` | rgb(148, 163, 184) | 100% | same |
| Known spot text/border | All known | `#FFFFFF` | rgb(255, 255, 255) | 100% | same |
| Visible unknown spot fill | Unknown | `#F8FAFC` | rgb(248, 250, 252) | 100% | `ParkingAvailabilityBubble.tsx` |
| Visible unknown spot text | Unknown | `#64748B` | rgb(100, 116, 139) | 100% | same |
| Visible unknown spot border | Unknown | `#CBD5E1` | rgb(203, 213, 225) | 100% | same |
| Cluster body | Default/selected | `#FFFFFF` | rgb(255, 255, 255) | 100% | same |
| Cluster text | Default/selected | `#0F172A` | rgb(15, 23, 42) | 100% | same |
| Cluster default border | Default | `#DBEAFE` | rgb(219, 234, 254) | 100% | same |
| Cluster selected border | Selected | `#2563EB` | rgb(37, 99, 235) | 100% | same |
| Default spot shadow | Default | — | rgba(15, 23, 42, 0.24) | 24% | same |
| Moving spot shadow | Moving | — | rgba(15, 23, 42, 0.18) | 18% | same |
| Default cluster shadow | Default | — | rgba(15, 23, 42, 0.22) | 22% | same |
| Moving cluster shadow | Moving | — | rgba(15, 23, 42, 0.16) | 16% | same |
| Selected cluster shadow | Selected | — | rgba(37, 99, 235, 0.26) | 26% | same |
| Cluster fallback glow argument | Unreachable in current branch order | — | rgba(15, 23, 42, 0.28) | 28% | same |

The active marker source declares/resolves 38 unique color values when opaque colors and distinct alpha recipes are counted separately (16 opaque values and 22 translucent RGBA values across bubbles, cell, search, and user markers). Of these, 37 can affect current rendered output. The remaining rgba(15, 23, 42, 0.28) is passed as the cluster `glowStrong` fallback, but current branch order always returns a specific cluster shadow before reading it. Transparent is not counted.

### Supporting marker colors

| Role | HEX | RGB/RGBA | Source |
|---|---:|---|---|
| Cell border / `brand-300` | `#93C5FD` | rgb(147, 197, 253) | `tailwind.config.js`, `cell-summary-marker.tsx` |
| Cell background / `brand-50` | `#EFF6FF` | rgb(239, 246, 255) | same |
| Cell dot / `brand-500` | `#3B82F6` | rgb(59, 130, 246) | same |
| Cell text / `brand-950` | `#172554` | rgb(23, 37, 84) | same |
| Cell shadow | — | rgba(30, 64, 175, 0.18) | `tailwind.config.js` (`shadow-marker-cell`) |
| Destination pin fill | `#EF4444` | rgb(239, 68, 68) | `search-destination-marker.tsx` |
| Destination shadow | — | rgba(127, 29, 29, 0.28) | same |
| User core / `brand-600` | `#2563EB` | rgb(37, 99, 235) | `tailwind.config.js`, `user-location-marker.tsx` |
| User pulse / `brand-500/30` | — | rgba(59, 130, 246, 0.30) | same |
| User core shadow | — | rgba(15, 23, 42, 0.35) | `user-location-marker.tsx` |

## 6. Availability Color Logic

`normalizeAvailabilityPercent` first rounds with `Math.round`, then clamps to the inclusive range 0–100. `getAvailabilityStatus` evaluates the normalized result.

| Raw/normalized availability | Status | Marker fill |
|---:|---|---|
| Rounded value ≥ 66 | High | `#22C55E` |
| Rounded value 33–65 | Medium | `#FF9500` |
| Rounded value 0–32 | Low | `#FF2D2D` |
| `null` or non-finite value in the bubble component | Unknown | visible spot fill `#F8FAFC` |

Boundary consequences: 65.5 rounds to 66 and becomes high; 32.5 rounds to 33 and becomes medium. Values above 100 clamp to 100; values below 0 clamp to 0. Directly calling the normalization utility with `NaN` produces 0/low, but the bubble checks `Number.isFinite` first and therefore renders a non-finite value as unknown. Sources: `src/utils/parking-availability.ts`, `ParkingAvailabilityBubble.tsx`, tests under `tests/`.

## 7. Unknown / Unavailable State

For an individual spot, `percentage === null` or a non-finite value displays `—`. The visible pill uses fill `#F8FAFC`, text `#64748B`, and border `#CBD5E1`. The selected aura and strong shadow still use the unknown theme's rgba(100, 116, 139, 0.34); the selected pointer inner fill uses the visible pill fill. Default and moving unknown spots retain the near-white visible fill rather than the theme's `movingFill`.

Unknown clusters retain their white cluster body and dark `#0F172A` text. Their accent dot comes from the unknown theme (`#64748B`). The accessibility label for an unknown spot is `Parking availability unavailable`.

Sources: `ParkingAvailabilityBubble.tsx`, `parking-availability-status.ts`.

## 8. Exact Geometry

### Individual spot geometry

| Property | Small | Medium | Large / production spot |
|---|---:|---:|---:|
| Canvas | 66 × 46 px | 72 × 50 px | 78 × 50 px |
| Pill body | 58 × 32 px | 64 × 34 px | 68 × 36 px |
| Font size | 16 px | 17 px | 18 px |
| Line height | 18 px | 19 px | 20 px |
| Pill radius | 999 px | 999 px | 999 px |
| Default border | 3 px | 3 px | 3 px |
| Selected border | 3.5 px | 3.5 px | 3.5 px |
| Selected aura | body + 8 px each axis | body + 8 px | body + 8 px |
| Aura top offset | -4 px | -4 px | -4 px |
| Hit slop | 4 px all sides | 4 px | 4 px |

### Cluster geometry

| Property | Small | Medium | Large |
|---|---:|---:|---:|
| Canvas | 116 × 48 px | 124 × 50 px | 132 × 52 px |
| Pill min width | 74 px | 80 px | 86 px |
| Pill height | 40 px | 42 px | 44 px |
| Font size | 13 px | 14 px | 15 px |
| Line height | 15 px | 16 px | 17 px |
| Horizontal padding base | 16 px | 17 px | 18 px |
| Effective left padding | 28 px | 29 px | 30 px |
| Right padding | 16 px | 17 px | 18 px |
| Dot | 7 × 7 px | 7 × 7 px | 7 × 7 px |
| Dot left | 12 px | 12 px | 12 px |
| Dot opacity | 0.95 | 0.95 | 0.95 |
| Radius | 999 px | 999 px | 999 px |
| Default/selected border | 1 / 2 px | 1 / 2 px | 1 / 2 px |
| Hit slop | 4 px | 4 px | 4 px |

The dot is absolutely positioned 12 px from the left and vertically centered by the component. The extra 12 px added to the cluster's base left padding reserves space for the accent.

### Pointer/tail construction

The tail exists for individual spots only and becomes visible with selection progress. It is a pair of zero-width CSS-style triangles:

| Layer | Left border | Right border | Top border | Color | Position |
|---|---:|---:|---:|---|---|
| Outer/border | 8 px | 8 px | 11 px | white | left -8 px; top 0 |
| Inner/fill | 5 px | 5 px | 7 px | current pill fill | left -5 px; top -3 px |

The tail container is 0 × 11 px. Its opacity progresses 0→1 and scale 0.75→1 during selection. Consequently, the current default spot is a pill without a visible tail; the tail is selected-state UI, despite the marker's pin-like concept.

Sources: `ParkingAvailabilityBubble.tsx`, `marker-visuals.ts`.

## 9. Shape Language and Typography

All availability and aggregate bodies use an effective pill radius (`borderRadius: 999` or NativeWind `rounded-full`, which resolves to 9999 px in this configuration). Aura and accent dot are also fully rounded.

Bubble text uses the platform's default system sans-serif; no custom font family is assigned. Availability and cluster labels use font weight 900 (`font-black`), centered alignment, tabular numbers, one line, and letter spacing -0.45 px. Exact sizes and line heights appear in the geometry tables.

The cell marker uses 12 px type, 15 px line height, weight 800, tabular numerals, one centered line, and the platform system sans. Search and user markers contain no text.

## 10. Shadows and Depth

| Marker/state | Exact recipe | Translation | Elevation |
|---|---|---|---:|
| Spot default | `0 3px 9px rgba(15, 23, 42, 0.24)` | X0, Y3, blur9, spread0, slate 24% | 3 |
| Spot selected | `0 7px 18px 2px <status glowStrong>` | X0, Y7, blur18, spread2, status 58% (unknown 34%) | 5 |
| Spot moving | `0 1px 3px rgba(15, 23, 42, 0.18)` | X0, Y1, blur3, spread0, slate 18% | selected 5; otherwise 3 |
| Cluster default | `0 8px 18px rgba(15, 23, 42, 0.22)` | X0, Y8, blur18, spread0, slate 22% | 6 |
| Cluster selected | `0 9px 20px rgba(37, 99, 235, 0.26)` | X0, Y9, blur20, spread0, blue 26% | 8 |
| Cluster moving | `0 3px 8px rgba(15, 23, 42, 0.16)` | X0, Y3, blur8, spread0, slate 16% | selected 8; otherwise 6 |
| Cell summary | `0 7px 16px rgba(30, 64, 175, 0.18)` | X0, Y7, blur16, spread0, navy 18% | no explicit elevation |
| Search destination | `0 4px 10px rgba(127, 29, 29, 0.28)` | X0, Y4, blur10, spread0, dark red 28% | parent layer elevation 4 |
| User location core | `0 1px 4px rgba(15, 23, 42, 0.35)` | X0, Y1, blur4, spread0, slate 35% | parent layer elevation 4 |

`boxShadow` is used for bubble bodies. The status-color aura is a separate absolutely positioned view rather than part of the shadow recipe.

## 11. Selected, Pressed, and Touch States

### Selected state

Individual spot: scale 1.12, border 3.5 px, elevation 5, stronger status shadow, aura visible, pointer visible, and local marker z-index 2. Cluster: scale 1.05, border becomes 2 px `#2563EB`, elevation 8, and selected blue shadow. It has no aura or pointer. A cluster press normally zoom-expands the cluster, so persistent selected-cluster presentation is supported by the component but is not the typical production interaction.

### Scale state table

| Bubble type | Default rest | Selected rest | Touch down | Forced `pressed` state |
|---|---:|---:|---:|---:|
| Spot | 1.00 | 1.12 | 0.95 | 0.95 |
| Cluster | 1.00 | 1.05 | 0.97 | 0.95 |

`onPressIn` springs to the touch-down target. `onPressOut` springs back to the selected/default resting target. Each Pressable has 4 px hit slop, accessibility role `button`, and a selected accessibility state. A known spot label is `NN% estimated parking availability`; unknown is `Parking availability unavailable`; clusters announce their formatted area count plus `parking areas`.

## 12. Animation Specification

| Animation | Duration/config | Type | Start | End | Reduced motion |
|---|---|---|---|---|---|
| Bubble selection | 160 ms | timing | progress 0 | progress 1 | `ReduceMotion.System` |
| Spot selected scale | 160 ms | timing | 1.00 | 1.12 | System |
| Cluster selected scale | 160 ms | timing | 1.00 | 1.05 | System |
| Selected aura | 160 ms | timing | opacity 0, scale 0.82 | opacity 1, scale 1 | System |
| Selected pointer | 160 ms | timing | opacity 0, scale 0.75 | opacity 1, scale 1 | System |
| Touch press/release | damping 18, stiffness 260, mass 0.65 | spring | resting scale | pressed/resting target | System |
| Marker card enter | 200 ms | `ZoomIn` | opacity 0, scale 0.92 | opacity 1, scale 1 | System; omitted while moving |
| Semantic-stage enter | 180 ms | `FadeIn` | opacity 0 | opacity 1 | System |
| Semantic-stage exit | 140 ms | `FadeOut` | opacity 1 | opacity 0 | System |
| Search recommendation enter | 180 ms | `ZoomIn` | opacity 0, scale 0.92 | opacity 1, scale 1 | System |
| Search recommendation exit | 140 ms | `FadeOut` | opacity 1 | opacity 0 | System |
| Cell press/release | damping 18, stiffness 320, default mass | spring | 1 | 0.96 / 1 | System |
| Search destination enter | 170 ms | `ZoomIn` | opacity 0, scale 0.92 | opacity 1, scale 1 | no explicit reduced-motion option |
| User pulse | 1600 ms, infinite, non-reversing | timing loop | opacity 0.34, scale 1 | opacity 0, scale 2.25 | no explicit reduced-motion option |

The search recommendation wrapper can combine its 180 ms zoom with the child card's 200 ms card-entry animation. No custom easing is supplied to the timing transitions. Sources: marker component files listed above.

## 13. Selected Aura / Glow

The aura is an individual-spot-only view positioned behind the pill. Its width is `bubble width + 8 px`, height is `bubble height + 8 px`, and top is `-4 px`, giving a nominal 4 px extension on every side. It uses the availability theme's `glow` color: 42% alpha for high/medium/low and 26% for unknown. Its radius is 999 px. Selection animates opacity 0→1 and scale 0.82→1 over 160 ms. Moving mode forces selection progress to zero, hiding both aura and pointer; selected body scale/border remain.

## 14. Marker Text Content

- Individual known: normalized rounded integer plus `%`, e.g. `72%`.
- Individual unknown/non-finite: `—`.
- Cluster: normalized rounded non-negative count from `spotCount ?? count`.
- Cluster count: `0 areas`, `1 area`, `N areas`; values above 999 become `999+ areas`.
- Cell summary: localized capacity using `de-DE` formatting plus `space/spaces` when capacity exists; otherwise segment count plus `parking area/parking areas`.

## 15. Marker Size and Zoom Logic

`getMarkerSizeTier` returns `spot` for every individual marker. For clusters it returns large at zoom ≤10, medium at zoom ≤13, and small above 13.

| Map zoom | Individual marker | Cluster tier | Cluster canvas |
|---:|---|---|---|
| ≤10 | `spot` → large bubble | Large | 132 × 52 px |
| >10 to ≤13 | `spot` → large bubble | Medium | 124 × 50 px |
| >13 | `spot` → large bubble | Small | 116 × 48 px |

Because normal parking clusters appear only at the `segmentCluster` stage beginning at zoom 14.7, ordinary production clusters normally use the small tier. Large/medium cluster styles remain available for retained selected items, previews, or different callers.

The visual utility also exposes `visualSize`, `glowPadding: 4`, and derived square `canvasSize`: cluster large 86/4/140, medium 80/4/132, small 74/4/124, spot 68/4/86. Projection and collision currently use the explicit width/height values instead of the derived square `canvasSize`.

## 16. Semantic Zoom System

| Stage | Entry zoom | Return hysteresis | Visible representation |
|---|---:|---:|---|
| `city` | initial zoom <12.2 | remain/return at ≤11.8 | city-resolution cell summaries |
| `cell` | 12.2 to <14.7 | remain/return at ≤14.3 | coarse or fine cell summaries |
| `segmentCluster` | 14.7 to <16.2 | remain/return at ≤15.8 | clusters plus unclustered parking spots |
| `segment` | ≥16.2 | above cluster return threshold | individual parking segments |

The 0.4 zoom hysteresis prevents rapid marker-family flicker around boundaries. In the cell stage, resolution is coarse below zoom 14 and fine at/above 14. City mode allows up to 24 cell markers with horizontal/vertical gaps 24/20 px. Cell mode allows up to 48 with gaps 12/10 px. Cell summaries are suppressed when an overlay or selected parking item is active.

Cluster radius and visible caps also change with zoom:

| Zoom | Supercluster radius | Visible cap |
|---:|---:|---:|
| ≤10 | 64 px | 20 |
| >10 to ≤13 | 48 px | 50 |
| >13 to ≤15 | 32 px | 90 |
| >15 | 16 px | 140 |

Supercluster uses maximum zoom 16 and caps clustering input at 180 features. Collision rectangles add 4 px to both marker width and height. Cluster priority is descending count, then descending availability. When a parking item is selected, it becomes the sole normal displayed parking marker. When search results are active, only the top three recommendation parking markers are displayed. Sources: `map-detail-level.ts`, `marker-density.ts`, `use-parking-marker-pipeline.ts`, `parking-map.tsx`.

## 17. Moving / Performance Mode

`performanceMode = 'moving'` begins during camera motion and clears 150 ms after the last movement event. It intentionally:

- replaces normal shadows with smaller, lower-alpha moving shadows;
- prevents card-entry animation;
- forces selection progress to zero, suppressing selected aura and pointer;
- preserves selected scale, border thickness, and elevation;
- keeps active high/medium/low fill colors unchanged because each theme's `movingFill` equals its normal fill;
- leaves the visible unknown spot near-white because the unknown rendering branch overrides theme fill.

These differences are performance optimizations, not a separate brand state. Marker content and meaning do not change while moving.

## 18. Marker Positioning, Canvas, and Layering

Each projected marker is positioned by subtracting half its canvas dimensions from the projected coordinate: `translateX = x - width / 2`, `translateY = y - height / 2`. In design terms, the fixed canvas is centered on the map coordinate, while the pill, aura, and pointer are composed inside it. The canvas is larger than the pill so effects and the pointer can fit without changing coordinate anchoring. Overflow is visible where required.

| Layer | z-index | Elevation | Contents |
|---|---:|---:|---|
| Map | 0 | 0 | Base map |
| Marker layer | 10 | 2 | Normal parking/cell markers |
| Marker highlight layer | 20 | 4 | Search destination and user location |
| Floating map controls | 40 | 6 | Non-marker controls |

Within the parking marker overlay, selected markers receive local z-index 2; others receive 1. Search destination and user-location parents share the highlight layer. User location is rendered later, so normal paint order may place it above the destination if they exactly overlap.

## 19. Cell Summary Marker — Semantic Zoom Aggregate

| Property | Value |
|---|---|
| Canvas | 112 × 44 px |
| Inner pill height | 38 px |
| Maximum width | 112 px |
| Horizontal padding | 12 px each side (`px-3`) |
| Border | 1 px `brand-300` = `#93C5FD` |
| Background | `brand-50` = `#EFF6FF` |
| Dot | 7 × 7 px; `brand-500` = `#3B82F6`; 7 px right margin |
| Text | `brand-950` = `#172554`; 12/15 px; weight 800; tabular |
| Radius | full pill (`9999px`) |
| Shadow | `0 7px 16px rgba(30, 64, 175, 0.18)` |
| Hit slop | 6 px all sides |
| Press | scale 0.96; spring damping 18, stiffness 320, default mass |
| Press action | camera zoom target 14.9 |

Source: `cell-summary-marker.tsx`, `tailwind.config.js`.

## 20. Other Map Markers

### Search destination marker

- Component canvas: 40 × 44 px.
- Lucide `MapPin`: size 38, fill `#EF4444`, white stroke, stroke width 1.8.
- White center dot: 8 × 8 px, left 15 px, top 11 px, fully rounded.
- Shadow: `0 4px 10px rgba(127, 29, 29, 0.28)`.
- Parent projection offset: x − 20, y − 38; layer z20/elevation4.
- Entry: 170 ms ZoomIn, initial opacity 0/scale 0.92.
- Noninteractive; accessibility role `image`, label `Searched destination`.

### User location marker

- Canvas: 28 × 28 px, centered by x/y −14.
- Pulse: 20 × 20 px, radius 10, `rgba(59, 130, 246, 0.30)`; animation opacity 0.34→0 and scale 1→2.25 over 1600 ms, infinite and non-reversing. Because the layer color already has 30% alpha, its starting effective alpha is approximately 10.2%.
- Core: 18 × 18 px, radius 9, 3 px white border, fill `#2563EB`.
- Core shadow: `0 1px 4px rgba(15, 23, 42, 0.35)`.
- Noninteractive; parent layer z20/elevation4.

## 21. Component State Matrix

| Type | Availability | Interaction | Performance | Visual result |
|---|---|---|---|---|
| Spot | High | Default | Normal | Green pill, white text/border, standard slate shadow |
| Spot | Medium | Default | Normal | Orange pill, white text/border, standard slate shadow |
| Spot | Low | Default | Normal | Red pill, white text/border, standard slate shadow |
| Spot | Unknown | Default | Normal | Near-white pill, slate em dash, pale-slate border |
| Spot | Any | Selected | Normal | 1.12×, 3.5 px border, status aura/tail, strong status shadow, z2 |
| Spot | Any | Touch down | Normal | Springs to 0.95× |
| Spot | Any | Default/selected | Moving | Reduced shadow; aura/tail hidden; selection scale/border retained |
| Cluster | High | Default | Normal | White pill, green dot, pale-blue border, dark count |
| Cluster | Medium | Default | Normal | White pill, orange dot, pale-blue border, dark count |
| Cluster | Low | Default | Normal | White pill, red dot, pale-blue border, dark count |
| Cluster | Unknown | Default | Normal | White pill, slate dot, pale-blue border, dark count |
| Cluster | Any | Selected | Normal | 1.05×, 2 px blue border, stronger blue shadow, z2 |
| Cluster | Any | Touch down | Normal | Springs to 0.97× |
| Cluster | Any | Default/selected | Moving | Reduced shadow; selected scale/border retained |

## 22. Consolidated Bubble Design Tokens

### Colors

```text
BUBBLE_HIGH_FILL                 = #22C55E
BUBBLE_MEDIUM_FILL               = #FF9500
BUBBLE_LOW_FILL                  = #FF2D2D
BUBBLE_UNKNOWN_VISIBLE_FILL      = #F8FAFC
BUBBLE_UNKNOWN_TEXT              = #64748B
BUBBLE_UNKNOWN_BORDER            = #CBD5E1
BUBBLE_KNOWN_TEXT_BORDER         = #FFFFFF
CLUSTER_FILL                     = #FFFFFF
CLUSTER_TEXT                     = #0F172A
CLUSTER_BORDER                   = #DBEAFE
CLUSTER_SELECTED_BORDER          = #2563EB
CELL_BORDER                      = #93C5FD
CELL_FILL                        = #EFF6FF
CELL_ACCENT                      = #3B82F6
CELL_TEXT                        = #172554
DESTINATION_FILL                 = #EF4444
USER_LOCATION_FILL               = #2563EB
```

### Geometry

```text
SPOT_LARGE_CANVAS                = 78 × 50
SPOT_LARGE_BODY                  = 68 × 36
SPOT_MEDIUM_CANVAS               = 72 × 50
SPOT_MEDIUM_BODY                 = 64 × 34
SPOT_SMALL_CANVAS                = 66 × 46
SPOT_SMALL_BODY                  = 58 × 32
CLUSTER_LARGE_CANVAS             = 132 × 52
CLUSTER_LARGE_BODY_MIN           = 86 × 44
CLUSTER_MEDIUM_CANVAS            = 124 × 50
CLUSTER_MEDIUM_BODY_MIN          = 80 × 42
CLUSTER_SMALL_CANVAS             = 116 × 48
CLUSTER_SMALL_BODY_MIN           = 74 × 40
BUBBLE_RADIUS                    = 999
SPOT_BORDER_DEFAULT              = 3
SPOT_BORDER_SELECTED             = 3.5
CLUSTER_BORDER_DEFAULT           = 1
CLUSTER_BORDER_SELECTED          = 2
CLUSTER_DOT                      = 7 × 7
AURA_EXPANSION                   = 4 px per side
HIT_SLOP                         = 4 px per side
```

### Motion

```text
SELECTION_DURATION               = 160 ms
SPOT_SELECTED_SCALE              = 1.12
CLUSTER_SELECTED_SCALE           = 1.05
SPOT_TOUCH_SCALE                 = 0.95
CLUSTER_TOUCH_SCALE              = 0.97
PRESS_SPRING_DAMPING             = 18
PRESS_SPRING_STIFFNESS           = 260
PRESS_SPRING_MASS                = 0.65
MARKER_ENTER                     = 200 ms, opacity 0 / scale .92 → 1
STAGE_ENTER                      = 180 ms FadeIn
STAGE_EXIT                       = 140 ms FadeOut
MOVING_SETTLE_DELAY              = 150 ms
```

## 23. Competing Availability Palettes in the Repository

The current parking bubble uses only the active palette documented above: `#22C55E`, `#FF9500`, and `#FF2D2D`, with thresholds 66/33. Other palettes exist but are not used by `ParkingAvailabilityBubble`:

| Palette | Low | Medium | High | Unknown | Current bubble? | Source |
|---|---:|---:|---:|---:|---|---|
| Warm availability/Tailwind | `#78AFC8` / rgb(120, 175, 200) | `#B7B068` / rgb(183, 176, 104) | `#DFA536` / rgb(223, 165, 54) | `#C9C4B8` / rgb(201, 196, 184) | No | `tailwind.config.js`, `src/constants/theme.ts` |
| PM semantic | danger `#D92D20` / rgb(217, 45, 32) | warning `#FF9F0A` / rgb(255, 159, 10) | success `#34C759` / rgb(52, 199, 89) | — | No | same |
| Generic status | danger `#DC2626` / rgb(220, 38, 38) | warning `#D97706` / rgb(217, 119, 6) | success `#059669` / rgb(5, 150, 105) | unavailable `#94A3B8` / rgb(148, 163, 184) | No | `tailwind.config.js` |
| Utility palette | reds `#DC2626/#B91C1C/#991B1B` = rgb(220,38,38) / rgb(185,28,28) / rgb(153,27,27) | oranges `#F97316/#EA580C/#C2410C` = rgb(249,115,22) / rgb(234,88,12) / rgb(194,65,12) | emeralds `#10B981/#047857` = rgb(16,185,129) / rgb(4,120,87) | — | No | `tailwind.config.js` |

The parking detail theme also has a distinct unknown recipe: `#64748B` / rgb(100,116,139) fill, `#475569` / rgb(71,85,105) text, `#94A3B8` / rgb(148,163,184) ring, `#E2E8F0` / rgb(226,232,240) track, rgba(100, 116, 139, 0.20) glow, rgba(100, 116, 139, 0.25) strong glow, `#F1F5F9` / rgb(241,245,249) tint, `#CBD5E1` / rgb(203,213,225) border, and `#94A3B8` moving fill (`ParkingBottomSheet.tsx`). Additionally, `parking-feature-adapters.ts` derives `colorStatus` using thresholds 60/30, but the visible bubble ignores that field and recomputes status at 66/33. Across the active declarations and adjacent competing marker/status palettes, this audit records 60 distinct opaque/RGBA values, excluding transparent; 59 can participate in current rendering and one is the unreachable fallback described above.

## 24. Recreating the Bubble in Figma

### Individual production parking bubble

1. Create a 78 × 50 px frame with visible overflow and centered contents.
2. Add a 68 × 36 px pill, radius 999, centered near the top of the canvas.
3. Apply the state fill: high `#22C55E`, medium `#FF9500`, low `#FF2D2D`, or unknown `#F8FAFC`.
4. Apply a 3 px inside white border for known states; use `#CBD5E1` for unknown. Selected border is 3.5 px.
5. Add centered system-sans text at 18 px size, 20 px line height, weight 900, letter spacing -0.45 px, tabular numerals. Use white for known percentages and `#64748B` for unknown `—`.
6. Build the selected pointer from an outer white 16 × 11 triangle and inner fill-colored 10 × 7 triangle, with the exact border construction in Section 8. Hide it in the default state.
7. Add the default shadow `0 3 9 rgba(15,23,42,.24)`; create selected shadow variants using the status strong-glow at `0 7 18 2`.
8. Create an aura behind the pill at 76 × 44 px (body +8 each axis), offset -4 px vertically relative to the body, radius 999, using the status glow.
9. Create component variants: high/medium/low/unknown × default/selected/pressed/moving. Selected is 1.12×; touch down is 0.95×.

### Cluster bubble

1. Create the required fixed canvas: small 116 × 48, medium 124 × 50, or large 132 × 52.
2. Add a white pill with respective minimum size 74 × 40, 80 × 42, or 86 × 44 and radius 999.
3. Apply a 1 px `#DBEAFE` border. Selected uses 2 px `#2563EB`.
4. Add a 7 × 7 px status-colored dot 12 px from the pill's left edge, centered vertically, opacity 95%.
5. Use left/right padding 28/16 px small, 29/17 medium, or 30/18 large.
6. Add dark `#0F172A` text at 13/15, 14/16, or 15/17 px, system sans, weight 900, letter spacing -0.45 px, tabular.
7. Add default shadow `0 8 18 rgba(15,23,42,.22)`. Selected uses `0 9 20 rgba(37,99,235,.26)`.
8. Create default, selected, pressed, and moving variants. Selected is 1.05×; physical touch down is 0.97×. Do not add a pointer or aura.

## 25. What the Designer Can Safely Change

Safe visual variables, subject to implementation review: fill/border/text colors, border thickness, body/canvas dimensions, radius, padding, type scale/weight, shadows, aura strength, pointer geometry, and motion duration/spring feel.

Logic-dependent variables that constitute product/behavior changes: 66/33 availability thresholds, semantic zoom cutoffs and hysteresis, marker caps, cluster radius, cell aggregation, count/capacity content, selected/search marker substitution, projection, collision priority, parking data, and recommendation selection. A designer may propose changes to these, but they must be labeled and implemented as behavioral changes rather than token-only edits.

## 26. Design Review Opportunities

No implementation has been changed. A designer may want to review:

- availability palette drift between the active bubble, warm availability tokens, PM semantics, generic status colors, and detail-screen unknown theme;
- threshold drift: visible bubbles use 66/33 while an adapter's `colorStatus` uses 60/30;
- white text contrast on the current bright green and orange fills, particularly at 18 px/900 but still worth formal contrast testing;
- whether a marker tail that appears only when selected matches the intended mental model;
- whether simultaneous selected scale, thick border, aura, strong colored shadow, and tail is more emphasis than necessary;
- whether cluster hierarchy is adequately represented when normal production clusters almost always use only the small tier;
- consistency of unknown state across spot bubbles, clusters, and parking detail UI;
- missing explicit reduced-motion handling for the search destination enter and continuous user-location pulse;
- inconsistent hardcoded colors versus centralized NativeWind tokens.

## 27. Technical Observations

These are audit findings only, not code fixes:

- Cluster accessibility text is composed from a string already ending in `area/areas`, followed by `parking areas`, which can announce text such as `12 areas parking areas`.
- `marker-visuals.ts` exposes square `canvasSize` values that are not used by current projection; explicit width/height values are authoritative.
- The marker pipeline retains outgoing features for 200 ms, while the render path relies on keyed enter/exit wrappers rather than rendering a separate outgoing marker layer.
- A third marker overlay layer is structurally available but currently empty in the inspected production path.
- The legacy route `src/app/parking/[id].tsx` uses provider-native markers and is not part of this custom bubble visual system.

## 28. Source Traceability Index

| Concern | Authoritative source |
|---|---|
| Bubble geometry, text, shadow, aura, pointer, touch | `src/components/parking-map/ParkingAvailabilityBubble.tsx` |
| Active status palette | `src/components/parking-map/parking-availability-status.ts` |
| Rounding/clamping/thresholds | `src/utils/parking-availability.ts` |
| Zoom size tiers/canvas dimensions | `src/components/parking-map/marker-visuals.ts` |
| Marker card entry and spot size mapping | `src/components/parking-map/parking-marker-card.tsx` |
| Projection, z-order, stage/recommendation motion | `src/components/parking-map/parking-marker-overlay.tsx` |
| Clustering, caps, collision, priority | `src/components/parking-map/marker-density.ts` |
| Semantic stage boundaries/hysteresis | `src/components/parking-map/map-detail-level.ts` |
| Semantic marker substitution | `src/components/parking-map/use-parking-marker-pipeline.ts` |
| Cell aggregate marker | `src/components/parking-map/cell-summary-marker.tsx` |
| Destination marker | `src/components/parking-map/search-destination-marker.tsx` |
| User location marker | `src/components/parking-map/user-location-marker.tsx` |
| Layer z-index/elevation | `src/components/parking-map/map-layers.ts` |
| NativeWind colors/shadow resolution | `tailwind.config.js` |
| Camera-moving lifecycle and rendered hierarchy | `src/components/parking-map/parking-map.tsx` |
