import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { type ErrorBoundaryProps, router } from 'expo-router';
import { BlurView } from 'expo-blur';
import Ionicons from '@expo/vector-icons/Ionicons';
import type MapView from 'react-native-maps';

import TopBar from '@/components/TopBar';
import NativeParkingMap from '@/components/NativeParkingMap';
import { BLUR_INTENSITY, BLUR_TINT, C, GLASS_BORDER, GLASS_CARD, R } from '@/constants/theme';
import { parkingData } from '@/data/munich_parking';
import { getBadgeColor, type DisplayEntry } from '@/utils/parking';
import { fmtDist, haversine } from '@/utils/geo';
import { useLocation } from '@/hooks/useLocation';

// ─── ErrorBoundary ──────────────────────────────────────────────────────────────
// Expo Router renders this in place of the route when anything in the map
// subtree throws during render — so the /map tab always shows *something*
// (with a Retry) instead of the route de-registering into "Oops, not found".

export function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  return (
    <View style={styles.boundary}>
      <Ionicons name="warning-outline" size={44} color={C.warning} />
      <Text style={styles.boundaryTitle}>The map couldn’t load</Text>
      <Text style={styles.boundaryBody}>{error.message}</Text>
      <Pressable style={styles.boundaryBtn} onPress={retry}>
        <Ionicons name="refresh" size={16} color={C.accent} />
        <Text style={styles.boundaryBtnText}>Try again</Text>
      </Pressable>
    </View>
  );
}

// ─── MapScreen ────────────────────────────────────────────────────────────────

export default function MapScreen() {
  const [selected, setSelected] = useState<DisplayEntry | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const { userLoc, locLoading, requestLocation } = useLocation();
  const mapRef = useRef<MapView>(null);

  // Stamp every entry with its stable array index — no filter/sort on the map.
  // Distance sorting is useful for the list view, not for scatter-plot markers.
  const displayEntries = useMemo<DisplayEntry[]>(
    () => parkingData.map((e, i) => ({ ...e, _idx: i })),
    [],
  );

  // Animate to the user's position whenever a GPS fix arrives, and show a
  // brief confirmation toast the first time it locks.
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
    setToast('Centered on your location');
    const t = setTimeout(() => setToast(null), 2200);
    return () => clearTimeout(t);
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

  // Rough walk time at an average pace of ~80 metres/minute.
  const selectedWalkMin = useMemo(() => {
    if (selectedDistance === null) return null;
    return Math.max(1, Math.round(selectedDistance / 80));
  }, [selectedDistance]);

  const badgeColor = selected ? getBadgeColor(selected.gruppe) : C.accent;

  const handleViewDetails = useCallback(() => {
    if (!selected) return;
    router.push({ pathname: '/parking/[id]', params: { id: String(selected._idx) } });
  }, [selected]);

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <SafeAreaView edges={['top']} style={{ flex: 1 }}>
        <View style={{ flex: 1, paddingHorizontal: 16, paddingTop: 16, gap: 8 }}>

          {/* Top bar */}
          <TopBar
            title="Find parking"
            subtitle="Munich city data · static supply"
            action={
              <Pressable style={styles.notifBtnWrap}>
                <BlurView
                  intensity={BLUR_INTENSITY}
                  tint={BLUR_TINT}
                  style={StyleSheet.absoluteFillObject}
                />
                <Ionicons name="notifications-outline" size={18} color="#163252" />
                <Text style={{ color: '#163252', fontWeight: '700', fontSize: 14 }}>2</Text>
              </Pressable>
            }
          />

          {/* ── Map ─────────────────────────────────────────────────────── */}
          {/* flex:1 takes all remaining space; overflow:hidden clips the   */}
          {/* MapView to the border radius on the parent card.              */}
          <View style={[styles.mapCardShadow, { flex: 1 }]}>
            <View style={styles.mapCard}>
              <NativeParkingMap
                parkingData={displayEntries}
                userLocation={userLoc}
                onSelect={handleSelect}
                selectedIdx={selected?._idx}
                mapRef={mapRef as React.RefObject<MapView>}
              />

              {/* 1px inner highlight border, drawn over the map — mirrors the */}
              {/* mockup's inset box-shadow (RN shadows can't do inset).       */}
              <View style={styles.mapCardInsetBorder} pointerEvents="none" />

              {/* Toast — brief confirmation when GPS first locks */}
              {toast && (
                <View style={styles.toastWrap} pointerEvents="none">
                  <View style={styles.toastPill}>
                    <BlurView
                      intensity={BLUR_INTENSITY}
                      tint="dark"
                      style={StyleSheet.absoluteFillObject}
                    />
                    <Text style={styles.toastText}>{toast}</Text>
                  </View>
                </View>
              )}

              {/* Center / locate button — absolutely positioned over the map */}
              <Pressable
                style={styles.centerBtn}
                onPress={handleCenter}
                accessibilityLabel={userLoc ? 'Re-center map' : 'Find my location'}
              >
                <BlurView
                  intensity={BLUR_INTENSITY}
                  tint={BLUR_TINT}
                  style={StyleSheet.absoluteFillObject}
                />
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
          </View>

          {/* ── Selected parking bottom sheet ──────────────────────────────── */}
          {selected && (
            <View style={[styles.infoCardShadow, GLASS_CARD]}>
              <BlurView intensity={BLUR_INTENSITY} tint={BLUR_TINT} style={styles.infoCard}>
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
                      sub={`~${selectedWalkMin}min walk`}
                    />
                  ) : null}
                  <InfoChip
                    label="Availability"
                    value="Unknown"
                    sub="No live feed"
                  />
                </View>

                {/* Primary CTA — full parking detail screen */}
                <Pressable style={styles.primaryBtn} onPress={handleViewDetails}>
                  <Text style={styles.primaryBtnText}>View full details</Text>
                  <Ionicons name="arrow-forward" size={16} color="#fff" />
                </Pressable>
              </BlurView>
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
  boundary: {
    flex: 1,
    backgroundColor: C.bg,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 28,
    gap: 12,
  },
  boundaryTitle: {
    color: C.text,
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  boundaryBody: {
    color: C.muted,
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
  },
  boundaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 99,
    backgroundColor: 'rgba(0,122,255,0.1)',
  },
  boundaryBtnText: {
    color: C.accent,
    fontSize: 14,
    fontWeight: '600',
  },
  notifBtnWrap: {
    minHeight: 44,
    paddingHorizontal: 14,
    borderRadius: 99,
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: GLASS_BORDER,
    shadowColor: '#758499',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.22,
    shadowRadius: 2,
    elevation: 2,
  },
  mapCardShadow: {
    borderRadius: R.xl,
    shadowColor: '#54637d',
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.16,
    shadowRadius: 24,
    elevation: 8,
  },
  mapCard: {
    flex: 1,
    borderRadius: R.xl,
    overflow: 'hidden',
    backgroundColor: '#e7edf2',
  },
  mapCardInsetBorder: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: R.xl,
    borderWidth: 1,
    borderColor: 'rgba(84,99,125,0.15)',
  },
  toastWrap: {
    position: 'absolute',
    top: 12,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  toastPill: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 99,
    overflow: 'hidden',
  },
  toastText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
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
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: GLASS_BORDER,
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
  infoCardShadow: {
    borderRadius: R.xl,
  },
  infoCard: {
    padding: 14,
    borderRadius: R.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: GLASS_BORDER,
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
    backgroundColor: 'rgba(255,255,255,0.5)',
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
  primaryBtn: {
    marginTop: 12,
    minHeight: 48,
    borderRadius: R.md,
    backgroundColor: C.accent,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: C.accent,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.32,
    shadowRadius: 16,
    elevation: 6,
  },
  primaryBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
});
