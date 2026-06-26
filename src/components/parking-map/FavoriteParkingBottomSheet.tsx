import { memo, useCallback, useMemo } from 'react';
import BottomSheet, { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { Heart } from 'lucide-react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useFavoriteParking } from '@/context/FavoriteParkingContext';
import type { ParkingClusterResponse } from '@/types/parking-map';

import { getAvailabilityTheme } from './parking-availability-status';

type FavoriteParkingBottomSheetProps = {
  onSpotPress: (item: ParkingClusterResponse) => void;
};

const RING_SIZE = 42;
const RING_STROKE = 5;
const RING_RADIUS = (RING_SIZE - RING_STROKE) / 2;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

function clampPercentage(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function formatDistance(distance?: number) {
  if (distance === undefined) {
    return null;
  }

  const walkingMinutes = Math.max(1, Math.round(distance / 80));
  return `${walkingMinutes} min walk`;
}

function FavoriteProgressRing({ percentage }: { percentage: number }) {
  const theme = getAvailabilityTheme(percentage);
  const ringOffset = RING_CIRCUMFERENCE * (1 - percentage / 100);

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
          fill="rgba(255,255,255,0.9)"
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
        {percentage}%
      </Text>
    </View>
  );
}

const FavoriteSpotRow = memo(function FavoriteSpotRow({
  item,
  onPress,
}: {
  item: ParkingClusterResponse;
  onPress: (item: ParkingClusterResponse) => void;
}) {
  const percentage = clampPercentage(item.availabilityPercent);
  const title = item.bestSpot.zoneName || 'Parking Area';
  const distanceLabel = formatDistance(item.distanceToDestination);

  const handlePress = useCallback(() => {
    onPress(item);
  }, [item, onPress]);

  return (
    <Pressable
      accessibilityLabel={`Open ${title}`}
      accessibilityRole="button"
      className="mb-3 flex-row items-center rounded-3xl border border-white/80 bg-white px-4 py-4 active:bg-slate-50"
      onPress={handlePress}
      style={styles.row}
    >
      <FavoriteProgressRing percentage={percentage} />
      <View className="ml-4 flex-1">
        <Text
          className="text-[16px] font-extrabold text-slate-950"
          numberOfLines={1}
        >
          {title}
        </Text>
        <View className="mt-1 flex-row items-center">
          <Text className="text-[13px] font-bold text-slate-600">
            {percentage}% available
          </Text>
          {distanceLabel ? (
            <Text className="ml-2 text-[13px] font-semibold text-slate-400">
              {distanceLabel}
            </Text>
          ) : null}
        </View>
      </View>
      <View className="ml-3 h-9 w-9 items-center justify-center rounded-full bg-rose-50">
        <Heart color="#E11D48" fill="#E11D48" size={17} strokeWidth={2.4} />
      </View>
    </Pressable>
  );
});

export function FavoriteParkingBottomSheet({
  onSpotPress,
}: FavoriteParkingBottomSheetProps) {
  const insets = useSafeAreaInsets();
  const { favoriteItems } = useFavoriteParking();
  const snapPoints = useMemo(() => ['82%'], []);

  return (
    <BottomSheet
      backgroundStyle={styles.background}
      enableDynamicSizing={false}
      enableOverDrag={false}
      handleIndicatorStyle={styles.handleIndicator}
      handleStyle={styles.handle}
      index={0}
      overDragResistanceFactor={4}
      snapPoints={snapPoints}
      style={styles.sheet}
    >
      <BottomSheetScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: Math.max(insets.bottom, 10) + 118 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View className="mb-5 flex-row items-center justify-between">
          <View>
            <Text className="text-[26px] font-extrabold text-slate-950">
              Favorite spots
            </Text>
            <Text className="mt-1 text-[14px] font-semibold text-slate-500">
              {favoriteItems.length === 1
                ? '1 favorited parking spot'
                : `${favoriteItems.length} favorited parking spots`}
            </Text>
          </View>
          <View className="h-12 w-12 items-center justify-center rounded-full bg-rose-50">
            <Heart color="#E11D48" fill="#E11D48" size={22} strokeWidth={2.4} />
          </View>
        </View>

        {favoriteItems.length === 0 ? (
          <View className="items-center justify-center rounded-[28px] border border-dashed border-slate-300 bg-white/80 px-6 py-12">
            <View className="mb-4 h-16 w-16 items-center justify-center rounded-full bg-rose-50">
              <Heart color="#E11D48" size={28} strokeWidth={2.2} />
            </View>
            <Text className="text-[18px] font-extrabold text-slate-950">
              No favorite spots yet
            </Text>
            <Text className="mt-2 text-center text-[14px] font-medium leading-5 text-slate-500">
              Tap the heart on a parking spot to add it here.
            </Text>
          </View>
        ) : (
          favoriteItems.map((item) => (
            <FavoriteSpotRow item={item} key={item.id} onPress={onSpotPress} />
          ))
        )}
      </BottomSheetScrollView>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  background: {
    backgroundColor: '#F3F5F8',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
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
    boxShadow: '0 10px 26px rgba(15,23,42,0.08)',
    elevation: 3,
  },
  sheet: {
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    boxShadow: '0 -8px 24px rgba(0,0,0,0.12)',
    elevation: 14,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
  },
});
