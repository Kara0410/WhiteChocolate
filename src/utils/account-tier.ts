import { SubscriptionStatus } from '@/types/account';

export type AccountAccessTier = 'guest' | 'free' | 'premium';

export function getAccountAccessTier({
  isSignedIn,
  subscriptionStatus,
}: {
  isSignedIn: boolean;
  subscriptionStatus: SubscriptionStatus;
}): AccountAccessTier {
  if (!isSignedIn) {
    return 'guest';
  }

  return subscriptionStatus === SubscriptionStatus.PREMIUM ||
    subscriptionStatus === SubscriptionStatus.LIFETIME
    ? 'premium'
    : 'free';
}
