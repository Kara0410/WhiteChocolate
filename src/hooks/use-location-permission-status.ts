import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import { useFocusEffect } from 'expo-router';
import * as Location from 'expo-location';
import { AppState, Linking } from 'react-native';

export type AccountLocationStatus =
  | 'allowed'
  | 'denied'
  | 'not-requested'
  | 'services-disabled'
  | 'unavailable';

type LocationPermissionState = {
  status: AccountLocationStatus;
  label: string;
  description: string;
};

const INITIAL_STATE: LocationPermissionState = {
  status: 'unavailable',
  label: 'Checking',
  description: 'Checking foreground location access.',
};

function describeLocationState(
  permission: Location.LocationPermissionResponse,
  servicesEnabled: boolean,
): LocationPermissionState {
  const permissionLabel = permission.granted
    ? 'Allowed'
    : permission.status === 'undetermined'
      ? 'Not requested'
      : 'Denied';

  if (!servicesEnabled) {
    return {
      status: 'services-disabled',
      label: 'Services off',
      description: `Device location services are disabled. Permission: ${permissionLabel}.`,
    };
  }

  if (permission.granted) {
    return {
      status: 'allowed',
      label: 'Allowed',
      description:
        'Foreground location access is allowed. Location is requested only from map actions.',
    };
  }

  if (permission.status === 'undetermined') {
    return {
      status: 'not-requested',
      label: 'Not requested',
      description:
        'Location has not been requested. Use the current-location map action when needed.',
    };
  }

  return {
    status: 'denied',
    label: 'Denied',
    description: permission.canAskAgain
      ? 'Foreground location access is denied. The map can request it again contextually.'
      : 'Foreground location access is denied. Change it in system Settings.',
  };
}

export function useLocationPermissionStatus() {
  const mountedRef = useRef(true);
  const requestIdRef = useRef(0);
  const [state, setState] =
    useState<LocationPermissionState>(INITIAL_STATE);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    if (mountedRef.current) {
      setLoading(true);
      setError(null);
    }

    try {
      const [permission, servicesEnabled] = await Promise.all([
        Location.getForegroundPermissionsAsync(),
        Location.hasServicesEnabledAsync(),
      ]);

      if (mountedRef.current && requestId === requestIdRef.current) {
        setState(describeLocationState(permission, servicesEnabled));
      }
    } catch {
      if (mountedRef.current && requestId === requestIdRef.current) {
        setState({
          status: 'unavailable',
          label: 'Unavailable',
          description:
            'Location permission status is unavailable on this device.',
        });
        setError('Location permission status could not be checked.');
      }
    } finally {
      if (mountedRef.current && requestId === requestIdRef.current) {
        setLoading(false);
      }
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );

  useEffect(() => {
    mountedRef.current = true;
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        void refresh();
      }
    });

    return () => {
      mountedRef.current = false;
      requestIdRef.current += 1;
      subscription.remove();
    };
  }, [refresh]);

  const openSettings = useCallback(async () => {
    try {
      await Linking.openSettings();
    } catch {
      if (mountedRef.current) {
        setError('System Settings could not be opened.');
      }
    }
  }, []);

  return {
    ...state,
    error,
    loading,
    openSettings,
    refresh,
  };
}

