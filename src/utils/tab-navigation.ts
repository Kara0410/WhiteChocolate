import type { NavItemKey } from '@/components/BottomNavBar';
import type {
  FocusedMapSurface,
  MapOverlayMode,
} from '@/context/MapOverlayContext';

type ActiveNavItemOptions = {
  activeOverlay: MapOverlayMode;
  isAccountRoute: boolean;
};

type BottomNavVisibilityOptions = ActiveNavItemOptions & {
  focusedMapSurface: FocusedMapSurface;
  isMapRoute: boolean;
};

export function isAccountPathname(pathname: string) {
  return pathname.endsWith('/account') || pathname.includes('/account/');
}

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

export function shouldShowBottomNav({
  activeOverlay,
  focusedMapSurface,
  isAccountRoute,
  isMapRoute,
}: BottomNavVisibilityOptions) {
  if (isAccountRoute || !isMapRoute) {
    return false;
  }

  return activeOverlay === 'none' && focusedMapSurface === 'none';
}

export function createLocationFocusKey(
  sequence: number,
  timestamp = Date.now(),
) {
  return `navbar-location:${timestamp}:${sequence}`;
}
