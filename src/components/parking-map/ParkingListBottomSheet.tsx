import { useCallback, useMemo, useRef, type ComponentRef } from 'react';
import BottomSheet, {
  BottomSheetFlatList,
  useBottomSheetSpringConfigs,
} from '@gorhom/bottom-sheet';
import { ArrowRight, Car, X } from 'lucide-react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  MAP_ELEVATIONS,
  MAP_LAYERS,
} from '@/components/parking-map/map-layers';
import { ParkingAreaListItem } from '@/components/parking-map/ParkingAreaListItem';
import { GlassSheetBackground } from '@/components/parking-map/glass-sheet-background';
import type { ParkingClusterResponse } from '@/types/parking-map';
import { formatParkingPriceLabel } from '@/utils/parkingSearch';
import { COLORS, RADII, SHADOWS } from '@/constants/theme';

type ParkingListBottomSheetProps = {
  errorMessage?: string | null;
  onRetry?: () => void;
  onClose: () => void;
  onSpotPress: (item: ParkingClusterResponse) => void;
  spots: ParkingClusterResponse[];
};

export function ParkingListBottomSheet({
  errorMessage = null,
  onRetry,
  onClose,
  onSpotPress,
  spots,
}: ParkingListBottomSheetProps) {
  const sheetRef = useRef<ComponentRef<typeof BottomSheet>>(null);
  const pendingSpotRef = useRef<ParkingClusterResponse | null>(null);
  const insets = useSafeAreaInsets();
  const snapPoints = useMemo(() => ['18%', '70%'], []);
  const animationConfigs = useBottomSheetSpringConfigs({
    damping: 30,
    mass: 0.9,
    overshootClamping: false,
    stiffness: 280,
  });

  const closeSheet = useCallback(() => {
    sheetRef.current?.close();
  }, []);

  const handleSpotPress = useCallback((item: ParkingClusterResponse) => {
    pendingSpotRef.current = item;
    sheetRef.current?.close();
  }, []);

  const handleSheetClose = useCallback(() => {
    const pendingSpot = pendingSpotRef.current;
    pendingSpotRef.current = null;

    if (pendingSpot) {
      onSpotPress(pendingSpot);
      return;
    }

    onClose();
  }, [onClose, onSpotPress]);

  const renderItem = useCallback(
    ({ item }: { item: ParkingClusterResponse }) => {
      const hasKnownAvailability =
        item.availabilityStatus !== undefined &&
        item.availabilityStatus !== 'unknown' &&
        item.availabilityPercent !== null;
      const title = item.bestSpot.label || 'Parking area';

      return (
        <View className="mb-2.5">
          <ParkingAreaListItem
            action={{
              accessibilityLabel: `Navigate to ${title}`,
              icon: ArrowRight,
              onPress: () => handleSpotPress(item),
            }}
            metaSecondary={formatParkingPriceLabel(item)}
            onPress={() => handleSpotPress(item)}
            percentage={hasKnownAvailability ? item.availabilityPercent : null}
            title={title}
          />
        </View>
      );
    },
    [handleSpotPress],
  );

  return (
    <BottomSheet
      ref={sheetRef}
      animationConfigs={animationConfigs}
      backgroundComponent={GlassSheetBackground}
      backgroundStyle={styles.background}
      enableDynamicSizing={false}
      enableOverDrag={false}
      enablePanDownToClose
      handleIndicatorStyle={styles.handleIndicator}
      handleStyle={styles.handle}
      index={1}
      onClose={handleSheetClose}
      overDragResistanceFactor={4}
      snapPoints={snapPoints}
      style={styles.sheet}
    >
      <BottomSheetFlatList
        contentContainerStyle={[
          styles.content,
          { paddingBottom: Math.max(insets.bottom, 10) + 108 },
        ]}
        data={spots}
        initialNumToRender={10}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={
          <View className="mb-5 flex-row items-center justify-between">
            <View className="flex-1 pr-3">
              <Text className="text-[26px] font-extrabold text-ink-primary">
                Parking nearby
              </Text>
              <Text className="mt-1 text-[14px] font-semibold text-ink-secondary">
                {spots.length} parking areas
              </Text>
            </View>
            <Pressable
              accessibilityLabel="Close parking list"
              accessibilityRole="button"
              className="h-11 w-11 items-center justify-center rounded-full bg-surface-default active:bg-background-default"
              hitSlop={8}
              onPress={closeSheet}
              style={{ borderCurve: 'continuous' }}
            >
              <X color={COLORS.icon.default} size={19} strokeWidth={2.5} />
            </Pressable>
          </View>
        }
        ListEmptyComponent={
          <View className="items-center rounded-card border border-dashed border-border-strong bg-surface-default/80 px-6 py-12">
            <View className="mb-4 h-16 w-16 items-center justify-center rounded-full bg-accent-soft">
              <Car color={COLORS.accent.primary} size={28} strokeWidth={2.2} />
            </View>
            <Text className="text-[18px] font-extrabold text-ink-primary">
              {errorMessage === null
                ? 'No parking areas found'
                : 'Unable to load parking areas'}
            </Text>
            {errorMessage !== null ? (
              <>
                <Text className="mt-2 text-center text-[14px] font-medium leading-5 text-ink-secondary">
                  Parking information couldn&apos;t be loaded. Try again.
                </Text>
                {onRetry ? (
                  <Pressable
                    accessibilityLabel="Retry parking information"
                    accessibilityRole="button"
                    className="mt-4 min-h-11 justify-center rounded-full bg-accent-primary px-4 active:bg-accent-pressed"
                    onPress={onRetry}
                  >
                    <Text className="text-center text-[13px] font-extrabold text-ink-on-accent">
                      Retry
                    </Text>
                  </Pressable>
                ) : null}
              </>
            ) : null}
          </View>
        }
        maxToRenderPerBatch={12}
        renderItem={renderItem}
        showsVerticalScrollIndicator={false}
        updateCellsBatchingPeriod={50}
        windowSize={7}
      />
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  background: {
    backgroundColor: 'transparent',
    borderTopLeftRadius: RADII.sheet,
    borderTopRightRadius: RADII.sheet,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 4,
  },
  handle: {
    paddingBottom: 10,
    paddingTop: 12,
  },
  handleIndicator: {
    backgroundColor: COLORS.border.strong,
    borderRadius: 999,
    height: 5,
    width: 42,
  },
  sheet: {
    borderTopLeftRadius: RADII.sheet,
    borderTopRightRadius: RADII.sheet,
    boxShadow: SHADOWS.sheet,
    elevation: MAP_ELEVATIONS.bottomSheet,
    zIndex: MAP_LAYERS.bottomSheet,
  },
});
