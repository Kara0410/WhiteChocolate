import { memo, type ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';

export type ParkingDetailSectionProps = {
  title: string;
  actionLabel?: string;
  onActionPress?: () => void;
  children: ReactNode;
};

export const ParkingDetailSection = memo(function ParkingDetailSection({
  title,
  actionLabel,
  onActionPress,
  children,
}: ParkingDetailSectionProps) {
  return (
    <View
      className="mb-4 rounded-[28px] border border-white/70 bg-white px-5 py-5 shadow-sm"
      style={{ borderCurve: 'continuous' }}
    >
      <View className="mb-4 flex-row items-center justify-between">
        <Text className="text-[15px] font-bold text-slate-950">{title}</Text>
        {actionLabel ? (
          <Pressable
            accessibilityRole="button"
            hitSlop={8}
            onPress={onActionPress}
          >
            <Text className="text-[13px] font-semibold text-blue-600">
              {actionLabel}
            </Text>
          </Pressable>
        ) : null}
      </View>
      {children}
    </View>
  );
});
