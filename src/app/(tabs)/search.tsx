import { type ReactNode, useMemo, useState } from 'react';
import {
  FlatList,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';

import TopBar from '@/components/TopBar';
import { C, GLASS_CARD, R } from '@/constants/theme';
import {
  availabilityEstimate,
  availabilityPercent,
  availabilityTone,
  type Zone,
  ZONES,
} from '@/constants/zones';
import { parkingData } from '@/data/munich_parking';
import { filterAndSort, type DisplayEntry } from '@/utils/parking';

// ─── Quick filter chips ────────────────────────────────────────────────────────

const QUICK_FILTERS = ['EV charging', 'After 19:00', 'Cheapest'];

// ─── Zone row card (recommended) ──────────────────────────────────────────────

function ZoneRow({ zone, onReserve, first }: { zone: Zone; onReserve: (z: Zone) => void; first?: boolean }) {
  const tone = availabilityTone(zone);
  const pct  = availabilityPercent(zone);
  return (
    <View style={{
      flexDirection:  'row',
      alignItems:     'center',
      gap:            12,
      minHeight:      66,
      borderTopWidth: first ? 0 : 1,
      borderTopColor: 'rgba(117,132,153,0.14)',
    }}>
      <View style={{ width: 13, height: 38, borderRadius: 99, backgroundColor: tone.color }} />
      <View style={{ flex: 1 }}>
        <Text style={{ color: C.text, fontSize: 15, fontWeight: '600', letterSpacing: -0.2 }}>
          {zone.name}
        </Text>
        <Text style={{ color: C.muted, fontSize: 13, marginTop: 2 }}>
          {zone.area} · {zone.rule}
        </Text>
      </View>
      <Text style={{ color: C.text, fontSize: 18, fontWeight: '800', minWidth: 44, textAlign: 'right' }}>
        {pct}%
      </Text>
      <Pressable
        onPress={() => onReserve(zone)}
        style={{
          minWidth:        48,
          minHeight:       40,
          borderRadius:    14,
          backgroundColor: '#eef5ff',
          alignItems:      'center',
          justifyContent:  'center',
        }}
      >
        <Text style={{ color: C.accent, fontWeight: '800', fontSize: 13 }}>Go</Text>
      </Pressable>
    </View>
  );
}

// ─── Street row (full dataset results) ────────────────────────────────────────

function StreetRow({ item }: { item: DisplayEntry }) {
  return (
    <View style={{
      flexDirection:  'row',
      alignItems:     'center',
      gap:            12,
      minHeight:      60,
      borderTopWidth: 1,
      borderTopColor: 'rgba(117,132,153,0.14)',
    }}>
      <View style={{
        width:           36,
        height:          36,
        borderRadius:    12,
        backgroundColor: '#eef5ff',
        alignItems:      'center',
        justifyContent:  'center',
      }}>
        <Ionicons name="location-outline" size={18} color={C.accent} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ color: C.text, fontSize: 14, fontWeight: '600', letterSpacing: -0.1 }} numberOfLines={1}>
          {item.strasse}
        </Text>
        <Text style={{ color: C.muted, fontSize: 12, marginTop: 2 }} numberOfLines={1}>
          {item.prm ? `${item.prm} · ` : ''}{item.gruppe}
        </Text>
      </View>
      {item.angebot > 0 && (
        <Text style={{ color: C.muted, fontSize: 12 }}>{item.angebot} bays</Text>
      )}
    </View>
  );
}

// ─── Section card wrapper ─────────────────────────────────────────────────────

function SectionCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={{ borderRadius: R.lg, backgroundColor: 'rgba(255,255,255,0.82)', ...GLASS_CARD, padding: 16, marginBottom: 12 }}>
      <Text style={{ color: C.text, fontSize: 20, fontWeight: '700', letterSpacing: -0.7, marginBottom: 12 }}>
        {title}
      </Text>
      {children}
    </View>
  );
}

// ─── SearchScreen ─────────────────────────────────────────────────────────────

export default function SearchScreen() {
  const [query, setQuery] = useState('');
  const [activeQuick, setActiveQuick] = useState<string | null>(null);

  const searchResults = useMemo(() => {
    if (!query.trim()) return [];
    return filterAndSort(parkingData, query, new Set(), null).slice(0, 20);
  }, [query]);

  const filteredZones = useMemo(() =>
    ZONES.filter(z => (z.name + z.area).toLowerCase().includes(query.toLowerCase())),
    [query],
  );

  function handleReserve(zone: Zone) {
    setQuery(zone.name);
  }

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
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
              <TopBar title="Search zones" subtitle="Street, landmark, or rule" />

              {/* Search box */}
              <View style={{
                minHeight:        52,
                flexDirection:    'row',
                alignItems:       'center',
                gap:              10,
                paddingHorizontal: 14,
                borderRadius:     R.md,
                backgroundColor:  '#fff',
                shadowColor:      '#758499',
                shadowOffset:     { width: 0, height: 1 },
                shadowOpacity:    0.15,
                shadowRadius:     2,
                elevation:        2,
                marginBottom:     12,
              }}>
                <Ionicons name="search" size={18} color={C.muted} />
                <TextInput
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

              {/* Quick filter row */}
              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
                {QUICK_FILTERS.map((f) => (
                  <Pressable
                    key={f}
                    onPress={() => setActiveQuick(activeQuick === f ? null : f)}
                    style={{
                      minHeight:        40,
                      paddingHorizontal: 13,
                      borderRadius:     99,
                      backgroundColor:  activeQuick === f ? C.accent : '#e9f1fb',
                      justifyContent:   'center',
                    }}
                  >
                    <Text style={{ color: activeQuick === f ? '#fff' : '#163252', fontWeight: '700', fontSize: 13 }}>
                      {f}
                    </Text>
                  </Pressable>
                ))}
              </View>

              {/* Recommended zones (visible when not searching deep) */}
              {filteredZones.length > 0 && (
                <SectionCard title="Recommended now">
                  {filteredZones.map((zone, i) => (
                    <ZoneRow key={zone.id} zone={zone} onReserve={handleReserve} first={i === 0} />
                  ))}
                </SectionCard>
              )}

              {/* Street results header */}
              {searchResults.length > 0 && (
                <Text style={{ color: C.muted, fontSize: 13, fontWeight: '700', marginBottom: 8 }}>
                  Munich streets ({searchResults.length})
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
              <View style={{
                borderRadius:    R.lg,
                backgroundColor: '#eff8f4',
                padding:         16,
                marginTop: 4,
              }}>
                <Ionicons name="shield-checkmark-outline" size={28} color="#22724c" />
                <Text style={{ color: '#145b3c', fontSize: 18, fontWeight: '700', marginTop: 8, marginBottom: 4 }}>
                  Low risk parking mode
                </Text>
                <Text style={{ color: '#22724c', fontSize: 13, lineHeight: 20 }}>
                  ParkMunich only suggests legal, non-resident bays and warns before cleaning windows or permit-only hours.
                </Text>
              </View>
            ) : null
          }
        />
      </SafeAreaView>
    </View>
  );
}
