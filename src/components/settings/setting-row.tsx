import { memo, useCallback } from 'react';
import {
  ActivityIndicator,
  Pressable,
  Switch,
  Text,
  View,
} from 'react-native';
import { ChevronRight, type LucideIcon } from 'lucide-react-native';
import { COLORS } from '@/constants/theme';

export type SettingRowProps = {
  icon: LucideIcon;
  title: string;
  subtitle?: string;
  badge?: string;
  rightText?: string;
  showChevron?: boolean;
  switchValue?: boolean;
  onSwitchValueChange?: (value: boolean) => void;
  loading?: boolean;
  disabled?: boolean;
  danger?: boolean;
  onPress?: () => void;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  showDivider?: boolean;
};

export const SettingRow = memo(function SettingRow({
  icon: Icon,
  title,
  subtitle,
  badge,
  rightText,
  showChevron = false,
  switchValue,
  onSwitchValueChange,
  loading = false,
  disabled = false,
  danger = false,
  onPress,
  accessibilityLabel,
  accessibilityHint,
  showDivider = false,
}: SettingRowProps) {
  const hasSwitch = switchValue !== undefined && onSwitchValueChange;
  const isDisabled = disabled || loading;

  const handlePress = useCallback(() => {
    if (isDisabled) {
      return;
    }

    if (hasSwitch) {
      onSwitchValueChange(!switchValue);
      return;
    }

    onPress?.();
  }, [
    hasSwitch,
    isDisabled,
    onPress,
    onSwitchValueChange,
    switchValue,
  ]);

  if (loading) {
    return (
      <View
        accessibilityLabel={`${title} loading`}
        accessibilityRole="progressbar"
        className={`min-h-16 flex-row items-center px-4 py-3 ${
          showDivider ? 'border-b border-border-subtle' : ''
        }`}
      >
        <View className="h-10 w-10 rounded-2xl bg-surface-muted" />
        <View className="ml-3 flex-1">
          <View className="h-4 w-32 rounded-full bg-surface-muted" />
          <View className="mt-2 h-3 w-48 max-w-[80%] rounded-full bg-background-default" />
        </View>
        <ActivityIndicator color={COLORS.text.muted} size="small" />
      </View>
    );
  }

  return (
    <Pressable
      accessibilityHint={accessibilityHint}
      accessibilityLabel={accessibilityLabel ?? title}
      accessibilityRole={hasSwitch ? 'switch' : onPress ? 'button' : 'text'}
      accessibilityState={{
        checked: hasSwitch ? switchValue : undefined,
        disabled: isDisabled,
      }}
      className={`min-h-16 flex-row items-center px-4 py-3 ${
        showDivider ? 'border-b border-border-subtle' : ''
      } ${isDisabled ? 'opacity-50' : 'active:bg-surface-input'}`}
      disabled={isDisabled}
      onPress={handlePress}
    >
      <View
        className={`h-10 w-10 items-center justify-center rounded-2xl ${
          danger ? 'bg-feedback-error-soft' : 'bg-background-default'
        }`}
      >
        <Icon
          color={danger ? COLORS.feedback.error : COLORS.icon.default}
          size={19}
          strokeWidth={2.3}
        />
      </View>

      <View className="ml-3 min-w-0 flex-1">
        <View className="flex-row items-center">
          <Text
            className={`flex-shrink text-[15px] font-extrabold ${
              danger ? 'text-feedback-error' : 'text-ink-primary'
            }`}
          >
            {title}
          </Text>
          {badge ? (
            <View className="ml-2 rounded-full bg-accent-soft px-2 py-1">
              <Text className="text-[10px] font-extrabold uppercase tracking-[0.5px] text-accent-primary">
                {badge}
              </Text>
            </View>
          ) : null}
        </View>
        {subtitle ? (
          <Text className="mt-1 text-[13px] font-semibold leading-5 text-ink-secondary">
            {subtitle}
          </Text>
        ) : null}
      </View>

      {rightText ? (
        <Text className="ml-3 text-[13px] font-bold text-ink-secondary">
          {rightText}
        </Text>
      ) : null}

      {hasSwitch ? (
        <Switch
          accessible={false}
          className="ml-3"
          pointerEvents="none"
          trackColor={{ false: COLORS.border.strong, true: COLORS.accent.soft }}
          thumbColor={switchValue ? COLORS.accent.primary : COLORS.surface.input}
          value={switchValue}
        />
      ) : showChevron ? (
        <ChevronRight
          color={COLORS.text.muted}
          size={19}
          strokeWidth={2.4}
          style={{ marginLeft: 10 }}
        />
      ) : null}
    </Pressable>
  );
});
