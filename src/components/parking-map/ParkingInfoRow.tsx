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
  green: { background: 'bg-emerald-100', foreground: 'text-emerald-700' },
  orange: { background: 'bg-orange-100', foreground: 'text-orange-700' },
  red: { background: 'bg-red-100', foreground: 'text-red-700' },
  blue: { background: 'bg-blue-100', foreground: 'text-blue-700' },
  purple: { background: 'bg-purple-100', foreground: 'text-purple-700' },
  slate: { background: 'bg-slate-100', foreground: 'text-slate-700' },
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
          <Text className="text-[14px] font-semibold text-slate-950">
            {label}
          </Text>
          {description ? (
            <Text className="mt-1 text-[12px] font-medium leading-[17px] text-slate-500">
              {description}
            </Text>
          ) : null}
        </View>
      </View>
      <Text className="text-right text-[14px] font-bold text-slate-700">
        {value}
      </Text>
    </View>
  );
});
