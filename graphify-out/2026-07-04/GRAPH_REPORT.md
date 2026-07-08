# Graph Report - White_choclate  (2026-07-04)

## Corpus Check
- 158 files · ~93,770 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 801 nodes · 1573 edges · 60 communities (54 shown, 6 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 13 edges (avg confidence: 0.66)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `d8c6314f`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- [[_COMMUNITY_Changelog|Changelog]]
- [[_COMMUNITY_Path|Path]]
- [[_COMMUNITY_e2e-helpers.ts|e2e-helpers.ts]]
- [[_COMMUNITY_BrowserManager|BrowserManager]]
- [[_COMMUNITY_server.ts|server.ts]]
- [[_COMMUNITY_meta-commands.ts|meta-commands.ts]]
- [[_COMMUNITY_eval-store.ts|eval-store.ts]]
- [[_COMMUNITY_redact-engine.ts|redact-engine.ts]]
- [[_COMMUNITY_codex-e2e.test.ts|codex-e2e.test.ts]]
- [[_COMMUNITY_cookie-import-browser.ts|cookie-import-browser.ts]]
- [[_COMMUNITY_types.ts|types.ts]]
- [[_COMMUNITY_browser-manager.ts|browser-manager.ts]]
- [[_COMMUNITY_gstack-memory-ingest.ts|gstack-memory-ingest.ts]]
- [[_COMMUNITY_plan-tune.test.ts|plan-tune.test.ts]]
- [[_COMMUNITY_BrowseClient|BrowseClient]]
- [[_COMMUNITY_capture-parity-baseline.ts|capture-parity-baseline.ts]]
- [[_COMMUNITY_Json|Json]]
- [[_COMMUNITY_account-screen.tsx|account-screen.tsx]]
- [[_COMMUNITY_sync-manager.ts|sync-manager.ts]]
- [[_COMMUNITY_BottomNavBar.tsx|BottomNavBar.tsx]]
- [[_COMMUNITY_parking-map.tsx|parking-map.tsx]]
- [[_COMMUNITY_database.ts|database.ts]]
- [[_COMMUNITY_SearchNearestSpotsBottomSheet.tsx|SearchNearestSpotsBottomSheet.tsx]]
- [[_COMMUNITY_ParkingBottomSheet.tsx|ParkingBottomSheet.tsx]]
- [[_COMMUNITY_parking-map-geo.ts|parking-map-geo.ts]]
- [[_COMMUNITY_parking-map.ts|parking-map.ts]]
- [[_COMMUNITY_dependencies|dependencies]]
- [[_COMMUNITY_parking-zones.ts|parking-zones.ts]]
- [[_COMMUNITY_use-account.ts|use-account.ts]]
- [[_COMMUNITY_vehicle-merge.ts|vehicle-merge.ts]]
- [[_COMMUNITY_theme.ts|theme.ts]]
- [[_COMMUNITY_preference-merge.ts|preference-merge.ts]]
- [[_COMMUNITY_ParkingAvailabilityBubble.tsx|ParkingAvailabilityBubble.tsx]]
- [[_COMMUNITY_sync-types.ts|sync-types.ts]]
- [[_COMMUNITY_delete.tsx|delete.tsx]]
- [[_COMMUNITY_favorite-parking-storage.ts|favorite-parking-storage.ts]]
- [[_COMMUNITY_Account Cloud Sync|Account Cloud Sync]]
- [[_COMMUNITY_use-map-location.ts|use-map-location.ts]]
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
8. `AccountPlaceholderScreen` - 9 edges
9. `getAvailabilityTheme()` - 9 edges
10. `useFavoriteParking()` - 9 edges

## Surprising Connections (you probably didn't know these)
- `createParkingClusterEngine()` --indirect_call--> `record()`  [INFERRED]
  src/services/parking-clustering.ts → tests/parking-clustering.test.ts
- `buildZoneSummaries()` --indirect_call--> `spot()`  [INFERRED]
  src/utils/parking-zones.ts → tests/parking-search.test.ts
- `mergeFavorites()` --indirect_call--> `row()`  [INFERRED]
  src/services/sync/favorite-merge.ts → tests/parking-segments.test.ts
- `mergeVehicles()` --indirect_call--> `row()`  [INFERRED]
  src/services/sync/vehicle-merge.ts → tests/parking-segments.test.ts
- `filterParkingMarkersForScreenCircle()` --indirect_call--> `hasValidParkingCoordinates()`  [INFERRED]
  src/components/parking-map/marker-density.ts → src/utils/parking-map-geo.ts

## Import Cycles
- 1-file cycle: `metro.config.js -> metro.config.js`

## Communities (60 total, 6 thin omitted)

### Community 0 - "Changelog"
Cohesion: 0.12
Nodes (19): PREFERENCE_KEYS, determineSyncStrategy(), SyncDecisionInput, countLocalPreferences(), determineAccountSyncState(), DetermineAccountSyncStateInput, getLocalSnapshot(), getRemoteSnapshotPlaceholder() (+11 more)

### Community 1 - "Path"
Cohesion: 0.27
Nodes (16): filterParkingMarkersForViewport(), clampZoom(), createBufferedViewportBounds(), createParkingRenderCircleBounds(), createParkingSearchFocusCamera(), deriveCameraViewportDeltas(), getParkingClusterRequest(), getParkingRenderCircleClusterRequest() (+8 more)

### Community 2 - "e2e-helpers.ts"
Cohesion: 0.17
Nodes (11): FavoriteParkingBottomSheet(), FavoriteParkingBottomSheetProps, FavoriteSpotRow, styles, MAP_ELEVATIONS, MAP_LAYERS, ParkingListBottomSheet(), ParkingListBottomSheetProps (+3 more)

### Community 3 - "BrowserManager"
Cohesion: 0.17
Nodes (15): FavoriteProgressRing(), getAvailabilityStatus(), getAvailabilityTheme(), BubbleState, BubbleType, clampPercentage(), CLUSTER_SIZE, markerShadow() (+7 more)

### Community 4 - "server.ts"
Cohesion: 0.19
Nodes (9): AccountScreen(), AppDataSection, DangerSection, LegalSection, ProfileHeader, ProfileHeaderProps, SupportSection, SettingsErrorPanel (+1 more)

### Community 5 - "meta-commands.ts"
Cohesion: 0.19
Nodes (11): PreferenceRow, PreferencesSection, SettingItemListProps, SettingItemRow, PREFERENCE_SETTINGS, BooleanPreferenceKey, AccountRoute, SettingAction (+3 more)

### Community 6 - "eval-store.ts"
Cohesion: 0.24
Nodes (9): CachedParkingData, CameraMoveEvent, parkingCache, ParkingBoundingBox, ParkingCameraState, ParkingClusterRequest, ParkingCoordinates, ParkingItemType (+1 more)

### Community 7 - "redact-engine.ts"
Cohesion: 0.24
Nodes (7): AVAILABILITY_THEME, AvailabilityStatus, AvailabilityTheme, ParkingAvailabilitySection, ParkingAvailabilitySectionProps, ParkingDetailHeader, ParkingDetailHeaderProps

### Community 8 - "codex-e2e.test.ts"
Cohesion: 0.20
Nodes (6): NearestSpotRow, SearchNearestSpotsBottomSheet, SearchNearestSpotsBottomSheetProps, styles, formatSearchDistance(), ParkingSpotWithDistance

### Community 10 - "types.ts"
Cohesion: 0.28
Nodes (5): AccountScreenSkeleton, SubscriptionCard, SubscriptionCardProps, SettingRow, SettingRowProps

### Community 11 - "browser-manager.ts"
Cohesion: 0.39
Nodes (8): canOpenNavigationUrl(), getFallbackMapUrl(), hasValidCoordinates(), NavigationOption, openIosNavigation(), openParkingNavigation(), OpenParkingNavigationOptions, openUrlWithFallback()

### Community 12 - "gstack-memory-ingest.ts"
Cohesion: 0.50
Nodes (5): deriveMapDetailLevel(), MAP_DETAIL_THRESHOLDS, MapDetailLevel, resolveDetailZoom(), useMapDetailLevel()

### Community 13 - "plan-tune.test.ts"
Cohesion: 0.25
Nodes (7): ENTERING_TRANSITION, EXITING_TRANSITION, styles, ZONE_SUMMARY_MARKER_SIZE, ZoneSummaryMarker, ZoneSummaryMarkerProps, ParkingZoneSummary

### Community 14 - "BrowseClient"
Cohesion: 0.33
Nodes (4): AccountLocationStatus, INITIAL_STATE, LocationPermissionState, useLocationPermissionStatus()

### Community 15 - "capture-parity-baseline.ts"
Cohesion: 0.40
Nodes (4): ACCENT_CLASSES, ParkingInfoRow, ParkingInfoRowAccent, ParkingInfoRowProps

### Community 16 - "Json"
Cohesion: 0.67
Nodes (3): ParkingMap(), useParkingClusters(), useParkingZones()

### Community 19 - "account-screen.tsx"
Cohesion: 0.20
Nodes (13): DangerSectionProps, QuickActionsSection, QuickActionsSectionProps, SettingItemList, SettingsSection, SettingsSectionProps, ANONYMOUS_QUICK_ACTIONS, countLabel() (+5 more)

### Community 20 - "sync-manager.ts"
Cohesion: 0.12
Nodes (26): GarageScreen(), VehicleCard, AddVehicleResult, initialState, VehicleAction, VehicleContext, VehicleContextValue, vehicleReducer() (+18 more)

### Community 23 - "BottomNavBar.tsx"
Cohesion: 0.06
Nodes (38): FavoritesDeepLink(), TabNavigation(), ParkingListDeepLink(), AnimatedPressable, BottomNavBar(), BottomNavBarProps, NavigationItem, NavItem (+30 more)

### Community 27 - "parking-map.tsx"
Cohesion: 0.07
Nodes (24): APPLE_MAP_PROPERTIES, APPLE_MAP_UI_SETTINGS, CameraAnimationCommand, CameraFocusOptions, CameraFocusSource, DETAIL_LAYER_ENTERING, DETAIL_LAYER_EXITING, EMPTY_SEARCH_SPOTS (+16 more)

### Community 29 - "database.ts"
Cohesion: 0.06
Nodes (39): DetailState, ParkingDetailScreen(), Props, BADGE_COLORS, supabase, supabaseUrl, fetchParkingSegmentById(), fetchParkingSegments() (+31 more)

### Community 36 - "SearchNearestSpotsBottomSheet.tsx"
Cohesion: 0.21
Nodes (12): ParkingClusterResponse, haversineDistanceMeters(), compareCuratedSpots(), getCuratedNearbyParkingSpots(), GetCuratedNearbyParkingSpotsOptions, getEffectivePrice(), getNearestParkingSpots(), GetNearestParkingSpotsOptions (+4 more)

### Community 46 - "ParkingBottomSheet.tsx"
Cohesion: 0.13
Nodes (13): buildParkingShareMessage(), formatShareDistance(), getMapUrl(), HISTORICAL_USAGE, ParkingBottomSheet, ParkingBottomSheetComponent, ParkingBottomSheetHandle, ParkingBottomSheetProps (+5 more)

### Community 76 - "parking-map-geo.ts"
Cohesion: 0.20
Nodes (15): filterParkingMarkersForScreenCircle(), getApproximateCircleRadiusMeters(), getDisplayedParkingMarkerItems(), getMarkerLimitForZoom(), MarkerDensityOptions, ParkingCircleFilterResult, ParkingViewportFilterResult, ProjectedParkingMarker (+7 more)

### Community 77 - "parking-map.ts"
Cohesion: 0.12
Nodes (21): bestSpotScore(), clusterParkingRecords(), clusterToResponse(), createIndex(), createParkingClusterEngine(), destinationMetadata(), getClusterRadiusForZoom(), ParkingClusterGroup (+13 more)

### Community 86 - "dependencies"
Cohesion: 0.07
Nodes (30): dependencies, expo, expo-constants, expo-dev-client, expo-font, expo-linking, expo-location, expo-maps (+22 more)

### Community 93 - "parking-zones.ts"
Cohesion: 0.10
Nodes (26): fetchParkingZones(), PARKING_ZONE_COLUMNS, PARKING_ZONE_FIELDS, ParkingZone, ParkingZonePolygon, assignParkingRecordsToZones(), averageOfVertices(), boundsArea() (+18 more)

### Community 100 - "use-account.ts"
Cohesion: 0.16
Nodes (18): EmailSignInCard, EmailSignInCardProps, AccountActionResult, AccountError, AccountErrorCode, AccountUser, AuthStatus, SubscriptionStatus (+10 more)

### Community 111 - "vehicle-merge.ts"
Cohesion: 0.16
Nodes (23): FavoriteMergeResult, mergeFavorites(), normalizeRemoteFavoriteRow(), RemoteFavorite, mergePreferences(), normalizeRemotePreferencesRow(), PreferenceMergeOptions, PreferenceMergeResult (+15 more)

### Community 118 - "theme.ts"
Cohesion: 0.13
Nodes (12): INCLUDED, styles, BLUR_TINT, C, FONT_BODY, FONT_DISPLAY, GLASS_CARD, R (+4 more)

### Community 120 - "preference-merge.ts"
Cohesion: 0.23
Nodes (14): PreferencesContext, PreferencesContextValue, LanguagePreference, PreferenceKey, Preferences, PreferencesError, UnitsPreference, clearStoredPreferences() (+6 more)

### Community 129 - "ParkingAvailabilityBubble.tsx"
Cohesion: 0.18
Nodes (11): displayZoneCount(), formatSpotCount(), FormatSpotCountOptions, getMarkerDimensions(), getMarkerSizeTier(), MarkerSizeTier, zoneCountLabel(), MARKER_ENTERING_TRANSITION (+3 more)

### Community 130 - "sync-types.ts"
Cohesion: 0.25
Nodes (12): combineSyncResults(), createEmptySyncResult(), createFailedSyncResult(), createInitialDomainState(), createSyncError(), DomainSyncState, SyncDataDomain, SyncDomain (+4 more)

### Community 146 - "delete.tsx"
Cohesion: 0.13
Nodes (8): AccountDeleteScreen(), DeletionStep, AccountProfileScreen(), AccountPlaceholderScreen, AccountPlaceholderScreenProps, usePreferences(), useVehicles(), useAccount()

### Community 187 - "favorite-parking-storage.ts"
Cohesion: 0.18
Nodes (18): FavoriteParkingContext, FavoriteParkingContextValue, FavoriteParkingProvider(), AvailabilityColorStatus, WalkingCategory, clearStoredFavorites(), isColorStatus(), isFiniteNumber() (+10 more)

### Community 258 - "Account Cloud Sync"
Cohesion: 0.15
Nodes (12): Account Cloud Sync, Decision strategies, Favorites — key: favorite id (`segment_id` remotely), Known limitations, Merge rules (all pure, no I/O, inputs never mutated), Phase 4B contract, Preferences — wholesale winner, not per-key, RLS assumptions (verified in migrations, applied 2026-07-03) (+4 more)

### Community 259 - "use-map-location.ts"
Cohesion: 0.26
Nodes (10): MapScreen(), coordinatesFromLocation(), getCurrentPositionWithTimeout(), getDeviceLocation(), getRecentLastKnownCoordinates(), LocationRequestTimeoutError, LocationResult, MUNICH_CENTER (+2 more)

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
- **268 isolated node(s):** `{ defineConfig }`, `expoConfig`, `{ getDefaultConfig }`, `{ withNativeWind }`, `config` (+263 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **6 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `ParkingClusterResponse` connect `SearchNearestSpotsBottomSheet.tsx` to `Changelog`, `ParkingAvailabilityBubble.tsx`, `e2e-helpers.ts`, `eval-store.ts`, `codex-e2e.test.ts`, `cookie-import-browser.ts`, `parking-map-geo.ts`, `favorite-parking-storage.ts`, `ParkingBottomSheet.tsx`, `parking-map.ts`, `vehicle-merge.ts`, `parking-map.tsx`?**
  _High betweenness centrality (0.074) - this node is a cross-community bridge._
- **Why does `useFavoriteParking()` connect `e2e-helpers.ts` to `server.ts`, `favorite-parking-storage.ts`, `ParkingBottomSheet.tsx`, `Json`, `delete.tsx`, `parking-map.tsx`?**
  _High betweenness centrality (0.042) - this node is a cross-community bridge._
- **Why does `useMapOverlay()` connect `BottomNavBar.tsx` to `Json`, `parking-map.tsx`?**
  _High betweenness centrality (0.016) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `hasValidParkingCoordinates()` (e.g. with `filterParkingMarkersForScreenCircle()` and `filterParkingMarkersForViewport()`) actually correct?**
  _`hasValidParkingCoordinates()` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `{ defineConfig }`, `expoConfig`, `{ getDefaultConfig }` to the rest of the system?**
  _268 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Changelog` be split into smaller, more focused modules?**
  _Cohesion score 0.11692307692307692 - nodes in this community are weakly interconnected._
- **Should `sync-manager.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.12012012012012012 - nodes in this community are weakly interconnected._