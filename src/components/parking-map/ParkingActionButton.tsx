import { memo } from 'react';
import type { LucideIcon } from 'lucide-react-native';
import { Pressable } from 'react-native';

import { COLORS } from '@/constants/theme';

export type ParkingActionButtonProps = {
  icon: LucideIcon;
  accessibilityLabel: string;
  onPress: () => void;
  /** Fills the icon instead of outlining it — used by Favorites' heart. */
  active?: boolean;
  /** Searching.svg reference diameter: 31. */
  size?: number;
};

export const ParkingActionButton = memo(function ParkingActionButton({
  icon: Icon,
  accessibilityLabel,
  onPress,
  active = false,
  size = 31,
}: ParkingActionButtonProps) {
  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      className="items-center justify-center rounded-full bg-accent-soft active:opacity-80"
      hitSlop={6}
      onPress={onPress}
      style={{ height: size, width: size }}
    >
      <Icon
        color={COLORS.accent.primary}
        fill={active ? COLORS.accent.primary : 'transparent'}
        size={Math.round(size * 0.55)}
        strokeWidth={2.3}
      />
    </Pressable>
  );
});
