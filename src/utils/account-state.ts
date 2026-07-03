import {
  SubscriptionStatus,
  type AccountUser,
} from '@/types/account';

export function getCurrentAccountSnapshot(user: AccountUser | null) {
  const isSignedIn = user !== null;

  return {
    user,
    isAnonymous: !isSignedIn,
    isSignedIn,
    subscriptionStatus: SubscriptionStatus.FREE,
    displayName: user?.displayName ?? 'Munich driver',
    email: user?.email ?? null,
    avatar: user?.avatarUrl ?? null,
  };
}

