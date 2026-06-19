import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import type MapView from 'react-native-maps';

import TopBar from '@/components/TopBar';
import NativeParkingMap from '@/components/NativeParkingMap';
import { C, GLASS_CARD, R } from '@/constants/theme';
import { parkingData } from '@/data/munich_parking';
import { getBadgeColor, type DisplayEntry } from '@/utils/parking';
import { fmtDist, haversine } from '@/utils/geo';
import { useLocation } from '@/hooks/useLocation';

// ─── MapScreen ────────────────────────────────────────────────────────────────

export default function MapScreen() {
  const [selected, setSelected] = useState<DisplayEntry | null>(null);
  const { userLoc, locLoading, requestLocation } = useLocation();
  const mapRef = useRef<MapView>(null);

  // Stamp every entry with its stable array index — no filter/sort on the map.
  // Distance sorting is useful for the list view, not for scatter-plot markers.
  const displayEntries = useMemo<DisplayEntry[]>(
    () => parkingData.map((e, i) => ({ ...e, _idx: i })),
    [],
  );

  // Animate to the user's position whenever a GPS fix arrives
  useEffect(() => {
    if (!userLoc) return;
    mapRef.current?.animateToRegion(
      {
        latitude: userLoc.lat,
        longitude: userLoc.lon,
        latitudeDelta: 0.012,
        longitudeDelta: 0.012,
      },
      800,
    );
  }, [userLoc]);

  // Tap same marker again → deselect; tap different → select
  const handleSelect = useCallback((item: DisplayEntry) => {
    setSelected((prev) => (prev?._idx === item._idx ? null : item));
  }, []);

  // Center button: if we have a fix, re-centre; otherwise request permission
  const handleCenter = useCallback(() => {
    if (userLoc) {
      mapRef.current?.animateToRegion(
        {
          latitude: userLoc.lat,
          longitude: userLoc.lon,
          latitudeDelta: 0.012,
          longitudeDelta: 0.012,
        },
        600,
      );
    } else {
      requestLocation();
    }
  }, [userLoc, requestLocation]);

  // Distance from selected marker to user — computed here so NativeParkingMap
  // stays stateless and doesn't need to know about the selected entry.
  const selectedDistance = useMemo(() => {
    if (!selected || !userLoc || !selected.lat || !selected.lon) return null;
    return haversine(userLoc.lat, userLoc.lon, selected.lat, selected.lon);
  }, [selected, userLoc]);

  const badgeColor = selected ? getBadgeColor(selected.gruppe) : C.accent;

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <SafeAreaView edges={['top']} style={{ flex: 1 }}>
        <View style={{ flex: 1, paddingHorizontal: 16, paddingTop: 16, gap: 8 }}>

          {/* Top bar */}
          <TopBar
            title="Find parking"
            subtitle="Munich city data · static supply"
            action={
              <Pressable style={styles.notifBtn}>
                <Ionicons name="notifications-outline" size={18} color="#163252" />
                <Text style={{ color: '#163252', fontWeight: '700', fontSize: 14 }}>2</Text>
              </Pressable>
            }
          />

          {/* ── Map ─────────────────────────────────────────────────────── */}
          {/* flex:1 takes all remaining space; overflow:hidden clips the   */}
          {/* MapView to the border radius on the parent card.              */}
          <View style={[styles.mapCard, { flex: 1 }]}>
            <NativeParkingMap
              parkingData={displayEntries}
              userLocation={userLoc}
              onSelect={handleSelect}
              selectedIdx={selected?._idx}
              mapRef={mapRef as React.RefObject<MapView>}
            />

            {/* Center / locate button — absolutely positioned over the map */}
            <Pressable
              style={styles.centerBtn}
              onPress={handleCenter}
              accessibilityLabel={userLoc ? 'Re-center map' : 'Find my location'}
            >
              {locLoading ? (
                <ActivityIndicator size="small" color={C.text} />
              ) : (
                <Ionicons
                  name={userLoc ? 'navigate' : 'navigate-outline'}
                  size={18}
                  color={userLoc ? C.accent : C.text}
                />
              )}
              <Text style={styles.centerBtnText}>
                {locLoading ? 'Locating…' : userLoc ? 'Centered' : 'Center'}
              </Text>
            </Pressable>
          </View>

          {/* ── Selected parking card ────────────────────────────────────── */}
          {selected && (
            <View style={[styles.infoCard, GLASS_CARD]}>
              {/* Drag handle — visual affordance only */}
              <View style={styles.handle} />

              {/* Street name + close */}
              <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.street}>{selected.strasse}</Text>
                  {selected.prm ? (
                    <Text style={styles.district}>{selected.prm}</Text>
                  ) : null}
                </View>
                <Pressable onPress={() => setSelected(null)} hitSlop={10}>
                  <Ionicons name="close-circle" size={22} color={C.border} />
                </Pressable>
              </View>

              {/* Parking type badge */}
              <View style={[styles.badge, { backgroundColor: badgeColor + '22' }]}>
                <Text style={[styles.badgeText, { color: badgeColor }]} numberOfLines={1}>
                  {selected.gruppe}
                </Text>
              </View>

              {/* Info chips — three columns */}
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
                <InfoChip
                  label="Total spaces"
                  value={selected.angebot > 0 ? String(selected.angebot) : '—'}
                  sub="Static city data"
                />
                {selectedDistance !== null ? (
                  <InfoChip
                    label="Distance"
                    value={fmtDist(selectedDistance)}
                    sub="From your location"
                  />
                ) : null}
                <InfoChip
                  label="Availability"
                  value="Unknown"
                  sub="No live feed"
                />
              </View>
            </View>
          )}

          {/* Spacer for the floating nav bar */}
          <View style={{ height: 82 }} />
        </View>
      </SafeAreaView>
    </View>
  );
}

// ─── InfoChip ─────────────────────────────────────────────────────────────────

function InfoChip({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub: string;
}) {
  return (
    <View style={styles.chip}>
      <Text style={styles.chipLabel}>{label}</Text>
      <Text style={styles.chipValue}>{value}</Text>
      <Text style={styles.chipSub}>{sub}</Text>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  notifBtn: {
    minHeight: 44,
    paddingHorizontal: 14,
    borderRadius: 99,
    backgroundColor: 'rgba(255,255,255,0.82)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    shadowColor: '#758499',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.22,
    shadowRadius: 2,
    elevation: 2,
  },
  mapCard: {
    borderRadius: R.xl,
    overflow: 'hidden',
    backgroundColor: '#e7edf2',
  },
  centerBtn: {
    position: 'absolute',
    left: 14,
    bottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 99,
    backgroundColor: 'rgba(255,255,255,0.92)',
    shadowColor: '#758499',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 4,
    elevation: 4,
  },
  centerBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: C.text,
  },
  infoCard: {
    padding: 14,
    borderRadius: R.xl,
    backgroundColor: 'rgba(255,255,255,0.96)',
  },
  handle: {
    width: 42,
    height: 5,
    borderRadius: 99,
    backgroundColor: '#c7ced9',
    marginBottom: 12,
    alignSelf: 'center',
  },
  street: {
    color: C.text,
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: -0.4,
    marginBottom: 2,
  },
  district: {
    color: C.muted,
    fontSize: 13,
  },
  badge: {
    alignSelf: 'flex-start',
    marginTop: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 99,
    maxWidth: '90%',
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  chip: {
    flex: 1,
    backgroundColor: '#f3f6fa',
    padding: 10,
    borderRadius: R.md,
  },
  chipLabel: {
    color: C.muted,
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 2,
  },
  chipValue: {
    color: C.text,
    fontSize: 14,
    fontWeight: '700',
  },
  chipSub: {
    color: C.muted,
    fontSize: 10,
    marginTop: 2,
  },
});
