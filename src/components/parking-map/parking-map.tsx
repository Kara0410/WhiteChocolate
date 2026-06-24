import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppleMaps, GoogleMaps, type CameraPosition } from 'expo-maps';
import type { ImageRef } from 'expo-image';
import { Platform, Text, useWindowDimensions, View } from 'react-native';

import { useParkingClusters } from '@/hooks/use-parking-clusters';
import {
  loadMarkerImage,
  markerImageKey,
} from '@/components/parking-map/marker-image-cache';
import { selectSpatiallySeparatedMarkers } from '@/components/parking-map/marker-density';
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
    currentRegion,
    currentZoom,
    onCameraMove,
    visibleClusters,
  } = useParkingClusters(initialCamera, destination);
  const googleMapRef = useRef<GoogleMaps.MapView | null>(null);
  const appleMapRef = useRef<AppleMaps.MapView | null>(null);
  const [selectedParkingItem, setSelectedParkingItem] =
    useState<ParkingClusterResponse | null>(null);
  const [markerImages, setMarkerImages] = useState<Map<string, ImageRef>>(
    () => new Map(),
  );
  const { height, width } = useWindowDimensions();
  const renderedClusters = useMemo(
    () =>
      selectSpatiallySeparatedMarkers(visibleClusters, {
        camera: currentRegion,
        width,
        height,
        selectedId: selectedParkingItem?.id,
      }),
    [currentRegion, height, selectedParkingItem?.id, visibleClusters, width],
  );

  useEffect(() => {
    let cancelled = false;
    const uniqueItems = new Map<string, {
      item: ParkingClusterResponse;
      selected: boolean;
    }>();
    for (const item of renderedClusters) {
      for (const selected of [false, true]) {
        uniqueItems.set(markerImageKey(item, currentZoom, selected), {
          item,
          selected,
        });
      }
    }

    Promise.all(
      [...uniqueItems].map(async ([key, value]) => {
        const image = await loadMarkerImage(
          value.item,
          currentZoom,
          value.selected,
        );
        return [key, image] as const;
      }),
    )
      .then((entries) => {
        if (!cancelled) {
          setMarkerImages((current) => new Map([...current, ...entries]));
        }
      })
      .catch((caughtError) => {
        console.warn('Parking marker images could not be generated', caughtError);
      });

    return () => {
      cancelled = true;
    };
  }, [currentZoom, renderedClusters]);

  const clusterById = useMemo(
    () => new Map(renderedClusters.map((item) => [item.id, item])),
    [renderedClusters],
  );

  const googleMarkers = useMemo<GoogleMaps.Marker[]>(
    () =>
      renderedClusters.flatMap((item) => {
        const selected = selectedParkingItem?.id === item.id;
        const icon = markerImages.get(
          markerImageKey(item, currentZoom, selected),
        );
        const price =
          item.minPrice === null
            ? 'Free'
            : `From €${item.minPrice.toFixed(2)}/h`;
        return icon
          ? [
              {
                id: item.id,
                coordinates: {
                  latitude: item.latitude,
                  longitude: item.longitude,
                },
                icon,
                title:
                  item.type === 'cluster'
                    ? `${item.totalCapacity} parking spaces`
                    : item.bestSpot.zoneName,
                snippet:
                  item.type === 'cluster'
                    ? `${item.availableSpots} available · ${price}`
                    : `${item.availableSpots} available · ${price}`,
                showCallout: true,
                anchor: { x: 0.5, y: 0.5 },
                zIndex:
                  selected
                    ? 20
                    : item.type === 'spot'
                      ? 2
                      : 1,
              },
            ]
          : [];
      }),
    [currentZoom, markerImages, renderedClusters, selectedParkingItem?.id],
  );

  const appleMarkers = useMemo<AppleMaps.Marker[]>(
    () =>
      renderedClusters.flatMap((item) => {
        const selected = selectedParkingItem?.id === item.id;
        const icon = markerImages.get(
          markerImageKey(item, currentZoom, selected),
        );
        return icon
          ? [
              {
                id: item.id,
                coordinates: {
                  latitude: item.latitude,
                  longitude: item.longitude,
                },
                icon,
                title:
                  item.type === 'cluster'
                    ? `${item.totalCapacity} spaces · ${item.availableSpots} available`
                    : item.bestSpot.zoneName,
              },
            ]
          : [];
      }),
    [currentZoom, markerImages, renderedClusters, selectedParkingItem?.id],
  );

  const handleMarkerClick = useCallback(
    (marker: { id?: string }) => {
      const item = marker.id ? clusterById.get(marker.id) ?? null : null;
      setSelectedParkingItem(item);
      onSelectedParkingItemChange?.(item);

      if (
        item?.type === 'cluster' &&
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
            duration: 350,
          });
        } else if (Platform.OS === 'ios') {
          appleMapRef.current?.setCameraPosition(nextCamera);
        }
      }
    },
    [clusterById, currentZoom, onSelectedParkingItemChange],
  );

  const clearSelection = useCallback(() => {
    setSelectedParkingItem(null);
    onSelectedParkingItemChange?.(null);
  }, [onSelectedParkingItemChange]);

  const cameraPosition = useMemo<CameraPosition>(
    () => ({
      coordinates: {
        latitude: initialCamera.latitude,
        longitude: initialCamera.longitude,
      },
      zoom: initialCamera.zoom,
    }),
    [initialCamera],
  );

  return (
    <View style={{ flex: 1 }}>
      {Platform.OS === 'ios' ? (
        <AppleMaps.View
          ref={appleMapRef}
          cameraPosition={cameraPosition}
          markers={appleMarkers}
          onCameraMove={onCameraMove}
          onMapClick={clearSelection}
          onMarkerClick={handleMarkerClick}
          properties={{
            isMyLocationEnabled: false,
            pointsOfInterest: { including: [] },
          }}
          style={{ flex: 1 }}
          uiSettings={{
            compassEnabled: false,
            myLocationButtonEnabled: false,
          }}
        />
      ) : Platform.OS === 'android' ? (
        <GoogleMaps.View
          ref={googleMapRef}
          cameraPosition={cameraPosition}
          markers={googleMarkers}
          onCameraMove={onCameraMove}
          onMapClick={clearSelection}
          onMarkerClick={handleMarkerClick}
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
            scaleBarEnabled: false,
            zoomControlsEnabled: false,
          }}
        />
      ) : (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Text selectable>Maps are only available on Android and iOS.</Text>
        </View>
      )}

    </View>
  );
}
