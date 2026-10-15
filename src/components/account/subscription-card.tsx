import { memo } from 'react';
import { Crown } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';

import { SubscriptionStatus } from '@/types/account';
import { COLORS } from '@/constants/theme';

type SubscriptionCardProps = {
  disabled?: boolean;
  loading?: boolean;
  status: SubscriptionStatus;
  onPress?: () => void;
};

function statusCopy(status: SubscriptionStatus) {
  switch (status) {
    case SubscriptionStatus.PREMIUM:
      return { title: 'Premium', subtitle: 'Premium entitlement active' };
    case SubscriptionStatus.LIFETIME:
      return { title: 'Lifetime', subtitle: 'Lifetime entitlement active' };
    case SubscriptionStatus.UNKNOWN:
      return {
        title: 'Membership unavailable',
        subtitle: 'Subscription status could not be confirmed',
      };
    case SubscriptionStatus.FREE:
      return {
        title: 'Free plan',
        subtitle: 'Premium is not configured in this build',
      };
  }
}

export const SubscriptionCard = memo(function SubscriptionCard({
  disabled = false,
  loading = false,
  status,
  onPress,
}: SubscriptionCardProps) {
  if (loading) {
    return (
      <View className="mb-3 rounded-3xl bg-surface-default p-5">
        <View className="h-5 w-28 rounded-full bg-surface-muted" />
        <View className="mt-3 h-4 w-52 max-w-[90%] rounded-full bg-background-default" />
        <View className="mt-5 h-12 rounded-2xl bg-surface-muted" />
      </View>
    );
  }

  const copy = statusCopy(status);
  const isFree = status === SubscriptionStatus.FREE;
  const isActionDisabled = disabled || !onPress;

  return (
    <View className="mb-3 rounded-3xl bg-surface-default p-5">
      <View className="flex-row items-center">
        <View className="h-10 w-10 items-center justify-center rounded-full bg-status-limited-soft">
          <Crown color={COLORS.feedback.warning} size={19} strokeWidth={2.3} />
        </View>
        <View className="ml-3 flex-1">
          <Text className="text-[15px] font-extrabold text-ink-primary">
            {copy.title}
          </Text>
          <Text className="mt-1 text-[13px] font-semibold leading-5 text-ink-secondary">
            {copy.subtitle}
          </Text>
        </View>
      </View>
      <Pressable
        accessibilityHint={
          isActionDisabled
            ? 'Premium purchasing is not configured'
            : 'Opens membership options'
        }
        accessibilityLabel={
          isActionDisabled
            ? 'Premium coming later'
            : isFree
              ? 'Explore Premium'
              : 'Manage membership'
        }
        accessibilityRole="button"
        accessibilityState={{ disabled: isActionDisabled }}
        className={`mt-4 min-h-12 items-center justify-center rounded-2xl px-4 ${
          isActionDisabled
            ? 'bg-surface-muted'
            : 'bg-accent-primary active:bg-accent-pressed'
        }`}
        disabled={isActionDisabled}
        onPress={onPress}
      >
        <Text
          className={`text-[14px] font-extrabold ${
            isActionDisabled ? 'text-ink-secondary' : 'text-ink-on-accent'
          }`}
        >
          {isActionDisabled
            ? 'Coming later'
            : isFree
              ? 'Explore Premium'
              : 'Manage membership'}
        </Text>
      </Pressable>
    </View>
  );
});
