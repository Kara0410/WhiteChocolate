import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppleMaps, GoogleMaps, type CameraPosition } from 'expo-maps';
import {
  ActivityIndicator,
  InteractionManager,
  Platform,
  Pressable,
  Text,
  View,
  type LayoutChangeEvent,
} from 'react-native';
import { LocateFixed, MapPinned } from 'lucide-react-native';
import Animated, {
  FadeIn,
  FadeOut,
  ReduceMotion,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  MAP_ELEVATIONS,
  MAP_LAYERS,
} from '@/components/parking-map/map-layers';
import { PARKING_SEMANTIC_ZOOM_THRESHOLDS } from '@/components/parking-map/map-detail-level';
import {
  ParkingBottomSheet,
  type ParkingBottomSheetHandle,
} from '@/components/parking-map/ParkingBottomSheet';
import { FavoriteParkingBottomSheet } from '@/components/parking-map/FavoriteParkingBottomSheet';
import { ParkingListBottomSheet } from '@/components/parking-map/ParkingListBottomSheet';
import { ParkingMarkerOverlay } from '@/components/parking-map/parking-marker-overlay';
import { SearchDestinationMarker } from '@/components/parking-map/search-destination-marker';
import { SearchNearestSpotsBottomSheet } from '@/components/parking-map/SearchNearestSpotsBottomSheet';
import { UserLocationMarker } from '@/components/parking-map/user-location-marker';
import { useParkingMarkerPipeline } from '@/components/parking-map/use-parking-marker-pipeline';
import { useFavoriteParking } from '@/context/FavoriteParkingContext';
import { useMapOverlay } from '@/context/MapOverlayContext';
import { useParkingMapData } from '@/hooks/use-parking-map-data';
import {
  MUNICH_CENTER,
  MUNICH_OVERVIEW_CAMERA,
} from '@/hooks/use-map-location';
import { useParkingZones } from '@/hooks/use-parking-zones';
import type { PlaceSearchResult } from '@/hooks/use-google-place-search';
import type {
  ParkingCellSummary,
  ParkingZoneSummary,
} from '@/types/parking-domain';
import type {
  ParkingCameraState,
  ParkingClusterResponse,
  ParkingCoordinates,
} from '@/types/parking-map';
import {
  createParkingSearchFocusCamera,
  hasValidParkingCoordinates,
  haversineDistanceMeters,
  isCoordinateInsideBounds,
} from '@/utils/parking-map-geo';
import { getZoneFocusZoom } from '@/utils/parking-zones';
import {
  getCuratedNearbyParkingSpots,
  SEARCH_NEARBY_RESULT_LIMIT,
  type ParkingSpotWithDistance,
} from '@/utils/parkingSearch';
import {
  isParkingContextCurrent,
  parkingSnapshotMatchesAvailableSpots,
  resolveCurrentParkingSelection,
  type ParkingSelectionSource,
} from '@/utils/parking-selection';

const LABEL_FREE_MAP_STYLE = JSON.stringify([
  {
    featureType: 'all',
    elementType: 'labels',
    stylers: [{ visibility: 'off' }],
  },
  {
    featureType: 'poi',
    elementType: 'all',
    stylers: [{ visibility: 'off' }],
  },
  {
    featureType: 'transit',
    elementType: 'all',
    stylers: [{ visibility: 'off' }],
  },
]);
const MAP_VIEW_STYLE = {
  elevation: MAP_ELEVATIONS.map,
  flex: 1,
  zIndex: MAP_LAYERS.map,
} as const;
const APPLE_MAP_PROPERTIES = {
  isMyLocationEnabled: false,
  pointsOfInterest: { including: [] },
};
const APPLE_MAP_UI_SETTINGS = {
  compassEnabled: false,
  myLocationButtonEnabled: false,
  scaleBarEnabled: false,
  togglePitchEnabled: false,
};
const GOOGLE_MAP_PROPERTIES = {
  isBuildingEnabled: false,
  isIndoorEnabled: false,
  isMyLocationEnabled: false,
  isTrafficEnabled: false,
  selectionEnabled: false,
  mapStyleOptions: { json: LABEL_FREE_MAP_STYLE },
};
const GOOGLE_MAP_UI_SETTINGS = {
  compassEnabled: false,
  indoorLevelPickerEnabled: false,
  mapToolbarEnabled: false,
  myLocationButtonEnabled: false,
  rotationGesturesEnabled: false,
  scaleBarEnabled: false,
  tiltGesturesEnabled: false,
  zoomControlsEnabled: false,
};

const FULL_SHEET_RATIO = 0.5;
const PROGRAMMATIC_CAMERA_GUARD_MS = 500;
/**
 * Extra time past the requested animation duration before the next
 * programmatic camera command may start. Android's expo-maps wrapper does
 * not expose the setCameraPosition promise, so a command that interrupts a
 * running animation surfaces as an uncatchable "Animation cancelled"
 * rejection — serializing commands is the only reliable prevention.
 */
const CAMERA_COMMAND_SETTLE_BUFFER_MS = 80;
const INITIAL_CAMERA_SETTLE_MS = 750;
const MAP_DRAG_SETTLE_MS = 180;
const MARKER_MOVEMENT_SETTLE_MS = 150;
const EMPTY_SEARCH_SPOTS: ParkingSpotWithDistance[] = [];
/** Only the top recommendations get map markers in active search mode. */
const SEARCH_HIGHLIGHTED_MARKER_LIMIT = 3;
/**
 * How far the camera centre must drift from the searched destination before
 * the "Search this area" action appears. Nearby results never auto-refresh
 * on pan; this is the only way to re-run them for a new area.
 */
const SEARCH_AREA_REFRESH_DISTANCE_METERS = 600;
/**
 * Fallback acceptance for search results: if any loaded spot is this close
 * to the destination, the loaded data is usable for recommendations even
 * when request-key bookkeeping was bypassed (the clustering hook silently
 * drops a fetch that was deduped or superseded, so waiting on an exact key
 * can otherwise hang the sheet in its loading state forever).
 */
const SEARCH_FALLBACK_ACCEPT_RADIUS_METERS = 1200;

const DETAIL_LAYER_ENTERING = FadeIn.duration(180).reduceMotion(
  ReduceMotion.System,
);
const DETAIL_LAYER_EXITING = FadeOut.duration(140).reduceMotion(
  ReduceMotion.System,
);
type ParkingMapProps = {
  initialCamera: ParkingCameraState;
  currentLocationFocusKey?: string;
  destination?: ParkingCoordinates;
  favoriteFocusKey?: string;
  favoriteSpotId?: string;
  searchFocusKey?: string;
  isLocationLoading?: boolean;
  locationMessage?: string | null;
  locationSettingsRequired?: boolean;
  onRequestUserLocation?: () => Promise<ParkingCoordinates | null>;
  onOpenLocationSettings?: () => Promise<void>;
  userLocation?: ParkingCoordinates | null;
};

type ParkingMapMode = 'focusedArea' | 'munichOverview' | 'userLocation';

type SelectParkingItemOptions = {
  source?: ParkingSelectionSource;
  focusCamera?: boolean;
};

type CameraFocusSource = ParkingSelectionSource;

type CameraFocusOptions = {
  source?: CameraFocusSource;
};

type SearchSpotsSnapshot = {
  contextHash: string | null;
  placeId: string;
  /** Parking request the snapshot was computed for; a new key (e.g. from
   * "Search this area") invalidates the snapshot without dropping it, so
   * old results stay visible until the replacement set is ready. */
  requestKey: string;
  spots: ParkingSpotWithDistance[];
};

type SearchParkingRequest = {
  key: string;
  origin: ParkingCoordinates;
  startedAtVersion: number;
};

type CameraAnimationCommand = {
  /** Android animation duration; the serialization window is based on it. */
  duration: number;
  execute: () => void;
};

function isCameraCancellationError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error ?? '');

  return (
    message.includes('CancellationException') ||
    message.includes('Animation cancelled') ||
    message.includes('setCameraPosition has been rejected')
  );
}

function hasValidCoordinates(item: ParkingClusterResponse) {
  return Number.isFinite(item.latitude) && Number.isFinite(item.longitude);
}

function safelyHandleCameraUpdate(update: unknown, context: string) {
  void Promise.resolve(update).catch((error: unknown) => {
    if (isCameraCancellationError(error)) {
      return;
    }

    if (__DEV__) {
      console.warn(context, error);
    }
  });
}

export function ParkingMap({
  initialCamera,
  currentLocationFocusKey,
  destination,
  favoriteFocusKey,
  favoriteSpotId,
  searchFocusKey,
  isLocationLoading = false,
  locationMessage,
  locationSettingsRequired = false,
  onRequestUserLocation,
  onOpenLocationSettings,
  userLocation,
}: ParkingMapProps) {
  const insets = useSafeAreaInsets();
  const startsAtUserLocation = userLocation !== null;
  const [mapSize, setMapSize] = useState({ width: 0, height: 0 });
  const [isAutomaticParkingFetchEnabled, setAutomaticParkingFetchEnabled] =
    useState(startsAtUserLocation);
  const [mapMode, setMapMode] =
    useState<ParkingMapMode>(
      startsAtUserLocation ? 'userLocation' : 'munichOverview',
    );
  const [selectedSearchPlace, setSelectedSearchPlace] =
    useState<PlaceSearchResult | null>(null);
  const estimateDestination = useMemo(
    () =>
      selectedSearchPlace
        ? {
            latitude: selectedSearchPlace.latitude,
            longitude: selectedSearchPlace.longitude,
            placeId: selectedSearchPlace.placeId,
          }
        : destination
          ? { ...destination, placeId: null }
          : undefined,
    [destination, selectedSearchPlace],
  );
  const { polygons: parkingZonePolygons } = useParkingZones();
  const {
    activeContextHash,
    availabilityMessage,
    availabilityStatus,
    clearParkingData,
    currentRegion,
    displayCamera,
    loadedContextHash,
    loadedRequestBounds,
    loadedRequestKey,
    loadedRequestVersion,
    onCameraMove,
    requestParkingForCamera,
    refreshParkingAvailabilityForCamera,
    retryLatest,
    layerState,
    semanticStage,
    visibleSpots,
  } = useParkingMapData(
    initialCamera,
    estimateDestination,
    userLocation,
    mapSize,
    isAutomaticParkingFetchEnabled,
    parkingZonePolygons,
  );
  const googleMapRef = useRef<GoogleMaps.MapView | null>(null);
  const appleMapRef = useRef<AppleMaps.MapView | null>(null);
  const bottomSheetRef = useRef<ParkingBottomSheetHandle>(null);
  const programmaticCameraTimerRef =
    useRef<ReturnType<typeof setTimeout> | null>(null);
  const initialCameraSettleTimerRef =
    useRef<ReturnType<typeof setTimeout> | null>(null);
  const mapDragSettleTimerRef =
    useRef<ReturnType<typeof setTimeout> | null>(null);
  const markerMovementSettleTimerRef =
    useRef<ReturnType<typeof setTimeout> | null>(null);
  const favoriteFocusTimerRef =
    useRef<ReturnType<typeof setTimeout> | null>(null);
  const favoriteFocusInteractionRef =
    useRef<ReturnType<typeof InteractionManager.runAfterInteractions> | null>(
      null,
    );
  const isProgrammaticCameraMoveRef = useRef(false);
  const isInitialCameraSettledRef = useRef(false);
  const lastCameraCommandRef = useRef<{
    key: string;
    startedAt: number;
  } | null>(null);
  const isMapMovingRef = useRef(false);
  const hasCompactedForCurrentDragRef = useRef(false);
  const hasInitialCameraEventRef = useRef(false);
  const pendingFocusItemRef = useRef<ParkingClusterResponse | null>(null);
  const pendingFocusSourceRef = useRef<CameraFocusSource>('marker');
  const pendingCoordinateFocusRef = useRef<ParkingCoordinates | null>(null);
  const pendingCoordinateFocusContextRef = useRef(
    'Unable to focus searched place',
  );
  const pendingLocationFocusRef = useRef<{
    context: string;
    coordinates: ParkingCoordinates;
    zoom: number;
  } | null>(null);
  const cameraFocusRequestIdRef = useRef(0);
  const locationActionRequestIdRef = useRef(0);
  const cameraAnimationUntilRef = useRef(0);
  const pendingCameraCommandRef = useRef<CameraAnimationCommand | null>(null);
  const pendingCameraCommandTimerRef =
    useRef<ReturnType<typeof setTimeout> | null>(null);
  const [selectedParkingItem, setSelectedParkingItem] =
    useState<ParkingClusterResponse | null>(null);
  const [selectedParkingSource, setSelectedParkingSource] =
    useState<ParkingSelectionSource | null>(null);
  const [searchParkingRequest, setSearchParkingRequest] =
    useState<SearchParkingRequest | null>(null);
  const [searchSpotsSnapshot, setSearchSpotsSnapshot] =
    useState<SearchSpotsSnapshot | null>(null);
  const [hasInitialCameraEvent, setHasInitialCameraEvent] = useState(false);
  const [isMapMoving, setIsMapMoving] = useState(false);
  const { favoriteItems } = useFavoriteParking();
  const {
    activeOverlay,
    closeOverlay,
    consumeSelection,
    openSearch,
    selection,
  } = useMapOverlay();
  const lastFocusedFavoriteRequestRef = useRef<string | null>(null);
  const lastSearchFocusKeyRef = useRef<string | null>(null);
  const lastSearchSelectionIdRef = useRef<number | null>(null);
  const lastLocationFocusKeyRef = useRef<string | null>(null);

  useEffect(() => {
    setSelectedParkingItem((currentItem) =>
      resolveCurrentParkingSelection({
        activeContextHash,
        favoriteItems,
        loadedContextHash,
        searchSnapshot: searchSpotsSnapshot,
        selectedItem: currentItem,
        source: selectedParkingSource,
        visibleSpots,
      }),
    );
  }, [
    activeContextHash,
    favoriteItems,
    loadedContextHash,
    searchSpotsSnapshot,
    selectedParkingSource,
    visibleSpots,
  ]);

  useEffect(() => {
    if (selectedSearchPlace === null) {
      return;
    }

    const searchOrigin = searchParkingRequest?.origin ?? {
      latitude: selectedSearchPlace.latitude,
      longitude: selectedSearchPlace.longitude,
    };
    const activeRequestKey = searchParkingRequest?.key ?? null;
    const snapshotMatchesPlace =
      searchSpotsSnapshot !== null &&
      searchSpotsSnapshot.placeId === selectedSearchPlace.placeId;
    // Once a snapshot exists for the active request, panning never
    // recomputes it; only a new request key ("Search this area") or a new
    // place invalidates it.
    const snapshotSatisfiesActiveRequest =
      snapshotMatchesPlace &&
      searchSpotsSnapshot.contextHash === activeContextHash &&
      (activeRequestKey === null ||
        searchSpotsSnapshot.requestKey === activeRequestKey) &&
      parkingSnapshotMatchesAvailableSpots(
        searchSpotsSnapshot.spots,
        visibleSpots,
      );
    if (snapshotSatisfiesActiveRequest) {
      return;
    }

    // Keep the previous snapshot visible while the context-specific segment
    // request is in flight. It must not be relabelled with the new hash while
    // visibleSpots still contains legacy or previous-context objects.
    if (!isParkingContextCurrent(activeContextHash, loadedContextHash)) {
      return;
    }

    const loadedExpectedRequest =
      activeRequestKey !== null && loadedRequestKey === activeRequestKey;
    const loadedEquivalentCameraArea =
      searchParkingRequest !== null &&
      loadedRequestVersion > searchParkingRequest.startedAtVersion &&
      loadedRequestBounds !== null &&
      isCoordinateInsideBounds(searchOrigin, loadedRequestBounds);
    // Last resort: usable data near the destination always resolves the
    // search, because the clustering hook can silently drop the tracked
    // fetch (dedupe/supersede) and neither condition above would ever pass.
    const hasSpotsNearDestination =
      visibleSpots.length > 0 &&
      visibleSpots.some(
        (spot) =>
          haversineDistanceMeters(spot, searchOrigin) <=
          SEARCH_FALLBACK_ACCEPT_RADIUS_METERS,
      );

    if (
      !loadedExpectedRequest &&
      !loadedEquivalentCameraArea &&
      !hasSpotsNearDestination
    ) {
      return;
    }

    const curatedNearbyResults = getCuratedNearbyParkingSpots({
      origin: searchOrigin,
      spots: visibleSpots,
      limit: SEARCH_NEARBY_RESULT_LIMIT,
    });

    // An empty curated list still becomes a snapshot: the sheet must show
    // its real empty state instead of loading forever.
    setSearchSpotsSnapshot({
      contextHash: activeContextHash,
      placeId: selectedSearchPlace.placeId,
      requestKey: activeRequestKey ?? `loaded:v${loadedRequestVersion}`,
      spots: curatedNearbyResults,
    });
  }, [
    activeContextHash,
    loadedRequestBounds,
    loadedContextHash,
    loadedRequestKey,
    loadedRequestVersion,
    searchParkingRequest,
    searchSpotsSnapshot,
    selectedSearchPlace,
    visibleSpots,
  ]);

  // Full ranked result set for the bottom sheet (curated, max 25).
  const nearestSearchSpots =
    selectedSearchPlace !== null &&
    searchSpotsSnapshot?.placeId === selectedSearchPlace.placeId
      ? searchSpotsSnapshot.spots
      : EMPTY_SEARCH_SPOTS;
  const isSearchParkingLoading =
    selectedSearchPlace !== null &&
    (availabilityStatus === 'loading' ||
      searchSpotsSnapshot?.placeId !== selectedSearchPlace.placeId ||
      searchSpotsSnapshot?.contextHash !== activeContextHash) &&
    layerState.status !== 'error';
  const searchParkingError =
    selectedSearchPlace === null
      ? null
      : availabilityMessage ??
        (layerState.status === 'error' ? layerState.error : null);
  // Only the top recommendations become map markers. While a new place's
  // results load, the previous snapshot keeps its markers on screen so the
  // layer crossfades instead of blanking out.
  const highlightedSearchSpots = useMemo(() => {
    if (selectedSearchPlace === null || searchSpotsSnapshot === null) {
      return EMPTY_SEARCH_SPOTS;
    }

    return searchSpotsSnapshot.spots.slice(
      0,
      SEARCH_HIGHLIGHTED_MARKER_LIMIT,
    );
  }, [searchSpotsSnapshot, selectedSearchPlace]);
  const isSearchRecommendationMode =
    selectedSearchPlace !== null && selectedParkingItem === null;
  // Refresh of the current place's results is pending (Search this area).
  const isSearchAreaRefreshing =
    selectedSearchPlace !== null &&
    searchParkingRequest !== null &&
    searchSpotsSnapshot?.placeId === selectedSearchPlace.placeId &&
    searchSpotsSnapshot.requestKey !== searchParkingRequest.key;
  const cameraDistanceFromSearchPlace = useMemo(() => {
    if (selectedSearchPlace === null) {
      return null;
    }

    const cameraCenter = {
      latitude: displayCamera.latitude,
      longitude: displayCamera.longitude,
    };
    if (!hasValidParkingCoordinates(cameraCenter)) {
      return null;
    }

    return haversineDistanceMeters(cameraCenter, selectedSearchPlace);
  }, [
    displayCamera.latitude,
    displayCamera.longitude,
    selectedSearchPlace,
  ]);

  const {
    projectedCellSummaries,
    projectedMarkers,
    projectedSearchDestination,
    projectedUserLocation,
    projectedZoneSummaries,
  } = useParkingMarkerPipeline({
    activeOverlay,
    currentRegion,
    semanticStage: layerState.visibleStage,
    displayCamera,
    highlightedSearchSpots,
    isAutomaticParkingFetchEnabled,
    isMapMoving,
    loadedRequestBounds,
    mapMode,
    mapSize,
    layerFeatures: layerState.visibleFeatures,
    selectedParkingItem,
    selectedSearchPlace,
    userLocation,
  });
  const nativeZonePolygons = useMemo(
    () =>
      mapMode === 'munichOverview' ||
      semanticStage === 'city' ||
      semanticStage === 'zone'
        ? parkingZonePolygons.map((polygon) => ({
            id: polygon.id,
            coordinates: polygon.coordinates,
            color: '#2563EB20',
            lineColor: '#1D4ED8B8',
            lineWidth: 1,
          }))
        : [],
    [mapMode, parkingZonePolygons, semanticStage],
  );

  const canFocusCamera = useCallback(
    () =>
      mapSize.width > 0 &&
      mapSize.height > 0 &&
      hasInitialCameraEvent &&
      ((Platform.OS === 'android' && googleMapRef.current !== null) ||
        (Platform.OS === 'ios' && appleMapRef.current !== null)),
    [hasInitialCameraEvent, mapSize.height, mapSize.width],
  );

  const cancelPendingCameraFocus = useCallback(() => {
    cameraFocusRequestIdRef.current += 1;
    locationActionRequestIdRef.current += 1;
    pendingFocusItemRef.current = null;
    pendingFocusSourceRef.current = 'marker';
    pendingCoordinateFocusRef.current = null;
    pendingLocationFocusRef.current = null;
    pendingCameraCommandRef.current = null;

    if (pendingCameraCommandTimerRef.current) {
      clearTimeout(pendingCameraCommandTimerRef.current);
      pendingCameraCommandTimerRef.current = null;
    }
    if (favoriteFocusTimerRef.current) {
      clearTimeout(favoriteFocusTimerRef.current);
      favoriteFocusTimerRef.current = null;
    }
    if (favoriteFocusInteractionRef.current) {
      favoriteFocusInteractionRef.current.cancel();
      favoriteFocusInteractionRef.current = null;
    }
  }, []);

  /**
   * Runs a programmatic camera animation only when no other one is in
   * flight; otherwise the command is parked until the current window ends.
   * Only the newest parked command survives, so rapid taps resolve to the
   * user's latest intent without ever cancelling a native animation.
   */
  const runOrQueueCameraCommand = useCallback(
    (command: CameraAnimationCommand) => {
      const run = (nextCommand: CameraAnimationCommand) => {
        const now = Date.now();
        const waitMs = cameraAnimationUntilRef.current - now;

        if (waitMs <= 0) {
          cameraAnimationUntilRef.current =
            now + nextCommand.duration + CAMERA_COMMAND_SETTLE_BUFFER_MS;
          nextCommand.execute();
          return;
        }

        pendingCameraCommandRef.current = nextCommand;
        if (pendingCameraCommandTimerRef.current === null) {
          pendingCameraCommandTimerRef.current = setTimeout(() => {
            pendingCameraCommandTimerRef.current = null;
            const pending = pendingCameraCommandRef.current;
            pendingCameraCommandRef.current = null;
            if (pending) {
              run(pending);
            }
          }, waitMs);
        }
      };

      run(command);
    },
    [],
  );

  const beginProgrammaticCameraMove = useCallback(
    (coordinates: ParkingCoordinates, zoom: number) => {
      const key = [
        coordinates.latitude.toFixed(6),
        coordinates.longitude.toFixed(6),
        zoom.toFixed(2),
      ].join(':');
      const now = Date.now();
      const lastCommand = lastCameraCommandRef.current;

      if (
        isProgrammaticCameraMoveRef.current &&
        lastCommand?.key === key &&
        now - lastCommand.startedAt < PROGRAMMATIC_CAMERA_GUARD_MS
      ) {
        return false;
      }

      lastCameraCommandRef.current = { key, startedAt: now };
      isProgrammaticCameraMoveRef.current = true;
      if (programmaticCameraTimerRef.current) {
        clearTimeout(programmaticCameraTimerRef.current);
      }
      programmaticCameraTimerRef.current = setTimeout(() => {
        isProgrammaticCameraMoveRef.current = false;
        programmaticCameraTimerRef.current = null;
      }, PROGRAMMATIC_CAMERA_GUARD_MS);

      return true;
    },
    [],
  );

  const focusMarkerAboveSheetSafely = useCallback(
    (
      item: ParkingClusterResponse,
      options: CameraFocusOptions & { requestId?: number } = {},
    ) => {
      const source = options.source ?? 'marker';

      if (!hasValidCoordinates(item)) {
        return;
      }

      const requestId =
        options.requestId ?? (cameraFocusRequestIdRef.current += 1);

      if (requestId !== cameraFocusRequestIdRef.current) {
        return;
      }

      if (!canFocusCamera()) {
        pendingFocusItemRef.current = item;
        pendingFocusSourceRef.current = source;
        return;
      }

      const longitudeDelta =
        displayCamera.longitudeDelta ??
        Math.max(0.000001, (360 / 2 ** displayCamera.zoom) * 2);
      const latitudeDelta =
        displayCamera.latitudeDelta ??
        Math.max(0.000001, longitudeDelta * 1.6);
      const visibleMapRatio = 1 - FULL_SHEET_RATIO;
      const desiredMarkerYRatio = visibleMapRatio / 2;
      const yOffsetRatio = 0.5 - desiredMarkerYRatio;
      const nextCamera = {
        coordinates: {
          latitude: item.latitude - latitudeDelta * yOffsetRatio,
          longitude: item.longitude,
        },
        zoom: displayCamera.zoom,
      };

      const duration = source === 'favorite' ? 0 : 320;
      runOrQueueCameraCommand({
        duration,
        execute: () => {
          if (
            !beginProgrammaticCameraMove(
              nextCamera.coordinates,
              nextCamera.zoom,
            )
          ) {
            return;
          }

          try {
            const cameraUpdate =
              Platform.OS === 'android'
                ? googleMapRef.current!.setCameraPosition({
                    ...nextCamera,
                    duration,
                  })
                : appleMapRef.current!.setCameraPosition(nextCamera);

            safelyHandleCameraUpdate(
              cameraUpdate,
              source === 'favorite'
                ? 'Favorite camera focus failed'
                : 'Unable to focus parking map camera',
            );
          } catch (error) {
            if (isCameraCancellationError(error)) {
              return;
            }

            if (__DEV__) {
              console.warn(
                source === 'favorite'
                  ? 'Favorite camera focus failed'
                  : 'Unable to focus parking map camera',
                error,
              );
            }
          }
        },
      });
    },
    [
      canFocusCamera,
      beginProgrammaticCameraMove,
      displayCamera.latitudeDelta,
      displayCamera.longitudeDelta,
      displayCamera.zoom,
      runOrQueueCameraCommand,
    ],
  );

  const focusCoordinatesAboveSheetSafely = useCallback(
    (coordinates: ParkingCoordinates, context: string) => {
      if (!hasValidParkingCoordinates(coordinates)) {
        return;
      }

      if (!canFocusCamera()) {
        pendingCoordinateFocusRef.current = coordinates;
        pendingCoordinateFocusContextRef.current = context;
        return;
      }

      const searchCamera = createParkingSearchFocusCamera(
        coordinates,
        mapSize,
        Platform.OS === 'ios' ? 'apple' : 'google',
        FULL_SHEET_RATIO,
      );
      if (searchCamera === null) {
        return;
      }

      const nextCamera = {
        coordinates: {
          latitude: searchCamera.latitude,
          longitude: searchCamera.longitude,
        },
        zoom: searchCamera.zoom,
      };

      const startedAtVersion = loadedRequestVersion;
      const key = requestParkingForCamera(searchCamera);
      setSearchParkingRequest({ key, origin: coordinates, startedAtVersion });

      runOrQueueCameraCommand({
        duration: 360,
        execute: () => {
          if (
            !beginProgrammaticCameraMove(
              nextCamera.coordinates,
              nextCamera.zoom,
            )
          ) {
            return;
          }

          try {
            const cameraUpdate =
              Platform.OS === 'android'
                ? googleMapRef.current!.setCameraPosition({
                    ...nextCamera,
                    duration: 360,
                  })
                : appleMapRef.current!.setCameraPosition(nextCamera);

            safelyHandleCameraUpdate(cameraUpdate, context);
          } catch (error) {
            if (isCameraCancellationError(error)) {
              return;
            }

            if (__DEV__) {
              console.warn(context, error);
            }
          }
        },
      });
    },
    [
      beginProgrammaticCameraMove,
      canFocusCamera,
      loadedRequestVersion,
      mapSize,
      requestParkingForCamera,
      runOrQueueCameraCommand,
    ],
  );

  const focusLocationSafely = useCallback(
    (
      coordinates: ParkingCoordinates,
      context: string,
      zoom = 17,
    ) => {
      if (!hasValidParkingCoordinates(coordinates)) {
        return;
      }

      if (!canFocusCamera()) {
        pendingLocationFocusRef.current = {
          context,
          coordinates,
          zoom,
        };
        return;
      }

      const nextCamera = {
        coordinates,
        zoom,
        bearing: 0,
        tilt: 0,
      };

      runOrQueueCameraCommand({
        duration: 360,
        execute: () => {
          if (!beginProgrammaticCameraMove(coordinates, zoom)) {
            return;
          }

          try {
            const cameraUpdate =
              Platform.OS === 'android'
                ? googleMapRef.current!.setCameraPosition({
                    ...nextCamera,
                    duration: 360,
                  })
                : appleMapRef.current!.setCameraPosition(nextCamera);

            safelyHandleCameraUpdate(cameraUpdate, context);
          } catch (error) {
            if (!isCameraCancellationError(error) && __DEV__) {
              console.warn(context, error);
            }
          }
        },
      });
    },
    [beginProgrammaticCameraMove, canFocusCamera, runOrQueueCameraCommand],
  );

  const selectParkingItem = useCallback(
    (
      item: ParkingClusterResponse,
      options: SelectParkingItemOptions = {},
    ) => {
      const { source = 'marker' } = options;
      const focusCamera = options.focusCamera ?? true;

      setMapMode('focusedArea');
      setSelectedParkingItem(item);
      setSelectedParkingSource(source);
      if (!focusCamera) {
        cancelPendingCameraFocus();
        return;
      }

      if (source === 'favorite') {
        cancelPendingCameraFocus();
        favoriteFocusInteractionRef.current =
          InteractionManager.runAfterInteractions(() => {
            favoriteFocusTimerRef.current = setTimeout(() => {
              favoriteFocusTimerRef.current = null;
              focusMarkerAboveSheetSafely(item, { source: 'favorite' });
            }, 120);
          });
        return;
      }

      focusMarkerAboveSheetSafely(item, { source: 'marker' });
    },
    [
      cancelPendingCameraFocus,
      focusMarkerAboveSheetSafely,
    ],
  );

  const expandClusterSafely = useCallback(
    (item: ParkingClusterResponse) => {
      if (!hasValidCoordinates(item)) {
        return;
      }

      cancelPendingCameraFocus();
      const currentZoom = Number.isFinite(displayCamera.zoom)
        ? displayCamera.zoom
        : PARKING_SEMANTIC_ZOOM_THRESHOLDS.segmentEnter;
      // Always zoom in at least one level so repeated taps make progress
      // even when supercluster reports an expansion zoom we already passed.
      const targetZoom = Math.min(
        17,
        Math.max(
          item.expansionZoom ?? currentZoom + 2,
          Math.floor(currentZoom) + 1,
        ),
      );
      const coordinates = {
        latitude: item.latitude,
        longitude: item.longitude,
      };

      setMapMode('focusedArea');
      setAutomaticParkingFetchEnabled(true);
      requestParkingForCamera({ ...coordinates, zoom: targetZoom });
      focusLocationSafely(
        coordinates,
        'Unable to expand the parking cluster',
        targetZoom,
      );
    },
    [
      cancelPendingCameraFocus,
      displayCamera.zoom,
      focusLocationSafely,
      requestParkingForCamera,
    ],
  );

  const handleMarkerPress = useCallback(
    (item: ParkingClusterResponse) => {
      if (item.type === 'cluster') {
        setSearchParkingRequest(null);
        setSearchSpotsSnapshot(null);
        setSelectedSearchPlace(null);
        expandClusterSafely(item);
        return;
      }

      const source = selectedSearchPlace === null ? 'marker' : 'search';
      if (source === 'marker') {
        setSearchParkingRequest(null);
        setSearchSpotsSnapshot(null);
      }
      selectParkingItem(item, { source });
    },
    [expandClusterSafely, selectParkingItem, selectedSearchPlace],
  );

  const handleZoneSummaryPress = useCallback(
    (summary: ParkingZoneSummary) => {
      cancelPendingCameraFocus();
      const targetZoom = getZoneFocusZoom(
        parkingZonePolygons,
        summary.zoneId,
        mapSize.width,
        PARKING_SEMANTIC_ZOOM_THRESHOLDS.cellEnter + 0.15,
        PARKING_SEMANTIC_ZOOM_THRESHOLDS.segmentClusterEnter - 0.2,
      );
      const coordinates = {
        latitude: summary.representativePoint.latitude,
        longitude: summary.representativePoint.longitude,
      };

      setMapMode('focusedArea');
      setAutomaticParkingFetchEnabled(true);
      requestParkingForCamera({ ...coordinates, zoom: targetZoom });
      focusLocationSafely(
        coordinates,
        'Unable to focus the parking zone',
        targetZoom,
      );
    },
    [
      cancelPendingCameraFocus,
      focusLocationSafely,
      mapSize.width,
      parkingZonePolygons,
      requestParkingForCamera,
    ],
  );

  const handleCellSummaryPress = useCallback(
    (summary: ParkingCellSummary) => {
      cancelPendingCameraFocus();
      const targetZoom =
        PARKING_SEMANTIC_ZOOM_THRESHOLDS.segmentClusterEnter + 0.2;
      setMapMode('focusedArea');
      setAutomaticParkingFetchEnabled(true);
      requestParkingForCamera({ ...summary.center, zoom: targetZoom });
      focusLocationSafely(
        summary.center,
        'Unable to focus the parking area',
        targetZoom,
      );
    },
    [
      cancelPendingCameraFocus,
      focusLocationSafely,
      requestParkingForCamera,
    ],
  );

  const handleZonePolygonPress = useCallback(
    (polygon: { id?: string }) => {
      if (!polygon.id) {
        return;
      }
      const zoneId = polygon.id.split(':')[0];
      const feature = layerState.visibleFeatures.find(
        (candidate) =>
          candidate.kind === 'zone' && candidate.zoneId === zoneId,
      );
      if (!feature || feature.kind !== 'zone') {
        return;
      }
      const targetZoom = PARKING_SEMANTIC_ZOOM_THRESHOLDS.zoneEnter + 0.2;
      setMapMode('focusedArea');
      setAutomaticParkingFetchEnabled(true);
      focusLocationSafely(
        feature.coordinates,
        'Unable to focus the parking zone',
        targetZoom,
      );
    },
    [focusLocationSafely, layerState.visibleFeatures],
  );

  const handleSelectSearchPlace = useCallback(
    (place: PlaceSearchResult) => {
      if (!hasValidParkingCoordinates(place)) {
        return;
      }

      setMapMode('focusedArea');
      setAutomaticParkingFetchEnabled(true);
      setSelectedParkingItem(null);
      setSelectedParkingSource(null);
      cancelPendingCameraFocus();
      clearParkingData();
      setSearchParkingRequest(null);
      // Deliberately keep the previous snapshot: its markers stay visible
      // and crossfade out once the new place's recommendations arrive.
      setSelectedSearchPlace(place);
      focusCoordinatesAboveSheetSafely(
        { latitude: place.latitude, longitude: place.longitude },
        'Unable to focus searched place',
      );
    },
    [
      cancelPendingCameraFocus,
      clearParkingData,
      focusCoordinatesAboveSheetSafely,
    ],
  );

  const closeSearchResults = useCallback(() => {
    if (selectedParkingItem !== null) {
      return;
    }
    setSelectedSearchPlace(null);
    setSearchParkingRequest(null);
    setSearchSpotsSnapshot(null);
  }, [selectedParkingItem]);

  const handleSearchThisAreaPress = useCallback(() => {
    if (selectedSearchPlace === null) {
      return;
    }

    const camera: ParkingCameraState = {
      latitude: displayCamera.latitude,
      longitude: displayCamera.longitude,
      zoom: Number.isFinite(displayCamera.zoom)
        ? displayCamera.zoom
        : PARKING_SEMANTIC_ZOOM_THRESHOLDS.segmentEnter,
      latitudeDelta: displayCamera.latitudeDelta,
      longitudeDelta: displayCamera.longitudeDelta,
    };
    const startedAtVersion = loadedRequestVersion;
    const key = refreshParkingAvailabilityForCamera(camera);
    // A new request key invalidates the snapshot; the effect above rebuilds
    // recommendations from the freshly fetched area and ranks them from the
    // visible map center, matching the action label.
    setSearchParkingRequest({
      key,
      origin: {
        latitude: displayCamera.latitude,
        longitude: displayCamera.longitude,
      },
      startedAtVersion,
    });
  }, [
    displayCamera.latitude,
    displayCamera.latitudeDelta,
    displayCamera.longitude,
    displayCamera.longitudeDelta,
    displayCamera.zoom,
    loadedRequestVersion,
    refreshParkingAvailabilityForCamera,
    selectedSearchPlace,
  ]);

  const handleSearchSpotPress = useCallback(
    (item: ParkingClusterResponse) => {
      setSearchParkingRequest(null);
      selectParkingItem(item, { source: 'search', focusCamera: true });
    },
    [selectParkingItem],
  );

  const clearSelection = useCallback(() => {
    setSelectedParkingItem(null);
    setSelectedParkingSource(null);
    setSelectedSearchPlace(null);
    setSearchParkingRequest(null);
    setSearchSpotsSnapshot(null);
  }, []);

  const prepareForLocationFocus = useCallback(() => {
    closeOverlay();
    setSelectedSearchPlace(null);
    setSearchParkingRequest(null);
    setSearchSpotsSnapshot(null);
    clearSelection();
    cancelPendingCameraFocus();
  }, [cancelPendingCameraFocus, clearSelection, closeOverlay]);

  const handleCurrentLocationPress = useCallback(async () => {
    if (!onRequestUserLocation || isLocationLoading) {
      return;
    }

    prepareForLocationFocus();
    const requestId = ++locationActionRequestIdRef.current;
    const coordinates = await onRequestUserLocation();
    if (
      coordinates &&
      requestId === locationActionRequestIdRef.current
    ) {
      clearParkingData();
      setMapMode('userLocation');
      setAutomaticParkingFetchEnabled(true);
      requestParkingForCamera({
        ...coordinates,
        zoom: 17,
      });
      focusLocationSafely(
        coordinates,
        'Unable to focus the map on your location',
      );
    }
  }, [
    clearParkingData,
    focusLocationSafely,
    isLocationLoading,
    onRequestUserLocation,
    prepareForLocationFocus,
    requestParkingForCamera,
  ]);

  const handleMunichOverviewPress = useCallback(() => {
    prepareForLocationFocus();
    locationActionRequestIdRef.current += 1;
    setMapMode('munichOverview');
    setAutomaticParkingFetchEnabled(false);
    clearParkingData();
    focusLocationSafely(
      MUNICH_CENTER,
      'Unable to focus the Munich overview',
      MUNICH_OVERVIEW_CAMERA.zoom,
    );
  }, [
    clearParkingData,
    focusLocationSafely,
    prepareForLocationFocus,
  ]);

  const handleOverlaySpotPress = useCallback(
    (item: ParkingClusterResponse, source: ParkingSelectionSource) => {
      closeOverlay();
      setSelectedSearchPlace(null);
      selectParkingItem(item, { source, focusCamera: true });
    },
    [closeOverlay, selectParkingItem],
  );

  const handleParkingOverlaySpotPress = useCallback(
    (item: ParkingClusterResponse) => {
      handleOverlaySpotPress(item, 'marker');
    },
    [handleOverlaySpotPress],
  );

  const handleFavoriteOverlaySpotPress = useCallback(
    (item: ParkingClusterResponse) => {
      handleOverlaySpotPress(item, 'favorite');
    },
    [handleOverlaySpotPress],
  );

  const handleMapPress = useCallback(() => {
    if (activeOverlay !== 'none') {
      closeOverlay();
      return;
    }

    clearSelection();
  }, [activeOverlay, clearSelection, closeOverlay]);

  const handleLayout = useCallback((event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setMapSize((current) =>
      current.width === width && current.height === height
        ? current
        : { width, height },
    );
  }, []);

  const handleCameraMove = useCallback(
    (event: Parameters<typeof onCameraMove>[0]) => {
      onCameraMove(event, !isProgrammaticCameraMoveRef.current);
      if (
        hasInitialCameraEventRef.current &&
        isInitialCameraSettledRef.current &&
        !isProgrammaticCameraMoveRef.current
      ) {
        setMapMode('focusedArea');
        setAutomaticParkingFetchEnabled(true);
      }
      if (!isMapMovingRef.current) {
        isMapMovingRef.current = true;
        setIsMapMoving(true);
      }
      if (markerMovementSettleTimerRef.current) {
        clearTimeout(markerMovementSettleTimerRef.current);
      }
      markerMovementSettleTimerRef.current = setTimeout(() => {
        isMapMovingRef.current = false;
        setIsMapMoving(false);
        markerMovementSettleTimerRef.current = null;
      }, MARKER_MOVEMENT_SETTLE_MS);

      if (!hasInitialCameraEventRef.current) {
        hasInitialCameraEventRef.current = true;
        setHasInitialCameraEvent(true);
        initialCameraSettleTimerRef.current = setTimeout(() => {
          isInitialCameraSettledRef.current = true;
          initialCameraSettleTimerRef.current = null;
        }, INITIAL_CAMERA_SETTLE_MS);
      }

      if (isProgrammaticCameraMoveRef.current || selectedParkingItem === null) {
        return;
      }

      if (!hasCompactedForCurrentDragRef.current) {
        hasCompactedForCurrentDragRef.current = true;
        bottomSheetRef.current?.compact();
      }

      if (mapDragSettleTimerRef.current) {
        clearTimeout(mapDragSettleTimerRef.current);
      }
      mapDragSettleTimerRef.current = setTimeout(() => {
        hasCompactedForCurrentDragRef.current = false;
        mapDragSettleTimerRef.current = null;
      }, MAP_DRAG_SETTLE_MS);
    },
    [onCameraMove, selectedParkingItem],
  );

  useEffect(
    () => () => {
      if (programmaticCameraTimerRef.current) {
        clearTimeout(programmaticCameraTimerRef.current);
      }
      if (initialCameraSettleTimerRef.current) {
        clearTimeout(initialCameraSettleTimerRef.current);
      }
      if (mapDragSettleTimerRef.current) {
        clearTimeout(mapDragSettleTimerRef.current);
      }
      if (markerMovementSettleTimerRef.current) {
        clearTimeout(markerMovementSettleTimerRef.current);
      }
      if (favoriteFocusTimerRef.current) {
        clearTimeout(favoriteFocusTimerRef.current);
      }
      if (favoriteFocusInteractionRef.current) {
        favoriteFocusInteractionRef.current.cancel();
      }
      if (pendingCameraCommandTimerRef.current) {
        clearTimeout(pendingCameraCommandTimerRef.current);
      }
      pendingCameraCommandRef.current = null;
      pendingFocusItemRef.current = null;
      pendingCoordinateFocusRef.current = null;
      pendingLocationFocusRef.current = null;
      cameraFocusRequestIdRef.current += 1;
      locationActionRequestIdRef.current += 1;
    },
    [],
  );

  useEffect(() => {
    if (
      favoriteSpotId === undefined ||
      `${favoriteSpotId}:${favoriteFocusKey ?? ''}` ===
        lastFocusedFavoriteRequestRef.current
    ) {
      return;
    }

    const favoriteItem = favoriteItems.find(
      (item) => item.id === favoriteSpotId,
    );

    if (favoriteItem === undefined) {
      return;
    }

    lastFocusedFavoriteRequestRef.current = `${favoriteSpotId}:${
      favoriteFocusKey ?? ''
    }`;
    selectParkingItem(favoriteItem, {
      focusCamera: true,
      source: 'favorite',
    });
  }, [favoriteFocusKey, favoriteItems, favoriteSpotId, selectParkingItem]);

  useEffect(() => {
    if (activeOverlay === 'none') {
      return;
    }

    cancelPendingCameraFocus();
    setSelectedSearchPlace(null);
    setSearchParkingRequest(null);
    setSearchSpotsSnapshot(null);
    clearSelection();
  }, [activeOverlay, cancelPendingCameraFocus, clearSelection]);

  useEffect(() => {
    if (
      searchFocusKey === undefined ||
      searchFocusKey === lastSearchFocusKeyRef.current
    ) {
      return;
    }

    lastSearchFocusKeyRef.current = searchFocusKey;
    openSearch();
  }, [openSearch, searchFocusKey]);

  useEffect(() => {
    if (
      currentLocationFocusKey === undefined ||
      currentLocationFocusKey === lastLocationFocusKeyRef.current
    ) {
      return;
    }

    lastLocationFocusKeyRef.current = currentLocationFocusKey;
    void handleCurrentLocationPress();
  }, [currentLocationFocusKey, handleCurrentLocationPress]);

  useEffect(() => {
    if (
      selection === null ||
      selection.id === lastSearchSelectionIdRef.current
    ) {
      return;
    }

    lastSearchSelectionIdRef.current = selection.id;
    handleSelectSearchPlace(selection.place);
    consumeSelection(selection.id);
  }, [consumeSelection, handleSelectSearchPlace, selection]);

  useEffect(() => {
    if (!canFocusCamera()) {
      return;
    }

    const pendingFocusItem = pendingFocusItemRef.current;
    if (pendingFocusItem !== null) {
      pendingFocusItemRef.current = null;
      focusMarkerAboveSheetSafely(pendingFocusItem, {
        source: pendingFocusSourceRef.current,
      });
    }

    const pendingCoordinateFocus = pendingCoordinateFocusRef.current;
    if (pendingCoordinateFocus !== null) {
      pendingCoordinateFocusRef.current = null;
      focusCoordinatesAboveSheetSafely(
        pendingCoordinateFocus,
        pendingCoordinateFocusContextRef.current,
      );
    }

    const pendingLocationFocus = pendingLocationFocusRef.current;
    if (pendingLocationFocus !== null) {
      pendingLocationFocusRef.current = null;
      focusLocationSafely(
        pendingLocationFocus.coordinates,
        pendingLocationFocus.context,
        pendingLocationFocus.zoom,
      );
    }
  }, [
    canFocusCamera,
    focusCoordinatesAboveSheetSafely,
    focusLocationSafely,
    focusMarkerAboveSheetSafely,
    hasInitialCameraEvent,
    mapSize.height,
    mapSize.width,
  ]);

  const cameraPosition = useMemo<CameraPosition>(
    () => ({
      coordinates: {
        latitude: initialCamera.latitude,
        longitude: initialCamera.longitude,
      },
      zoom: initialCamera.zoom,
      bearing: 0,
      tilt: 0,
    }),
    [initialCamera],
  );

  return (
    <View className="flex-1 overflow-hidden" onLayout={handleLayout}>
      {Platform.OS === 'ios' ? (
        <AppleMaps.View
          ref={appleMapRef}
          cameraPosition={cameraPosition}
          onCameraMove={handleCameraMove}
          onMapClick={handleMapPress}
          onPolygonClick={handleZonePolygonPress}
          polygons={nativeZonePolygons}
          properties={APPLE_MAP_PROPERTIES}
          style={MAP_VIEW_STYLE}
          uiSettings={APPLE_MAP_UI_SETTINGS}
        />
      ) : Platform.OS === 'android' ? (
        <GoogleMaps.View
          ref={googleMapRef}
          cameraPosition={cameraPosition}
          onCameraMove={handleCameraMove}
          onMapClick={handleMapPress}
          onPolygonClick={handleZonePolygonPress}
          polygons={nativeZonePolygons}
          properties={GOOGLE_MAP_PROPERTIES}
          style={MAP_VIEW_STYLE}
          uiSettings={GOOGLE_MAP_UI_SETTINGS}
        />
      ) : (
        <View className="flex-1 items-center justify-center">
          <Text selectable>Maps are only available on Android and iOS.</Text>
        </View>
      )}

      <ParkingMarkerOverlay
        semanticStage={layerState.visibleStage}
        isMapMoving={isMapMoving}
        isSearchRecommendationMode={isSearchRecommendationMode}
        onMarkerPress={handleMarkerPress}
        onCellSummaryPress={handleCellSummaryPress}
        onZoneSummaryPress={handleZoneSummaryPress}
        projectedMarkers={projectedMarkers}
        projectedCellSummaries={projectedCellSummaries}
        projectedZoneSummaries={projectedZoneSummaries}
        selectedParkingItemId={selectedParkingItem?.id}
      />

      {projectedSearchDestination ? (
        <View
          accessibilityLabel="Searched destination"
          accessibilityRole="image"
          accessible
          collapsable={false}
          pointerEvents="none"
          style={{
            elevation: MAP_ELEVATIONS.markerHighlights,
            height: 44,
            left: 0,
            position: 'absolute',
            top: 0,
            transform: [
              { translateX: projectedSearchDestination.x - 20 },
              { translateY: projectedSearchDestination.y - 38 },
            ],
            width: 40,
            zIndex: MAP_LAYERS.markerHighlights,
          }}
        >
          <SearchDestinationMarker />
        </View>
      ) : null}

      {projectedUserLocation ? (
        <View
          collapsable={false}
          pointerEvents="none"
          style={{
            elevation: MAP_ELEVATIONS.markerHighlights,
            height: 28,
            left: 0,
            position: 'absolute',
            top: 0,
            transform: [
              { translateX: projectedUserLocation.x - 14 },
              { translateY: projectedUserLocation.y - 14 },
            ],
            width: 28,
            zIndex: MAP_LAYERS.markerHighlights,
          }}
        >
          <UserLocationMarker />
        </View>
      ) : null}

      {isSearchRecommendationMode &&
      activeOverlay === 'none' &&
      !isSearchParkingLoading &&
      cameraDistanceFromSearchPlace !== null &&
      cameraDistanceFromSearchPlace > SEARCH_AREA_REFRESH_DISTANCE_METERS ? (
        <View
          pointerEvents="box-none"
          style={{
            alignItems: 'center',
            elevation: MAP_ELEVATIONS.floatingControls,
            left: 0,
            position: 'absolute',
            right: 0,
            top: insets.top + 12,
            zIndex: MAP_LAYERS.floatingControls,
          }}
        >
          <Animated.View
            entering={DETAIL_LAYER_ENTERING}
            exiting={DETAIL_LAYER_EXITING}
          >
            <Pressable
              accessibilityHint="Finds parking recommendations in the visible map area"
              accessibilityLabel="Search this area"
              accessibilityRole="button"
              className="flex-row items-center rounded-full border border-slate-200 bg-white px-4 py-2.5 shadow-floating-strong active:bg-slate-100"
              disabled={isSearchAreaRefreshing}
              onPress={handleSearchThisAreaPress}
            >
              {isSearchAreaRefreshing ? (
                <ActivityIndicator color="#2563EB" size="small" />
              ) : null}
              <Text
                className={`text-[14px] font-bold text-blue-700${
                  isSearchAreaRefreshing ? ' ml-2' : ''
                }`}
              >
                {isSearchAreaRefreshing
                  ? 'Searching this area'
                  : 'Search this area'}
              </Text>
            </Pressable>
          </Animated.View>
        </View>
      ) : null}

      {activeOverlay === 'none' &&
      selectedParkingItem === null &&
      selectedSearchPlace === null ? (
        <View
          className="absolute right-4 items-end gap-2"
          pointerEvents="box-none"
          style={{
            bottom: Math.max(insets.bottom, 10) + 104,
            elevation: MAP_ELEVATIONS.floatingControls,
            zIndex: MAP_LAYERS.floatingControls,
          }}
        >
          {locationMessage ? (
            <View className="max-w-72 items-end rounded-2xl bg-slate-950/90 px-3 py-2 shadow-floating-message">
              <Text className="text-right text-xs font-semibold leading-4 text-white">
                {locationMessage}
              </Text>
              {locationSettingsRequired && onOpenLocationSettings ? (
                <Pressable
                  accessibilityLabel="Open location settings"
                  accessibilityRole="button"
                  className="mt-2 min-h-9 justify-center rounded-full bg-white/15 px-3 active:bg-white/25"
                  onPress={() => {
                    void onOpenLocationSettings();
                  }}
                >
                  <Text className="text-xs font-extrabold text-white">
                    Open Settings
                  </Text>
                </Pressable>
              ) : null}
            </View>
          ) : null}
          <Pressable
            accessibilityLabel="Center map on current location"
            accessibilityRole="button"
            accessibilityState={{
              selected: mapMode === 'userLocation',
            }}
            className="h-12 w-12 items-center justify-center rounded-full border border-slate-200 bg-white shadow-floating-deep active:bg-slate-100"
            disabled={isLocationLoading}
            onPress={handleCurrentLocationPress}
          >
            {isLocationLoading ? (
              <ActivityIndicator color="#2563EB" size="small" />
            ) : (
              <LocateFixed color="#2563EB" size={22} strokeWidth={2.4} />
            )}
          </Pressable>
          <Pressable
            accessibilityHint="Returns to the full Munich parking zone map"
            accessibilityLabel="Show Munich parking zone overview"
            accessibilityRole="button"
            accessibilityState={{
              selected: mapMode === 'munichOverview',
            }}
            className="h-12 w-12 items-center justify-center rounded-full border border-blue-200 bg-blue-50 shadow-floating-strong active:bg-blue-100"
            onPress={handleMunichOverviewPress}
          >
            <MapPinned color="#1D4ED8" size={21} strokeWidth={2.3} />
          </Pressable>
        </View>
      ) : null}

      <View
        collapsable={false}
        pointerEvents="box-none"
        style={{
          elevation: MAP_ELEVATIONS.bottomSheetHost,
          inset: 0,
          position: 'absolute',
          zIndex: MAP_LAYERS.bottomSheetHost,
        }}
      >
        <ParkingBottomSheet
          ref={bottomSheetRef}
          item={selectedParkingItem}
          onClose={clearSelection}
        />

        <SearchNearestSpotsBottomSheet
          errorMessage={searchParkingError}
          isLoading={isSearchParkingLoading}
          onClose={closeSearchResults}
          onRetry={retryLatest}
          onSpotPress={handleSearchSpotPress}
          searchPlace={selectedParkingItem === null ? selectedSearchPlace : null}
          spots={nearestSearchSpots}
        />

        {activeOverlay === 'parking' ? (
            <ParkingListBottomSheet
            errorMessage={
              visibleSpots.length === 0 && layerState.status === 'error'
                ? layerState.error
                : null
            }
            onClose={closeOverlay}
            onRetry={retryLatest}
            onSpotPress={handleParkingOverlaySpotPress}
            spots={visibleSpots}
          />
        ) : null}

        {activeOverlay === 'favorites' ? (
          <FavoriteParkingBottomSheet
            onClose={closeOverlay}
            onSpotPress={handleFavoriteOverlaySpotPress}
          />
        ) : null}

      </View>
    </View>
  );
}
