import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import BottomSheet, {
  BottomSheetFlatList,
  useBottomSheetSpringConfigs,
} from '@gorhom/bottom-sheet';
import { ArrowRight, ChevronDown, ChevronUp, MapPin, X } from 'lucide-react-native';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  MAP_ELEVATIONS,
  MAP_LAYERS,
} from '@/components/parking-map/map-layers';
import { ParkingAreaListItem } from '@/components/parking-map/ParkingAreaListItem';
import { GlassSheetBackground } from '@/components/parking-map/glass-sheet-background';
import type { PlaceSearchResult } from '@/hooks/use-google-place-search';
import type { ParkingClusterResponse } from '@/types/parking-map';
import {
  formatParkingPriceLabel,
  formatSearchDistance,
  type ParkingSpotWithDistance,
} from '@/utils/parkingSearch';

import { COLORS, RADII, SHADOWS } from '@/constants/theme';

type SearchNearestSpotsBottomSheetProps = {
  searchPlace: PlaceSearchResult | null;
  spots: ParkingSpotWithDistance[];
  isLoading?: boolean;
  errorMessage?: string | null;
  onRetry?: () => void;
  onClose: () => void;
  onSpotPress: (spot: ParkingClusterResponse) => void;
};

/** Curated first page: enough to choose from without overwhelming. */
const INITIAL_VISIBLE_RESULTS = 5;
/** Hard cap for the expanded list; the rest stays available on the map flow. */
const EXPANDED_VISIBLE_RESULTS = 12;

function SearchNearestSpotsBottomSheetComponent({
  searchPlace,
  spots,
  isLoading = false,
  errorMessage = null,
  onRetry,
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
    ({ item }: { item: ParkingSpotWithDistance }) => {
      const percentage =
        item.availabilityStatus !== undefined &&
        item.availabilityStatus !== 'unknown' &&
        item.availabilityPercent !== null
          ? item.availabilityPercent
          : null;
      const title = item.bestSpot.label || 'Parking Area';

      return (
        <View className="mb-2.5">
          <ParkingAreaListItem
            action={{
              accessibilityLabel: `Navigate to ${title}`,
              icon: ArrowRight,
              onPress: () => onSpotPress(item),
            }}
            metaPrimary={formatSearchDistance(item.distanceFromSearchMeters)}
            metaSecondary={formatParkingPriceLabel(item)}
            onPress={() => onSpotPress(item)}
            percentage={percentage}
            title={title}
          />
        </View>
      );
    },
    [onSpotPress],
  );

  return (
    <BottomSheet
      ref={sheetRef}
      animateOnMount={false}
      animationConfigs={animationConfigs}
      backgroundComponent={GlassSheetBackground}
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
            <Text className="text-[24px] font-extrabold text-ink-primary">
              Nearby Parking areas
            </Text>
            <View className="mt-1 flex-row items-center">
              <MapPin color={COLORS.text.secondary} size={14} strokeWidth={2.4} />
              <Text
                className="ml-1 flex-1 text-[13px] font-semibold text-ink-secondary"
                numberOfLines={1}
              >
                {searchPlace?.address ?? searchPlace?.title ?? 'Selected place'}
              </Text>
            </View>
            {spots.length > 0 ? (
              <Text className="mt-1 text-[12px] font-medium text-ink-muted">
                Showing the closest recommended parking areas
              </Text>
            ) : null}
            {spots.length > 0 && errorMessage !== null ? (
              <Text className="mt-2 text-[12px] font-semibold leading-4 text-status-limited">
                {errorMessage}
              </Text>
            ) : null}
            {spots.length > 0 && isLoading ? (
              <View className="mt-2 flex-row items-center">
                <ActivityIndicator color={COLORS.accent.primary} size="small" />
                <Text className="ml-2 text-[12px] font-semibold text-accent-primary">
                  Updating parking availability
                </Text>
              </View>
            ) : null}
          </View>
          <Pressable
            accessibilityLabel="Close nearby parking areas"
            accessibilityRole="button"
            className="h-10 w-10 items-center justify-center rounded-full bg-surface-default active:bg-background-default"
            hitSlop={8}
            onPress={closeSheet}
             style={{ borderCurve: 'continuous' }}
          >
            <X color={COLORS.icon.default} size={18} strokeWidth={2.5} />
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
              className="mt-1 flex-row items-center justify-center rounded-3xl border border-border-subtle bg-surface-default px-4 py-3.5 active:bg-surface-input"
              onPress={toggleExpandedResults}
              style={{ borderCurve: 'continuous' }}
            >
              <Text className="text-[14px] font-bold text-accent-primary">
                {isExpandedNearbyList
                  ? 'Show less'
                  : `Show more parking areas (${hiddenResultCount})`}
              </Text>
              {isExpandedNearbyList ? (
                <ChevronUp
                  color={COLORS.accent.primary}
                  size={16}
                  strokeWidth={2.6}
                  className="ml-1.5"
                />
              ) : (
                <ChevronDown
                  color={COLORS.accent.primary}
                  size={16}
                  strokeWidth={2.6}
                  className="ml-1.5"
                />
              )}
            </Pressable>
          ) : null
        }
        ListEmptyComponent={
          <View className="items-center justify-center rounded-card border border-dashed border-border-strong bg-surface-default/80 px-6 py-10">
            {isLoading && errorMessage === null ? (
              <ActivityIndicator color={COLORS.accent.primary} size="small" />
            ) : null}
            <Text className="mt-2 text-[18px] font-extrabold text-ink-primary">
              {errorMessage !== null
                ? 'Unable to load parking areas'
                : isLoading
                  ? 'Finding nearby parking areas'
                  : 'No nearby parking areas found'}
            </Text>
            <Text className="mt-2 text-center text-[14px] font-medium leading-5 text-ink-secondary">
              {errorMessage !== null
                ? 'Parking information couldn\'t be loaded. Try again.'
                : isLoading
                  ? 'Loading parking data around this destination.'
                  : 'Try a different place or address.'}
            </Text>
            {errorMessage !== null && onRetry ? (
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
    borderTopLeftRadius: RADII.sheet,
    borderTopRightRadius: RADII.sheet,
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
  listContent: {
    paddingHorizontal: 20,
    paddingTop: 2,
  },
  sheet: {
    borderTopLeftRadius: RADII.sheet,
    borderTopRightRadius: RADII.sheet,
    boxShadow: SHADOWS.sheet,
    elevation: MAP_ELEVATIONS.bottomSheet,
    zIndex: MAP_LAYERS.bottomSheet,
  },
});
