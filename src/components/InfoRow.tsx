/**
 * InfoRow — a labelled data row used inside the parking detail card.
 *
 * Layout: [icon]  LABEL (uppercase, small, muted)
 *                 Value text (larger, wraps freely)
 */

import { Text, View } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';

import { COLORS } from '@/constants/theme';

type Props = {
  icon: LucideIcon;
  label: string;
  value: string;
};

export default function InfoRow({ icon, label, value }: Props) {
  const Icon = icon;

  return (
    <View className="flex-row items-start mb-4">
      {/* marginTop aligns the icon with the label cap-height */}
      <Icon color={COLORS.icon.muted} size={18} strokeWidth={2.2} style={{ marginRight: 12, marginTop: 2 }} />
      <View className="flex-1">
        <Text className="text-[11px] text-ink-secondary uppercase tracking-[0.8px] mb-0.5">
          {label}
        </Text>
        <Text className="text-[15px] text-ink-muted leading-[22px]">{value}</Text>
      </View>
    </View>
  );
}
