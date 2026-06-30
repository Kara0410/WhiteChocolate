import {
  forwardRef,
  memo,
  useCallback,
  useImperativeHandle,
  useMemo,
  useRef,
  useEffect,
  type ComponentRef,
} from 'react';
import BottomSheet, {
  BottomSheetScrollView,
  useBottomSheetSpringConfigs,
} from '@gorhom/bottom-sheet';
import {
  Ban,
  Camera,
  CarFront,
  Clock3,
  CreditCard,
  DoorClosed,
  Lightbulb,
  Ruler,
  ShieldCheck,
  UserRoundCheck,
  Zap,
} from 'lucide-react-native';
import { Share, StyleSheet, Text, View } from 'react-native';

import { useFavoriteParking } from '@/context/FavoriteParkingContext';
import type { ParkingClusterResponse } from '@/types/parking-map';
import { openParkingNavigation } from '@/utils/openParkingNavigation';

import { ParkingDetailHeader } from './ParkingDetailHeader';
import { ParkingDetailSection } from './ParkingDetailSection';
import { ParkingInfoRow } from './ParkingInfoRow';
import { getAvailabilityTheme } from './parking-availability-status';

export type ParkingBottomSheetProps = {
  item: ParkingClusterResponse | null;
  onClose: () => void;
  onCompact?: () => void;
};

export type ParkingBottomSheetHandle = {
  compact: () => void;
};

const ITEM_SWITCH_DELAY_MS = 150;
const HISTORICAL_USAGE = [
  { day: 'Mon', value: 76, weekend: false },
  { day: 'Tue', value: 68, weekend: false },
  { day: 'Wed', value: 84, weekend: false },
  { day: 'Thu', value: 72, weekend: false },
  { day: 'Fri', value: 91, weekend: false },
  { day: 'Sat', value: 58, weekend: true },
  { day: 'Sun', value: 44, weekend: true },
];
const PAYMENT_METHODS = ['VISA', 'Mastercard', 'Apple Pay', 'Google Pay'];
const ICON_COLOR = '#334155';
const POSITIVE_COLOR = '#059669';
const NEGATIVE_COLOR = '#DC2626';

function clampPercentage(value: number) {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.max(0, Math.min(100, Math.round(value)));
}

function formatDistance(distance?: number) {
  if (distance === undefined) {
    return '3 min walk · 250 m';
  }

  const walkingMinutes = Math.max(1, Math.round(distance / 80));
  return `${walkingMinutes} min walk · ${distance} m`;
}

function formatShareDistance(distance?: number) {
  if (distance === undefined) {
    return null;
  }

  const walkingMinutes = Math.max(1, Math.round(distance / 80));
  return `${walkingMinutes} min walk (${distance} m)`;
}

function formatPrice(price: number | null) {
  return price === null ? 'Free' : `$${price.toFixed(2)} / hr`;
}

function getMapUrl(item: ParkingClusterResponse) {
  if (!Number.isFinite(item.latitude) || !Number.isFinite(item.longitude)) {
    return null;
  }

  const query = encodeURIComponent(`${item.latitude},${item.longitude}`);
  return `https://www.google.com/maps/search/?api=1&query=${query}`;
}

function buildParkingShareMessage(
  item: ParkingClusterResponse,
  title: string,
  percentage: number,
) {
  const lines = [
    `Check this parking spot: ${title}`,
    `Availability: ${percentage}%`,
  ];
  const distanceLabel = formatShareDistance(item.distanceToDestination);
  const mapUrl = getMapUrl(item);

  if (distanceLabel) {
    lines.push(`Distance: ${distanceLabel}`);
  }

  if (mapUrl) {
    lines.push(`Location: ${mapUrl}`);
  } else if (item.bestSpot.zoneName) {
    lines.push(`Location: ${item.bestSpot.zoneName}`);
  }

  return lines.join('\n');
}

const ParkingDetailContent = memo(function ParkingDetailContent({
  item,
  onClose,
}: {
  item: ParkingClusterResponse;
  onClose: () => void;
}) {
  const percentage = clampPercentage(item.availabilityPercent);
  const theme = useMemo(
    () => getAvailabilityTheme(percentage),
    [percentage],
  );
  const title = item.bestSpot.zoneName || 'Parking Area';
  const price = item.avgPrice ?? item.minPrice;
  const dailyPrice = price === null ? null : price * 7.2;
  const { isFavorite, toggleFavorite } = useFavoriteParking();
  const itemIsFavorite = isFavorite(item.id);

  const handleShare = useCallback(async () => {
    try {
      await Share.share({
        message: buildParkingShareMessage(item, title, percentage),
        title,
      });
    } catch (error) {
      if (__DEV__) {
        console.warn('Unable to share parking location', error);
      }
    }
  }, [item, percentage, title]);

  const handleFavorite = useCallback(() => {
    toggleFavorite(item);
  }, [item, toggleFavorite]);

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
        isFavorite={itemIsFavorite}
        onClose={onClose}
        onFavorite={handleFavorite}
        onNavigate={handleNavigate}
        onShare={handleShare}
        percentage={percentage}
        theme={theme}
        title={title}
      />

      <View className="mb-4 flex-row gap-3">
        <View
          className="flex-1 rounded-[28px] border border-white/70 bg-white px-4 py-5 shadow-sm"
          style={{ borderCurve: 'continuous' }}
        >
          <View className="h-11 w-11 items-center justify-center rounded-full bg-emerald-100">
            <Text className="text-xl font-bold text-emerald-700">$</Text>
          </View>
          <Text className="mt-4 text-[13px] font-semibold text-slate-500">
            Pricing
          </Text>
          <Text className="mt-1 text-[17px] font-extrabold text-slate-950">
            {formatPrice(price)}
          </Text>
          <Text className="mt-1 text-[11px] font-medium text-slate-500">
            {dailyPrice === null
              ? 'No payment required'
              : `Max daily $${dailyPrice.toFixed(2)}`}
          </Text>
        </View>

        <View
          className="flex-1 rounded-[28px] border border-white/70 bg-white px-4 py-5 shadow-sm"
          style={{ borderCurve: 'continuous' }}
        >
          <View className="h-11 w-11 items-center justify-center rounded-full bg-blue-100">
            <Clock3 color="#1D4ED8" size={19} />
          </View>
          <Text className="mt-4 text-[13px] font-semibold text-slate-500">
            Max Stay
          </Text>
          <Text className="mt-1 text-[17px] font-extrabold text-slate-950">
            2 hours
          </Text>
          <Text className="mt-1 text-[11px] font-medium text-slate-500">
            Check local signs
          </Text>
        </View>
      </View>

      <View className="mb-4 flex-row gap-3">
        <View
          className="flex-1 rounded-[28px] border border-white/70 bg-white px-4 py-5 shadow-sm"
          style={{ borderCurve: 'continuous' }}
        >
          <View className="h-11 w-11 items-center justify-center rounded-full bg-blue-100">
            <CarFront color="#1D4ED8" size={19} />
          </View>
          <Text className="mt-4 text-[13px] font-semibold text-slate-500">
            Distance
          </Text>
          <Text
            className="mt-1 text-[17px] font-extrabold text-slate-950"
            numberOfLines={1}
          >
            {formatDistance(item.distanceToDestination)}
          </Text>
          <Text className="mt-1 text-[11px] font-medium text-slate-500">
            To your destination
          </Text>
        </View>

        <View
          className="flex-1 rounded-[28px] border border-white/70 bg-white px-4 py-5 shadow-sm"
          style={{ borderCurve: 'continuous' }}
        >
          <View className="h-11 w-11 items-center justify-center rounded-full bg-emerald-100">
            <Clock3 color={POSITIVE_COLOR} size={19} />
          </View>
          <Text className="mt-4 text-[13px] font-semibold text-slate-500">
            Open Hours
          </Text>
          <Text className="mt-1 text-[17px] font-extrabold text-slate-950">
            24 hours
          </Text>
          <Text className="mt-1 text-[11px] font-medium text-slate-500">
            Open now
          </Text>
        </View>
      </View>

      <ParkingDetailSection title="Historical Usage">
        <View className="h-40 flex-row items-end justify-between">
          {HISTORICAL_USAGE.map(({ day, value, weekend }) => (
            <View className="h-full flex-1 items-center justify-end" key={day}>
              <View className="h-[112px] w-full items-center justify-end">
                <View
                  className={`w-5 rounded-t-lg ${
                    weekend ? 'bg-slate-400' : 'bg-emerald-500'
                  }`}
                  style={{ height: `${value}%` }}
                />
              </View>
              <Text className="mt-2 text-[10px] font-semibold text-slate-500">
                {day}
              </Text>
            </View>
          ))}
        </View>
      </ParkingDetailSection>

      <ParkingDetailSection title="EV Chargers">
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center">
            <View className="mr-3 h-11 w-11 items-center justify-center rounded-full bg-emerald-100">
              <Zap color={POSITIVE_COLOR} fill="#A7F3D0" size={21} />
            </View>
            <View>
              <Text className="text-[15px] font-bold text-emerald-700">
                6 / 10 available
              </Text>
              <Text className="mt-1 text-[12px] font-medium text-slate-500">
                Type 2 (AC) · 22 kW
              </Text>
            </View>
          </View>
        </View>
        <View className="mt-4 flex-row gap-2">
          {Array.from({ length: 10 }, (_, index) => (
            <View
              className={`h-2 flex-1 rounded-full ${
                index < 6 ? 'bg-emerald-500' : 'bg-slate-200'
              }`}
              key={index}
            />
          ))}
        </View>
      </ParkingDetailSection>

      <ParkingDetailSection title="Security">
        <ParkingInfoRow
          accent="green"
          icon={<Camera color={POSITIVE_COLOR} size={18} />}
          label="CCTV"
          value="Available"
        />
        <ParkingInfoRow
          accent="green"
          icon={<Lightbulb color={POSITIVE_COLOR} size={18} />}
          label="Lighting"
          value="Available"
        />
        <ParkingInfoRow
          accent="green"
          icon={<UserRoundCheck color={POSITIVE_COLOR} size={18} />}
          label="Staff On-site"
          value="Available"
        />
        <ParkingInfoRow
          accent="green"
          icon={<DoorClosed color={POSITIVE_COLOR} size={18} />}
          label="Gated Entry"
          value="Available"
        />
      </ParkingDetailSection>

      <ParkingDetailSection title="Vehicle Limits">
        <ParkingInfoRow
          accent="purple"
          icon={<Ruler color="#7E22CE" size={18} />}
          label="Max Height"
          value="2.10 m"
        />
        <ParkingInfoRow
          accent="purple"
          icon={<Ruler color="#7E22CE" size={18} />}
          label="Max Width"
          value="2.40 m"
        />
      </ParkingDetailSection>

      <ParkingDetailSection title="Restrictions">
        <ParkingInfoRow
          accent="red"
          icon={<Ban color={NEGATIVE_COLOR} size={18} />}
          label="No Overnight Parking"
          value="Restricted"
        />
        <ParkingInfoRow
          accent="red"
          icon={<CarFront color={NEGATIVE_COLOR} size={18} />}
          label="No Trucks"
          value="Restricted"
        />
        <ParkingInfoRow
          accent="red"
          icon={<ShieldCheck color={NEGATIVE_COLOR} size={18} />}
          label="Resident Only Zones"
          value="Check signs"
        />
      </ParkingDetailSection>

      <ParkingDetailSection title="Payment Methods">
        <View className="flex-row flex-wrap gap-2">
          {PAYMENT_METHODS.map((method) => (
            <View
              className="flex-row items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-2"
              key={method}
            >
              <CreditCard color={ICON_COLOR} size={15} />
              <Text className="ml-2 text-[12px] font-bold text-slate-700">
                {method}
              </Text>
            </View>
          ))}
        </View>
      </ParkingDetailSection>

      <ParkingDetailSection title="Spot Chance">
        <View className="flex-row items-center justify-between">
          <Text className="flex-1 pr-4 text-[14px] font-bold text-orange-700">
            High chance of finding a spot
          </Text>
          <Text
            className="text-[20px] font-extrabold text-orange-600"
            style={{ fontVariant: ['tabular-nums'] }}
          >
            92%
          </Text>
        </View>
        <View className="mt-3 h-3 overflow-hidden rounded-full bg-orange-100">
          <View className="h-full w-[92%] rounded-full bg-orange-500" />
        </View>
      </ParkingDetailSection>

      <ParkingDetailSection title="Details">
        <ParkingInfoRow
          label="Zone ID"
          value={item.bestSpot.id}
        />
        <ParkingInfoRow label="Zone Type" value="Public parking" />
        <ParkingInfoRow label="Surface" value="Paved" />
        <ParkingInfoRow
          label="Total Capacity"
          value={`${item.totalCapacity} spaces`}
        />
        <ParkingInfoRow label="Last Updated" value="Just now" />
      </ParkingDetailSection>

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

  const handleSheetChange = useCallback(
    (index: number) => {
      if (index === 0) {
        onCompact?.();
      }
    },
    [onCompact],
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
      onChange={handleSheetChange}
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
  sheet: {
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    boxShadow: '0 -4px 14px rgba(0,0,0,0.1)',
  },
  scrollContent: {
    paddingBottom: 120,
    paddingHorizontal: 20,
  },
});
