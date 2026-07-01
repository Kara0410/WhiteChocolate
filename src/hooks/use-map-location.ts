import { useCallback, useEffect, useRef, useState } from 'react';
import * as Location from 'expo-location';

import type {
  ParkingCameraState,
  ParkingCoordinates,
} from '@/types/parking-map';
import { hasValidParkingCoordinates } from '@/utils/parking-map-geo';

const LOCATION_TIMEOUT_MS = 12_000;

export const MUNICH_MOCK_LOCATION: ParkingCoordinates = {
  latitude: 48.1351,
  longitude: 11.5824,
};

export const MOCK_CAMERA: ParkingCameraState = {
  ...MUNICH_MOCK_LOCATION,
  zoom: 17,
};

type LocationResult =
  | { coordinates: ParkingCoordinates }
  | { message: string };

async function getDeviceLocation(): Promise<LocationResult> {
  try {
    let permission = await Location.getForegroundPermissionsAsync();
    if (permission.status !== Location.PermissionStatus.GRANTED) {
      permission = await Location.requestForegroundPermissionsAsync();
    }

    if (permission.status !== Location.PermissionStatus.GRANTED) {
      return {
        message: 'Location permission denied. Showing the Munich test area.',
      };
    }

    const servicesEnabled = await Location.hasServicesEnabledAsync();
    if (!servicesEnabled) {
      return {
        message: 'Location services are off. Showing the Munich test area.',
      };
    }

    let timeout: ReturnType<typeof setTimeout> | undefined;
    const timeoutPromise = new Promise<never>((_, reject) => {
      timeout = setTimeout(
        () => reject(new Error('Location request timed out')),
        LOCATION_TIMEOUT_MS,
      );
    });

    try {
      const position = await Promise.race([
        Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        }),
        timeoutPromise,
      ]);

      const coordinates = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      };

      return hasValidParkingCoordinates(coordinates)
        ? { coordinates }
        : {
            message:
              'Current location is unavailable. Showing the Munich test area.',
          };
    } finally {
      if (timeout) {
        clearTimeout(timeout);
      }
    }
  } catch {
    return {
      message: 'Current location is unavailable. Showing the Munich test area.',
    };
  }
}

export function useMapLocation() {
  const bootstrapPromiseRef = useRef<Promise<LocationResult> | null>(null);
  const isMountedRef = useRef(true);
  const requestIdRef = useRef(0);
  const [initialCamera, setInitialCamera] =
    useState<ParkingCameraState | null>(null);
  const [userLocation, setUserLocation] =
    useState<ParkingCoordinates | null>(null);
  const [isLocationLoading, setIsLocationLoading] = useState(true);
  const [locationMessage, setLocationMessage] = useState<string | null>(null);

  const applyResult = useCallback((result: LocationResult) => {
    if ('coordinates' in result) {
      setUserLocation(result.coordinates);
      setLocationMessage(null);
      return result.coordinates;
    }

    setLocationMessage(result.message);
    return null;
  }, []);

  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;
      requestIdRef.current += 1;
    };
  }, []);

  useEffect(() => {
    let isActive = true;
    const requestId = ++requestIdRef.current;
    bootstrapPromiseRef.current ??= getDeviceLocation();

    void bootstrapPromiseRef.current.then((result) => {
      if (
        !isActive ||
        !isMountedRef.current ||
        requestId !== requestIdRef.current
      ) {
        return;
      }

      const coordinates = applyResult(result);
      setInitialCamera(
        coordinates ? { ...coordinates, zoom: 17 } : MOCK_CAMERA,
      );
      setIsLocationLoading(false);
    });

    return () => {
      isActive = false;
    };
  }, [applyResult]);

  const requestCurrentLocation = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    if (isMountedRef.current) {
      setIsLocationLoading(true);
    }
    const result = await getDeviceLocation();

    if (!isMountedRef.current || requestId !== requestIdRef.current) {
      return null;
    }

    const coordinates = applyResult(result);
    setIsLocationLoading(false);
    return coordinates;
  }, [applyResult]);

  return {
    initialCamera,
    isLocationLoading,
    locationMessage,
    requestCurrentLocation,
    userLocation,
  };
}
