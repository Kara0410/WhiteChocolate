import {
  memo,
  useCallback,
  useMemo,
  useRef,
  type ComponentRef,
} from 'react';
import BottomSheet, {
  BottomSheetFlatList,
  useBottomSheetSpringConfigs,
} from '@gorhom/bottom-sheet';
import { Car, ChevronRight, MapPin, X } from 'lucide-react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  MAP_ELEVATIONS,
  MAP_LAYERS,
} from '@/components/parking-map/map-layers';
import type { ParkingClusterResponse } from '@/types/parking-map';

type ParkingListBottomSheetProps = {
  onClose: () => void;
  onSpotPress: (item: ParkingClusterResponse) => void;
  spots: ParkingClusterResponse[];
};

const ParkingListRow = memo(function ParkingListRow({
  item,
  onPress,
}: {
  item: ParkingClusterResponse;
  onPress: (item: ParkingClusterResponse) => void;
}) {
  const percentage = Math.max(
    0,
    Math.min(100, Math.round(item.availabilityPercent)),
  );
  const price = item.avgPrice ?? item.minPrice;
  const availabilityColor =
    percentage >= 55 ? '#059669' : percentage >= 25 ? '#D97706' : '#DC2626';

  return (
    <Pressable
      accessibilityLabel={`Open ${item.bestSpot.zoneName || 'parking area'}`}
      accessibilityRole="button"
      className="mb-3 flex-row items-center rounded-3xl border border-white/80 bg-white px-4 py-4 active:bg-slate-50"
      onPress={() => onPress(item)}
      style={styles.row}
    >
      <View className="h-12 w-12 items-center justify-center rounded-2xl bg-blue-50">
        <MapPin color="#2563EB" size={21} strokeWidth={2.3} />
      </View>
      <View className="ml-4 flex-1">
        <Text
          className="text-[16px] font-extrabold text-slate-950"
          numberOfLines={1}
        >
          {item.bestSpot.zoneName || 'Parking area'}
        </Text>
        <View className="mt-1 flex-row items-center">
          <Text
            className="text-[13px] font-extrabold"
            style={{ color: availabilityColor }}
          >
            {percentage}% available
          </Text>
          <Text className="ml-2 text-[13px] font-semibold text-slate-400">
            {price === null ? 'Free' : `€${price.toFixed(2)}/hr`}
          </Text>
        </View>
      </View>
      <ChevronRight color="#94A3B8" size={19} strokeWidth={2.3} />
    </Pressable>
  );
});

export function ParkingListBottomSheet({
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
    ({ item }: { item: ParkingClusterResponse }) => (
      <ParkingListRow item={item} onPress={handleSpotPress} />
    ),
    [handleSpotPress],
  );

  return (
    <BottomSheet
      ref={sheetRef}
      animationConfigs={animationConfigs}
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
              <Text className="text-[26px] font-extrabold text-slate-950">
                Parking nearby
              </Text>
              <Text className="mt-1 text-[14px] font-semibold text-slate-500">
                {spots.length} live parking areas
              </Text>
            </View>
            <Pressable
              accessibilityLabel="Close parking list"
              accessibilityRole="button"
              className="h-11 w-11 items-center justify-center rounded-full bg-white active:bg-slate-100"
              hitSlop={8}
              onPress={closeSheet}
              style={styles.closeButton}
            >
              <X color="#475569" size={19} strokeWidth={2.5} />
            </Pressable>
          </View>
        }
        ListEmptyComponent={
          <View className="items-center rounded-[28px] border border-dashed border-slate-300 bg-white/80 px-6 py-12">
            <View className="mb-4 h-16 w-16 items-center justify-center rounded-full bg-blue-50">
              <Car color="#2563EB" size={28} strokeWidth={2.2} />
            </View>
            <Text className="text-[18px] font-extrabold text-slate-950">
              No parking areas found
            </Text>
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
    backgroundColor: '#F3F5F8',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
  },
  closeButton: {
    borderCurve: 'continuous',
    boxShadow: '0 4px 12px rgba(15,23,42,0.07)',
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
    backgroundColor: 'rgba(0,0,0,0.16)',
    borderRadius: 999,
    height: 5,
    width: 42,
  },
  row: {
    borderCurve: 'continuous',
    boxShadow: '0 4px 12px rgba(15,23,42,0.07)',
  },
  sheet: {
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    boxShadow: '0 -4px 14px rgba(0,0,0,0.1)',
    elevation: MAP_ELEVATIONS.bottomSheet,
    zIndex: MAP_LAYERS.bottomSheet,
  },
});
