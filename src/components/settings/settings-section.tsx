import { memo, type ReactNode } from 'react';
import { Text, View } from 'react-native';

type SettingsSectionProps = {
  title: string;
  subtitle?: string;
  children: ReactNode;
};

export const SettingsSection = memo(function SettingsSection({
  title,
  subtitle,
  children,
}: SettingsSectionProps) {
  return (
    <View className="mb-6">
      <View className="mb-2 px-1">
        <Text className="text-[12px] font-extrabold uppercase tracking-[0.8px] text-slate-500">
          {title}
        </Text>
        {subtitle ? (
          <Text className="mt-1 text-[12px] font-semibold leading-4 text-slate-400">
            {subtitle}
          </Text>
        ) : null}
      </View>
      <View
        className="overflow-hidden rounded-[28px] border border-white/80 bg-white"
        style={{
          borderCurve: 'continuous',
          boxShadow: '0 4px 12px rgba(15,23,42,0.06)',
        }}
      >
        {children}
      </View>
    </View>
  );
});
