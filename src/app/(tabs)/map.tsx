import { useMemo } from 'react';
import { AppleMaps, GoogleMaps, type CameraPosition } from 'expo-maps';
import { router } from 'expo-router';
import { Platform, Text } from 'react-native';

import { parkingData } from '@/data/munich_parking';

const MUNICH_CAMERA: CameraPosition = {
  coordinates: {
    latitude: 48.1351,
    longitude: 11.5824,
  },
  zoom: 15,
};

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
  {
    featureType: 'administrative',
    elementType: 'all',
    stylers: [{ visibility: 'off' }],
  },
]);

type ParkingPoint = {
  id: string;
  latitude: number;
  longitude: number;
};

const PARKING_POINTS: ParkingPoint[] = parkingData.flatMap((entry, index) =>
  entry.lat === null || entry.lon === null
    ? []
    : [
        {
          id: String(index),
          latitude: entry.lat,
          longitude: entry.lon,
        },
      ],
);

export default function MapScreen() {
  const googleMarkers = useMemo<GoogleMaps.Marker[]>(
    () =>
      PARKING_POINTS.map((point) => ({
        id: point.id,
        coordinates: {
          latitude: point.latitude,
          longitude: point.longitude,
        },
      })),
    [],
  );

  const appleMarkers = useMemo<AppleMaps.Marker[]>(
    () =>
      PARKING_POINTS.map((point) => ({
        id: point.id,
        coordinates: {
          latitude: point.latitude,
          longitude: point.longitude,
        },
        monogram: 'P',
        tintColor: '#1677FF',
      })),
    [],
  );

  const openParkingDetails = (marker: { id?: string }) => {
    if (!marker.id) {
      return;
    }

    router.push({
      pathname: '/parking/[id]',
      params: { id: marker.id },
    });
  };

  if (Platform.OS === 'ios') {
    return (
      <AppleMaps.View
        cameraPosition={MUNICH_CAMERA}
        markers={appleMarkers}
        onMarkerClick={openParkingDetails}
        properties={{
          isMyLocationEnabled: false,
          pointsOfInterest: { including: [] },
        }}
        style={{ flex: 1 }}
        uiSettings={{
          myLocationButtonEnabled: false,
        }}
      />
    );
  }

  if (Platform.OS === 'android') {
    return (
      <GoogleMaps.View
        cameraPosition={MUNICH_CAMERA}
        markers={googleMarkers}
        onMarkerClick={openParkingDetails}
        properties={{
          isBuildingEnabled: false,
          isIndoorEnabled: false,
          isMyLocationEnabled: false,
          isTrafficEnabled: false,
          selectionEnabled: false,
          mapStyleOptions: {
            json: LABEL_FREE_MAP_STYLE,
          },
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
    );
  }

  return <Text selectable>Maps are only available on Android and iOS</Text>;
}
