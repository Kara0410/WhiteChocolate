import { lazy, Suspense } from 'react';
import {
  ActivityIndicator,
  Linking,
  StyleSheet,
  Text,
  TouchableOpacity,
  TurboModuleRegistry,
  View,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import { C } from '@/constants/theme';
import type { ParkingMapProps } from './ParkingMapView';

// ─── Native-module availability gate ───────────────────────────────────────────
// react-native-maps' spec calls TurboModuleRegistry.getEnforcing('RNMapsAirModule')
// at module-eval time, which THROWS when the native module isn't linked (e.g. in
// Expo Go, or a stale dev client built before maps was added). A thrown error here
// would crash the whole route module, so expo-router can't register `/map` and the
// home redirect lands on "not found".
//
// We probe with the non-throwing TurboModuleRegistry.get() first, and only import
// the real map (which pulls in react-native-maps) when the module is present.
// On web, TurboModuleRegistry isn't implemented — optional chaining keeps it safe.
export const MAPS_AVAILABLE = TurboModuleRegistry?.get?.('RNMapsAirModule') != null;

// Lazily import so react-native-maps is never evaluated when MAPS_AVAILABLE is false.
const ParkingMapView = MAPS_AVAILABLE
  ? lazy(() => import('./ParkingMapView'))
  : null;

// ─── Fallback ──────────────────────────────────────────────────────────────────
// Shown when the native maps module isn't in the running binary. Keeps the screen
// (and the rest of the app) working instead of red-screening the router.

function MapUnavailable() {
  return (
    <View style={styles.fallback}>
      <Ionicons name="map-outline" size={44} color={C.muted} />
      <Text style={styles.fallbackTitle}>Map needs a development build</Text>
      <Text style={styles.fallbackBody}>
        The interactive map uses native code that isn’t included in Expo Go. Run a
        development build to see it.
      </Text>
      <TouchableOpacity
        style={styles.fallbackBtn}
        onPress={() =>
          Linking.openURL('https://docs.expo.dev/develop/development-builds/introduction/')
        }
        accessibilityRole="link"
      >
        <Text style={styles.fallbackBtnText}>Learn about dev builds</Text>
        <Ionicons name="open-outline" size={15} color={C.accent} />
      </TouchableOpacity>
    </View>
  );
}

function MapLoading() {
  return (
    <View style={styles.fallback}>
      <ActivityIndicator size="large" color={C.accent} />
    </View>
  );
}

// ─── NativeParkingMap ───────────────────────────────────────────────────────────
// Public component: identical API to before, but resilient to a missing module.

export default function NativeParkingMap(props: ParkingMapProps) {
  if (!ParkingMapView) {
    return <MapUnavailable />;
  }
  return (
    <Suspense fallback={<MapLoading />}>
      <ParkingMapView {...props} />
    </Suspense>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  fallback: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 28,
    gap: 12,
  },
  fallbackTitle: {
    color: C.text,
    fontSize: 17,
    fontWeight: '700',
    textAlign: 'center',
  },
  fallbackBody: {
    color: C.muted,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  fallbackBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 99,
    backgroundColor: 'rgba(0,122,255,0.1)',
  },
  fallbackBtnText: {
    color: C.accent,
    fontSize: 14,
    fontWeight: '600',
  },
});
