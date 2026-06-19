import { useState } from 'react';
import { Pressable, Text, useWindowDimensions, View } from 'react-native';
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

// ─── MetricCard ───────────────────────────────────────────────────────────────

function MetricCard({ label, value, small }: { label: string; value: string; small?: boolean }) {
  return (
    <View style={{
      flex: 1,
      paddingVertical: 10,
      paddingHorizontal: 12,
      minHeight: 58,
      borderRadius: R.md,
      backgroundColor: 'rgba(255,255,255,0.82)',
      shadowColor: '#758499',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.15,
      shadowRadius: 2,
      elevation: 2,
    }}>
      <Text style={{ color: C.muted, fontSize: 12, fontWeight: '700', marginBottom: 4 }}>
        {label}
      </Text>
      <Text style={{ color: C.text, fontSize: small ? 14 : 17, fontWeight: '700', letterSpacing: -0.3 }}>
        {value}
      </Text>
    </View>
  );
}

// ─── MapPin ───────────────────────────────────────────────────────────────────

function MapPin({
  zone,
  selected,
  onPress,
  cardWidth,
  cardHeight,
}: {
  zone: Zone;
  selected: boolean;
  onPress: () => void;
  cardWidth: number;
  cardHeight: number;
}) {
  const tone = availabilityTone(zone);
  const pct  = availabilityPercent(zone);

  const centerX = (cardWidth  * zone.x) / 100;
  const centerY = (cardHeight * zone.y) / 100;

  return (
    <Pressable
      onPress={onPress}
      style={{
        position:        'absolute',
        width:           54,
        height:          54,
        left:            centerX - 27,
        top:             centerY - 27,
        borderRadius:    19,
        borderBottomRightRadius: 5,
        backgroundColor: tone.color,
        alignItems:      'center',
        justifyContent:  'center',
        transform:       [{ rotate: '-45deg' }],
        shadowColor:     tone.color,
        shadowOffset:    { width: 0, height: 10 },
        shadowOpacity:   0.38,
        shadowRadius:    20,
        elevation:       8,
        borderWidth:     selected ? 4 : 0,
        borderColor:     'rgba(255,255,255,0.72)',
      }}
    >
      <Text style={{
        transform:   [{ rotate: '45deg' }],
        color:       '#fff',
        fontWeight:  '800',
        fontSize:    12,
      }}>
        {pct}%
      </Text>
    </Pressable>
  );
}

// ─── StylizedMapCard ──────────────────────────────────────────────────────────

const STREETS = [
  { top: 0.23, rotation: '-18deg' },
  { top: 0.48, rotation:  '14deg' },
  { top: 0.67, rotation:  '-7deg' },
  { top: 0.39, rotation:  '63deg' },
];

function StylizedMapCard({
  zones,
  selected,
  onSelect,
  cardWidth,
  cardHeight,
}: {
  zones: Zone[];
  selected: Zone;
  onSelect: (zone: Zone) => void;
  cardWidth: number;
  cardHeight: number;
}) {
  return (
    <View style={{ flex: 1, backgroundColor: '#e7edf2', borderRadius: R.xl, overflow: 'hidden' }}>

      {/* Decorative streets */}
      {STREETS.map((s, i) => (
        <View
          key={i}
          style={{
            position:        'absolute',
            height:          18,
            left:            -cardWidth * 0.15,
            right:           -cardWidth * 0.15,
            top:             cardHeight * s.top,
            borderRadius:    99,
            backgroundColor: 'rgba(255,255,255,0.75)',
            transform:       [{ rotate: s.rotation }],
          }}
        />
      ))}

      {/* Isar river */}
      <View style={{
        position:        'absolute',
        right:           -24,
        top:             cardHeight * 0.10,
        width:           72,
        height:          cardHeight * 0.80,
        borderRadius:    99,
        backgroundColor: 'rgba(65,169,224,0.18)',
        alignItems:      'center',
        justifyContent:  'center',
      }}>
        <Text style={{ color: '#2d7ba8', fontWeight: '800', fontSize: 10, letterSpacing: 1.2 }}>
          ISAR
        </Text>
      </View>

      {/* Zone pins */}
      {zones.map((zone) => (
        <MapPin
          key={zone.id}
          zone={zone}
          selected={selected.id === zone.id}
          onPress={() => onSelect(zone)}
          cardWidth={cardWidth}
          cardHeight={cardHeight}
        />
      ))}

      {/* Center button */}
      <Pressable style={{
        position:        'absolute',
        left:            14,
        bottom:          14,
        flexDirection:   'row',
        alignItems:      'center',
        gap:             6,
        paddingHorizontal: 14,
        paddingVertical: 9,
        borderRadius:    99,
        backgroundColor: 'rgba(255,255,255,0.78)',
      }}>
        <Ionicons name="map-outline" size={16} color={C.text} />
        <Text style={{ fontSize: 13, fontWeight: '600', color: C.text }}>Center</Text>
      </Pressable>

    </View>
  );
}

// ─── MapScreen ────────────────────────────────────────────────────────────────

const MAP_CARD_H = 260;

export default function MapScreen() {
  const [selected, setSelected] = useState<Zone>(ZONES[0]);
  const { width } = useWindowDimensions();

  const cardWidth = width - 32; // 16px padding each side

  const tone = availabilityTone(selected);
  const pct  = availabilityPercent(selected);

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <SafeAreaView edges={['top']} style={{ flex: 1 }}>
        <View style={{ flex: 1, paddingHorizontal: 16, paddingTop: 16, gap: 8 }}>

          {/* Top bar */}
          <TopBar
            title="Find parking"
            subtitle="Munich live curb availability"
            action={
              <Pressable style={{
                minHeight:       44,
                paddingHorizontal: 14,
                borderRadius:    99,
                backgroundColor: 'rgba(255,255,255,0.82)',
                flexDirection:   'row',
                alignItems:      'center',
                gap:             6,
                shadowColor:     '#758499',
                shadowOffset:    { width: 0, height: 1 },
                shadowOpacity:   0.22,
                shadowRadius:    2,
                elevation:       2,
              }}>
                <Ionicons name="notifications-outline" size={18} color="#163252" />
                <Text style={{ color: '#163252', fontWeight: '700', fontSize: 14 }}>2</Text>
              </Pressable>
            }
          />

          {/* Stylized map card */}
          <View style={{ height: MAP_CARD_H, borderRadius: R.xl, overflow: 'hidden' }}>
            <StylizedMapCard
              zones={ZONES}
              selected={selected}
              onSelect={setSelected}
              cardWidth={cardWidth}
              cardHeight={MAP_CARD_H}
            />
          </View>

          {/* Live metrics strip */}
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <MetricCard label="Availability"  value={availabilityEstimate(selected)} small />
            <MetricCard label="Avg. tariff"   value={selected.price} />
            <MetricCard label="CO₂ saved"     value="1.8 kg" />
          </View>

          {/* Zone info sheet */}
          <View style={{
            flex:            1,
            padding:         14,
            borderRadius:    R.xl,
            backgroundColor: 'rgba(255,255,255,0.78)',
            ...GLASS_CARD,
          }}>
            {/* Handle */}
            <View style={{
              width:           42,
              height:          5,
              borderRadius:    99,
              backgroundColor: '#c7ced9',
              marginBottom:    14,
              alignSelf:       'center',
            }} />

            {/* Zone header */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 10 }}>
              <View style={{ flex: 1 }}>
                <Text style={{ color: C.muted, fontSize: 13, marginBottom: 3 }}>{selected.area}</Text>
                <Text style={{ color: C.text, fontSize: 20, fontWeight: '700', letterSpacing: -0.7 }}>{selected.name}</Text>
              </View>
              <Text style={{ color: C.accent, fontSize: 22, fontWeight: '800', letterSpacing: -0.8 }}>
                {selected.price}
              </Text>
            </View>

            {/* Availability progress bar */}
            <View style={{
              height:          34,
              borderRadius:    99,
              backgroundColor: '#e8edf4',
              marginBottom:    10,
              overflow:        'hidden',
              position:        'relative',
              justifyContent:  'center',
            }}>
              <View style={{
                position:        'absolute',
                top:             5,
                bottom:          5,
                left:            5,
                width:           `${Math.max(12, pct)}%` as any,
                borderRadius:    99,
                backgroundColor: tone.color,
              }} />
              <Text style={{
                textAlign:  'center',
                fontSize:   12,
                fontWeight: '800',
                color:      C.text,
                zIndex:     1,
              }}>
                {availabilityEstimate(selected)} · {tone.label} chance
              </Text>
            </View>

            {/* Walk / Rule / Payment grid */}
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 10 }}>
              <MetricCard label="Walk"    value={selected.walk} small />
              <MetricCard label="Rule"    value={selected.rule} small />
              <MetricCard label="Payment" value="App only" small />
            </View>

            {/* CTA */}
            <Pressable style={{
              width:           '100%',
              minHeight:       48,
              borderRadius:    R.md,
              backgroundColor: C.accent,
              flexDirection:   'row',
              alignItems:      'center',
              justifyContent:  'center',
              gap:             8,
              shadowColor:     C.accent,
              shadowOffset:    { width: 0, height: 12 },
              shadowOpacity:   0.34,
              shadowRadius:    28,
              elevation:       8,
              marginTop:       'auto' as any,
            }}>
              <Ionicons name="car-outline" size={20} color="#fff" />
              <Text style={{ color: '#fff', fontSize: 16, fontWeight: '800' }}>
                Start guided parking
              </Text>
            </Pressable>
          </View>

          {/* Spacer for floating nav bar */}
          <View style={{ height: 82 }} />
        </View>
      </SafeAreaView>
    </View>
  );
}
