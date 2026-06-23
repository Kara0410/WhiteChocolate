import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, Stack } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';

import { C, FONT_DISPLAY, R } from '@/constants/theme';

const INCLUDED = [
  'Confidence-weighted availability by hour',
  'Price, max-stay, EV and resident rules',
  'One-tap fresh occupancy checks',
];

export default function BillingScreen() {
  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={{ flex: 1, backgroundColor: C.surface }}>
        <SafeAreaView edges={['top']} style={{ flex: 1 }}>
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 60, gap: 14 }}
          >
            <Pressable onPress={() => router.back()} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start' }}>
              <Ionicons name="arrow-back" size={16} color={C.deep} />
              <Text style={{ color: C.deep, fontWeight: '800', fontSize: 14 }}>Back to map</Text>
            </Pressable>

            <View>
              <Text style={{ color: '#7C5F1E', fontSize: 12, fontWeight: '800', letterSpacing: 1.4, textTransform: 'uppercase', marginBottom: 6 }}>
                Pilot subscription
              </Text>
              <Text style={{ fontFamily: FONT_DISPLAY, color: C.text, fontSize: 27, fontWeight: '700', letterSpacing: -0.5 }}>
                Unlock full prediction confidence.
              </Text>
              <Text style={{ color: '#536368', fontSize: 14, lineHeight: 20, marginTop: 8 }}>
                Subscribe after the pre-payment gate passes. Checkout stays hosted by Stripe;
                cancellations are managed in the Stripe portal.
              </Text>
            </View>

            <View style={{ borderRadius: R.lg, borderWidth: 1, borderColor: C.border, backgroundColor: C.surfaceWarm, padding: 18 }}>
              <Text style={{ color: C.muted, fontSize: 13, fontWeight: '700' }}>Munich pilot</Text>
              <Text style={{ fontFamily: FONT_DISPLAY, color: C.text, fontSize: 52, fontWeight: '700', letterSpacing: -1.5 }}>€6</Text>
              <Text style={{ color: C.muted, fontSize: 13 }}>per month · refund policy shown before payment</Text>
            </View>

            <View style={{ gap: 10 }}>
              {INCLUDED.map((line) => (
                <View key={line} style={{ flexDirection: 'row', gap: 8 }}>
                  <Text style={{ color: '#31454C', fontWeight: '800' }}>✓</Text>
                  <Text style={{ flex: 1, color: '#31454C', fontWeight: '700', fontSize: 14 }}>{line}</Text>
                </View>
              ))}
            </View>

            <Pressable style={{ minHeight: 50, borderRadius: R.md, backgroundColor: C.deep, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ color: '#fff', fontWeight: '900', fontSize: 15 }}>Sign in and continue to Stripe</Text>
            </Pressable>

            <Text style={{ color: C.muted, fontSize: 12, lineHeight: 17 }}>
              Cancelling sign-in returns silently to the map. Declines are handled inside Stripe
              Checkout.
            </Text>
          </ScrollView>
        </SafeAreaView>
      </View>
    </>
  );
}
