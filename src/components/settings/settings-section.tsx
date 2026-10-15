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
        <Text className="text-[12px] font-extrabold uppercase tracking-[0.8px] text-ink-secondary">
          {title}
        </Text>
        {subtitle ? (
          <Text className="mt-1 text-[12px] font-semibold leading-4 text-ink-muted">
            {subtitle}
          </Text>
        ) : null}
      </View>
      <View
        className="overflow-hidden rounded-card border border-border-glass bg-surface-default shadow-card"
        style={{ borderCurve: 'continuous' }}
      >
        {children}
      </View>
    </View>
  );
});
