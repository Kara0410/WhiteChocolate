import { memo, useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE, type Region } from 'react-native-maps';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { C } from '@/constants/theme';
import { confidenceOpacity, confidenceTone, type Zone } from '@/constants/zones';

// ─── Constants ────────────────────────────────────────────────────────────────

const MUNICH_REGION: Region = {
  latitude: 48.1351,
  longitude: 11.5824,
  latitudeDelta: 0.06,
  longitudeDelta: 0.06,
};

// ─── ZoneMarker ──────────────────────────────────────────────────────────────
// Asymmetrical pill chip (rounded everywhere but one corner) so zones read as
// confidence pins rather than generic map dots — mirrors the mockup's
// .zone-chip treatment. tracksViewChanges is only true for the selected pin
// since that's the only one animating, keeping iOS marker diffing cheap.

const ZoneMarker = memo(function ZoneMarker({ zone, selected }: { zone: Zone; selected: boolean }) {
  const color = confidenceTone(zone.pct);
  const opacity = confidenceOpacity(zone.freshness);

  const pulse = useSharedValue(0);
  useEffect(() => {
    if (!selected) return;
    pulse.value = 0;
    pulse.value = withRepeat(withTiming(1, { duration: 1800 }), -1, false);
  }, [selected, pulse]);

  const ringStyle = useAnimatedStyle(() => ({
    opacity: 1 - pulse.value,
    transform: [{ scale: 1 + pulse.value * 0.6 }],
  }));

  return (
    <View style={styles.markerWrap}>
      {selected && (
        <Animated.View style={[styles.pulseRing, { backgroundColor: color }, ringStyle]} />
      )}
      <View
        style={[
          styles.chip,
          {
            backgroundColor: color,
            opacity,
            borderStyle: zone.freshness === 'none' ? 'dashed' : 'solid',
          },
          selected && styles.chipSelected,
        ]}
      >
        <Text style={styles.chipPct} numberOfLines={1}>
          {zone.pct === null ? '—' : `${zone.pct}%`}
        </Text>
        <Text style={styles.chipAge} numberOfLines={1}>
          {zone.age}
        </Text>
      </View>
    </View>
  );
});

// ─── Props ────────────────────────────────────────────────────────────────────

export interface ParkingMapProps {
  zones: Zone[];
  userLocation: { lat: number; lon: number } | null;
  onSelect: (zone: Zone) => void;
  selectedId?: string;
  mapRef: React.RefObject<MapView>;
}

// ─── ParkingMapView ───────────────────────────────────────────────────────────

export default function ParkingMapView({
  zones,
  userLocation,
  onSelect,
  selectedId,
  mapRef,
}: ParkingMapProps) {
  return (
    <MapView
      ref={mapRef}
      style={StyleSheet.absoluteFillObject}
      provider={PROVIDER_GOOGLE}
      initialRegion={MUNICH_REGION}
      showsUserLocation={!!userLocation}
      showsMyLocationButton={false}
      showsCompass={false}
      toolbarEnabled={false}
      loadingEnabled
      loadingBackgroundColor={C.mapTint}
      loadingIndicatorColor={C.accent}
    >
      {zones.map((zone) => {
        const isSelected = zone.id === selectedId;
        return (
          <Marker
            key={zone.id}
            coordinate={{ latitude: zone.lat, longitude: zone.lon }}
            onPress={() => onSelect(zone)}
            tracksViewChanges={isSelected}
            anchor={{ x: 0.5, y: 0.5 }}
          >
            <ZoneMarker zone={zone} selected={isSelected} />
          </Marker>
        );
      })}
    </MapView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  markerWrap: {
    width: 64,
    height: 64,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulseRing: {
    position: 'absolute',
    width: 54,
    height: 54,
    borderRadius: 27,
  },
  chip: {
    minWidth: 48,
    minHeight: 48,
    paddingHorizontal: 4,
    transform: [{ rotate: '-8deg' }],
    borderWidth: 2,
    borderColor: 'rgba(23,33,38,0.45)',
    borderTopLeftRadius: 99,
    borderTopRightRadius: 99,
    borderBottomLeftRadius: 99,
    borderBottomRightRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.22,
    shadowRadius: 6,
    elevation: 5,
  },
  chipSelected: {
    borderWidth: 3,
    borderColor: 'rgba(255,252,245,0.92)',
  },
  chipPct: {
    color: C.text,
    fontSize: 13,
    fontWeight: '800',
    lineHeight: 15,
  },
  chipAge: {
    color: C.text,
    fontSize: 9,
    fontWeight: '700',
    lineHeight: 10,
  },
});
