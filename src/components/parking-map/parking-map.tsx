import { useCallback, useMemo, useRef, useState } from 'react';
import { AppleMaps, GoogleMaps, type CameraPosition } from 'expo-maps';
import { Platform, Text, View, type LayoutChangeEvent } from 'react-native';

import { projectParkingMarkers } from '@/components/parking-map/marker-density';
import { ParkingBottomSheet } from '@/components/parking-map/ParkingBottomSheet';
import { ParkingMarkerCard } from '@/components/parking-map/parking-marker-card';
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

type ParkingMapProps = {
  initialCamera: ParkingCameraState;
  destination?: ParkingCoordinates;
  onSelectedParkingItemChange?: (
    item: ParkingClusterResponse | null,
  ) => void;
};

export function ParkingMap({
  initialCamera,
  destination,
  onSelectedParkingItemChange,
}: ParkingMapProps) {
  const {
    displayCamera,
    currentZoom,
    onCameraMove,
    visibleClusters,
  } = useParkingClusters(initialCamera, destination);
  const googleMapRef = useRef<GoogleMaps.MapView | null>(null);
  const appleMapRef = useRef<AppleMaps.MapView | null>(null);
  const [selectedParkingItem, setSelectedParkingItem] =
    useState<ParkingClusterResponse | null>(null);
  const [mapSize, setMapSize] = useState({ width: 0, height: 0 });

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

  const handleMarkerPress = useCallback(
    (item: ParkingClusterResponse) => {
      setSelectedParkingItem(item);
      onSelectedParkingItemChange?.(item);

      if (
        item.type === 'cluster' &&
        item.expansionZoom !== undefined &&
        item.expansionZoom > currentZoom
      ) {
        const nextCamera = {
          coordinates: {
            latitude: item.latitude,
            longitude: item.longitude,
          },
          zoom: Math.min(20, item.expansionZoom),
        };
        if (Platform.OS === 'android') {
          googleMapRef.current?.setCameraPosition({
            ...nextCamera,
            duration: 320,
          });
        } else if (Platform.OS === 'ios') {
          appleMapRef.current?.setCameraPosition(nextCamera);
        }
      }
    },
    [currentZoom, onSelectedParkingItemChange],
  );

  const clearSelection = useCallback(() => {
    setSelectedParkingItem(null);
    onSelectedParkingItemChange?.(null);
  }, [onSelectedParkingItemChange]);

  const handleLayout = useCallback((event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setMapSize({ width, height });
  }, []);

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
          onCameraMove={onCameraMove}
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
          onCameraMove={onCameraMove}
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
        item={selectedParkingItem}
        onClose={clearSelection}
      />
    </View>
  );
}
