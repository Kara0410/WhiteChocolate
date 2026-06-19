import { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';

import TopBar from '@/components/TopBar';
import { C, GLASS_CARD, R } from '@/constants/theme';
import { HISTORY, VEHICLES, type Vehicle } from '@/constants/vehicles';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatElapsed(totalSec: number): string {
  const h = String(Math.floor(totalSec / 3600)).padStart(2, '0');
  const m = String(Math.floor((totalSec % 3600) / 60)).padStart(2, '0');
  const s = String(totalSec % 60).padStart(2, '0');
  return `${h}:${m}:${s}`;
}

function estimateCost(totalSec: number, hourlyRate: number): string {
  const billableMin = Math.max(1, Math.ceil(totalSec / 60));
  return `€${((billableMin / 60) * hourlyRate).toFixed(2)}`;
}

// ─── MetricCard ───────────────────────────────────────────────────────────────

function TrackerMetric({ label, value }: { label: string; value: string }) {
  return (
    <View style={{
      flex:             1,
      padding:          12,
      borderRadius:     R.md,
      backgroundColor:  'rgba(255,255,255,0.16)',
    }}>
      <Text style={{ color: 'rgba(255,255,255,0.74)', fontSize: 12, fontWeight: '700', marginBottom: 4 }}>
        {label}
      </Text>
      <Text style={{ color: '#fff', fontSize: 15, fontWeight: '700' }}>{value}</Text>
    </View>
  );
}

// ─── VehicleChoice ────────────────────────────────────────────────────────────

function VehicleChoice({
  car,
  active,
  onPress,
}: {
  car: Vehicle;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        flexDirection:    'row',
        alignItems:       'center',
        gap:              12,
        minHeight:        66,
        width:            '100%',
        borderTopWidth:   1,
        borderTopColor:   'rgba(117,132,153,0.14)',
        borderRadius:     active ? R.md : 0,
        backgroundColor:  active ? 'rgba(0,122,255,0.06)' : 'transparent',
        paddingHorizontal: active ? 8 : 0,
      }}
    >
      <View style={{
        width:           40,
        height:          40,
        borderRadius:    14,
        backgroundColor: active ? 'rgba(0,122,255,0.12)' : '#f1f4f8',
        alignItems:      'center',
        justifyContent:  'center',
      }}>
        <Ionicons name="car-outline" size={20} color={active ? C.accent : C.muted} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ color: C.text, fontSize: 15, fontWeight: '600' }}>{car.name}</Text>
        <Text style={{ color: C.muted, fontSize: 13, marginTop: 2 }}>{car.plate} · {car.note}</Text>
      </View>
      <Text style={{ color: active ? C.accent : C.muted, fontSize: 12, fontWeight: '800' }}>
        {active ? 'Selected' : 'Pick'}
      </Text>
    </Pressable>
  );
}

// ─── TrackScreen ──────────────────────────────────────────────────────────────

const DEFAULT_RATE = 3.2;

export default function TrackScreen() {
  const [selectedCarId, setSelectedCarId] = useState(VEHICLES[0].id);
  const [tracking, setTracking]           = useState(false);
  const [elapsed, setElapsed]             = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const activeCar = VEHICLES.find(c => c.id === selectedCarId) ?? VEHICLES[0];

  useEffect(() => {
    if (tracking) {
      intervalRef.current = setInterval(() => setElapsed(v => v + 1), 1000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [tracking]);

  function resetTracker() {
    setTracking(false);
    setElapsed(0);
  }

  const cost = estimateCost(elapsed, DEFAULT_RATE);

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <SafeAreaView edges={['top']} style={{ flex: 1 }}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 100 }}
          keyboardShouldPersistTaps="handled"
        >
          <TopBar title="Parking tracker" subtitle="Pick a car, start timer, estimate cost" />

          {/* ── Tracker card (blue gradient) ────────────────────────────── */}
          <View style={{
            borderRadius:    30,
            padding:         18,
            backgroundColor: '#007AFF',
            shadowColor:     '#007AFF',
            shadowOffset:    { width: 0, height: 22 },
            shadowOpacity:   0.24,
            shadowRadius:    44,
            elevation:       16,
            marginBottom:    12,
          }}>
            {/* Header */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
              <View>
                <Text style={{ color: 'rgba(255,255,255,0.74)', fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 4 }}>
                  {tracking ? 'Timer running' : 'Ready to track'}
                </Text>
                <Text style={{ color: '#fff', fontSize: 22, fontWeight: '700', letterSpacing: -0.5 }}>
                  {activeCar.plate}
                </Text>
              </View>
              <View style={{ padding: 10, borderRadius: 17, backgroundColor: 'rgba(255,255,255,0.18)' }}>
                <Text style={{ color: '#fff', fontWeight: '900', fontSize: 16 }}>{cost}</Text>
              </View>
            </View>

            {/* Timer */}
            <Text style={{
              fontSize:      46,
              color:         '#fff',
              fontWeight:    '900',
              letterSpacing: -2.5,
              marginVertical: 14,
              fontVariant:   ['tabular-nums'],
            }}>
              {formatElapsed(elapsed)}
            </Text>

            {/* Metrics */}
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TrackerMetric label="Estimate"  value={cost} />
              <TrackerMetric label="Tariff"    value="€3.20/h" />
              <TrackerMetric label="Reminder"  value="+15 min" />
            </View>

            {/* Actions */}
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
              <Pressable
                onPress={() => setTracking(t => !t)}
                style={{
                  flex:            1,
                  minHeight:       52,
                  borderRadius:    R.md,
                  backgroundColor: '#fff',
                  flexDirection:   'row',
                  alignItems:      'center',
                  justifyContent:  'center',
                  gap:             8,
                }}
              >
                <Ionicons name={(tracking ? 'pause-circle-outline' : 'play-circle-outline') as any} size={22} color={C.accent} />
                <Text style={{ color: C.accent, fontWeight: '900', fontSize: 15 }}>
                  {tracking ? 'Pause timer' : 'Start timer'}
                </Text>
              </Pressable>

              <Pressable
                onPress={resetTracker}
                style={{
                  minHeight:       52,
                  paddingHorizontal: 18,
                  borderRadius:    R.md,
                  backgroundColor: 'rgba(255,255,255,0.16)',
                  alignItems:      'center',
                  justifyContent:  'center',
                }}
              >
                <Text style={{ color: '#fff', fontWeight: '900', fontSize: 15 }}>Reset</Text>
              </Pressable>
            </View>

            {/* Disclaimer */}
            <Text style={{ color: 'rgba(255,255,255,0.76)', fontSize: 13, lineHeight: 18, marginTop: 12 }}>
              Local-only estimate for Munich street parking. Final fee can change by zone rule or permit window.
            </Text>
          </View>

          {/* ── Vehicle selector ────────────────────────────────────────── */}
          <View style={{ borderRadius: R.lg, backgroundColor: 'rgba(255,255,255,0.82)', padding: 16, ...GLASS_CARD, marginBottom: 12 }}>
            <Text style={{ color: C.text, fontSize: 20, fontWeight: '700', letterSpacing: -0.7, marginBottom: 4 }}>
              Select vehicle
            </Text>
            {VEHICLES.map(car => (
              <VehicleChoice
                key={car.id}
                car={car}
                active={car.id === selectedCarId}
                onPress={() => setSelectedCarId(car.id)}
              />
            ))}
          </View>

          {/* ── Recent tracked sessions ─────────────────────────────────── */}
          <View style={{ borderRadius: R.lg, backgroundColor: 'rgba(255,255,255,0.82)', padding: 16, ...GLASS_CARD, marginBottom: 12 }}>
            <Text style={{ color: C.text, fontSize: 20, fontWeight: '700', letterSpacing: -0.7, marginBottom: 4 }}>
              Recent tracked parking
            </Text>
            {HISTORY.map((item, i) => (
              <View
                key={item.street}
                style={{
                  flexDirection:  'row',
                  alignItems:     'center',
                  gap:            12,
                  minHeight:      66,
                  borderTopWidth: i > 0 ? 1 : 0,
                  borderTopColor: 'rgba(117,132,153,0.14)',
                }}
              >
                <View style={{ flex: 1 }}>
                  <Text style={{ color: C.text, fontSize: 15, fontWeight: '600' }}>{item.street}</Text>
                  <Text style={{ color: C.muted, fontSize: 13, marginTop: 2 }}>{item.time} · {item.plate}</Text>
                </View>
                <Text style={{ fontWeight: '800', color: C.text, fontSize: 15 }}>{item.cost}</Text>
                <View style={{ paddingHorizontal: 8, paddingVertical: 6, borderRadius: 99, backgroundColor: '#e5f7ee' }}>
                  <Text style={{ fontSize: 12, color: '#22724c', fontWeight: '700' }}>{item.status}</Text>
                </View>
              </View>
            ))}
          </View>

          {/* ── Wallet row ──────────────────────────────────────────────── */}
          <View style={{ borderRadius: R.lg, backgroundColor: 'rgba(255,255,255,0.82)', padding: 16, ...GLASS_CARD, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <Ionicons name="wallet-outline" size={28} color={C.accent} />
            <View style={{ flex: 1 }}>
              <Text style={{ color: C.text, fontSize: 15, fontWeight: '600' }}>Parking wallet estimate</Text>
              <Text style={{ color: C.muted, fontSize: 13, marginTop: 2 }}>Balance €28.60 · local receipts prepared after timer stop</Text>
            </View>
          </View>

        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
