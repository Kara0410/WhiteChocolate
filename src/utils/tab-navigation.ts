import type { NavItemKey } from '@/components/BottomNavBar';
import type { MapOverlayMode } from '@/context/MapOverlayContext';

type ActiveNavItemOptions = {
  activeOverlay: MapOverlayMode;
  isAccountRoute: boolean;
};

export function getActiveNavItemKey({
  activeOverlay,
  isAccountRoute,
}: ActiveNavItemOptions): NavItemKey {
  if (isAccountRoute) {
    return 'profile';
  }

  if (activeOverlay === 'favorites') {
    return 'favorite';
  }

  return 'location';
}

export function createLocationFocusKey(
  sequence: number,
  timestamp = Date.now(),
) {
  return `navbar-location:${timestamp}:${sequence}`;
}
