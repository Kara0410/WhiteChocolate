import { useCallback, useEffect, useRef, useState } from 'react';
import * as Location from 'expo-location';

import type {
  ParkingCameraState,
  ParkingCoordinates,
} from '@/types/parking-map';
import { hasValidParkingCoordinates } from '@/utils/parking-map-geo';

const LOCATION_TIMEOUT_MS = 15_000;
const LAST_KNOWN_LOCATION_MAX_AGE_MS = 2 * 60_000;
const LAST_KNOWN_LOCATION_MAX_ACCURACY_METERS = 500;

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

class LocationRequestTimeoutError extends Error {}

function coordinatesFromLocation(
  location: Location.LocationObject | null,
): ParkingCoordinates | null {
  if (location === null) {
    return null;
  }

  const coordinates = {
    latitude: location.coords.latitude,
    longitude: location.coords.longitude,
  };

  return hasValidParkingCoordinates(coordinates) ? coordinates : null;
}

async function getCurrentPositionWithTimeout() {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeout = setTimeout(
      () =>
        reject(
          new LocationRequestTimeoutError('Location request timed out'),
        ),
      LOCATION_TIMEOUT_MS,
    );
  });

  try {
    return await Promise.race([
      Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      }),
      timeoutPromise,
    ]);
  } finally {
    if (timeout) {
      clearTimeout(timeout);
    }
  }
}

async function getRecentLastKnownCoordinates() {
  try {
    const location = await Location.getLastKnownPositionAsync({
      maxAge: LAST_KNOWN_LOCATION_MAX_AGE_MS,
      requiredAccuracy: LAST_KNOWN_LOCATION_MAX_ACCURACY_METERS,
    });

    return coordinatesFromLocation(location);
  } catch {
    return null;
  }
}

async function getDeviceLocation(): Promise<LocationResult> {
  try {
    let permission = await Location.getForegroundPermissionsAsync();
    if (!permission.granted && permission.canAskAgain) {
      permission = await Location.requestForegroundPermissionsAsync();
    }

    if (!permission.granted) {
      return {
        message:
          'Location permission is denied. Enable it in Settings to show your position. Showing the Munich test area.',
      };
    }

    const servicesEnabled = await Location.hasServicesEnabledAsync();
    if (!servicesEnabled) {
      return {
        message: 'Location services are off. Showing the Munich test area.',
      };
    }

    try {
      const coordinates = coordinatesFromLocation(
        await getCurrentPositionWithTimeout(),
      );
      if (coordinates) {
        return { coordinates };
      }

      return {
        message:
          'Current location is unavailable. Showing the Munich test area.',
      };
    } catch (error) {
      const lastKnownCoordinates = await getRecentLastKnownCoordinates();
      if (lastKnownCoordinates) {
        return { coordinates: lastKnownCoordinates };
      }

      return {
        message:
          error instanceof LocationRequestTimeoutError
            ? 'Location request timed out. Showing the Munich test area.'
            : 'Current location is unavailable. Showing the Munich test area.',
      };
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

    setUserLocation(null);
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
