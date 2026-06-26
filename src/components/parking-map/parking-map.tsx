import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppleMaps, GoogleMaps, type CameraPosition } from 'expo-maps';
import {
  InteractionManager,
  Platform,
  Text,
  View,
  type LayoutChangeEvent,
} from 'react-native';

import { projectParkingMarkers } from '@/components/parking-map/marker-density';
import {
  ParkingBottomSheet,
  type ParkingBottomSheetHandle,
} from '@/components/parking-map/ParkingBottomSheet';
import { ParkingMarkerCard } from '@/components/parking-map/parking-marker-card';
import { PlaceSearchOverlay } from '@/components/parking-map/PlaceSearchOverlay';
import { SearchNearestSpotsBottomSheet } from '@/components/parking-map/SearchNearestSpotsBottomSheet';
import { useFavoriteParking } from '@/context/FavoriteParkingContext';
import { useParkingClusters } from '@/hooks/use-parking-clusters';
import type { PlaceSearchResult } from '@/hooks/use-place-search';
import { getAllMockParkingSpots } from '@/services/parking-clusters';
import type {
  ParkingCameraState,
  ParkingClusterResponse,
  ParkingCoordinates,
} from '@/types/parking-map';
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

const FULL_SHEET_RATIO = 0.5;
const PROGRAMMATIC_CAMERA_GUARD_MS = 500;
const MAP_DRAG_SETTLE_MS = 180;

type ParkingMapProps = {
  initialCamera: ParkingCameraState;
  destination?: ParkingCoordinates;
  favoriteFocusKey?: string;
  favoriteSpotId?: string;
  searchFocusKey?: string;
  onSelectedParkingItemChange?: (
    item: ParkingClusterResponse | null,
  ) => void;
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

function hasValidCoordinatePair(coordinates: ParkingCoordinates) {
  return (
    Number.isFinite(coordinates.latitude) &&
    Number.isFinite(coordinates.longitude)
  );
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
  destination,
  favoriteFocusKey,
  favoriteSpotId,
  searchFocusKey,
  onSelectedParkingItemChange,
}: ParkingMapProps) {
  const {
    displayCamera,
    onCameraMove,
    visibleClusters,
  } = useParkingClusters(initialCamera, destination);
  const googleMapRef = useRef<GoogleMaps.MapView | null>(null);
  const appleMapRef = useRef<AppleMaps.MapView | null>(null);
  const bottomSheetRef = useRef<ParkingBottomSheetHandle>(null);
  const programmaticCameraTimerRef =
    useRef<ReturnType<typeof setTimeout> | null>(null);
  const mapDragSettleTimerRef =
    useRef<ReturnType<typeof setTimeout> | null>(null);
  const favoriteFocusTimerRef =
    useRef<ReturnType<typeof setTimeout> | null>(null);
  const favoriteFocusInteractionRef =
    useRef<ReturnType<typeof InteractionManager.runAfterInteractions> | null>(
      null,
    );
  const isProgrammaticCameraMoveRef = useRef(false);
  const hasCompactedForCurrentDragRef = useRef(false);
  const hasInitialCameraEventRef = useRef(false);
  const pendingFocusItemRef = useRef<ParkingClusterResponse | null>(null);
  const pendingFocusSourceRef = useRef<CameraFocusSource>('marker');
  const pendingCoordinateFocusRef = useRef<ParkingCoordinates | null>(null);
  const pendingCoordinateFocusContextRef = useRef(
    'Unable to focus searched place',
  );
  const cameraFocusRequestIdRef = useRef(0);
  const [selectedParkingItem, setSelectedParkingItem] =
    useState<ParkingClusterResponse | null>(null);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [selectedSearchPlace, setSelectedSearchPlace] =
    useState<PlaceSearchResult | null>(null);
  const [mapSize, setMapSize] = useState({ width: 0, height: 0 });
  const [hasInitialCameraEvent, setHasInitialCameraEvent] = useState(false);
  const { favoriteItems } = useFavoriteParking();
  const lastFocusedFavoriteRequestRef = useRef<string | null>(null);
  const lastSearchFocusKeyRef = useRef<string | null>(null);
  const allParkingSpots = useMemo(
    () =>
      getAllMockParkingSpots(
        selectedSearchPlace
          ? {
              latitude: selectedSearchPlace.latitude,
              longitude: selectedSearchPlace.longitude,
            }
          : undefined,
      ),
    [selectedSearchPlace],
  );
  const nearestSearchSpots = useMemo(
    () =>
      selectedSearchPlace
        ? getNearestParkingSpots({
            origin: {
              latitude: selectedSearchPlace.latitude,
              longitude: selectedSearchPlace.longitude,
            },
            spots: allParkingSpots,
            limit: 25,
          })
        : [],
    [allParkingSpots, selectedSearchPlace],
  );

  const projectedMarkers = useMemo(
    () =>
      mapSize.width > 0 && mapSize.height > 0
        ? projectParkingMarkers(visibleClusters, {
            camera: displayCamera,
            width: mapSize.width,
            height: mapSize.height,
            selectedId: selectedParkingItem?.id,
          })
        : [],
    [
      displayCamera,
      mapSize.height,
      mapSize.width,
      selectedParkingItem?.id,
      visibleClusters,
    ],
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
    pendingFocusItemRef.current = null;
    pendingFocusSourceRef.current = 'marker';
    pendingCoordinateFocusRef.current = null;

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
      if (!hasValidCoordinatePair(coordinates)) {
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

  const selectParkingItem = useCallback(
    (
      item: ParkingClusterResponse,
      options: SelectParkingItemOptions = {},
    ) => {
      const { source = 'marker' } = options;
      const focusCamera = options.focusCamera ?? true;

      setSelectedParkingItem(item);
      onSelectedParkingItemChange?.(item);
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
      onSelectedParkingItemChange,
    ],
  );

  const handleMarkerPress = useCallback(
    (item: ParkingClusterResponse) => {
      setSelectedSearchPlace(null);
      selectParkingItem(item);
    },
    [selectParkingItem],
  );

  const openSearch = useCallback(() => {
    setIsSearchOpen(true);
  }, []);

  const closeSearch = useCallback(() => {
    setIsSearchOpen(false);
  }, []);

  const handleSelectSearchPlace = useCallback(
    (place: PlaceSearchResult) => {
      setIsSearchOpen(false);
      setSelectedParkingItem(null);
      onSelectedParkingItemChange?.(null);
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
      onSelectedParkingItemChange,
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
    onSelectedParkingItemChange?.(null);
  }, [onSelectedParkingItemChange]);

  const handleLayout = useCallback((event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setMapSize({ width, height });
  }, []);

  const handleCameraMove = useCallback(
    (event: Parameters<typeof onCameraMove>[0]) => {
      onCameraMove(event);
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
      if (favoriteFocusTimerRef.current) {
        clearTimeout(favoriteFocusTimerRef.current);
      }
      if (favoriteFocusInteractionRef.current) {
        favoriteFocusInteractionRef.current.cancel();
      }
      pendingFocusItemRef.current = null;
      pendingCoordinateFocusRef.current = null;
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
    if (pendingCoordinateFocus === null) {
      return;
    }

    pendingCoordinateFocusRef.current = null;
    focusCoordinatesAboveSheetSafely(
      pendingCoordinateFocus,
      pendingCoordinateFocusContextRef.current,
    );
  }, [
    canFocusCamera,
    focusCoordinatesAboveSheetSafely,
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
          onMapClick={clearSelection}
          properties={{
            isMyLocationEnabled: false,
            pointsOfInterest: { including: [] },
          }}
          style={{ flex: 1 }}
          uiSettings={{
            compassEnabled: false,
            myLocationButtonEnabled: false,
            scaleBarEnabled: false,
            togglePitchEnabled: false,
          }}
        />
      ) : Platform.OS === 'android' ? (
        <GoogleMaps.View
          ref={googleMapRef}
          cameraPosition={cameraPosition}
          onCameraMove={handleCameraMove}
          onMapClick={clearSelection}
          properties={{
            isBuildingEnabled: false,
            isIndoorEnabled: false,
            isMyLocationEnabled: false,
            isTrafficEnabled: false,
            selectionEnabled: false,
            mapStyleOptions: { json: LABEL_FREE_MAP_STYLE },
          }}
          style={{ flex: 1 }}
          uiSettings={{
            compassEnabled: false,
            indoorLevelPickerEnabled: false,
            mapToolbarEnabled: false,
            myLocationButtonEnabled: false,
            rotationGesturesEnabled: false,
            scaleBarEnabled: false,
            tiltGesturesEnabled: false,
            zoomControlsEnabled: false,
          }}
        />
      ) : (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Text selectable>Maps are only available on Android and iOS.</Text>
        </View>
      )}

      <View
        pointerEvents="box-none"
        style={{
          position: 'absolute',
          inset: 0,
        }}
      >
        {projectedMarkers.map(({ item, x, y, width, height }) => (
          <View
            key={item.id}
            pointerEvents="box-none"
            style={{
              position: 'absolute',
              left: x - width / 2,
              top: y - height / 2,
              width,
              height,
            }}
          >
            <ParkingMarkerCard
              item={item}
              onPress={handleMarkerPress}
              selected={selectedParkingItem?.id === item.id}
              zoom={displayCamera.zoom}
            />
          </View>
        ))}
      </View>

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

      <PlaceSearchOverlay
        onClose={closeSearch}
        onSelectPlace={handleSelectSearchPlace}
        visible={isSearchOpen}
      />
    </View>
  );
}
