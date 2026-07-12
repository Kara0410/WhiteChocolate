import type { AccountAccessTier } from '@/utils/account-tier';

export type ParkingDetailGateKind = 'free-details' | 'premium-details';

export type ParkingDetailGateCopy = {
  title: string;
  description: string;
  actionLabel: string;
  accessibilityLabel: string;
  accessibilityHint: string;
};

export const FREE_DETAIL_PREVIEW_CARDS = [
  { label: 'Pricing', valueWidth: 96, descriptionWidth: 128 },
  { label: 'Max Stay', valueWidth: 84, descriptionWidth: 116 },
  { label: 'Distance', valueWidth: 112, descriptionWidth: 132 },
  { label: 'Open Hours', valueWidth: 92, descriptionWidth: 104 },
] as const;

export const PREMIUM_DETAIL_PREVIEW_SECTIONS = [
  'Historical Usage',
  'Parking insights',
] as const;

export function getParkingDetailAccess(tier: AccountAccessTier) {
  const hasFreeDetailsAccess = tier !== 'guest';
  const hasPremiumDetailsAccess = tier === 'premium';

  return {
    hasFreeDetailsAccess,
    hasPremiumDetailsAccess,
  };
}

export function getParkingDetailGateCopy(
  kind: ParkingDetailGateKind,
): ParkingDetailGateCopy {
  if (kind === 'free-details') {
    return {
      title: 'Unlock parking details',
      description:
        'Create a free account to see pricing, parking limits, distance, and opening hours.',
      actionLabel: 'Create free account',
      accessibilityLabel:
        'Parking details locked. Create a free account to see pricing, parking limits, distance, and opening hours.',
      accessibilityHint: 'Opens the account creation sheet.',
    };
  }

  return {
    title: 'Unlock advanced parking insights',
    description:
      'Upgrade to Premium to see usage trends, EV information, restrictions, security details, and more.',
    actionLabel: 'Explore Premium',
    accessibilityLabel:
      'Advanced parking insights locked. Upgrade to Premium to see usage trends and additional parking details.',
    accessibilityHint: 'Opens Premium membership options.',
  };
}

export function getPremiumGateRoute() {
  return '/billing' as const;
}
