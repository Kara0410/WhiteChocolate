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
const RECENT_LOCATION_REUSE_MS = 10_000;
const USER_LOCATION_ZOOM = 17;

export const MUNICH_CENTER: ParkingCoordinates = {
  latitude: 48.1351,
  longitude: 11.582,
};

export const MUNICH_OVERVIEW_CAMERA: ParkingCameraState = {
  ...MUNICH_CENTER,
  zoom: 11,
  latitudeDelta: 0.2,
  longitudeDelta: 0.22,
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

async function getDeviceLocation(
  requestPermission: boolean,
): Promise<LocationResult> {
  try {
    let permission = await Location.getForegroundPermissionsAsync();
    if (
      requestPermission &&
      !permission.granted &&
      permission.canAskAgain
    ) {
      permission = await Location.requestForegroundPermissionsAsync();
    }

    if (!permission.granted) {
      return {
        message:
          permission.status === Location.PermissionStatus.UNDETERMINED
            ? 'Location access has not been enabled. Showing the Munich overview.'
            : 'Location permission is denied. Enable it in Settings to show your position. Showing the Munich overview.',
      };
    }

    const servicesEnabled = await Location.hasServicesEnabledAsync();
    if (!servicesEnabled) {
      return {
        message: 'Location services are off. Showing the Munich overview.',
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
          'Current location is unavailable. Showing the Munich overview.',
      };
    } catch (error) {
      const lastKnownCoordinates = await getRecentLastKnownCoordinates();
      if (lastKnownCoordinates) {
        return { coordinates: lastKnownCoordinates };
      }

      return {
        message:
          error instanceof LocationRequestTimeoutError
            ? 'Location request timed out. Showing the Munich overview.'
            : 'Current location is unavailable. Showing the Munich overview.',
      };
    }
  } catch {
    return {
      message: 'Current location is unavailable. Showing the Munich overview.',
    };
  }
}

type UseMapLocationOptions = {
  resolveInitialCamera?: boolean;
};

export function useMapLocation({
  resolveInitialCamera = false,
}: UseMapLocationOptions = {}) {
  const isMountedRef = useRef(true);
  const requestIdRef = useRef(0);
  const lastResolvedLocationRef = useRef<{
    coordinates: ParkingCoordinates;
    resolvedAt: number;
  } | null>(null);
  const [initialCamera, setInitialCamera] =
    useState<ParkingCameraState | null>(
      resolveInitialCamera ? null : MUNICH_OVERVIEW_CAMERA,
  );
  const [userLocation, setUserLocation] =
    useState<ParkingCoordinates | null>(null);
  const [isLocationLoading, setIsLocationLoading] = useState(false);
  const [locationMessage, setLocationMessage] = useState<string | null>(null);

  const applyResult = useCallback((result: LocationResult) => {
    if ('coordinates' in result) {
      lastResolvedLocationRef.current = {
        coordinates: result.coordinates,
        resolvedAt: Date.now(),
      };
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

  const resolveDeviceLocation = useCallback(async (requestPermission: boolean) => {
    const requestId = ++requestIdRef.current;
    if (isMountedRef.current) {
      setIsLocationLoading(true);
    }
    const result = await getDeviceLocation(requestPermission);

    if (!isMountedRef.current || requestId !== requestIdRef.current) {
      return null;
    }

    const coordinates = applyResult(result);
    setIsLocationLoading(false);
    return coordinates;
  }, [applyResult]);

  const requestCurrentLocation = useCallback(async () => {
    const recentLocation = lastResolvedLocationRef.current;
    if (
      recentLocation !== null &&
      Date.now() - recentLocation.resolvedAt <= RECENT_LOCATION_REUSE_MS
    ) {
      return recentLocation.coordinates;
    }

    return resolveDeviceLocation(true);
  }, [resolveDeviceLocation]);

  useEffect(() => {
    if (!resolveInitialCamera) {
      return;
    }

    let active = true;
    void resolveDeviceLocation(false).then((coordinates) => {
      if (!active) {
        return;
      }

      setInitialCamera(
        coordinates === null
          ? MUNICH_OVERVIEW_CAMERA
          : {
              ...coordinates,
              zoom: USER_LOCATION_ZOOM,
            },
      );
    });

    return () => {
      active = false;
    };
  }, [resolveDeviceLocation, resolveInitialCamera]);

  return {
    initialCamera,
    isLocationLoading,
    locationMessage,
    requestCurrentLocation,
    userLocation,
  };
}
