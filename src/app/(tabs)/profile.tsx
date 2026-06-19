import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';

import TopBar from '@/components/TopBar';
import { C, GLASS_CARD, R } from '@/constants/theme';
import { VEHICLES } from '@/constants/vehicles';

// ─── Stat card ────────────────────────────────────────────────────────────────

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <View style={{
      flex:            1,
      padding:         12,
      borderRadius:    R.md,
      backgroundColor: 'rgba(255,255,255,0.72)',
      shadowColor:     '#758499',
      shadowOffset:    { width: 0, height: 1 },
      shadowOpacity:   0.12,
      shadowRadius:    2,
      elevation:       1,
      alignItems:      'center',
    }}>
      <Text style={{ color: C.muted, fontSize: 12, fontWeight: '700', marginBottom: 4 }}>{label}</Text>
      <Text style={{ color: C.text, fontSize: 18, fontWeight: '800', letterSpacing: -0.5 }}>{value}</Text>
    </View>
  );
}

// ─── ProfileScreen ────────────────────────────────────────────────────────────

export default function ProfileScreen() {
  const router = useRouter();

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <SafeAreaView edges={['top']} style={{ flex: 1 }}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 100 }}
        >
          <TopBar
            title="Profile"
            subtitle="Driver account and vehicles"
            action={
              <Pressable
                onPress={() => router.push('/settings')}
                style={{
                  minHeight:        44,
                  paddingHorizontal: 14,
                  borderRadius:     99,
                  backgroundColor:  'rgba(255,255,255,0.82)',
                  alignItems:       'center',
                  justifyContent:   'center',
                  shadowColor:      '#758499',
                  shadowOffset:     { width: 0, height: 1 },
                  shadowOpacity:    0.15,
                  shadowRadius:     2,
                  elevation:        2,
                }}
              >
                <Text style={{ color: '#163252', fontWeight: '700', fontSize: 14 }}>Edit</Text>
              </Pressable>
            }
          />

          {/* ── Profile card ────────────────────────────────────────────── */}
          <View style={{ borderRadius: R.lg, backgroundColor: 'rgba(255,255,255,0.82)', padding: 16, ...GLASS_CARD, marginBottom: 12, alignItems: 'center' }}>
            {/* Avatar */}
            <View style={{
              width:           78,
              height:          78,
              borderRadius:    28,
              backgroundColor: C.accent,
              alignItems:      'center',
              justifyContent:  'center',
              marginBottom:    12,
              shadowColor:     C.accent,
              shadowOffset:    { width: 0, height: 8 },
              shadowOpacity:   0.30,
              shadowRadius:    16,
              elevation:       8,
            }}>
              <Text style={{ color: '#fff', fontSize: 26, fontWeight: '900' }}>AS</Text>
            </View>

            <Text style={{ color: C.text, fontSize: 20, fontWeight: '700', letterSpacing: -0.5 }}>
              Anna Schneider
            </Text>
            <Text style={{ color: C.muted, fontSize: 13, marginTop: 4, textAlign: 'center' }}>
              Munich resident · verified low-emission vehicle
            </Text>

            {/* Stats */}
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 16, width: '100%' }}>
              <StatCard label="Sessions" value="42"  />
              <StatCard label="Saved"    value="€73" />
              <StatCard label="Rating"   value="4.9" />
            </View>
          </View>

          {/* ── Vehicles ────────────────────────────────────────────────── */}
          <View style={{ borderRadius: R.lg, backgroundColor: 'rgba(255,255,255,0.82)', padding: 16, ...GLASS_CARD, marginBottom: 12 }}>
            <Text style={{ color: C.text, fontSize: 20, fontWeight: '700', letterSpacing: -0.7, marginBottom: 4 }}>
              Vehicles
            </Text>
            {VEHICLES.map((car, i) => (
              <View
                key={car.id}
                style={{
                  flexDirection:  'row',
                  alignItems:     'center',
                  gap:            12,
                  minHeight:      66,
                  borderTopWidth: i > 0 ? 1 : 0,
                  borderTopColor: 'rgba(117,132,153,0.14)',
                }}
              >
                <View style={{
                  width:           40,
                  height:          40,
                  borderRadius:    14,
                  backgroundColor: '#eef5ff',
                  alignItems:      'center',
                  justifyContent:  'center',
                }}>
                  <Ionicons name="car-outline" size={20} color={C.accent} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: C.text, fontSize: 15, fontWeight: '600' }}>{car.name}</Text>
                  <Text style={{ color: C.muted, fontSize: 13, marginTop: 2 }}>{car.plate} · {car.note}</Text>
                </View>
                <Text style={{ color: C.accent, fontSize: 12, fontWeight: '800' }}>
                  {i === 0 ? 'Primary' : 'Guest'}
                </Text>
              </View>
            ))}
          </View>

          {/* ── Saved places ────────────────────────────────────────────── */}
          <View style={{ borderRadius: R.lg, backgroundColor: 'rgba(255,255,255,0.82)', padding: 16, ...GLASS_CARD }}>
            <Text style={{ color: C.text, fontSize: 20, fontWeight: '700', letterSpacing: -0.7, marginBottom: 8 }}>
              Saved places
            </Text>
            <Text style={{ color: C.muted, fontSize: 13, lineHeight: 20 }}>
              Home near Sendlinger Tor, Work in Maxvorstadt, and weekly Markt am Wiener Platz parking shortcuts.
            </Text>

            {[
              { icon: 'home-outline',   label: 'Home',        sub: 'Sendlinger Tor' },
              { icon: 'briefcase-outline', label: 'Work',     sub: 'Maxvorstadt'    },
              { icon: 'bag-handle-outline', label: 'Market',  sub: 'Wiener Platz'   },
            ].map((place, i) => (
              <View
                key={place.label}
                style={{
                  flexDirection:  'row',
                  alignItems:     'center',
                  gap:            12,
                  minHeight:      52,
                  borderTopWidth: 1,
                  borderTopColor: 'rgba(117,132,153,0.14)',
                  marginTop:      4,
                }}
              >
                <View style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: '#f1f4f8', alignItems: 'center', justifyContent: 'center' }}>
                  <Ionicons name={place.icon as any} size={16} color={C.muted} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: C.text, fontSize: 14, fontWeight: '600' }}>{place.label}</Text>
                  <Text style={{ color: C.muted, fontSize: 12 }}>{place.sub}</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={C.border} />
              </View>
            ))}
          </View>

        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
