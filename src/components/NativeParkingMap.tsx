import { memo, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE, type Region } from 'react-native-maps';

import { getBadgeColor, type DisplayEntry } from '@/utils/parking';

// ─── Types ────────────────────────────────────────────────────────────────────

type CoordEntry = DisplayEntry & { lat: number; lon: number };

function hasCoords(item: DisplayEntry): item is CoordEntry {
  return typeof item.lat === 'number' && typeof item.lon === 'number';
}

// ─── Constants ────────────────────────────────────────────────────────────────

const MUNICH_REGION: Region = {
  latitude: 48.1351,
  longitude: 11.5824,
  latitudeDelta: 0.08,
  longitudeDelta: 0.08,
};

// Cap visible markers per region to avoid rendering thousands at once.
const MAX_VISIBLE = 300;

// ─── ParkingMarker ───────────────────────────────────────────────────────────
// Memoized so React doesn't re-create this component on every map re-render.
// tracksViewChanges={false} on the Marker prevents iOS from diffing the native
// view tree on every frame — a significant performance win for dense datasets.

const ParkingMarker = memo(function ParkingMarker({ item }: { item: CoordEntry }) {
  const color = getBadgeColor(item.gruppe);
  const label = item.angebot > 0 ? String(item.angebot) : 'P';
  return (
    <View style={[styles.marker, { backgroundColor: color }]}>
      <Text style={styles.markerLabel} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
});

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  parkingData: DisplayEntry[];
  userLocation: { lat: number; lon: number } | null;
  onSelect: (item: DisplayEntry) => void;
  selectedIdx?: number;
  mapRef: React.RefObject<MapView>;
}

// ─── NativeParkingMap ─────────────────────────────────────────────────────────

export default function NativeParkingMap({
  parkingData,
  userLocation,
  onSelect,
  mapRef,
}: Props) {
  const [region, setRegion] = useState<Region>(MUNICH_REGION);

  // Compute once: entries with valid lat/lon
  const withCoords = useMemo(
    () => parkingData.filter(hasCoords),
    [parkingData],
  );

  // On each region change, clip to visible bounds capped at MAX_VISIBLE.
  // Recomputing is cheap here because withCoords is already memoized.
  const visibleMarkers = useMemo((): CoordEntry[] => {
    const { latitude, longitude, latitudeDelta, longitudeDelta } = region;
    const latMin = latitude - latitudeDelta / 2;
    const latMax = latitude + latitudeDelta / 2;
    const lonMin = longitude - longitudeDelta / 2;
    const lonMax = longitude + longitudeDelta / 2;

    const inBounds = withCoords.filter(
      (item) =>
        item.lat >= latMin &&
        item.lat <= latMax &&
        item.lon >= lonMin &&
        item.lon <= lonMax,
    );

    return inBounds.length <= MAX_VISIBLE ? inBounds : inBounds.slice(0, MAX_VISIBLE);
  }, [withCoords, region]);

  return (
    <MapView
      ref={mapRef}
      style={StyleSheet.absoluteFillObject}
      provider={PROVIDER_GOOGLE}
      initialRegion={MUNICH_REGION}
      onRegionChangeComplete={setRegion}
      // Show the native blue-dot only after we have a GPS fix
      showsUserLocation={!!userLocation}
      showsMyLocationButton={false}
      showsCompass={false}
      // Android: removes the "Open in Maps" toolbar that appears on marker press
      toolbarEnabled={false}
      // Show a loading indicator while map tiles fetch
      loadingEnabled
      loadingBackgroundColor="#F7F8FC"
      loadingIndicatorColor="#007AFF"
    >
      {visibleMarkers.map((item) => (
        <Marker
          key={item._idx}
          coordinate={{ latitude: item.lat, longitude: item.lon }}
          onPress={() => onSelect(item)}
          // iOS: render once and skip native view-tree diffing each frame
          tracksViewChanges={false}
          anchor={{ x: 0.5, y: 0.5 }}
        >
          <ParkingMarker item={item} />
        </Marker>
      ))}
    </MapView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  marker: {
    width: 34,
    height: 34,
    borderRadius: 8,
    borderBottomRightRadius: 2,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  markerLabel: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
});
