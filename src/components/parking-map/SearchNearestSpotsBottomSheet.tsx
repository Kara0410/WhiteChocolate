import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import BottomSheet, {
  BottomSheetFlatList,
  useBottomSheetSpringConfigs,
} from '@gorhom/bottom-sheet';
import { ChevronDown, ChevronUp, MapPin, Navigation, X } from 'lucide-react-native';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  MAP_ELEVATIONS,
  MAP_LAYERS,
} from '@/components/parking-map/map-layers';
import type { PlaceSearchResult } from '@/hooks/use-google-place-search';
import type { ParkingClusterResponse } from '@/types/parking-map';
import {
  formatSearchDistance,
  type ParkingSpotWithDistance,
} from '@/utils/parkingSearch';

import { getAvailabilityTheme } from './parking-availability-status';

type SearchNearestSpotsBottomSheetProps = {
  searchPlace: PlaceSearchResult | null;
  spots: ParkingSpotWithDistance[];
  isLoading?: boolean;
  errorMessage?: string | null;
  onClose: () => void;
  onSpotPress: (spot: ParkingClusterResponse) => void;
};

/** Curated first page: enough to choose from without overwhelming. */
const INITIAL_VISIBLE_RESULTS = 5;
/** Hard cap for the expanded list; the rest stays available on the map flow. */
const EXPANDED_VISIBLE_RESULTS = 12;

const RING_SIZE = 42;
const RING_STROKE = 5;
const RING_RADIUS = (RING_SIZE - RING_STROKE) / 2;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

function clampPercentage(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function formatPrice(item: ParkingClusterResponse) {
  const price = item.avgPrice ?? item.minPrice;
  if (item.pricingStatus === 'free') {
    return 'Free';
  }
  return price === null ? 'Price unavailable' : `EUR ${price.toFixed(2)} / hr`;
}

function AvailabilityRing({ percentage }: { percentage: number | null }) {
  const theme =
    percentage === null
      ? { ring: '#94A3B8', ringTrack: '#E2E8F0', text: '#64748B' }
      : getAvailabilityTheme(percentage);
  const ringOffset =
    percentage === null
      ? RING_CIRCUMFERENCE
      : RING_CIRCUMFERENCE * (1 - percentage / 100);

  return (
    <View className="items-center justify-center">
      <Svg
        height={RING_SIZE}
        style={{ transform: [{ rotate: '-90deg' }] }}
        width={RING_SIZE}
      >
        <Circle
          cx={RING_SIZE / 2}
          cy={RING_SIZE / 2}
          fill="rgba(255,255,255,0.92)"
          r={RING_RADIUS}
          stroke={theme.ringTrack}
          strokeWidth={RING_STROKE}
        />
        <Circle
          cx={RING_SIZE / 2}
          cy={RING_SIZE / 2}
          fill="none"
          r={RING_RADIUS}
          stroke={theme.ring}
          strokeDasharray={`${RING_CIRCUMFERENCE} ${RING_CIRCUMFERENCE}`}
          strokeDashoffset={ringOffset}
          strokeLinecap="round"
          strokeWidth={RING_STROKE}
        />
      </Svg>
      <Text
        className="absolute text-[11px] font-extrabold"
        style={{ color: theme.text, fontVariant: ['tabular-nums'] }}
      >
        {percentage === null ? '—' : `${percentage}%`}
      </Text>
    </View>
  );
}

const NearestSpotRow = memo(function NearestSpotRow({
  item,
  onPress,
}: {
  item: ParkingSpotWithDistance;
  onPress: (item: ParkingClusterResponse) => void;
}) {
  const percentage =
    item.availabilityStatus !== undefined &&
    item.availabilityStatus !== 'unknown'
      ? clampPercentage(item.availabilityPercent)
      : null;
  const title = item.bestSpot.zoneName || 'Parking Area';

  return (
    <Pressable
      accessibilityLabel={`Open ${title}`}
      accessibilityRole="button"
      className="mb-3 flex-row items-center rounded-3xl border border-white/80 bg-white px-4 py-4 active:bg-slate-50"
      onPress={() => onPress(item)}
      style={styles.row}
    >
      <AvailabilityRing percentage={percentage} />
      <View className="ml-4 flex-1">
        <Text
          className="text-[16px] font-extrabold text-slate-950"
          numberOfLines={1}
        >
          {title}
        </Text>
        <View className="mt-1 flex-row items-center">
          <Text className="text-[13px] font-bold text-slate-600">
            {formatSearchDistance(item.distanceFromSearchMeters)}
          </Text>
          <Text className="ml-2 text-[13px] font-semibold text-slate-400">
            {formatPrice(item)}
          </Text>
        </View>
      </View>
      <View className="ml-3 h-9 w-9 items-center justify-center rounded-full bg-blue-50">
        <Navigation color="#2563EB" size={17} strokeWidth={2.4} />
      </View>
    </Pressable>
  );
});

function SearchNearestSpotsBottomSheetComponent({
  searchPlace,
  spots,
  isLoading = false,
  errorMessage = null,
  onClose,
  onSpotPress,
}: SearchNearestSpotsBottomSheetProps) {
  const sheetRef = useRef<BottomSheet>(null);
  const insets = useSafeAreaInsets();
  const snapPoints = useMemo(() => ['18%', '50%'], []);
  const [isExpandedNearbyList, setIsExpandedNearbyList] = useState(false);
  const animationConfigs = useBottomSheetSpringConfigs({
    damping: 32,
    mass: 0.9,
    overshootClamping: false,
    stiffness: 300,
  });

  useEffect(() => {
    setIsExpandedNearbyList(false);
    if (searchPlace) {
      sheetRef.current?.snapToIndex(1);
      return;
    }

    sheetRef.current?.close();
  }, [searchPlace]);

  const visibleSheetResults = useMemo(
    () =>
      spots.slice(
        0,
        isExpandedNearbyList
          ? EXPANDED_VISIBLE_RESULTS
          : INITIAL_VISIBLE_RESULTS,
      ),
    [isExpandedNearbyList, spots],
  );
  const hiddenResultCount = Math.max(
    0,
    Math.min(spots.length, EXPANDED_VISIBLE_RESULTS) -
      visibleSheetResults.length,
  );
  const canToggleResultCount = spots.length > INITIAL_VISIBLE_RESULTS;

  const toggleExpandedResults = useCallback(() => {
    setIsExpandedNearbyList((current) => !current);
  }, []);

  const closeSheet = useCallback(() => {
    sheetRef.current?.close();
  }, []);

  const handleSheetClose = useCallback(() => {
    onClose();
  }, [onClose]);

  const renderSpot = useCallback(
    ({ item }: { item: ParkingSpotWithDistance }) => (
      <NearestSpotRow item={item} onPress={onSpotPress} />
    ),
    [onSpotPress],
  );

  return (
    <BottomSheet
      ref={sheetRef}
      animateOnMount={false}
      animationConfigs={animationConfigs}
      backgroundStyle={styles.background}
      enableDynamicSizing={false}
      enableOverDrag={false}
      enablePanDownToClose
      handleIndicatorStyle={styles.handleIndicator}
      handleStyle={styles.handle}
      index={-1}
      onClose={handleSheetClose}
      overDragResistanceFactor={4}
      snapPoints={snapPoints}
      style={styles.sheet}
    >
      <View className="px-5 pb-3 pt-1">
        <View className="flex-row items-center justify-between">
          <View className="flex-1 pr-3">
            <Text className="text-[24px] font-extrabold text-slate-950">
              Nearby parking areas
            </Text>
            <View className="mt-1 flex-row items-center">
              <MapPin color="#64748B" size={14} strokeWidth={2.4} />
              <Text
                className="ml-1 flex-1 text-[13px] font-semibold text-slate-500"
                numberOfLines={1}
              >
                {searchPlace?.address ?? searchPlace?.title ?? 'Selected place'}
              </Text>
            </View>
            {spots.length > 0 ? (
              <Text className="mt-1 text-[12px] font-medium text-slate-400">
                Showing the closest recommended parking areas
              </Text>
            ) : null}
          </View>
          <Pressable
            accessibilityLabel="Close nearby parking areas"
            accessibilityRole="button"
            className="h-10 w-10 items-center justify-center rounded-full bg-white active:bg-slate-100"
            hitSlop={8}
            onPress={closeSheet}
            style={styles.closeButton}
          >
            <X color="#475569" size={18} strokeWidth={2.5} />
          </Pressable>
        </View>
      </View>

      <BottomSheetFlatList
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: Math.max(insets.bottom, 10) + 118 },
        ]}
        data={visibleSheetResults}
        initialNumToRender={8}
        keyExtractor={(item) => item.id}
        keyboardShouldPersistTaps="handled"
        ListFooterComponent={
          canToggleResultCount ? (
            <Pressable
              accessibilityLabel={
                isExpandedNearbyList
                  ? 'Show fewer nearby parking areas'
                  : 'Show more nearby parking areas'
              }
              accessibilityRole="button"
              className="mt-1 flex-row items-center justify-center rounded-3xl border border-slate-200 bg-white px-4 py-3.5 active:bg-slate-50"
              onPress={toggleExpandedResults}
              style={styles.row}
            >
              <Text className="text-[14px] font-bold text-blue-700">
                {isExpandedNearbyList
                  ? 'Show less'
                  : `Show more parking areas (${hiddenResultCount})`}
              </Text>
              {isExpandedNearbyList ? (
                <ChevronUp
                  color="#1D4ED8"
                  size={16}
                  strokeWidth={2.6}
                  style={styles.toggleIcon}
                />
              ) : (
                <ChevronDown
                  color="#1D4ED8"
                  size={16}
                  strokeWidth={2.6}
                  style={styles.toggleIcon}
                />
              )}
            </Pressable>
          ) : null
        }
        ListEmptyComponent={
          <View className="items-center justify-center rounded-[28px] border border-dashed border-slate-300 bg-white/80 px-6 py-10">
            {isLoading && errorMessage === null ? (
              <ActivityIndicator color="#2563EB" size="small" />
            ) : null}
            <Text className="mt-2 text-[18px] font-extrabold text-slate-950">
              {errorMessage !== null
                ? 'Unable to load parking areas'
                : isLoading
                  ? 'Finding nearby parking areas'
                  : 'No nearby parking areas found'}
            </Text>
            <Text className="mt-2 text-center text-[14px] font-medium leading-5 text-slate-500">
              {errorMessage !== null
                ? 'Check your connection and search this area again.'
                : isLoading
                  ? 'Loading parking data around this destination.'
                  : 'Try a different place or address.'}
            </Text>
          </View>
        }
        maxToRenderPerBatch={8}
        renderItem={renderSpot}
        showsVerticalScrollIndicator={false}
        updateCellsBatchingPeriod={50}
        windowSize={5}
      />
    </BottomSheet>
  );
}

export const SearchNearestSpotsBottomSheet = memo(
  SearchNearestSpotsBottomSheetComponent,
);

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
  listContent: {
    paddingHorizontal: 20,
    paddingTop: 2,
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
  toggleIcon: {
    marginLeft: 6,
  },
});
