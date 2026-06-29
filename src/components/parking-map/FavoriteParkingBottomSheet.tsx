import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentRef,
} from 'react';
import BottomSheet, {
  BottomSheetFlatList,
  useBottomSheetSpringConfigs,
} from '@gorhom/bottom-sheet';
import { Heart, Trash2, X } from 'lucide-react-native';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  type LayoutChangeEvent,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  FadeInDown,
  FadeOutUp,
  LinearTransition,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useFavoriteParking } from '@/context/FavoriteParkingContext';
import type { ParkingClusterResponse } from '@/types/parking-map';

import { getAvailabilityTheme } from './parking-availability-status';

type FavoriteParkingBottomSheetProps = {
  onClose: () => void;
  onSpotPress: (item: ParkingClusterResponse) => void;
};

const RING_SIZE = 42;
const RING_STROKE = 5;
const RING_RADIUS = (RING_SIZE - RING_STROKE) / 2;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;
const DELETE_ACTION_WIDTH = 82;
const REVEAL_THRESHOLD = 44;
const FULL_DELETE_DISTANCE = 138;
const ROW_VERTICAL_GAP = 12;

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
  index,
  isAnyRowOpen,
  isOpen,
  item,
  onCloseOpenRow,
  onDelete,
  onOpenRow,
  onPress,
}: {
  index: number;
  isAnyRowOpen: boolean;
  isOpen: boolean;
  item: ParkingClusterResponse;
  onCloseOpenRow: () => void;
  onDelete: (id: string) => void;
  onOpenRow: (id: string) => void;
  onPress: (item: ParkingClusterResponse) => void;
}) {
  const percentage = clampPercentage(item.availabilityPercent);
  const title = item.bestSpot.zoneName || 'Parking Area';
  const distanceLabel = formatDistance(item.distanceToDestination);
  const translateX = useSharedValue(0);
  const startX = useSharedValue(0);
  const rowWidth = useSharedValue(0);
  const opacity = useSharedValue(1);
  const pressedScale = useSharedValue(1);
  const containerHeight = useSharedValue(0);
  const containerMargin = useSharedValue(ROW_VERTICAL_GAP);
  const isDeleting = useSharedValue(false);
  const [hasMeasured, setHasMeasured] = useState(false);

  const handlePress = useCallback(() => {
    if (isOpen || isAnyRowOpen) {
      onCloseOpenRow();
      return;
    }

    onPress(item);
  }, [isAnyRowOpen, isOpen, item, onCloseOpenRow, onPress]);

  const handleLayout = useCallback(
    (event: LayoutChangeEvent) => {
      if (isDeleting.value) {
        return;
      }

      const { height, width } = event.nativeEvent.layout;
      rowWidth.value = width;
      containerHeight.value = height;
      setHasMeasured(true);
    },
    [containerHeight, isDeleting, rowWidth],
  );

  const handleDelete = useCallback(() => {
    onCloseOpenRow();
    onDelete(item.id);
  }, [item.id, onCloseOpenRow, onDelete]);

  const animateDelete = useCallback(() => {
    isDeleting.value = true;
    opacity.value = withTiming(0, { duration: 160 });
    pressedScale.value = withTiming(0.98, { duration: 120 });
    translateX.value = withTiming(
      -Math.max(rowWidth.value + DELETE_ACTION_WIDTH, FULL_DELETE_DISTANCE),
      { duration: 210 },
    );
    containerMargin.value = withTiming(0, { duration: 180 });
    containerHeight.value = withTiming(
      0,
      { duration: 210 },
      (finished) => {
        if (finished) {
          runOnJS(handleDelete)();
        }
      },
    );
  }, [
    containerHeight,
    containerMargin,
    handleDelete,
    isDeleting,
    opacity,
    pressedScale,
    rowWidth,
    translateX,
  ]);

  useEffect(() => {
    if (!isOpen && !isDeleting.value) {
      translateX.value = withSpring(0, {
        damping: 24,
        mass: 0.9,
        stiffness: 260,
      });
    }
  }, [isDeleting, isOpen, translateX]);

  const panGesture = useMemo(
    () =>
      Gesture.Pan()
        .activeOffsetX([-12, 12])
        .failOffsetY([-12, 12])
        .onBegin(() => {
          startX.value = translateX.value;
          runOnJS(onOpenRow)(item.id);
        })
        .onUpdate((event) => {
          const rawX = Math.min(0, startX.value + event.translationX);
          const maxOpenDistance = -Math.min(rowWidth.value, 168);
          const nextX =
            rawX < maxOpenDistance
              ? maxOpenDistance + (rawX - maxOpenDistance) * 0.28
              : rawX;
          translateX.value = nextX;
        })
        .onEnd(() => {
          const deleteThreshold = Math.min(
            FULL_DELETE_DISTANCE,
            Math.max(110, rowWidth.value * 0.5),
          );

          if (Math.abs(translateX.value) >= deleteThreshold) {
            runOnJS(animateDelete)();
            return;
          }

          if (Math.abs(translateX.value) >= REVEAL_THRESHOLD) {
            translateX.value = withSpring(-DELETE_ACTION_WIDTH, {
              damping: 26,
              mass: 0.9,
              stiffness: 280,
            });
            runOnJS(onOpenRow)(item.id);
            return;
          }

          translateX.value = withSpring(0, {
            damping: 24,
            mass: 0.9,
            stiffness: 280,
          });
          runOnJS(onCloseOpenRow)();
        }),
    [
      animateDelete,
      item.id,
      onCloseOpenRow,
      onOpenRow,
      rowWidth,
      startX,
      translateX,
    ],
  );

  const rowAnimatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [
      { translateX: translateX.value },
      { scale: pressedScale.value },
    ],
  }));

  const actionAnimatedStyle = useAnimatedStyle(() => ({
    opacity: Math.min(1, Math.abs(translateX.value) / REVEAL_THRESHOLD),
    transform: [
      {
        scale: 0.92 + Math.min(1, Math.abs(translateX.value) / REVEAL_THRESHOLD) * 0.08,
      },
    ],
  }));

  const containerAnimatedStyle = useAnimatedStyle(() => ({
    height: hasMeasured ? containerHeight.value : undefined,
    marginBottom: hasMeasured ? containerMargin.value : ROW_VERTICAL_GAP,
  }));

  return (
    <Animated.View
      entering={FadeInDown.delay(Math.min(index * 35, 180))
        .duration(280)
        .springify()
        .damping(24)
        .stiffness(260)}
      exiting={FadeOutUp.duration(160)}
      layout={LinearTransition.springify().damping(26).stiffness(260)}
      onLayout={handleLayout}
      style={containerAnimatedStyle}
      className="overflow-hidden rounded-3xl"
    >
      <Animated.View
        className="absolute bottom-0 right-0 top-0 w-[82px] items-center justify-center rounded-3xl bg-red-600"
        style={actionAnimatedStyle}
      >
        <Pressable
          accessibilityLabel={`Remove ${title} from favorites`}
          accessibilityRole="button"
          className="h-full w-full items-center justify-center active:bg-red-700"
          onPress={animateDelete}
        >
          <Trash2 color="#FFFFFF" size={22} strokeWidth={2.4} />
        </Pressable>
      </Animated.View>

      <GestureDetector gesture={panGesture}>
        <Animated.View style={rowAnimatedStyle}>
          <Pressable
            accessibilityLabel={`Open ${title}`}
            accessibilityRole="button"
            className="flex-row items-center rounded-3xl border border-white/80 bg-white px-4 py-4 active:bg-slate-50"
            onPress={handlePress}
            onPressIn={() => {
              pressedScale.value = withTiming(0.985, { duration: 90 });
            }}
            onPressOut={() => {
              pressedScale.value = withSpring(1, {
                damping: 18,
                stiffness: 260,
              });
            }}
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
              <Heart
                color="#E11D48"
                fill="#E11D48"
                size={17}
                strokeWidth={2.4}
              />
            </View>
          </Pressable>
        </Animated.View>
      </GestureDetector>
    </Animated.View>
  );
});

export function FavoriteParkingBottomSheet({
  onClose,
  onSpotPress,
}: FavoriteParkingBottomSheetProps) {
  const sheetRef = useRef<ComponentRef<typeof BottomSheet>>(null);
  const pendingSpotRef = useRef<ParkingClusterResponse | null>(null);
  const insets = useSafeAreaInsets();
  const { favoriteItems, removeFavorite } = useFavoriteParking();
  const [openRowId, setOpenRowId] = useState<string | null>(null);
  const snapPoints = useMemo(() => ['18%', '70%'], []);
  const animationConfigs = useBottomSheetSpringConfigs({
    damping: 30,
    mass: 0.9,
    overshootClamping: false,
    stiffness: 280,
  });

  const closeOpenRow = useCallback(() => {
    setOpenRowId(null);
  }, []);

  const closeSheet = useCallback(() => {
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

  const handleSpotPress = useCallback(
    (item: ParkingClusterResponse) => {
      pendingSpotRef.current = item;
      closeSheet();
    },
    [closeSheet],
  );

  const handleDelete = useCallback(
    (id: string) => {
      setOpenRowId((current) => (current === id ? null : current));
      removeFavorite(id);
    },
    [removeFavorite],
  );
  const renderFavorite = useCallback(
    ({
      item,
      index,
    }: {
      item: ParkingClusterResponse;
      index: number;
    }) => (
      <FavoriteSpotRow
        index={index}
        isAnyRowOpen={openRowId !== null}
        isOpen={openRowId === item.id}
        item={item}
        onCloseOpenRow={closeOpenRow}
        onDelete={handleDelete}
        onOpenRow={setOpenRowId}
        onPress={handleSpotPress}
      />
    ),
    [closeOpenRow, handleDelete, handleSpotPress, openRowId],
  );

  return (
    <BottomSheet
      ref={sheetRef}
      backgroundStyle={styles.background}
      animationConfigs={animationConfigs}
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
          { paddingBottom: Math.max(insets.bottom, 10) + 118 },
        ]}
        data={favoriteItems}
        initialNumToRender={8}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={
          <Animated.View
            entering={FadeInDown.duration(260).springify().damping(24)}
            exiting={FadeOutUp.duration(150)}
            className="items-center justify-center rounded-[28px] border border-dashed border-slate-300 bg-white/80 px-6 py-12"
          >
            <View className="mb-4 h-16 w-16 items-center justify-center rounded-full bg-rose-50">
              <Heart color="#E11D48" size={28} strokeWidth={2.2} />
            </View>
            <Text className="text-[18px] font-extrabold text-slate-950">
              No favorite spots yet
            </Text>
            <Text className="mt-2 text-center text-[14px] font-medium leading-5 text-slate-500">
              Tap the heart on a parking spot to add it here.
            </Text>
          </Animated.View>
        }
        ListHeaderComponent={
          <View className="mb-5 flex-row items-center justify-between">
            <View className="flex-1 pr-3">
              <Text className="text-[26px] font-extrabold text-slate-950">
                Favorite spots
              </Text>
              <Text className="mt-1 text-[14px] font-semibold text-slate-500">
                {favoriteItems.length === 1
                  ? '1 favorited parking spot'
                  : `${favoriteItems.length} favorited parking spots`}
              </Text>
            </View>
            <Pressable
              accessibilityLabel="Close favorite spots"
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
        maxToRenderPerBatch={8}
        renderItem={renderFavorite}
        showsVerticalScrollIndicator={false}
        updateCellsBatchingPeriod={50}
        windowSize={5}
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
  closeButton: {
    borderCurve: 'continuous',
    boxShadow: '0 4px 12px rgba(15,23,42,0.07)',
  },
  row: {
    borderCurve: 'continuous',
    boxShadow: '0 4px 12px rgba(15,23,42,0.07)',
  },
  sheet: {
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    boxShadow: '0 -4px 14px rgba(0,0,0,0.1)',
  },
});
