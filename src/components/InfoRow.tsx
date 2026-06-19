/**
 * InfoRow — a labelled data row used inside the parking detail card.
 *
 * Layout: [icon]  LABEL (uppercase, small, muted)
 *                 Value text (larger, wraps freely)
 */

import { Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

type Props = {
  icon: string;
  label: string;
  value: string;
};

export default function InfoRow({ icon, label, value }: Props) {
  return (
    <View className="flex-row items-start mb-4">
      {/* marginTop aligns the icon with the label cap-height */}
      <Ionicons name={icon as any} size={18} color="#6b7280" style={{ marginRight: 12, marginTop: 2 }} />
      <View className="flex-1">
        <Text className="text-[11px] text-gray-500 uppercase tracking-[0.8px] mb-0.5">
          {label}
        </Text>
        <Text className="text-[15px] text-gray-200 leading-[22px]">{value}</Text>
      </View>
    </View>
  );
}
