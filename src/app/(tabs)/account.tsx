import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';

import { C, FONT_DISPLAY, R } from '@/constants/theme';

function SettingsRow({ label, value, onPress, first }: { label: string; value: string; onPress?: () => void; first?: boolean }) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        minHeight: 48, paddingVertical: 12,
        borderTopWidth: first ? 0 : 1, borderTopColor: 'rgba(23,33,38,0.10)',
      }}
    >
      <Text style={{ color: C.text, fontSize: 14, fontWeight: '600' }}>{label}</Text>
      <Text style={{ color: C.muted, fontSize: 13 }}>{value}</Text>
    </Pressable>
  );
}

export default function AccountScreen() {
  return (
    <View style={{ flex: 1, backgroundColor: C.surface }}>
      <SafeAreaView edges={['top']} style={{ flex: 1 }}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 100, gap: 14 }}
        >
          <View
            style={{
              width: 66, height: 66, borderRadius: 24, backgroundColor: C.deep,
              alignItems: 'center', justifyContent: 'center',
            }}
          >
            <Text style={{ fontFamily: FONT_DISPLAY, color: C.accent, fontSize: 32, fontWeight: '900' }}>M</Text>
          </View>

          <View>
            <Text style={{ fontFamily: FONT_DISPLAY, color: C.text, fontSize: 27, fontWeight: '700', letterSpacing: -0.5, marginBottom: 6 }}>
              Account
            </Text>
            <Text style={{ color: '#536368', fontSize: 14, lineHeight: 20 }}>
              Anonymous reporting remains available. Subscription management opens Stripe’s hosted
              Customer Portal.
            </Text>
          </View>

          <View style={{ borderRadius: R.lg, borderWidth: 1, borderColor: C.border, backgroundColor: C.surfaceWarm, padding: 16 }}>
            <Text style={{ color: C.text, fontWeight: '800', fontSize: 14, marginBottom: 8 }}>Subscription</Text>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 }}>
              <Text style={{ color: C.text, fontSize: 14 }}>Munich pilot</Text>
              <Text style={{ color: '#7C5F1E', fontWeight: '900', fontSize: 13 }}>Active</Text>
            </View>
            <Pressable
              onPress={() => router.push('/billing')}
              style={{ minHeight: 48, borderRadius: R.md, borderWidth: 1, borderColor: C.border, backgroundColor: '#FFFAF0', alignItems: 'center', justifyContent: 'center' }}
            >
              <Text style={{ color: C.deep, fontWeight: '900', fontSize: 14 }}>Manage subscription</Text>
            </Pressable>
          </View>

          <View style={{ borderRadius: R.lg, borderWidth: 1, borderColor: C.border, backgroundColor: C.surfaceWarm, padding: 16 }}>
            <Text style={{ color: C.text, fontWeight: '800', fontSize: 14, marginBottom: 4 }}>Privacy</Text>
            <SettingsRow label="Location permission" value="Allowed" first />
            <SettingsRow label="Data and consent" value="Review" />
          </View>

          <View style={{ borderRadius: R.lg, backgroundColor: '#F0E7D8', padding: 16 }}>
            <Text style={{ color: C.text, fontWeight: '800', fontSize: 14, marginBottom: 6 }}>Contributions today</Text>
            <Text style={{ color: '#536368', fontSize: 14, lineHeight: 20 }}>
              3 reports sent in Haidhausen. Thanks — this is the pilot health metric that matters.
            </Text>
          </View>

          <Pressable
            style={{ flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start' }}
            onPress={() => router.push('/billing')}
          >
            <Ionicons name="card-outline" size={16} color={C.deep} />
            <Text style={{ color: C.deep, fontWeight: '700', fontSize: 13 }}>View pilot pricing</Text>
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
