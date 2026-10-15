import { memo } from 'react';
import { Pressable, Text, View } from 'react-native';

import {
  ParkingActionButton,
  type ParkingActionButtonProps,
} from '@/components/parking-map/ParkingActionButton';
import { ParkingAvailabilityBar } from '@/components/parking-map/ParkingAvailabilityBar';
import { getAvailabilityTheme } from '@/components/parking-map/parking-availability-status';
import { GlassSurface } from '@/components/ui/glass-surface';
import { COLORS } from '@/constants/theme';

export type ParkingAreaListItemAction = Omit<ParkingActionButtonProps, 'size'>;

export type ParkingAreaListItemContentProps = {
  title: string;
  percentage: number | null;
  metaPrimary?: string | null;
  metaSecondary?: string | null;
  action: ParkingAreaListItemAction;
};

/** Reusable row content for Search, Favorites, and other parking-area lists — no outer
 * Pressable, for screens (Favorites) that already own their own gesture wrapper. */
export const ParkingAreaListItemContent = memo(
  function ParkingAreaListItemContent({
    title,
    percentage,
    metaPrimary,
    metaSecondary,
    action,
  }: ParkingAreaListItemContentProps) {
    const known = percentage !== null && Number.isFinite(percentage);
    const clamped = known
      ? Math.max(0, Math.min(100, Math.round(percentage)))
      : null;
    const percentColor =
      clamped !== null ? getAvailabilityTheme(clamped).ring : COLORS.text.metadata;

    return (
      <View className="flex-row items-center">
        <View className="w-16 items-start">
          <Text
            className="text-[16px] font-extrabold"
            style={{ color: percentColor, fontVariant: ['tabular-nums'] }}
          >
            {clamped !== null ? `${clamped}%` : '—'}
          </Text>
          <View className="mt-1.5">
            <ParkingAvailabilityBar percentage={percentage} />
          </View>
        </View>
        <View className="ml-4 flex-1">
          <Text
            className="text-[15px] font-extrabold text-ink-primary"
            numberOfLines={1}
          >
            {title}
          </Text>
          {metaPrimary || metaSecondary ? (
            <View className="mt-1 flex-row items-center">
              {metaPrimary ? (
                <Text
                  className="text-[12px] font-bold text-ink-metadata"
                  numberOfLines={1}
                >
                  {metaPrimary}
                </Text>
              ) : null}
              {metaSecondary ? (
                <Text
                  className="ml-2 text-[12px] font-semibold text-ink-metadata"
                  numberOfLines={1}
                >
                  {metaSecondary}
                </Text>
              ) : null}
            </View>
          ) : null}
        </View>
        <View className="ml-3">
          <ParkingActionButton {...action} />
        </View>
      </View>
    );
  },
);

export type ParkingAreaListItemProps = ParkingAreaListItemContentProps & {
  onPress: () => void;
};

/** Reusable parking-area card (Searching.svg spec) for screens that have no outer gesture
 * wrapper of their own — Search results and the general nearby-parking list. Uses the
 * same shared GlassSurface primitive (variant="listCard") as every other glass surface
 * in the app, not a one-off tinted background. */
export const ParkingAreaListItem = memo(function ParkingAreaListItem({
  onPress,
  title,
  ...contentProps
}: ParkingAreaListItemProps) {
  return (
    <GlassSurface style={{ minHeight: 62 }} variant="listCard">
      <Pressable
        accessibilityLabel={`Open ${title}`}
        accessibilityRole="button"
        className="flex-1 justify-center px-4 active:opacity-80"
        onPress={onPress}
      >
        <ParkingAreaListItemContent title={title} {...contentProps} />
      </Pressable>
    </GlassSurface>
  );
});
