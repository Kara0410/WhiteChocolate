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
  { label: 'Distance', valueWidth: 112, descriptionWidth: 132 },
  { label: 'Capacity', valueWidth: 84, descriptionWidth: 116 },
  { label: 'Parking rules', valueWidth: 92, descriptionWidth: 104 },
] as const;

export const PREMIUM_DETAIL_PREVIEW_SECTIONS = [
  'Estimate explanation',
  'Data quality',
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
        'Create a free account to save parking locations and preferences.',
      actionLabel: 'Create free account',
      accessibilityLabel:
        'Parking features locked. Create a free account to save parking locations and preferences.',
      accessibilityHint: 'Opens the account creation sheet.',
    };
  }

  return {
    title: 'Unlock advanced parking insights',
    description:
      'Upgrade to Premium for additional estimate explanations and data-quality context.',
    actionLabel: 'Explore Premium',
    accessibilityLabel:
      'Advanced parking insights locked. Upgrade to Premium for additional estimate explanations and data-quality context.',
    accessibilityHint: 'Opens Premium membership options.',
  };
}

export function getPremiumGateRoute() {
  return '/billing' as const;
}
