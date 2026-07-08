# Graph Report - White_choclate  (2026-07-08)

## Corpus Check
- 165 files · ~99,920 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 847 nodes · 1695 edges · 47 communities (41 shown, 6 thin omitted)
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
- [[_COMMUNITY_account-placeholder-screen.tsx|account-placeholder-screen.tsx]]
- [[_COMMUNITY_parking-map.ts|parking-map.ts]]
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
2. `useAccount()` - 15 edges
3. `hasValidParkingCoordinates()` - 12 edges
4. `scripts` - 11 edges
5. `useMapOverlay()` - 11 edges
6. `normalizeStoredFavorite()` - 11 edges
7. `ParkingCoordinates` - 10 edges
8. `Vehicle` - 10 edges
9. `createAccountError()` - 10 edges
10. `AccountPlaceholderScreen` - 9 edges

## Surprising Connections (you probably didn't know these)
- `createParkingClusterEngine()` --indirect_call--> `record()`  [INFERRED]
  src/services/parking-clustering.ts → tests/parking-clustering.test.ts
- `buildZoneSummaries()` --indirect_call--> `spot()`  [INFERRED]
  src/utils/parking-zones.ts → tests/parking-search.test.ts
- `mergeFavorites()` --indirect_call--> `row()`  [INFERRED]
  src/services/sync/favorite-merge.ts → tests/parking-segments.test.ts
- `mergeVehicles()` --indirect_call--> `row()`  [INFERRED]
  src/services/sync/vehicle-merge.ts → tests/parking-segments.test.ts
- `AccountProfileScreen()` --calls--> `useAccount()`  [EXTRACTED]
  src/app/(tabs)/account/profile.tsx → src/hooks/use-account.ts

## Import Cycles
- 1-file cycle: `metro.config.js -> metro.config.js`

## Communities (47 total, 6 thin omitted)

### Community 0 - "Changelog"
Cohesion: 0.07
Nodes (38): AppStack(), ACCOUNT_ENTRY_STEPS, AccountSetupPhase, ALL_STEPS, CARD_ENTERING, IconComponent, OnboardingScreen(), OnboardingStep (+30 more)

### Community 1 - "Path"
Cohesion: 0.10
Nodes (32): AccountDeleteScreen(), DeletionStep, GarageScreen(), VehicleCard, usePreferences(), AddVehicleResult, initialState, useVehicles() (+24 more)

### Community 2 - "e2e-helpers.ts"
Cohesion: 0.25
Nodes (6): FavoriteParkingBottomSheet(), FavoriteParkingBottomSheetProps, FavoriteProgressRing(), FavoriteSpotRow, styles, useFavoriteParking()

### Community 3 - "BrowserManager"
Cohesion: 0.13
Nodes (20): formatSpotCount(), AVAILABILITY_THEME, AvailabilityStatus, AvailabilityTheme, getAvailabilityStatus(), getAvailabilityTheme(), BubbleState, BubbleType (+12 more)

### Community 4 - "server.ts"
Cohesion: 0.19
Nodes (15): filterParkingMarkersForScreenCircle(), getApproximateCircleRadiusMeters(), getDisplayedParkingMarkerItems(), getMarkerLimitForZoom(), MarkerDensityOptions, ParkingCircleFilterResult, ParkingViewportFilterResult, ProjectedParkingMarker (+7 more)

### Community 5 - "meta-commands.ts"
Cohesion: 0.20
Nodes (17): FavoriteParkingContext, FavoriteParkingContextValue, FavoriteParkingProvider(), AvailabilityColorStatus, WalkingCategory, clearStoredFavorites(), isColorStatus(), isFiniteNumber() (+9 more)

### Community 6 - "sync-manager.ts"
Cohesion: 0.10
Nodes (25): FavoriteMergeResult, mergeFavorites(), normalizeRemoteFavoriteRow(), RemoteFavorite, mergePreferences(), normalizeRemotePreferencesRow(), PREFERENCE_KEYS, PreferenceMergeOptions (+17 more)

### Community 7 - "parking-map-geo.ts"
Cohesion: 0.27
Nodes (16): filterParkingMarkersForViewport(), clampZoom(), createBufferedViewportBounds(), createParkingRenderCircleBounds(), createParkingSearchFocusCamera(), deriveCameraViewportDeltas(), getParkingClusterRequest(), getParkingRenderCircleClusterRequest() (+8 more)

### Community 8 - "sync-manager.ts"
Cohesion: 0.20
Nodes (10): displayZoneCount(), FormatSpotCountOptions, getMarkerDimensions(), getMarkerSizeTier(), MarkerSizeTier, zoneCountLabel(), MARKER_ENTERING_TRANSITION, ParkingMarkerCard (+2 more)

### Community 9 - "SearchNearestSpotsBottomSheet.tsx"
Cohesion: 0.14
Nodes (12): MAP_ELEVATIONS, MAP_LAYERS, ParkingListBottomSheet(), ParkingListBottomSheetProps, ParkingListRow, styles, NearestSpotRow, SearchNearestSpotsBottomSheet (+4 more)

### Community 11 - "parking-map.ts"
Cohesion: 0.22
Nodes (10): CachedParkingData, CameraMoveEvent, parkingCache, ParkingBestSpot, ParkingBoundingBox, ParkingClusterRequest, ParkingCoordinates, ParkingItemType (+2 more)

### Community 12 - "gstack-memory-ingest.ts"
Cohesion: 0.50
Nodes (5): deriveMapDetailLevel(), MAP_DETAIL_THRESHOLDS, MapDetailLevel, resolveDetailZoom(), useMapDetailLevel()

### Community 13 - "plan-tune.test.ts"
Cohesion: 0.39
Nodes (8): canOpenNavigationUrl(), getFallbackMapUrl(), hasValidCoordinates(), NavigationOption, openIosNavigation(), openParkingNavigation(), OpenParkingNavigationOptions, openUrlWithFallback()

### Community 19 - "account-screen.tsx"
Cohesion: 0.07
Nodes (44): AccountScreen(), AccountScreenSkeleton, AppDataSection, DangerSection, DangerSectionProps, LegalSection, PreferenceRow, PreferencesSection (+36 more)

### Community 20 - "sync-manager.ts"
Cohesion: 0.07
Nodes (42): PreferencesContext, PreferencesContextValue, determineSyncStrategy(), SyncDecisionInput, countLocalPreferences(), determineAccountSyncState(), DetermineAccountSyncStateInput, getLocalSnapshot() (+34 more)

### Community 23 - "BottomNavBar.tsx"
Cohesion: 0.05
Nodes (49): FavoritesDeepLink(), GarageGate(), TabNavigation(), ParkingListDeepLink(), BenefitRowProps, CreateAccountSheet, CreateAccountSheetProps, AnimatedPressable (+41 more)

### Community 27 - "parking-map.tsx"
Cohesion: 0.06
Nodes (34): APPLE_MAP_PROPERTIES, APPLE_MAP_UI_SETTINGS, CameraAnimationCommand, CameraFocusOptions, CameraFocusSource, DETAIL_LAYER_ENTERING, DETAIL_LAYER_EXITING, EMPTY_SEARCH_SPOTS (+26 more)

### Community 29 - "database.ts"
Cohesion: 0.06
Nodes (40): DetailState, ParkingDetailScreen(), Props, BADGE_COLORS, supabase, supabaseUrl, fetchParkingSegmentById(), fetchParkingSegments() (+32 more)

### Community 46 - "ParkingBottomSheet.tsx"
Cohesion: 0.09
Nodes (19): buildParkingShareMessage(), formatShareDistance(), getMapUrl(), HISTORICAL_USAGE, ParkingBottomSheet, ParkingBottomSheetComponent, ParkingBottomSheetHandle, ParkingBottomSheetProps (+11 more)

### Community 77 - "parking-map.ts"
Cohesion: 0.14
Nodes (20): bestSpotScore(), clusterParkingRecords(), clusterToResponse(), createIndex(), createParkingClusterEngine(), destinationMetadata(), getClusterRadiusForZoom(), ParkingClusterGroup (+12 more)

### Community 86 - "dependencies"
Cohesion: 0.07
Nodes (30): dependencies, expo, expo-constants, expo-dev-client, expo-font, expo-linking, expo-location, expo-maps (+22 more)

### Community 93 - "parking-zones.ts"
Cohesion: 0.10
Nodes (25): fetchParkingZones(), PARKING_ZONE_COLUMNS, PARKING_ZONE_FIELDS, ParkingZone, assignParkingRecordsToZones(), averageOfVertices(), boundsArea(), buildZoneSummaries() (+17 more)

### Community 100 - "use-account.ts"
Cohesion: 0.12
Nodes (28): AccountProfileScreen(), AuthMode, EmailSignInCard, EmailSignInCardProps, ProfileHeader, ProfileHeaderProps, isValidEmail(), normalizeEmail() (+20 more)

### Community 118 - "theme.ts"
Cohesion: 0.13
Nodes (12): INCLUDED, styles, BLUR_TINT, C, FONT_BODY, FONT_DISPLAY, GLASS_CARD, R (+4 more)

### Community 187 - "favorite-parking-storage.ts"
Cohesion: 0.21
Nodes (12): ParkingClusterResponse, haversineDistanceMeters(), compareCuratedSpots(), getCuratedNearbyParkingSpots(), GetCuratedNearbyParkingSpotsOptions, getEffectivePrice(), getNearestParkingSpots(), GetNearestParkingSpotsOptions (+4 more)

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
- **276 isolated node(s):** `{ defineConfig }`, `expoConfig`, `{ getDefaultConfig }`, `{ withNativeWind }`, `config` (+271 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **6 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `ParkingClusterResponse` connect `favorite-parking-storage.ts` to `e2e-helpers.ts`, `server.ts`, `meta-commands.ts`, `sync-manager.ts`, `sync-manager.ts`, `SearchNearestSpotsBottomSheet.tsx`, `parking-map.ts`, `parking-map.ts`, `ParkingBottomSheet.tsx`, `sync-manager.ts`, `parking-map.tsx`?**
  _High betweenness centrality (0.071) - this node is a cross-community bridge._
- **Why does `useFavoriteParking()` connect `e2e-helpers.ts` to `Path`, `meta-commands.ts`, `ParkingBottomSheet.tsx`, `account-screen.tsx`, `parking-map.tsx`?**
  _High betweenness centrality (0.033) - this node is a cross-community bridge._
- **Why does `useAccount()` connect `BottomNavBar.tsx` to `Changelog`, `Path`, `account-screen.tsx`, `use-account.ts`?**
  _High betweenness centrality (0.019) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `hasValidParkingCoordinates()` (e.g. with `filterParkingMarkersForScreenCircle()` and `filterParkingMarkersForViewport()`) actually correct?**
  _`hasValidParkingCoordinates()` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `{ defineConfig }`, `expoConfig`, `{ getDefaultConfig }` to the rest of the system?**
  _276 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Changelog` be split into smaller, more focused modules?**
  _Cohesion score 0.06612244897959184 - nodes in this community are weakly interconnected._
- **Should `Path` be split into smaller, more focused modules?**
  _Cohesion score 0.1014799154334038 - nodes in this community are weakly interconnected._