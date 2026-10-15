import { router, Stack } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

export default function FreshCheckScreen() {
  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View className="flex-1 justify-end bg-background-map-fallback">
        <View className="m-[18px] mb-8 rounded-sheet border border-border-glass bg-surface-default p-5 shadow-card">
          <Text className="mb-1.5 text-[12px] font-extrabold uppercase tracking-overline text-accent-primary">
            Parking estimate
          </Text>
          <Text className="mb-2 font-ui text-[24px] font-bold tracking-[-0.4px] text-ink-primary">
            Refresh from the map
          </Text>
          <Text className="mb-5 text-[14px] leading-5 text-ink-muted">
            Select or search for a destination on the map to refresh its parking estimate. The result is based on time, parking rules and area demand—not a live driver report.
          </Text>
          <Pressable
            accessibilityRole="button"
            className="min-h-12 items-center justify-center rounded-control bg-accent-primary active:bg-accent-pressed"
            onPress={() => router.back()}
          >
            <Text className="text-[15px] font-black text-ink-on-accent">Back to map</Text>
          </Pressable>
        </View>
      </View>
    </>
  );
}
