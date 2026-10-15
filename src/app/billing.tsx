import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, Stack } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';

import { COLORS } from '@/constants/theme';

const INCLUDED = [
  'Confidence-weighted availability by hour',
  'Available price, capacity and parking-rule details',
  'One-tap fresh occupancy checks',
];

export default function BillingScreen() {
  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View className="flex-1 bg-surface-default">
        <SafeAreaView className="flex-1" edges={['top']}>
          <ScrollView
            contentContainerClassName="gap-3.5 px-4 pb-[60px] pt-4"
            showsVerticalScrollIndicator={false}
          >
            <Pressable
              className="flex-row items-center gap-1.5 self-start"
              onPress={() => router.back()}
            >
              <ArrowLeft size={16} color={COLORS.icon.default} />
              <Text className="text-[14px] font-extrabold text-ink-primary">Back to map</Text>
            </Pressable>

            <View>
              <Text className="mb-1.5 text-[12px] font-extrabold uppercase tracking-overline text-accent-primary">
                Pilot subscription
              </Text>
              <Text className="font-ui text-[27px] font-bold tracking-[-0.5px] text-ink-primary">
                Unlock full prediction confidence.
              </Text>
              <Text className="mt-2 text-[14px] leading-5 text-ink-muted">
                Subscribe after the pre-payment gate passes. Checkout stays hosted by Stripe;
                cancellations are managed in the Stripe portal.
              </Text>
            </View>

            <View className="rounded-card border border-border-subtle bg-surface-muted p-[18px]">
              <Text className="text-[13px] font-bold text-ink-muted">Munich pilot</Text>
              <Text className="font-ui text-[52px] font-bold tracking-[-1.5px] text-ink-primary">€6</Text>
              <Text className="text-[13px] text-ink-muted">per month · refund policy shown before payment</Text>
            </View>

            <View className="gap-2.5">
              {INCLUDED.map((line) => (
                <View key={line} className="flex-row gap-2">
                  <Text className="font-extrabold text-ink-primary">✓</Text>
                  <Text className="flex-1 text-[14px] font-bold text-ink-primary">{line}</Text>
                </View>
              ))}
            </View>

            <Pressable className="min-h-[50px] items-center justify-center rounded-control bg-accent-primary active:bg-accent-pressed">
              <Text className="text-[15px] font-black text-ink-on-accent">Sign in and continue to Stripe</Text>
            </Pressable>

            <Text className="text-[12px] leading-[17px] text-ink-muted">
              Cancelling sign-in returns silently to the map. Declines are handled inside Stripe
              Checkout.
            </Text>
          </ScrollView>
        </SafeAreaView>
      </View>
    </>
  );
}
