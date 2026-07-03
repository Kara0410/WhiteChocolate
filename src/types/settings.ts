import type { LucideIcon } from 'lucide-react-native';

import type { BooleanPreferenceKey } from '@/types/preferences';

export type AccountRoute =
  | '/account/profile'
  | '/account/preferences'
  | '/account/notifications'
  | '/account/privacy'
  | '/account/help'
  | '/account/about'
  | '/account/licenses'
  | '/account/delete';

export type SettingItemType = 'action' | 'info' | 'navigation' | 'switch';

export type SettingAction =
  | 'continue-anonymously'
  | 'delete-account'
  | 'delete-local-data'
  | 'logout'
  | 'restore-purchases'
  | 'upgrade';

export type SettingGroup =
  | 'quick-actions'
  | 'preferences'
  | 'support'
  | 'legal'
  | 'danger';

export type SettingItem = {
  id: string;
  title: string;
  subtitle?: string;
  icon: LucideIcon;
  type: SettingItemType;
  action?: SettingAction;
  danger?: boolean;
  badge?: string;
  requiresLogin?: boolean;
  navigationTarget?: AccountRoute;
  switchKey?: BooleanPreferenceKey;
  group: SettingGroup;
  rightText?: string;
  disabled?: boolean;
  accessibilityHint?: string;
};
