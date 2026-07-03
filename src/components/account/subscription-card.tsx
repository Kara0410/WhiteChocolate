import { memo } from 'react';
import { Crown } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';

import { SubscriptionStatus } from '@/types/account';

type SubscriptionCardProps = {
  loading?: boolean;
  status: SubscriptionStatus;
  onPress: () => void;
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
        subtitle: 'Premium integration is prepared for a later phase',
      };
  }
}

export const SubscriptionCard = memo(function SubscriptionCard({
  loading = false,
  status,
  onPress,
}: SubscriptionCardProps) {
  if (loading) {
    return (
      <View className="mb-3 rounded-3xl bg-white p-5">
        <View className="h-5 w-28 rounded-full bg-slate-200" />
        <View className="mt-3 h-4 w-52 max-w-[90%] rounded-full bg-slate-100" />
        <View className="mt-5 h-12 rounded-2xl bg-slate-200" />
      </View>
    );
  }

  const copy = statusCopy(status);
  const isFree = status === SubscriptionStatus.FREE;

  return (
    <View className="mb-3 rounded-3xl bg-white p-5">
      <View className="flex-row items-center">
        <View className="h-10 w-10 items-center justify-center rounded-full bg-amber-50">
          <Crown color="#D97706" size={19} strokeWidth={2.3} />
        </View>
        <View className="ml-3 flex-1">
          <Text className="text-[15px] font-extrabold text-slate-900">
            {copy.title}
          </Text>
          <Text className="mt-1 text-[13px] font-semibold leading-5 text-slate-500">
            {copy.subtitle}
          </Text>
        </View>
      </View>
      <Pressable
        accessibilityHint="Opens the existing premium information page"
        accessibilityLabel={
          isFree ? 'Explore Premium' : 'Manage membership'
        }
        accessibilityRole="button"
        className="mt-4 min-h-12 items-center justify-center rounded-2xl bg-slate-950 px-4 active:bg-slate-800"
        onPress={onPress}
      >
        <Text className="text-[14px] font-extrabold text-white">
          {isFree ? 'Explore Premium' : 'Manage membership'}
        </Text>
      </Pressable>
    </View>
  );
});
