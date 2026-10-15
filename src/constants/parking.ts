import { COLORS } from '@/constants/theme';

export const BADGE_COLORS: Record<string, string> = {
  Bewohnerparken: COLORS.zone.resident,
  Kurzzeitparken: COLORS.zone.shortTerm,
  Mischparken: COLORS.zone.mixed,
  'E-Parken': COLORS.zone.electric,
  Behindertenparken: COLORS.zone.accessible,
  'Absolutes Halteverbot': COLORS.zone.restricted,
};
