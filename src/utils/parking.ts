import { BADGE_COLORS } from '@/constants/parking';
import { COLORS } from '@/constants/theme';

export function getBadgeColor(groupName: string) {
  for (const key of Object.keys(BADGE_COLORS)) {
    if (groupName.startsWith(key)) {
      return BADGE_COLORS[key];
    }
  }

  return COLORS.status.unknown;
}
