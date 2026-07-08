# Graph Report - White_choclate  (2026-07-08)

## Corpus Check
- 162 files · ~98,814 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 831 nodes · 1654 edges · 45 communities (40 shown, 5 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 13 edges (avg confidence: 0.66)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `4276c917`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- [[_COMMUNITY_Changelog|Changelog]]
- [[_COMMUNITY_Path|Path]]
- [[_COMMUNITY_e2e-helpers.ts|e2e-helpers.ts]]
- [[_COMMUNITY_BrowserManager|BrowserManager]]
- [[_COMMUNITY_server.ts|server.ts]]
- [[_COMMUNITY_meta-commands.ts|meta-commands.ts]]
- [[_COMMUNITY_sync-manager.ts|sync-manager.ts]]
- [[_COMMUNITY_parking-map-geo.ts|parking-map-geo.ts]]
- [[_COMMUNITY_sync-manager.ts|sync-manager.ts]]
- [[_COMMUNITY_SearchNearestSpotsBottomSheet.tsx|SearchNearestSpotsBottomSheet.tsx]]
- [[_COMMUNITY_gstack-memory-ingest.ts|gstack-memory-ingest.ts]]
- [[_COMMUNITY_plan-tune.test.ts|plan-tune.test.ts]]
- [[_COMMUNITY_account-screen.tsx|account-screen.tsx]]
- [[_COMMUNITY_sync-manager.ts|sync-manager.ts]]
- [[_COMMUNITY_BottomNavBar.tsx|BottomNavBar.tsx]]
- [[_COMMUNITY_parking-map.tsx|parking-map.tsx]]
- [[_COMMUNITY_database.ts|database.ts]]
- [[_COMMUNITY_ParkingBottomSheet.tsx|ParkingBottomSheet.tsx]]
- [[_COMMUNITY_parking-map.ts|parking-map.ts]]
- [[_COMMUNITY_dependencies|dependencies]]
- [[_COMMUNITY_parking-zones.ts|parking-zones.ts]]
- [[_COMMUNITY_use-account.ts|use-account.ts]]
- [[_COMMUNITY_theme.ts|theme.ts]]
- [[_COMMUNITY_favorite-parking-storage.ts|favorite-parking-storage.ts]]
- [[_COMMUNITY_scripts|scripts]]
- [[_COMMUNITY_tsconfig.json|tsconfig.json]]
- [[_COMMUNITY_Google Places Android `empty` Client Rejection|Google Places Android `<empty>` Client Rejection]]
- [[_COMMUNITY_devDependencies|devDependencies]]
- [[_COMMUNITY_Place Search Geocode Permission|Place Search Geocode Permission]]
- [[_COMMUNITY_config.sh|config.sh]]
- [[_COMMUNITY_ParkMunich|ParkMunich]]
- [[_COMMUNITY_package.json|package.json]]
- [[_COMMUNITY_metro.config.js|metro.config.js]]
- [[_COMMUNITY_Expo HAS CHANGED|Expo HAS CHANGED]]
- [[_COMMUNITY_2026-06-24-expo-linear-gradient-android|2026-06-24-expo-linear-gradient-android.md]]
- [[_COMMUNITY_2026-06-24-expo-maps-android-authorization|2026-06-24-expo-maps-android-authorization.md]]
- [[_COMMUNITY_CLAUDE|CLAUDE.md]]

## God Nodes (most connected - your core abstractions)
1. `ParkingClusterResponse` - 20 edges
2. `hasValidParkingCoordinates()` - 12 edges
3. `scripts` - 11 edges
4. `useMapOverlay()` - 11 edges
5. `normalizeStoredFavorite()` - 11 edges
6. `ParkingCoordinates` - 10 edges
7. `Vehicle` - 10 edges
8. `createAccountError()` - 10 edges
9. `AccountPlaceholderScreen` - 9 edges
10. `getAvailabilityTheme()` - 9 edges

## Surprising Connections (you probably didn't know these)
- `createParkingClusterEngine()` --indirect_call--> `record()`  [INFERRED]
  src/services/parking-clustering.ts → tests/parking-clustering.test.ts
- `buildZoneSummaries()` --indirect_call--> `spot()`  [INFERRED]
  src/utils/parking-zones.ts → tests/parking-search.test.ts
- `mergeFavorites()` --indirect_call--> `row()`  [INFERRED]
  src/services/sync/favorite-merge.ts → tests/parking-segments.test.ts
- `mergeVehicles()` --indirect_call--> `row()`  [INFERRED]
  src/services/sync/vehicle-merge.ts → tests/parking-segments.test.ts
- `TabNavigation()` --calls--> `useMapOverlay()`  [EXTRACTED]
  src/app/(tabs)/_layout.tsx → src/context/MapOverlayContext.tsx

## Import Cycles
- 1-file cycle: `metro.config.js -> metro.config.js`

## Communities (45 total, 5 thin omitted)

### Community 0 - "Changelog"
Cohesion: 0.08
Nodes (29): AppStack(), AccountSetupPhase, ALL_STEPS, CARD_ENTERING, IconComponent, OnboardingScreen(), OnboardingStep, SCREEN_ENTERING (+21 more)

### Community 1 - "Path"
Cohesion: 0.22
Nodes (9): FavoriteProgressRing(), AVAILABILITY_THEME, AvailabilityStatus, AvailabilityTheme, getAvailabilityStatus(), getAvailabilityTheme(), ParkingAvailabilitySection, ParkingAvailabilitySectionProps (+1 more)

### Community 2 - "e2e-helpers.ts"
Cohesion: 0.17
Nodes (11): FavoriteParkingBottomSheet(), FavoriteParkingBottomSheetProps, FavoriteSpotRow, styles, MAP_ELEVATIONS, MAP_LAYERS, ParkingListBottomSheet(), ParkingListBottomSheetProps (+3 more)

### Community 3 - "BrowserManager"
Cohesion: 0.21
Nodes (12): formatSpotCount(), BubbleState, BubbleType, clampPercentage(), CLUSTER_SIZE, markerShadow(), normalizeClusterCount(), ParkingAvailabilityBubble() (+4 more)

### Community 4 - "server.ts"
Cohesion: 0.19
Nodes (11): FavoritesDeepLink(), TabNavigation(), ParkingListDeepLink(), MapOverlayContext, MapOverlayContextValue, MapOverlayMode, MapOverlayProvider(), SearchSelection (+3 more)

### Community 5 - "meta-commands.ts"
Cohesion: 0.23
Nodes (15): FavoriteParkingContext, FavoriteParkingContextValue, FavoriteParkingProvider(), clearStoredFavorites(), isColorStatus(), isFiniteNumber(), isNonEmptyString(), isRecord() (+7 more)

### Community 6 - "sync-manager.ts"
Cohesion: 0.08
Nodes (40): PreferencesContext, PreferencesContextValue, FavoriteMergeResult, mergeFavorites(), normalizeRemoteFavoriteRow(), RemoteFavorite, mergePreferences(), normalizeRemotePreferencesRow() (+32 more)

### Community 7 - "parking-map-geo.ts"
Cohesion: 0.18
Nodes (11): AnimatedPressable, BottomNavBar(), BottomNavBarProps, NavigationItem, NavItem, NavItemKey, ParkingAction, SearchResultRow (+3 more)

### Community 8 - "sync-manager.ts"
Cohesion: 0.20
Nodes (10): displayZoneCount(), FormatSpotCountOptions, getMarkerDimensions(), getMarkerSizeTier(), MarkerSizeTier, zoneCountLabel(), MARKER_ENTERING_TRANSITION, ParkingMarkerCard (+2 more)

### Community 9 - "SearchNearestSpotsBottomSheet.tsx"
Cohesion: 0.22
Nodes (5): NearestSpotRow, SearchNearestSpotsBottomSheet, SearchNearestSpotsBottomSheetProps, styles, ParkingSpotWithDistance

### Community 12 - "gstack-memory-ingest.ts"
Cohesion: 0.44
Nodes (6): deriveMapDetailLevel(), MAP_DETAIL_THRESHOLDS, MapDetailLevel, resolveDetailZoom(), useMapDetailLevel(), ParkingCameraState

### Community 13 - "plan-tune.test.ts"
Cohesion: 0.25
Nodes (7): ENTERING_TRANSITION, EXITING_TRANSITION, styles, ZONE_SUMMARY_MARKER_SIZE, ZoneSummaryMarker, ZoneSummaryMarkerProps, ParkingZoneSummary

### Community 19 - "account-screen.tsx"
Cohesion: 0.07
Nodes (40): AccountScreen(), AccountScreenSkeleton, AppDataSection, DangerSection, DangerSectionProps, LegalSection, PreferenceRow, PreferencesSection (+32 more)

### Community 20 - "sync-manager.ts"
Cohesion: 0.05
Nodes (60): GarageScreen(), VehicleCard, AddVehicleResult, initialState, useVehicles(), VehicleAction, VehicleContext, VehicleContextValue (+52 more)

### Community 23 - "BottomNavBar.tsx"
Cohesion: 0.15
Nodes (15): getGooglePlacesApiKey(), createSearchSessionToken(), useGooglePlaceSearch(), AUTOCOMPLETE_FIELD_MASK, fetchPlaceAutocomplete(), fetchPlaceDetails(), GooglePlaceAutocompleteParams, GooglePlaceDetailsResponse (+7 more)

### Community 27 - "parking-map.tsx"
Cohesion: 0.07
Nodes (27): APPLE_MAP_PROPERTIES, APPLE_MAP_UI_SETTINGS, CameraAnimationCommand, CameraFocusOptions, CameraFocusSource, DETAIL_LAYER_ENTERING, DETAIL_LAYER_EXITING, EMPTY_SEARCH_SPOTS (+19 more)

### Community 29 - "database.ts"
Cohesion: 0.06
Nodes (40): DetailState, ParkingDetailScreen(), Props, BADGE_COLORS, supabase, supabaseUrl, fetchParkingSegmentById(), fetchParkingSegments() (+32 more)

### Community 46 - "ParkingBottomSheet.tsx"
Cohesion: 0.08
Nodes (27): buildParkingShareMessage(), formatShareDistance(), getMapUrl(), HISTORICAL_USAGE, ParkingBottomSheet, ParkingBottomSheetComponent, ParkingBottomSheetHandle, ParkingBottomSheetProps (+19 more)

### Community 77 - "parking-map.ts"
Cohesion: 0.05
Nodes (72): filterParkingMarkersForScreenCircle(), filterParkingMarkersForViewport(), getApproximateCircleRadiusMeters(), getDisplayedParkingMarkerItems(), getMarkerLimitForZoom(), MarkerDensityOptions, ParkingCircleFilterResult, ParkingViewportFilterResult (+64 more)

### Community 86 - "dependencies"
Cohesion: 0.07
Nodes (30): dependencies, expo, expo-constants, expo-dev-client, expo-font, expo-linking, expo-location, expo-maps (+22 more)

### Community 93 - "parking-zones.ts"
Cohesion: 0.11
Nodes (24): fetchParkingZones(), PARKING_ZONE_COLUMNS, PARKING_ZONE_FIELDS, ParkingZone, averageOfVertices(), boundsArea(), buildZoneSummaries(), createParkingZoneMatcher() (+16 more)

### Community 100 - "use-account.ts"
Cohesion: 0.07
Nodes (34): AccountDeleteScreen(), DeletionStep, AccountProfileScreen(), AccountPlaceholderScreen, AccountPlaceholderScreenProps, AuthMode, EmailSignInCard, EmailSignInCardProps (+26 more)

### Community 118 - "theme.ts"
Cohesion: 0.13
Nodes (12): INCLUDED, styles, BLUR_TINT, C, FONT_BODY, FONT_DISPLAY, GLASS_CARD, R (+4 more)

### Community 187 - "favorite-parking-storage.ts"
Cohesion: 0.20
Nodes (12): ParkingClusterResponse, compareCuratedSpots(), formatSearchDistance(), getCuratedNearbyParkingSpots(), GetCuratedNearbyParkingSpotsOptions, getEffectivePrice(), getNearestParkingSpots(), GetNearestParkingSpotsOptions (+4 more)

### Community 299 - "scripts"
Cohesion: 0.18
Nodes (11): scripts, android, build:dev:android, build:dev:ios, build:dev:ios-sim, ios, lint, start (+3 more)

### Community 356 - "tsconfig.json"
Cohesion: 0.22
Nodes (8): compilerOptions, paths, strict, exclude, extends, include, @/*, @/assets/*

### Community 408 - "Google Places Android `<empty>` Client Rejection"
Cohesion: 0.25
Nodes (7): Evidence, Fix, Google Places Android `<empty>` Client Rejection, Required Setup, Root Cause, Status, Symptom

### Community 409 - "devDependencies"
Cohesion: 0.22
Nodes (9): devDependencies, @babel/core, babel-preset-expo, eslint, eslint-config-expo, tsx, @types/react, @types/supercluster (+1 more)

### Community 469 - "Place Search Geocode Permission"
Cohesion: 0.29
Nodes (6): Fix, Place Search Geocode Permission, Root Cause, Status, Symptom, Verification

### Community 565 - "ParkMunich"
Cohesion: 0.33
Nodes (5): Getting started, Maps & secrets, ParkMunich, Project layout, Useful scripts

### Community 616 - "package.json"
Cohesion: 0.40
Nodes (4): main, name, private, version

### Community 769 - "metro.config.js"
Cohesion: 0.67
Nodes (3): config, { getDefaultConfig }, { withNativeWind }

## Knowledge Gaps
- **270 isolated node(s):** `{ defineConfig }`, `expoConfig`, `{ getDefaultConfig }`, `{ withNativeWind }`, `config` (+265 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **5 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `ParkingClusterResponse` connect `favorite-parking-storage.ts` to `e2e-helpers.ts`, `meta-commands.ts`, `sync-manager.ts`, `sync-manager.ts`, `SearchNearestSpotsBottomSheet.tsx`, `parking-map.ts`, `ParkingBottomSheet.tsx`, `sync-manager.ts`, `parking-map.tsx`?**
  _High betweenness centrality (0.072) - this node is a cross-community bridge._
- **Why does `useFavoriteParking()` connect `e2e-helpers.ts` to `use-account.ts`, `meta-commands.ts`, `ParkingBottomSheet.tsx`, `account-screen.tsx`, `parking-map.tsx`?**
  _High betweenness centrality (0.038) - this node is a cross-community bridge._
- **Why does `useMapOverlay()` connect `server.ts` to `parking-map.tsx`, `parking-map-geo.ts`?**
  _High betweenness centrality (0.015) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `hasValidParkingCoordinates()` (e.g. with `filterParkingMarkersForScreenCircle()` and `filterParkingMarkersForViewport()`) actually correct?**
  _`hasValidParkingCoordinates()` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `{ defineConfig }`, `expoConfig`, `{ getDefaultConfig }` to the rest of the system?**
  _270 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Changelog` be split into smaller, more focused modules?**
  _Cohesion score 0.08333333333333333 - nodes in this community are weakly interconnected._
- **Should `sync-manager.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.07706766917293233 - nodes in this community are weakly interconnected._