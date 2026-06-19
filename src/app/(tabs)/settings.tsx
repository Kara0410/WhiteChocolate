import { useState } from 'react';
import { Pressable, ScrollView, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';

import TopBar from '@/components/TopBar';
import { C, GLASS_CARD, R } from '@/constants/theme';

// ─── Types ────────────────────────────────────────────────────────────────────

type SettingDef = {
  key: string;
  title: string;
  desc: string;
  defaultOn: boolean;
};

const PREFS: SettingDef[] = [
  { key: 'notifications',  title: 'Notifications',        desc: 'Street cleaning, expiry reminders',    defaultOn: true  },
  { key: 'autoExtend',     title: 'Auto-extend sessions', desc: 'Ask before adding 15 minutes',         defaultOn: false },
  { key: 'lowEmission',    title: 'Low-emission routing', desc: 'Avoid Umweltzone violations',          defaultOn: true  },
  { key: 'offlineCache',   title: 'Offline map cache',    desc: 'Save central Munich districts',        defaultOn: true  },
  { key: 'darkInterface',  title: 'Dark interface',       desc: 'Preview nighttime parking mode',       defaultOn: false },
];

// ─── SettingRow ───────────────────────────────────────────────────────────────

function SettingRow({
  title,
  desc,
  enabled,
  onToggle,
  first,
}: {
  title: string;
  desc: string;
  enabled: boolean;
  onToggle: () => void;
  first: boolean;
}) {
  return (
    <Pressable
      onPress={onToggle}
      style={{
        flexDirection:  'row',
        alignItems:     'center',
        gap:            12,
        minHeight:      72,
        borderTopWidth: first ? 0 : 1,
        borderTopColor: 'rgba(117,132,153,0.14)',
      }}
    >
      <View style={{ flex: 1 }}>
        <Text style={{ color: C.text, fontSize: 15, fontWeight: '600' }}>{title}</Text>
        <Text style={{ color: C.muted, fontSize: 13, marginTop: 2, lineHeight: 18 }}>{desc}</Text>
      </View>
      <Switch
        value={enabled}
        onValueChange={onToggle}
        trackColor={{ false: '#cfd7e3', true: C.accent }}
        thumbColor="#ffffff"
        ios_backgroundColor="#cfd7e3"
      />
    </Pressable>
  );
}

// ─── SettingsScreen ───────────────────────────────────────────────────────────

export default function SettingsScreen() {
  const initialState = Object.fromEntries(PREFS.map(p => [p.key, p.defaultOn]));
  const [prefs, setPrefs] = useState<Record<string, boolean>>(initialState);

  function toggle(key: string) {
    setPrefs(prev => ({ ...prev, [key]: !prev[key] }));
  }

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <SafeAreaView edges={['top']} style={{ flex: 1 }}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 100 }}
        >
          <TopBar title="Settings" subtitle="App behavior and privacy" />

          {/* ── Preferences ─────────────────────────────────────────────── */}
          <View style={{ borderRadius: R.lg, backgroundColor: 'rgba(255,255,255,0.82)', padding: 16, ...GLASS_CARD, marginBottom: 12 }}>
            <Text style={{ color: C.text, fontSize: 20, fontWeight: '700', letterSpacing: -0.7, marginBottom: 4 }}>
              Preferences
            </Text>
            {PREFS.map((pref, i) => (
              <SettingRow
                key={pref.key}
                title={pref.title}
                desc={pref.desc}
                enabled={prefs[pref.key] ?? pref.defaultOn}
                onToggle={() => toggle(pref.key)}
                first={i === 0}
              />
            ))}
          </View>

          {/* ── Local backend note ──────────────────────────────────────── */}
          <View style={{ borderRadius: R.lg, backgroundColor: 'rgba(255,255,255,0.82)', padding: 16, ...GLASS_CARD, marginBottom: 12 }}>
            <Text style={{ color: C.text, fontSize: 20, fontWeight: '700', letterSpacing: -0.7, marginBottom: 8 }}>
              Local backend logic
            </Text>
            <Text style={{ color: C.muted, fontSize: 13, lineHeight: 20 }}>
              State is local-first: zone inventory, reservations, profile, settings, and mock payment receipts are stored in app memory. No external servers or real charges are involved.
            </Text>

            {[
              { icon: 'lock-closed-outline',  label: 'No real payments'    },
              { icon: 'cloud-offline-outline', label: 'No network calls'    },
              { icon: 'shield-outline',        label: 'Privacy by default'  },
            ].map((item, i) => (
              <View
                key={item.label}
                style={{
                  flexDirection:  'row',
                  alignItems:     'center',
                  gap:            10,
                  marginTop:      12,
                  borderTopWidth: 1,
                  borderTopColor: 'rgba(117,132,153,0.14)',
                  paddingTop:     12,
                }}
              >
                <Ionicons name={item.icon as any} size={18} color={C.success} />
                <Text style={{ color: C.text, fontSize: 14, fontWeight: '600' }}>{item.label}</Text>
              </View>
            ))}
          </View>

          {/* ── Privacy controls ────────────────────────────────────────── */}
          <View style={{ borderRadius: R.lg, backgroundColor: '#fff3f2', padding: 16, ...GLASS_CARD }}>
            <Text style={{ color: '#9f2f25', fontSize: 20, fontWeight: '700', letterSpacing: -0.7, marginBottom: 8 }}>
              Privacy controls
            </Text>
            <Text style={{ color: C.muted, fontSize: 13, lineHeight: 20, marginBottom: 12 }}>
              Delete cached locations, export receipts, or reset demo account data.
            </Text>
            <Pressable style={{
              minHeight:        44,
              paddingHorizontal: 14,
              borderRadius:     15,
              backgroundColor:  '#ffdeda',
              alignSelf:        'flex-start',
              alignItems:       'center',
              justifyContent:   'center',
            }}>
              <Text style={{ color: '#9f2f25', fontWeight: '800', fontSize: 14 }}>Manage data</Text>
            </Pressable>
          </View>

        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
