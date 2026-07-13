import {
  BarChart3,
  Bell,
  BellRing,
  BookOpen,
  Bug,
  CircleHelp,
  Crown,
  FileText,
  Gauge,
  Heart,
  Languages,
  LogOut,
  MapPin,
  Moon,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Trash2,
  UserRound,
  Vibrate,
} from 'lucide-react-native';

import type { SettingItem } from '@/types/settings';

export const ANONYMOUS_QUICK_ACTIONS: SettingItem[] = [
  {
    id: 'anonymous-status',
    title: 'Continue without account',
    subtitle: 'Parking remains available without signing in.',
    icon: UserRound,
    type: 'info',
    action: 'continue-anonymously',
    group: 'quick-actions',
  },
  {
    id: 'account-benefits',
    title: 'Sign in to sync favorites',
    subtitle:
      'Email and password sign-in. Sync itself arrives in a later phase.',
    icon: Sparkles,
    type: 'navigation',
    navigationTarget: '/account/profile',
    group: 'quick-actions',
    accessibilityHint: 'Opens email and password sign-in',
  },
  {
    id: 'restore',
    title: 'Restore purchases',
    subtitle: 'Purchase restoration will be added with store billing.',
    icon: RotateCcw,
    type: 'action',
    action: 'restore-purchases',
    badge: 'Future',
    disabled: true,
    group: 'quick-actions',
  },
];

export const SIGNED_IN_QUICK_ACTIONS: SettingItem[] = [
  {
    id: 'edit-profile',
    title: 'Profile details',
    subtitle: 'View your signed-in email and session controls.',
    icon: UserRound,
    type: 'navigation',
    navigationTarget: '/account/profile',
    requiresLogin: true,
    group: 'quick-actions',
  },
  {
    id: 'membership',
    title: 'Membership',
    icon: Crown,
    type: 'action',
    action: 'upgrade',
    requiresLogin: true,
    group: 'quick-actions',
  },
  {
    id: 'restore',
    title: 'Restore purchases',
    icon: RotateCcw,
    type: 'action',
    action: 'restore-purchases',
    badge: 'Future',
    disabled: true,
    group: 'quick-actions',
  },
  {
    id: 'logout',
    title: 'Sign out',
    subtitle: 'Your favorites and preferences stay on this device.',
    icon: LogOut,
    type: 'action',
    action: 'logout',
    requiresLogin: true,
    group: 'quick-actions',
  },
];

export const PREFERENCE_SETTINGS: SettingItem[] = [
  {
    id: 'dark-mode',
    title: 'Dark mode',
    subtitle: 'Theme switching will be connected in a later phase.',
    icon: Moon,
    type: 'switch',
    switchKey: 'darkMode',
    badge: 'Future',
    disabled: true,
    group: 'preferences',
  },
  {
    id: 'notifications',
    title: 'Notifications',
    subtitle: 'Save whether notifications may be enabled later.',
    icon: Bell,
    type: 'switch',
    switchKey: 'notifications',
    group: 'preferences',
  },
  {
    id: 'parking-reminders',
    title: 'Parking reminders',
    subtitle: 'Remember the preferred reminder setting.',
    icon: BellRing,
    type: 'switch',
    switchKey: 'parkingReminders',
    group: 'preferences',
  },
  {
    id: 'haptics',
    title: 'Haptic feedback',
    subtitle: 'Remember whether tactile feedback is preferred.',
    icon: Vibrate,
    type: 'switch',
    switchKey: 'hapticFeedback',
    group: 'preferences',
  },
  {
    id: 'analytics',
    title: 'Product analytics',
    subtitle: 'Consent preference only; no analytics SDK is installed.',
    icon: BarChart3,
    type: 'switch',
    switchKey: 'analytics',
    group: 'preferences',
  },
  {
    id: 'crash-reporting',
    title: 'Crash reporting',
    subtitle: 'Consent preference only; no crash SDK is installed.',
    icon: Bug,
    type: 'switch',
    switchKey: 'crashReporting',
    group: 'preferences',
  },
  {
    id: 'language',
    title: 'Language',
    subtitle: 'Localization is not configured yet.',
    icon: Languages,
    type: 'navigation',
    navigationTarget: '/account/preferences',
    rightText: 'System',
    group: 'preferences',
  },
  {
    id: 'units',
    title: 'Units',
    subtitle: 'Choose how distances and measurements are shown later.',
    icon: Gauge,
    type: 'navigation',
    navigationTarget: '/account/preferences',
    rightText: 'Metric',
    group: 'preferences',
  },
];

export const SUPPORT_SETTINGS: SettingItem[] = [
  {
    id: 'help',
    title: 'Help & support',
    subtitle: 'Support contact is not configured in this development build.',
    icon: CircleHelp,
    type: 'navigation',
    navigationTarget: '/account/help',
    group: 'support',
  },
  {
    id: 'notification-settings',
    title: 'Notification settings',
    subtitle: 'Detailed notification controls are prepared for later.',
    icon: BellRing,
    type: 'navigation',
    navigationTarget: '/account/notifications',
    group: 'support',
  },
];

export const LEGAL_SETTINGS: SettingItem[] = [
  {
    id: 'privacy',
    title: 'Privacy & data',
    subtitle: 'Privacy policy URL is not configured in this development build.',
    icon: ShieldCheck,
    type: 'navigation',
    navigationTarget: '/account/privacy',
    group: 'legal',
  },
  {
    id: 'about',
    title: 'About',
    subtitle: 'App version and product information.',
    icon: FileText,
    type: 'navigation',
    navigationTarget: '/account/about',
    group: 'legal',
  },
  {
    id: 'licenses',
    title: 'Open-source licenses',
    subtitle: 'Third-party acknowledgements will be added later.',
    icon: BookOpen,
    type: 'navigation',
    navigationTarget: '/account/licenses',
    group: 'legal',
  },
];

function countLabel(count: number, singular: string, plural: string) {
  return `${count.toLocaleString()} ${count === 1 ? singular : plural}`;
}

export function getAppDataSettings({
  favoriteCount,
  locationDescription,
  locationLabel,
  locationLoading,
}: {
  favoriteCount: number;
  locationDescription: string;
  locationLabel: string;
  locationLoading: boolean;
}): SettingItem[] {
  return [
    {
      id: 'favorites',
      title: 'View favorites',
      subtitle: countLabel(favoriteCount, 'favorite spot', 'favorite spots'),
      icon: Heart,
      type: 'navigation',
      navigationTarget: '/favorites',
      rightText: favoriteCount.toLocaleString(),
      group: 'app-data',
      accessibilityLabel: `View favorites, ${countLabel(
        favoriteCount,
        'favorite spot',
        'favorite spots',
      )}`,
      accessibilityHint: 'Opens favorite parking spots on the map',
    },
    {
      id: 'location-permission',
      title: 'Location permission',
      subtitle: locationDescription,
      icon: MapPin,
      type: 'action',
      action: 'open-system-settings',
      rightText: locationLabel,
      group: 'app-data',
      disabled: locationLoading,
      accessibilityLabel: `Location permission, ${locationLabel}`,
      accessibilityHint:
        'Opens system Settings. Location is not requested from this page.',
    },
  ];
}

// "Delete account" must not appear until the backend deletion flow exists,
// even for signed-in users (docs/auth-foundation.md §7).
export function getDangerSettings(isSignedIn: boolean): SettingItem[] {
  return [
    {
      id: 'data-controls',
      title: 'Data controls',
      subtitle: isSignedIn
        ? 'Delete local device data. Account deletion is coming later.'
        : 'Delete favorites and preferences from this device.',
      icon: Trash2,
      type: 'navigation',
      navigationTarget: '/account/delete',
      requiresLogin: isSignedIn,
      group: 'danger',
    },
  ];
}
