import { memo, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, Platform, Pressable, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';

import TopBar from '@/components/TopBar';
import { MAPS_AVAILABLE } from '@/components/NativeParkingMap';
import { C, R } from '@/constants/theme';
import { confidenceTone, ZONES, type Zone } from '@/constants/zones';
import { parkingData } from '@/data/munich_parking';
import { filterAndSort, type DisplayEntry } from '@/utils/parking';

// ─── ZoneRow ──────────────────────────────────────────────────────────────────

function ZoneRow({ zone, first }: { zone: Zone; first?: boolean }) {
  const tone = confidenceTone(zone.pct);
  return (
    <View style={{
      flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 66,
      borderTopWidth: first ? 0 : 1, borderTopColor: 'rgba(23,33,38,0.10)', paddingVertical: 8,
    }}>
      <View style={{ width: 13, height: 36, borderRadius: 99, backgroundColor: tone, opacity: zone.freshness === 'aging' ? 0.58 : 1, borderWidth: 1, borderColor: 'rgba(23,33,38,0.18)' }} />
      <View style={{ flex: 1 }}>
        <Text style={{ color: C.text, fontSize: 15, fontWeight: '700', letterSpacing: -0.2 }}>{zone.name}</Text>
        <Text style={{ color: C.muted, fontSize: 12, marginTop: 2 }} numberOfLines={1}>{zone.rule}</Text>
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        <Text style={{ color: C.text, fontSize: 16, fontWeight: '800' }}>{zone.pct === null ? 'No data' : `${zone.pct}%`}</Text>
        <Text style={{ color: C.muted, fontSize: 12, marginTop: 2 }}>{zone.price}</Text>
      </View>
    </View>
  );
}

// ─── StreetRow ────────────────────────────────────────────────────────────────

const StreetRow = memo(function StreetRow({ item }: { item: DisplayEntry }) {
  return (
    <Pressable
      onPress={() => router.push({ pathname: '/parking/[id]', params: { id: String(item._idx) } })}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 60, borderTopWidth: 1, borderTopColor: 'rgba(23,33,38,0.10)' }}
    >
      <View style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: '#FFF3DC', alignItems: 'center', justifyContent: 'center' }}>
        <Ionicons name="location-outline" size={18} color={C.accent} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ color: C.text, fontSize: 14, fontWeight: '600', letterSpacing: -0.1 }} numberOfLines={1}>{item.strasse}</Text>
        <Text style={{ color: C.muted, fontSize: 12, marginTop: 2 }} numberOfLines={1}>
          {item.prm ? `${item.prm} · ` : ''}{item.gruppe}
        </Text>
      </View>
      {item.angebot > 0 && <Text style={{ color: C.muted, fontSize: 12 }}>{item.angebot} bays</Text>}
      <Ionicons name="chevron-forward" size={16} color={C.border} />
    </Pressable>
  );
});

// ─── ListScreen ───────────────────────────────────────────────────────────────

export default function ListScreen() {
  const [evOnly, setEvOnly] = useState(false);
  const [query, setQuery] = useState('');
  const deferredQuery = useDeferredValue(query);
  const searchInputRef = useRef<TextInput>(null);
  const { focusSearch } = useLocalSearchParams<{ focusSearch?: string }>();

  useEffect(() => {
    if (!focusSearch) return;
    const focusTimer = setTimeout(() => searchInputRef.current?.focus(), 120);
    return () => clearTimeout(focusTimer);
  }, [focusSearch]);

  const visibleZones = useMemo(() => (evOnly ? ZONES.filter((z) => z.ev) : ZONES), [evOnly]);

  const searchResults = useMemo(() => {
    if (!deferredQuery.trim()) return [];
    return filterAndSort(parkingData, deferredQuery, new Set(), null).slice(0, 20);
  }, [deferredQuery]);

  return (
    <View style={{ flex: 1, backgroundColor: C.surface }}>
      <SafeAreaView edges={['top']} style={{ flex: 1 }}>
        <FlatList
          data={query ? searchResults : []}
          keyExtractor={(_, i) => String(i)}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 100 }}
          ListHeaderComponent={
            <View>
              <TopBar
                title="Parking zones"
                subtitle="List fallback"
                action={
                  <Pressable
                    onPress={() => setEvOnly((v) => !v)}
                    style={{
                      minWidth: 48, minHeight: 44, borderRadius: 16, paddingHorizontal: 14,
                      backgroundColor: evOnly ? C.deep : C.surfaceWarm,
                      alignItems: 'center', justifyContent: 'center',
                    }}
                  >
                    <Text style={{ color: evOnly ? '#fff' : C.deep, fontWeight: '900', fontSize: 13 }}>EV only</Text>
                  </Pressable>
                }
              />

              {!MAPS_AVAILABLE && (
                <View style={{ borderRadius: R.md, backgroundColor: C.dangerSoft, padding: 12, marginBottom: 10 }}>
                  <Text style={{ color: C.dangerText, fontSize: 13, fontWeight: '800' }}>
                    Map tiles are slow. List remains available.
                  </Text>
                </View>
              )}

              <View style={{ borderTopWidth: 1, borderTopColor: 'rgba(23,33,38,0.10)', marginBottom: 16 }}>
                {visibleZones.map((zone, i) => (
                  <ZoneRow key={zone.id} zone={zone} first={i === 0} />
                ))}
              </View>

              <Text style={{ color: C.muted, fontSize: 13, fontWeight: '700', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.6 }}>
                Search Munich streets
              </Text>
              <View style={{
                minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: 10,
                paddingHorizontal: 14, borderRadius: R.md, backgroundColor: '#fff',
                shadowColor: '#192A2F', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.12, shadowRadius: 2, elevation: 2,
                marginBottom: 12,
              }}>
                <Ionicons name="search" size={18} color={C.muted} />
                <TextInput
                  ref={searchInputRef}
                  style={{ flex: 1, color: C.text, fontSize: 16, height: 52 }}
                  placeholder="Try Marienplatz or EV bays"
                  placeholderTextColor={C.muted}
                  value={query}
                  onChangeText={setQuery}
                  returnKeyType="search"
                  autoCorrect={false}
                  clearButtonMode="while-editing"
                />
                {Platform.OS !== 'ios' && query.length > 0 && (
                  <Pressable onPress={() => setQuery('')}>
                    <Ionicons name="close-circle" size={18} color={C.muted} />
                  </Pressable>
                )}
              </View>

              {searchResults.length > 0 && (
                <Text style={{ color: C.muted, fontSize: 13, fontWeight: '700', marginBottom: 8 }}>
                  {searchResults.length} results
                </Text>
              )}
            </View>
          }
          renderItem={({ item }) => (
            <View style={{ borderRadius: R.md, backgroundColor: '#fff', paddingHorizontal: 14, marginBottom: 2 }}>
              <StreetRow item={item} />
            </View>
          )}
          ListFooterComponent={
            !query ? (
              <Pressable onPress={() => router.push('/fresh-check')} style={{
                minHeight: 54, borderRadius: R.lg, backgroundColor: C.deep,
                alignItems: 'center', justifyContent: 'center', marginTop: 4,
              }}>
                <Text style={{ color: '#fff', fontWeight: '900', fontSize: 15 }}>I’m leaving now</Text>
              </Pressable>
            ) : null
          }
        />
      </SafeAreaView>
    </View>
  );
}
