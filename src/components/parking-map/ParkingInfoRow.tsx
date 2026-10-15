import { memo, type ReactNode } from 'react';
import { Text, View } from 'react-native';

export type ParkingInfoRowAccent =
  | 'green'
  | 'orange'
  | 'red'
  | 'blue'
  | 'purple'
  | 'slate';

export type ParkingInfoRowProps = {
  icon?: ReactNode;
  label: string;
  value: string;
  description?: string;
  accent?: ParkingInfoRowAccent;
};

const ACCENT_CLASSES: Record<
  ParkingInfoRowAccent,
  { background: string; foreground: string }
> = {
  green: { background: 'bg-status-available-soft', foreground: 'text-status-available' },
  orange: { background: 'bg-status-limited-soft', foreground: 'text-status-limited' },
  red: { background: 'bg-feedback-error-soft', foreground: 'text-feedback-error' },
  blue: { background: 'bg-accent-soft', foreground: 'text-accent-primary' },
  purple: { background: 'bg-accent-soft', foreground: 'text-accent-primary' },
  slate: { background: 'bg-background-default', foreground: 'text-ink-secondary' },
};

export const ParkingInfoRow = memo(function ParkingInfoRow({
  icon,
  label,
  value,
  description,
  accent = 'slate',
}: ParkingInfoRowProps) {
  const accentClasses = ACCENT_CLASSES[accent];

  return (
    <View className="flex-row items-center justify-between py-3">
      <View className="flex-1 flex-row items-center">
        <View
          className={`mr-3 h-10 w-10 items-center justify-center rounded-full ${accentClasses.background}`}
        >
          {icon ?? (
            <Text className={`text-[16px] font-bold ${accentClasses.foreground}`}>
              •
            </Text>
          )}
        </View>
        <View className="flex-1 pr-3">
          <Text className="text-[14px] font-semibold text-ink-primary">
            {label}
          </Text>
          {description ? (
            <Text className="mt-1 text-[12px] font-medium leading-[17px] text-ink-secondary">
              {description}
            </Text>
          ) : null}
        </View>
      </View>
      <Text className="text-right text-[14px] font-bold text-ink-secondary">
        {value}
      </Text>
    </View>
  );
});
