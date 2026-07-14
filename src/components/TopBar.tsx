import { Text, View } from 'react-native';
import type { ReactNode } from 'react';

type Props = {
  title: string;
  subtitle: string;
  action?: ReactNode;
};

export default function TopBar({ title, subtitle, action }: Props) {
  return (
    <View className="mb-3.5 flex-row items-center justify-between gap-3">
      <View className="flex-1">
        <Text className="mb-1 text-[12px] font-extrabold uppercase tracking-overline text-warm-accent-text">
          {subtitle}
        </Text>
        <Text className="font-display text-[27px] font-bold leading-[30px] tracking-[-0.6px] text-warm-text">
          {title}
        </Text>
      </View>
      {action}
    </View>
  );
}
