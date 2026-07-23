import {
  forwardRef,
  memo,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  type ComponentRef,
} from 'react';
import BottomSheet, {
  BottomSheetScrollView,
  useBottomSheetSpringConfigs,
} from '@gorhom/bottom-sheet';
import { Alert, Platform, Share, StyleSheet, Text, View } from 'react-native';

import {
  MAP_ELEVATIONS,
  MAP_LAYERS,
} from '@/components/parking-map/map-layers';
import { SettingsErrorPanel } from '@/components/settings/settings-error-panel';
import { useAccount } from '@/hooks/use-account';
import { useAuthSheet } from '@/context/AuthSheetContext';
import { useFavoriteParking } from '@/context/FavoriteParkingContext';
import type { ParkingClusterResponse } from '@/types/parking-map';
import { logAppError, normalizeAppError } from '@/utils/app-errors';
import { openParkingNavigation } from '@/utils/openParkingNavigation';
import { normalizeParkingAvailabilityPercentage } from '@/utils/parking-estimates';

import { ParkingDetailHeader } from './ParkingDetailHeader';
import { ParkingDetailSection } from './ParkingDetailSection';
import { ParkingInfoRow } from './ParkingInfoRow';
import {
  getAvailabilityTheme,
  type AvailabilityTheme,
} from './parking-availability-status';

export type ParkingBottomSheetProps = {
  item: ParkingClusterResponse | null;
  onClose: () => void;
  onCompact?: () => void;
};

export type ParkingBottomSheetHandle = {
  compact: () => void;
};

const UNKNOWN_THEME: AvailabilityTheme = {
  fill: '#64748B',
  text: '#475569',
  ring: '#94A3B8',
  ringTrack: '#E2E8F0',
  glow: 'rgba(100, 116, 139, 0.2)',
  glowStrong: 'rgba(100, 116, 139, 0.25)',
  backgroundTint: '#F1F5F9',
  border: '#CBD5E1',
  movingFill: '#94A3B8',
};

function formatDistance(distance?: number) {
  if (distance === undefined) return 'Distance unavailable';
  const walkingMinutes = Math.max(1, Math.round(distance / 80));
  return `${walkingMinutes} min walk · ${Math.round(distance)} m`;
}

function estimateAge(generatedAt?: string | null) {
  if (!generatedAt) return 'Estimate time unavailable';
  const ageMs = Date.now() - Date.parse(generatedAt);
  if (!Number.isFinite(ageMs)) return 'Estimate time unavailable';
  const minutes = Math.max(0, Math.floor(ageMs / 60_000));
  if (minutes < 1) return 'Estimated less than a minute ago';
  if (minutes < 60) return `Estimated ${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  return `Estimated ${hours} hr${hours === 1 ? '' : 's'} ago`;
}

function priceLabel(item: ParkingClusterResponse) {
  if (item.pricingStatus === 'free') return 'Free';
  const rate = item.avgPrice ?? item.minPrice;
  if (item.pricingStatus === 'paid' && rate !== null) {
    return `€${rate.toFixed(2)} / hr`;
  }
  if (item.pricingStatus === 'paid') return 'Paid · rate unavailable';
  return 'Pricing unavailable';
}

function shareMessage(
  item: ParkingClusterResponse,
  title: string,
  percentage: number | null,
) {
  const availability =
    percentage === null
      ? 'Estimated availability: unavailable'
      : `Estimated availability: ${percentage}%`;
  const query = encodeURIComponent(`${item.latitude},${item.longitude}`);
  return [
    title,
    availability,
    formatDistance(item.distanceToDestination),
    `https://www.google.com/maps/search/?api=1&query=${query}`,
  ].join('\n');
}

const ParkingDetailContent = memo(function ParkingDetailContent({
  item,
  onClose,
}: {
  item: ParkingClusterResponse;
  onClose: () => void;
}) {
  const percentage = normalizeParkingAvailabilityPercentage(
    item.availabilityPercent,
  );
  const theme = useMemo(
    () => (percentage === null ? UNKNOWN_THEME : getAvailabilityTheme(percentage)),
    [percentage],
  );
  const title = item.bestSpot.label || 'Parking area';
  const account = useAccount();
  const { showCreateAccountSheet } = useAuthSheet();
  const { error: favoriteError, isFavorite, refreshFavorites, toggleFavorite } =
    useFavoriteParking();
  const itemIsFavorite = isFavorite(item.id);

  const handleNavigate = useCallback(() => {
    void openParkingNavigation({
      latitude: item.latitude,
      longitude: item.longitude,
      label: title,
    });
  }, [item.latitude, item.longitude, title]);

  const handleShare = useCallback(async () => {
    try {
      await Share.share({
        message: shareMessage(item, title, percentage),
        title,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message.toLowerCase() : '';
      if (message.includes('cancel') || message.includes('dismiss')) return;
      logAppError('sharing', error, { source: 'parking-detail' });
      Alert.alert('Sharing unavailable', normalizeAppError(error, 'sharing').message);
    }
  }, [item, percentage, title]);

  const handleFavorite = useCallback(() => {
    if (!account.isSignedIn) {
      showCreateAccountSheet({ origin: 'parking-favorite' });
      return;
    }
    toggleFavorite(item);
  }, [account.isSignedIn, item, showCreateAccountSheet, toggleFavorite]);

  return (
    <View style={styles.detailContent}>
      <ParkingDetailHeader
        distanceLabel={formatDistance(item.distanceToDestination)}
        isFavorite={itemIsFavorite}
        onClose={onClose}
        onFavorite={handleFavorite}
        onNavigate={handleNavigate}
        onShare={handleShare}
        percentage={percentage}
        theme={theme}
        title={title}
      />

      {favoriteError ? (
        <View className="px-5 pt-3">
          <SettingsErrorPanel
            message={favoriteError.message}
            onRetry={() => void refreshFavorites()}
          />
        </View>
      ) : null}

      <BottomSheetScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        style={styles.detailScrollView}
      >
        <ParkingDetailSection title="Estimated availability">
          <Text className="text-[22px] font-extrabold text-slate-950">
            {percentage === null ? 'Estimate unavailable' : `${percentage}% available`}
          </Text>
          <Text className="mt-2 text-[13px] font-semibold leading-5 text-slate-600">
            Estimate based on time, parking rules and area demand
          </Text>
          <View className="mt-4 border-t border-slate-100 pt-3">
            <ParkingInfoRow
              label="Confidence"
              value={
                item.availabilityConfidence === 'medium'
                  ? 'Medium confidence'
                  : item.availabilityConfidence === 'low'
                    ? 'Low confidence'
                    : 'Estimate unavailable'
              }
            />
            <ParkingInfoRow
              label="Generated"
              value={estimateAge(item.estimateGeneratedAt)}
            />
          </View>
        </ParkingDetailSection>

        <ParkingDetailSection title="Parking information">
          <ParkingInfoRow label="Pricing" value={priceLabel(item)} />
          <ParkingInfoRow
            label="Estimated spaces"
            value={
              item.availableSpots === null
                ? 'Capacity unavailable'
                : `${item.availableSpots} of ${item.totalCapacity}`
            }
          />
          <ParkingInfoRow
            label="Total capacity"
            value={
              item.totalCapacity > 0
                ? `${item.totalCapacity} spaces`
                : 'No public spaces listed'
            }
          />
        </ParkingDetailSection>
      </BottomSheetScrollView>
    </View>
  );
});

export const ParkingBottomSheet = forwardRef<
  ParkingBottomSheetHandle,
  ParkingBottomSheetProps
>(function ParkingBottomSheet({ item, onClose, onCompact }, ref) {
  const sheetRef = useRef<ComponentRef<typeof BottomSheet>>(null);
  const snapPoints = useMemo(() => ['18%', '50%', '92%'], []);
  const animationConfigs = useBottomSheetSpringConfigs({
    damping: 34,
    overshootClamping: true,
    stiffness: 360,
  });
  const selectedItemId = item?.id ?? null;

  useImperativeHandle(ref, () => ({
    compact: () => {
      sheetRef.current?.snapToIndex(0);
      onCompact?.();
    },
  }), [onCompact]);

  useEffect(() => {
    if (selectedItemId !== null) sheetRef.current?.snapToIndex(1);
    else sheetRef.current?.close();
  }, [selectedItemId]);

  return (
    <BottomSheet
      animationConfigs={animationConfigs}
      backgroundStyle={styles.sheetBackground}
      enableDynamicSizing={false}
      enablePanDownToClose
      handleIndicatorStyle={styles.handleIndicator}
      index={-1}
      onClose={onClose}
      ref={sheetRef}
      snapPoints={snapPoints}
      style={styles.sheet}
    >
      {item ? <ParkingDetailContent item={item} onClose={onClose} /> : null}
    </BottomSheet>
  );
});

const styles = StyleSheet.create({
  detailContent: { flex: 1 },
  detailScrollView: { flex: 1 },
  handleIndicator: { backgroundColor: '#CBD5E1', width: 42 },
  scrollContent: { paddingBottom: 48, paddingHorizontal: 20 },
  sheet: {
    elevation: MAP_ELEVATIONS.bottomSheet,
    zIndex: MAP_LAYERS.bottomSheet,
  },
  sheetBackground: {
    backgroundColor: Platform.OS === 'ios' ? '#F8FAFC' : '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
  },
});
