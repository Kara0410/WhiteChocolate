import {
  forwardRef,
  memo,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type ComponentRef,
} from 'react';
import BottomSheet, {
  BottomSheetScrollView,
  useBottomSheetSpringConfigs,
} from '@gorhom/bottom-sheet';
import {
  ActivityIndicator,
  Pressable,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {
  MAP_ELEVATIONS,
  MAP_LAYERS,
} from '@/components/parking-map/map-layers';
import { useAuthSheet } from '@/context/AuthSheetContext';
import { useFavoriteParking } from '@/context/FavoriteParkingContext';
import { useAccount } from '@/hooks/use-account';
import { fetchParkingSegmentDetails } from '@/services/parkingMapData';
import type { ParkingSegment } from '@/types/parking-segment';
import type { ParkingClusterResponse } from '@/types/parking-map';
import { openParkingNavigation } from '@/utils/openParkingNavigation';
import { formatParkingPrice } from '@/utils/parking-domain';

import { ParkingDetailHeader } from './ParkingDetailHeader';
import { ParkingDetailSection } from './ParkingDetailSection';
import { ParkingInfoRow } from './ParkingInfoRow';
import { getAvailabilityTheme } from './parking-availability-status';

export type ParkingBottomSheetProps = {
  item: ParkingClusterResponse | null;
  onClose: () => void;
  onCompact?: () => void;
};

export type ParkingBottomSheetHandle = { compact: () => void };

const ITEM_SWITCH_DELAY_MS = 150;

function clampPercentage(value: number) {
  return Number.isFinite(value)
    ? Math.max(0, Math.min(100, Math.round(value)))
    : 0;
}

function formatDistance(distance?: number) {
  if (distance === undefined) {
    return 'Distance unavailable';
  }
  const walkingMinutes = Math.max(1, Math.round(distance / 80));
  return `${walkingMinutes} min walk · ${distance} m`;
}

function formatUpdatedAt(value: string | null) {
  if (value === null) {
    return 'Unavailable';
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? 'Unavailable'
    : new Intl.DateTimeFormat('en', {
        dateStyle: 'medium',
        timeStyle: 'short',
      }).format(date);
}

function buildShareMessage(
  item: ParkingClusterResponse,
  title: string,
) {
  const lines = [`Parking: ${title}`];
  if (item.availabilityStatus !== 'unknown') {
    lines.push(`Estimated availability: ${item.availabilityPercent}%`);
  }
  lines.push(
    `Location: https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
      `${item.latitude},${item.longitude}`,
    )}`,
  );
  return lines.join('\n');
}

function SourceDetails({ detail }: { detail: ParkingSegment }) {
  const capacity =
    detail.capacity === null ? 'Unavailable' : `${detail.capacity} spaces`;
  const availability =
    detail.availability.status === 'unknown' ||
    detail.availability.percent === null
      ? 'Availability unavailable'
      : `${detail.availability.percent}% estimated`;
  const maxStay =
    detail.regulation.maximumStayMinutes === null
      ? 'Unavailable'
      : `${detail.regulation.maximumStayMinutes} minutes`;

  return (
    <>
      <ParkingDetailSection title="Current data">
        <ParkingInfoRow label="Availability" value={availability} />
        <ParkingInfoRow label="Capacity" value={capacity} />
        <ParkingInfoRow
          label="Pricing"
          value={formatParkingPrice(detail.pricing)}
        />
        <ParkingInfoRow
          label="Updated"
          value={formatUpdatedAt(detail.updatedAt)}
        />
      </ParkingDetailSection>

      <ParkingDetailSection title="Regulation">
        <ParkingInfoRow
          label="Rule"
          value={detail.regulation.name ?? 'Unavailable'}
        />
        <ParkingInfoRow label="Maximum stay" value={maxStay} />
        <ParkingInfoRow
          label="Description"
          value={detail.regulation.description ?? 'Unavailable'}
        />
        <ParkingInfoRow
          label="Source area"
          value={detail.sourceAreaName ?? 'Unavailable'}
        />
      </ParkingDetailSection>
    </>
  );
}

const ParkingDetailContent = memo(function ParkingDetailContent({
  item,
  onClose,
}: {
  item: ParkingClusterResponse;
  onClose: () => void;
}) {
  const [detail, setDetail] = useState<ParkingSegment | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);
  const account = useAccount();
  const { showCreateAccountSheet } = useAuthSheet();
  const { isFavorite, toggleFavorite } = useFavoriteParking();
  const percentage = clampPercentage(item.availabilityPercent);
  const theme = useMemo(() => getAvailabilityTheme(percentage), [percentage]);
  const title =
    detail?.streetName ?? item.bestSpot.zoneName ?? 'Parking Area';

  useEffect(() => {
    const controller = new AbortController();
    setDetail(null);
    setDetailError(null);
    void fetchParkingSegmentDetails(item.bestSpot.id, {
      signal: controller.signal,
    })
      .then((result) => {
        if (!controller.signal.aborted) {
          setDetail(result);
        }
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) {
          setDetailError(
            error instanceof Error
              ? error.message
              : 'Unable to load parking details.',
          );
        }
      });
    return () => controller.abort();
  }, [item.bestSpot.id]);

  const handleFavorite = useCallback(() => {
    if (!account.isSignedIn) {
      showCreateAccountSheet({ origin: 'parking-favorite' });
      return;
    }
    toggleFavorite(item);
  }, [account.isSignedIn, item, showCreateAccountSheet, toggleFavorite]);

  const handleShare = useCallback(async () => {
    try {
      await Share.share({ message: buildShareMessage(item, title), title });
    } catch (error) {
      if (__DEV__) {
        console.warn('Unable to share parking location', error);
      }
    }
  }, [item, title]);

  const handleNavigate = useCallback(() => {
    void openParkingNavigation({
      latitude: item.latitude,
      longitude: item.longitude,
      label: title,
    });
  }, [item.latitude, item.longitude, title]);

  return (
    <>
      <ParkingDetailHeader
        distanceLabel={formatDistance(item.distanceToDestination)}
        isFavorite={isFavorite(item.id)}
        onClose={onClose}
        onFavorite={account.isSignedIn ? handleFavorite : undefined}
        onNavigate={handleNavigate}
        onShare={account.isSignedIn ? handleShare : undefined}
        percentage={percentage}
        showMetrics={account.isSignedIn}
        theme={theme}
        title={title}
      />

      {!account.isSignedIn ? (
        <View className="mb-5 rounded-2xl border border-slate-200 bg-white p-5">
          <Text className="text-[16px] font-extrabold text-slate-950">
            Sign in for source details
          </Text>
          <Text className="mt-2 text-[13px] font-medium leading-5 text-slate-600">
            View current pricing, capacity, and parking regulations.
          </Text>
          <Pressable
            accessibilityLabel="Create account to view parking details"
            accessibilityRole="button"
            className="mt-4 min-h-11 items-center justify-center rounded-xl bg-slate-950 px-4 active:bg-slate-800"
            onPress={() =>
              showCreateAccountSheet({ origin: 'parking-free-details-gate' })
            }
          >
            <Text className="text-[13px] font-extrabold text-white">
              Create free account
            </Text>
          </Pressable>
        </View>
      ) : detail ? (
        <SourceDetails detail={detail} />
      ) : detailError ? (
        <View className="mb-5 rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <Text className="text-[13px] font-semibold text-amber-900">
            {detailError}
          </Text>
        </View>
      ) : (
        <View className="mb-5 flex-row items-center rounded-2xl bg-white p-4">
          <ActivityIndicator color="#2563EB" size="small" />
          <Text className="ml-3 text-[13px] font-semibold text-slate-600">
            Loading current parking details
          </Text>
        </View>
      )}
    </>
  );
});

const ParkingBottomSheetComponent = forwardRef<
  ParkingBottomSheetHandle,
  ParkingBottomSheetProps
>(function ParkingBottomSheet({ item, onClose, onCompact }, ref) {
  const sheetRef = useRef<ComponentRef<typeof BottomSheet>>(null);
  const hasOpenedRef = useRef(false);
  const previousItemIdRef = useRef<string | null>(null);
  const displayedItemRef = useRef<ParkingClusterResponse | null>(item);
  const switchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const snapPoints = useMemo(() => ['18%', '50%', '95%'], []);
  const animationConfigs = useBottomSheetSpringConfigs({
    damping: 34,
    overshootClamping: true,
    stiffness: 360,
  });

  useEffect(() => {
    if (switchTimerRef.current) {
      clearTimeout(switchTimerRef.current);
      switchTimerRef.current = null;
    }
    if (item !== null) {
      displayedItemRef.current = item;
      const isSwitchingItem =
        hasOpenedRef.current &&
        previousItemIdRef.current !== null &&
        previousItemIdRef.current !== item.id;
      hasOpenedRef.current = true;
      previousItemIdRef.current = item.id;
      if (isSwitchingItem) {
        sheetRef.current?.snapToIndex(0);
        switchTimerRef.current = setTimeout(() => {
          sheetRef.current?.snapToIndex(1);
          switchTimerRef.current = null;
        }, ITEM_SWITCH_DELAY_MS);
      } else {
        sheetRef.current?.snapToIndex(1);
      }
      return;
    }
    hasOpenedRef.current = false;
    previousItemIdRef.current = null;
    sheetRef.current?.close();
  }, [item]);

  useEffect(
    () => () => {
      if (switchTimerRef.current) {
        clearTimeout(switchTimerRef.current);
      }
    },
    [],
  );

  useImperativeHandle(
    ref,
    () => ({
      compact() {
        if (hasOpenedRef.current) {
          if (switchTimerRef.current) {
            clearTimeout(switchTimerRef.current);
            switchTimerRef.current = null;
          }
          sheetRef.current?.snapToIndex(0);
        }
      },
    }),
    [],
  );

  const handleSheetClose = useCallback(() => {
    if (!hasOpenedRef.current) {
      return;
    }
    if (switchTimerRef.current) {
      clearTimeout(switchTimerRef.current);
      switchTimerRef.current = null;
    }
    hasOpenedRef.current = false;
    onClose();
  }, [onClose]);

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
      onChange={(index) => {
        if (index === 0) {
          onCompact?.();
        }
      }}
      onClose={handleSheetClose}
      overDragResistanceFactor={4}
      snapPoints={snapPoints}
      style={styles.sheet}
    >
      <BottomSheetScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {item ?? displayedItemRef.current ? (
          <ParkingDetailContent
            item={(item ?? displayedItemRef.current)!}
            onClose={onClose}
          />
        ) : null}
      </BottomSheetScrollView>
    </BottomSheet>
  );
});

export const ParkingBottomSheet = memo(ParkingBottomSheetComponent);

const styles = StyleSheet.create({
  background: {
    backgroundColor: '#F3F5F8',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    overflow: 'hidden',
  },
  handle: { paddingBottom: 10, paddingTop: 12 },
  handleIndicator: {
    backgroundColor: 'rgba(0,0,0,0.16)',
    borderRadius: 999,
    height: 5,
    width: 42,
  },
  sheet: {
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    boxShadow: '0 -4px 14px rgba(0,0,0,0.1)',
    elevation: MAP_ELEVATIONS.bottomSheet,
    zIndex: MAP_LAYERS.bottomSheet,
  },
  scrollContent: { paddingBottom: 120, paddingHorizontal: 20 },
});
