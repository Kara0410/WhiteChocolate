import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, Stack } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';

import { C } from '@/constants/theme';

const INCLUDED = [
  'Confidence-weighted availability by hour',
  'Price, max-stay, EV and resident rules',
  'One-tap fresh occupancy checks',
];

export default function BillingScreen() {
  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View className="flex-1 bg-warm-surface">
        <SafeAreaView className="flex-1" edges={['top']}>
          <ScrollView
            contentContainerClassName="gap-3.5 px-4 pb-[60px] pt-4"
            showsVerticalScrollIndicator={false}
          >
            <Pressable
              className="flex-row items-center gap-1.5 self-start"
              onPress={() => router.back()}
            >
              <Ionicons name="arrow-back" size={16} color={C.deep} />
              <Text className="text-[14px] font-extrabold text-warm-deep">Back to map</Text>
            </Pressable>

            <View>
              <Text className="mb-1.5 text-[12px] font-extrabold uppercase tracking-overline text-warm-accent-text">
                Pilot subscription
              </Text>
              <Text className="font-display text-[27px] font-bold tracking-[-0.5px] text-warm-text">
                Unlock full prediction confidence.
              </Text>
              <Text className="mt-2 text-[14px] leading-5 text-warm-body-muted">
                Subscribe after the pre-payment gate passes. Checkout stays hosted by Stripe;
                cancellations are managed in the Stripe portal.
              </Text>
            </View>

            <View className="rounded-card border border-warm-border bg-warm-surface-warm p-[18px]">
              <Text className="text-[13px] font-bold text-warm-muted">Munich pilot</Text>
              <Text className="font-display text-[52px] font-bold tracking-[-1.5px] text-warm-text">€6</Text>
              <Text className="text-[13px] text-warm-muted">per month · refund policy shown before payment</Text>
            </View>

            <View className="gap-2.5">
              {INCLUDED.map((line) => (
                <View key={line} className="flex-row gap-2">
                  <Text className="font-extrabold text-warm-deep-text">✓</Text>
                  <Text className="flex-1 text-[14px] font-bold text-warm-deep-text">{line}</Text>
                </View>
              ))}
            </View>

            <Pressable className="min-h-[50px] items-center justify-center rounded-control bg-warm-deep">
              <Text className="text-[15px] font-black text-white">Sign in and continue to Stripe</Text>
            </Pressable>

            <Text className="text-[12px] leading-[17px] text-warm-muted">
              Cancelling sign-in returns silently to the map. Declines are handled inside Stripe
              Checkout.
            </Text>
          </ScrollView>
        </SafeAreaView>
      </View>
    </>
  );
}
