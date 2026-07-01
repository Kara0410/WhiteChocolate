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
import { FlaskConical, LocateFixed } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  filterParkingMarkersForViewport,
  projectMapCoordinate,
  projectSelectedParkingMarkers,
  selectSpatiallySeparatedMarkers,
} from '@/components/parking-map/marker-density';
import {
  MAP_ELEVATIONS,
  MAP_LAYERS,
} from '@/components/parking-map/map-layers';
import {
  ParkingBottomSheet,
  type ParkingBottomSheetHandle,
} from '@/components/parking-map/ParkingBottomSheet';
import { FavoriteParkingBottomSheet } from '@/components/parking-map/FavoriteParkingBottomSheet';
import { ParkingListBottomSheet } from '@/components/parking-map/ParkingListBottomSheet';
import { ParkingMarkerCard } from '@/components/parking-map/parking-marker-card';
import { SearchNearestSpotsBottomSheet } from '@/components/parking-map/SearchNearestSpotsBottomSheet';
import { YouBottomSheet } from '@/components/parking-map/YouBottomSheet';
import { UserLocationMarker } from '@/components/parking-map/user-location-marker';
import { useFavoriteParking } from '@/context/FavoriteParkingContext';
import { useMapOverlay } from '@/context/MapOverlayContext';
import { useParkingClusters } from '@/hooks/use-parking-clusters';
import { MUNICH_MOCK_LOCATION } from '@/hooks/use-map-location';
import type { PlaceSearchResult } from '@/hooks/use-google-place-search';
import type {
  ParkingCameraState,
  ParkingClusterResponse,
  ParkingCoordinates,
} from '@/types/parking-map';
import { hasValidParkingCoordinates } from '@/utils/parking-map-geo';
import { getNearestParkingSpots } from '@/utils/parkingSearch';

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
const MAP_DRAG_SETTLE_MS = 180;
const MARKER_MOVEMENT_SETTLE_MS = 150;

type ParkingMapProps = {
  initialCamera: ParkingCameraState;
  currentLocationFocusKey?: string;
  destination?: ParkingCoordinates;
  favoriteFocusKey?: string;
  favoriteSpotId?: string;
  searchFocusKey?: string;
  isLocationLoading?: boolean;
  locationMessage?: string | null;
  onRequestUserLocation?: () => Promise<ParkingCoordinates | null>;
  userLocation?: ParkingCoordinates | null;
};

type ParkingSelectionSource = 'marker' | 'favorite' | 'search';

type SelectParkingItemOptions = {
  source?: ParkingSelectionSource;
  focusCamera?: boolean;
};

type CameraFocusSource = ParkingSelectionSource;

type CameraFocusOptions = {
  source?: CameraFocusSource;
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
  onRequestUserLocation,
  userLocation,
}: ParkingMapProps) {
  const insets = useSafeAreaInsets();
  const {
    currentRegion,
    displayCamera,
    onCameraMove,
    visibleClusters,
    visibleSpots,
  } = useParkingClusters(initialCamera, destination);
  const googleMapRef = useRef<GoogleMaps.MapView | null>(null);
  const appleMapRef = useRef<AppleMaps.MapView | null>(null);
  const bottomSheetRef = useRef<ParkingBottomSheetHandle>(null);
  const programmaticCameraTimerRef =
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
  const isMapMovingRef = useRef(false);
  const hasCompactedForCurrentDragRef = useRef(false);
  const hasInitialCameraEventRef = useRef(false);
  const pendingFocusItemRef = useRef<ParkingClusterResponse | null>(null);
  const pendingFocusSourceRef = useRef<CameraFocusSource>('marker');
  const pendingCoordinateFocusRef = useRef<ParkingCoordinates | null>(null);
  const pendingCoordinateFocusContextRef = useRef(
    'Unable to focus searched place',
  );
  const pendingLocationFocusRef = useRef<ParkingCoordinates | null>(null);
  const cameraFocusRequestIdRef = useRef(0);
  const locationActionRequestIdRef = useRef(0);
  const [selectedParkingItem, setSelectedParkingItem] =
    useState<ParkingClusterResponse | null>(null);
  const [selectedSearchPlace, setSelectedSearchPlace] =
    useState<PlaceSearchResult | null>(null);
  const [mapSize, setMapSize] = useState({ width: 0, height: 0 });
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
  const nearestSearchSpots = useMemo(
    () =>
      selectedSearchPlace
        ? getNearestParkingSpots({
            origin: {
              latitude: selectedSearchPlace.latitude,
              longitude: selectedSearchPlace.longitude,
            },
            spots: visibleSpots,
            limit: 25,
          })
        : [],
    [selectedSearchPlace, visibleSpots],
  );

  const viewportFilterResult = useMemo(
    () => filterParkingMarkersForViewport(visibleClusters, currentRegion),
    [currentRegion, visibleClusters],
  );
  const viewportFilteredClusters = viewportFilterResult.markers;

  useEffect(() => {
    if (!__DEV__ || !viewportFilterResult.usedServerFallback) {
      return;
    }

    console.warn(
      'Parking viewport filter used the server-filtered cluster fallback.',
      {
        bounds: viewportFilterResult.bounds,
        currentRegion,
        visibleClusters: visibleClusters.length,
      },
    );
  }, [
    currentRegion,
    viewportFilterResult.bounds,
    viewportFilterResult.usedServerFallback,
    visibleClusters.length,
  ]);

  const densityFilteredMarkers = useMemo(
    () =>
      mapSize.width > 0 && mapSize.height > 0
        ? selectSpatiallySeparatedMarkers(viewportFilteredClusters, {
            camera: currentRegion,
            width: mapSize.width,
            height: mapSize.height,
          })
        : [],
    [
      currentRegion,
      mapSize.height,
      mapSize.width,
      viewportFilteredClusters,
    ],
  );
  const displayedMarkerItems = useMemo(() => {
    if (selectedParkingItem !== null) {
      return [selectedParkingItem];
    }
    if (activeOverlay !== 'none' || selectedSearchPlace !== null) {
      return [];
    }
    return densityFilteredMarkers;
  }, [
    activeOverlay,
    densityFilteredMarkers,
    selectedParkingItem,
    selectedSearchPlace,
  ]);
  const projectedMarkers = useMemo(
    () =>
      mapSize.width > 0 && mapSize.height > 0
        ? projectSelectedParkingMarkers(displayedMarkerItems, {
            camera: displayCamera,
            width: mapSize.width,
            height: mapSize.height,
          })
        : [],
    [
      displayCamera,
      displayedMarkerItems,
      mapSize.height,
      mapSize.width,
    ],
  );
  const projectedUserLocation = useMemo(() => {
    if (
      userLocation == null ||
      !hasValidParkingCoordinates(userLocation) ||
      mapSize.width <= 0 ||
      mapSize.height <= 0
    ) {
      return null;
    }

    const position = projectMapCoordinate(userLocation, {
      camera: displayCamera,
      height: mapSize.height,
      width: mapSize.width,
    });

    if (
      position.x < -28 ||
      position.x > mapSize.width + 28 ||
      position.y < -28 ||
      position.y > mapSize.height + 28
    ) {
      return null;
    }

    return position;
  }, [displayCamera, mapSize.height, mapSize.width, userLocation]);

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

    if (favoriteFocusTimerRef.current) {
      clearTimeout(favoriteFocusTimerRef.current);
      favoriteFocusTimerRef.current = null;
    }
    if (favoriteFocusInteractionRef.current) {
      favoriteFocusInteractionRef.current.cancel();
      favoriteFocusInteractionRef.current = null;
    }
  }, []);

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

      isProgrammaticCameraMoveRef.current = true;
      if (programmaticCameraTimerRef.current) {
        clearTimeout(programmaticCameraTimerRef.current);
      }
      programmaticCameraTimerRef.current = setTimeout(() => {
        isProgrammaticCameraMoveRef.current = false;
        programmaticCameraTimerRef.current = null;
      }, PROGRAMMATIC_CAMERA_GUARD_MS);

      try {
        const cameraUpdate =
          Platform.OS === 'android'
            ? googleMapRef.current!.setCameraPosition({
                ...nextCamera,
                duration: source === 'favorite' ? 0 : 320,
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
    [
      canFocusCamera,
      displayCamera.latitudeDelta,
      displayCamera.longitudeDelta,
      displayCamera.zoom,
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

      const longitudeDelta =
        displayCamera.longitudeDelta ??
        Math.max(0.000001, (360 / 2 ** displayCamera.zoom) * 2);
      const latitudeDelta =
        displayCamera.latitudeDelta ??
        Math.max(0.000001, longitudeDelta * 1.6);
      const visibleMapRatio = 1 - FULL_SHEET_RATIO;
      const desiredYRatio = visibleMapRatio / 2;
      const yOffsetRatio = 0.5 - desiredYRatio;
      const nextCamera = {
        coordinates: {
          latitude: coordinates.latitude - latitudeDelta * yOffsetRatio,
          longitude: coordinates.longitude,
        },
        zoom: Math.max(displayCamera.zoom, 16),
      };

      isProgrammaticCameraMoveRef.current = true;
      if (programmaticCameraTimerRef.current) {
        clearTimeout(programmaticCameraTimerRef.current);
      }
      programmaticCameraTimerRef.current = setTimeout(() => {
        isProgrammaticCameraMoveRef.current = false;
        programmaticCameraTimerRef.current = null;
      }, PROGRAMMATIC_CAMERA_GUARD_MS);

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
    [
      canFocusCamera,
      displayCamera.latitudeDelta,
      displayCamera.longitudeDelta,
      displayCamera.zoom,
    ],
  );

  const focusLocationSafely = useCallback(
    (coordinates: ParkingCoordinates, context: string) => {
      if (!hasValidParkingCoordinates(coordinates)) {
        return;
      }

      if (!canFocusCamera()) {
        pendingLocationFocusRef.current = coordinates;
        return;
      }

      const nextCamera = {
        coordinates,
        zoom: 17,
        bearing: 0,
        tilt: 0,
      };

      isProgrammaticCameraMoveRef.current = true;
      if (programmaticCameraTimerRef.current) {
        clearTimeout(programmaticCameraTimerRef.current);
      }
      programmaticCameraTimerRef.current = setTimeout(() => {
        isProgrammaticCameraMoveRef.current = false;
        programmaticCameraTimerRef.current = null;
      }, PROGRAMMATIC_CAMERA_GUARD_MS);

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
    [canFocusCamera],
  );

  const selectParkingItem = useCallback(
    (
      item: ParkingClusterResponse,
      options: SelectParkingItemOptions = {},
    ) => {
      const { source = 'marker' } = options;
      const focusCamera = options.focusCamera ?? true;

      setSelectedParkingItem(item);
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

  const handleMarkerPress = useCallback(
    (item: ParkingClusterResponse) => {
      setSelectedSearchPlace(null);
      selectParkingItem(item);
    },
    [selectParkingItem],
  );

  const handleSelectSearchPlace = useCallback(
    (place: PlaceSearchResult) => {
      setSelectedParkingItem(null);
      cancelPendingCameraFocus();
      setSelectedSearchPlace(place);
      focusCoordinatesAboveSheetSafely(
        { latitude: place.latitude, longitude: place.longitude },
        'Unable to focus searched place',
      );
    },
    [
      cancelPendingCameraFocus,
      focusCoordinatesAboveSheetSafely,
    ],
  );

  const closeSearchResults = useCallback(() => {
    setSelectedSearchPlace(null);
  }, []);

  const handleSearchSpotPress = useCallback(
    (item: ParkingClusterResponse) => {
      setSelectedSearchPlace(null);
      selectParkingItem(item, { source: 'search', focusCamera: true });
    },
    [selectParkingItem],
  );

  const clearSelection = useCallback(() => {
    setSelectedParkingItem(null);
  }, []);

  const prepareForLocationFocus = useCallback(() => {
    closeOverlay();
    setSelectedSearchPlace(null);
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
      focusLocationSafely(
        coordinates,
        'Unable to focus the map on your location',
      );
    }
  }, [
    focusLocationSafely,
    isLocationLoading,
    onRequestUserLocation,
    prepareForLocationFocus,
  ]);

  const handleMockLocationPress = useCallback(() => {
    prepareForLocationFocus();
    locationActionRequestIdRef.current += 1;
    focusLocationSafely(
      MUNICH_MOCK_LOCATION,
      'Unable to focus the Munich test location',
    );
  }, [focusLocationSafely, prepareForLocationFocus]);

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
      onCameraMove(event);
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
        pendingLocationFocus,
        'Unable to focus the requested map location',
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
    <View onLayout={handleLayout} style={{ flex: 1, overflow: 'hidden' }}>
      {Platform.OS === 'ios' ? (
        <AppleMaps.View
          ref={appleMapRef}
          cameraPosition={cameraPosition}
          onCameraMove={handleCameraMove}
          onMapClick={handleMapPress}
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
          properties={GOOGLE_MAP_PROPERTIES}
          style={MAP_VIEW_STYLE}
          uiSettings={GOOGLE_MAP_UI_SETTINGS}
        />
      ) : (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Text selectable>Maps are only available on Android and iOS.</Text>
        </View>
      )}

      <View
        pointerEvents="box-none"
        style={{
          elevation: MAP_ELEVATIONS.markers,
          position: 'absolute',
          inset: 0,
          zIndex: MAP_LAYERS.markers,
        }}
      >
        {projectedMarkers.map(({ item, x, y, width, height, tier }) => (
          <View
            key={item.id}
            pointerEvents="box-none"
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              transform: [
                { translateX: x - width / 2 },
                { translateY: y - height / 2 },
              ],
              width,
              height,
              zIndex: selectedParkingItem?.id === item.id ? 2 : 1,
            }}
          >
            <ParkingMarkerCard
              item={item}
              onPress={handleMarkerPress}
              performanceMode={isMapMoving ? 'moving' : 'normal'}
              selected={selectedParkingItem?.id === item.id}
              tier={tier}
            />
          </View>
        ))}
      </View>

      {projectedUserLocation ? (
        <View
          collapsable={false}
          pointerEvents="none"
          style={{
            elevation: MAP_ELEVATIONS.userLocation,
            height: 28,
            left: 0,
            position: 'absolute',
            top: 0,
            transform: [
              { translateX: projectedUserLocation.x - 14 },
              { translateY: projectedUserLocation.y - 14 },
            ],
            width: 28,
            zIndex: MAP_LAYERS.userLocation,
          }}
        >
          <UserLocationMarker />
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
            <View
              className="max-w-64 rounded-2xl bg-slate-950/90 px-3 py-2"
              style={{ boxShadow: '0 5px 16px rgba(15,23,42,0.18)' }}
            >
              <Text className="text-right text-xs font-semibold leading-4 text-white">
                {locationMessage}
              </Text>
            </View>
          ) : null}
          <Pressable
            accessibilityLabel="Center map on current location"
            accessibilityRole="button"
            className="h-12 w-12 items-center justify-center rounded-full border border-slate-200 bg-white active:bg-slate-100"
            disabled={isLocationLoading}
            onPress={handleCurrentLocationPress}
            style={{ boxShadow: '0 4px 14px rgba(15,23,42,0.2)' }}
          >
            {isLocationLoading ? (
              <ActivityIndicator color="#2563EB" size="small" />
            ) : (
              <LocateFixed color="#2563EB" size={22} strokeWidth={2.4} />
            )}
          </Pressable>
          {__DEV__ ? (
            <Pressable
              accessibilityHint="Centers the map on the Munich test coordinates"
              accessibilityLabel="Use Munich mock location"
              accessibilityRole="button"
              className="h-12 w-12 items-center justify-center rounded-full border border-amber-200 bg-amber-50 active:bg-amber-100"
              onPress={handleMockLocationPress}
              style={{ boxShadow: '0 4px 14px rgba(15,23,42,0.16)' }}
            >
              <FlaskConical color="#B45309" size={18} strokeWidth={2.3} />
              <Text className="mt-0.5 text-[8px] font-black tracking-wide text-amber-700">
                TEST
              </Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}

      <ParkingBottomSheet
        ref={bottomSheetRef}
        item={selectedParkingItem}
        onClose={clearSelection}
      />

      <SearchNearestSpotsBottomSheet
        onClose={closeSearchResults}
        onSpotPress={handleSearchSpotPress}
        searchPlace={selectedSearchPlace}
        spots={nearestSearchSpots}
      />

      {activeOverlay === 'parking' ? (
        <ParkingListBottomSheet
          onClose={closeOverlay}
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

      {activeOverlay === 'you' ? (
        <YouBottomSheet onClose={closeOverlay} />
      ) : null}

    </View>
  );
}
