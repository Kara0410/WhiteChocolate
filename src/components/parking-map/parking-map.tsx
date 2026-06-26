import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppleMaps, GoogleMaps, type CameraPosition } from 'expo-maps';
import { Platform, Text, View, type LayoutChangeEvent } from 'react-native';

import { projectParkingMarkers } from '@/components/parking-map/marker-density';
import {
  ParkingBottomSheet,
  type ParkingBottomSheetHandle,
} from '@/components/parking-map/ParkingBottomSheet';
import { ParkingMarkerCard } from '@/components/parking-map/parking-marker-card';
import { useFavoriteParking } from '@/context/FavoriteParkingContext';
import { useParkingClusters } from '@/hooks/use-parking-clusters';
import type {
  ParkingCameraState,
  ParkingClusterResponse,
  ParkingCoordinates,
} from '@/types/parking-map';

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
  favoriteSpotId?: string;
  onSelectedParkingItemChange?: (
    item: ParkingClusterResponse | null,
  ) => void;
};

export function ParkingMap({
  initialCamera,
  destination,
  favoriteSpotId,
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
  const isProgrammaticCameraMoveRef = useRef(false);
  const hasCompactedForCurrentDragRef = useRef(false);
  const hasInitialCameraEventRef = useRef(false);
  const pendingFocusItemRef = useRef<ParkingClusterResponse | null>(null);
  const [selectedParkingItem, setSelectedParkingItem] =
    useState<ParkingClusterResponse | null>(null);
  const [mapSize, setMapSize] = useState({ width: 0, height: 0 });
  const [hasInitialCameraEvent, setHasInitialCameraEvent] = useState(false);
  const { favoriteItems } = useFavoriteParking();
  const lastFocusedFavoriteIdRef = useRef<string | null>(null);

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

  const focusMarkerAboveSheetSafely = useCallback(
    (item: ParkingClusterResponse) => {
      if (!canFocusCamera()) {
        pendingFocusItemRef.current = item;
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

      if (Platform.OS === 'android') {
        googleMapRef.current!.setCameraPosition({
          ...nextCamera,
          duration: 320,
        });
      } else if (Platform.OS === 'ios') {
        appleMapRef.current!.setCameraPosition(nextCamera);
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
      options: { focusCamera?: boolean } = {},
    ) => {
      const { focusCamera = true } = options;

      setSelectedParkingItem(item);
      onSelectedParkingItemChange?.(item);
      if (focusCamera) {
        focusMarkerAboveSheetSafely(item);
      }
    },
    [focusMarkerAboveSheetSafely, onSelectedParkingItemChange],
  );

  const handleMarkerPress = useCallback(
    (item: ParkingClusterResponse) => {
      selectParkingItem(item);
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
    },
    [],
  );

  useEffect(() => {
    if (
      favoriteSpotId === undefined ||
      favoriteSpotId === lastFocusedFavoriteIdRef.current
    ) {
      return;
    }

    const favoriteItem = favoriteItems.find(
      (item) => item.id === favoriteSpotId,
    );

    if (favoriteItem === undefined) {
      return;
    }

    lastFocusedFavoriteIdRef.current = favoriteSpotId;
    selectParkingItem(favoriteItem);
  }, [favoriteItems, favoriteSpotId, selectParkingItem]);

  useEffect(() => {
    if (!canFocusCamera()) {
      return;
    }

    const pendingFocusItem = pendingFocusItemRef.current;
    if (pendingFocusItem === null) {
      return;
    }

    pendingFocusItemRef.current = null;
    focusMarkerAboveSheetSafely(pendingFocusItem);
  }, [
    canFocusCamera,
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
    </View>
  );
}
