/**
 * Custom hook — GPS permission request and current-position state.
 *
 * Encapsulates all expo-location calls so screens stay free of permission
 * boilerplate and can simply call `requestLocation` and read `userLoc`.
 */

import { useCallback, useState } from 'react';
import { Alert } from 'react-native';
import * as Location from 'expo-location';

type Coords = { lat: number; lon: number };

type UseLocationResult = {
  /** Current user position, or null when location mode is off. */
  userLoc: Coords | null;
  /** True while the permission dialog or GPS fix is in progress. */
  locLoading: boolean;
  /**
   * Toggles location mode:
   *   - When inactive → requests permission, fetches a one-shot GPS fix.
   *   - When active   → clears the stored position (returns to A–Z sort).
   */
  requestLocation: () => Promise<void>;
};

export function useLocation(): UseLocationResult {
  const [userLoc, setUserLoc]       = useState<Coords | null>(null);
  const [locLoading, setLocLoading] = useState(false);

  const requestLocation = useCallback(async () => {
    // Second tap: deactivate location mode.
    if (userLoc) {
      setUserLoc(null);
      return;
    }

    setLocLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission denied', 'Enable location access to find nearby parking.');
        return;
      }

      // Balanced accuracy is a good trade-off: faster than High, still precise
      // enough for street-level distances in a dense city.
      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      setUserLoc({ lat: pos.coords.latitude, lon: pos.coords.longitude });
    } catch {
      Alert.alert('Error', 'Could not get your location. Please try again.');
    } finally {
      // Always clear the spinner, even if an error was thrown.
      setLocLoading(false);
    }
  }, [userLoc]);

  return { userLoc, locLoading, requestLocation };
}
