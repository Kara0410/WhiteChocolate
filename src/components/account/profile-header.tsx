import { memo } from 'react';
import { Image, Text, View } from 'react-native';

import { SubscriptionStatus } from '@/types/account';

type ProfileHeaderProps = {
  avatar: string | null;
  displayName: string;
  email: string | null;
  isAnonymous: boolean;
  subscriptionStatus: SubscriptionStatus;
};

function subscriptionLabel(status: SubscriptionStatus) {
  switch (status) {
    case SubscriptionStatus.PREMIUM:
      return 'Premium member';
    case SubscriptionStatus.LIFETIME:
      return 'Lifetime member';
    case SubscriptionStatus.UNKNOWN:
      return 'Membership unavailable';
    case SubscriptionStatus.FREE:
      return 'Free plan';
  }
}

export const ProfileHeader = memo(function ProfileHeader({
  avatar,
  displayName,
  email,
  isAnonymous,
  subscriptionStatus,
}: ProfileHeaderProps) {
  const initial = displayName.trim().charAt(0).toUpperCase() || 'M';

  return (
    <View
      accessibilityLabel={
        isAnonymous
          ? `${displayName}, using without an account`
          : `${displayName}, ${email ?? 'signed in'}`
      }
      className="mb-6 flex-row items-center rounded-card border border-border-glass bg-surface-default px-5 py-5 shadow-card"
      style={{ borderCurve: 'continuous' }}
    >
      <View className="h-14 w-14 items-center justify-center rounded-2xl bg-accent-primary">
        {avatar ? (
          <Image
            accessibilityLabel={`${displayName} profile image`}
            className="h-14 w-14 rounded-2xl"
            source={{ uri: avatar }}
          />
        ) : (
          <Text className="text-[24px] font-black text-ink-on-accent">
            {initial}
          </Text>
        )}
      </View>
      <View className="ml-4 min-w-0 flex-1">
        <Text
          className="text-[18px] font-bold text-ink-primary"
          numberOfLines={1}
        >
          {displayName}
        </Text>
        <Text
          className="mt-1 text-[13px] font-semibold text-ink-secondary"
          numberOfLines={1}
        >
          {isAnonymous ? 'Using without an account' : email}
        </Text>
        <Text className="mt-1 text-[12px] font-bold text-accent-primary">
          {subscriptionLabel(subscriptionStatus)}
        </Text>
      </View>
    </View>
  );
});
