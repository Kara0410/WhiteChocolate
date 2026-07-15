import { useCallback, useEffect, useRef, useState } from 'react';
import * as Location from 'expo-location';
import { Linking } from 'react-native';

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
  | { message: string; requiresSettings?: boolean };

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
            ? 'Location access is off. Allow it to use your current position, or search for an address.'
            : permission.canAskAgain
              ? 'Location access is off. Allow it to use your current position, or search for an address.'
              : 'Location access is turned off. Enable it in Settings to use your current position.',
        requiresSettings:
          permission.status !== Location.PermissionStatus.UNDETERMINED &&
          !permission.canAskAgain,
      };
    }

    const servicesEnabled = await Location.hasServicesEnabledAsync();
    if (!servicesEnabled) {
      return {
        message:
          'Location services are turned off. Turn them on to use your current position.',
        requiresSettings: true,
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
          'We couldn\'t get your location. Try again or search for an address.',
      };
    } catch (error) {
      const lastKnownCoordinates = await getRecentLastKnownCoordinates();
      if (lastKnownCoordinates) {
        return { coordinates: lastKnownCoordinates };
      }

      return {
        message:
          error instanceof LocationRequestTimeoutError
            ? 'We couldn\'t get your location. Try again or search for an address.'
            : 'We couldn\'t get your location. Try again or search for an address.',
      };
    }
  } catch {
    return {
      message: 'We couldn\'t get your location. Try again or search for an address.',
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
  const locationRequestRef = useRef<Promise<ParkingCoordinates | null> | null>(
    null,
  );
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
  const [locationSettingsRequired, setLocationSettingsRequired] =
    useState(false);

  const applyResult = useCallback((result: LocationResult) => {
    if ('coordinates' in result) {
      lastResolvedLocationRef.current = {
        coordinates: result.coordinates,
        resolvedAt: Date.now(),
      };
      setUserLocation(result.coordinates);
      setLocationMessage(null);
      setLocationSettingsRequired(false);
      return result.coordinates;
    }

    setUserLocation(null);
    setLocationMessage(result.message);
    setLocationSettingsRequired(result.requiresSettings === true);
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
    if (locationRequestRef.current) {
      return locationRequestRef.current;
    }

    const requestId = ++requestIdRef.current;
    const operation = (async () => {
      if (isMountedRef.current) {
        setIsLocationLoading(true);
      }
      const result = await getDeviceLocation(requestPermission);

      if (!isMountedRef.current || requestId !== requestIdRef.current) {
        return null;
      }

      return applyResult(result);
    })().finally(() => {
      if (locationRequestRef.current === operation) {
        locationRequestRef.current = null;
      }
      if (isMountedRef.current) {
        setIsLocationLoading(false);
      }
    });

    locationRequestRef.current = operation;
    return operation;
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

  const openLocationSettings = useCallback(async () => {
    try {
      await Linking.openSettings();
    } catch {
      if (isMountedRef.current) {
        setLocationMessage(
          'Settings could not be opened. Enable location access in your device settings.',
        );
      }
    }
  }, []);

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
    locationSettingsRequired,
    openLocationSettings,
    requestCurrentLocation,
    userLocation,
  };
}
