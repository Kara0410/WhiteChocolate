import { BADGE_COLORS } from '@/constants/parking';

export function getBadgeColor(groupName: string) {
  for (const key of Object.keys(BADGE_COLORS)) {
    if (groupName.startsWith(key)) {
      return BADGE_COLORS[key];
    }
  }

  return '#6b7280';
}
