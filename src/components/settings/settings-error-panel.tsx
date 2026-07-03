import { memo } from 'react';
import { AlertCircle } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';

type SettingsErrorPanelProps = {
  message: string;
  onRetry?: () => void;
};

export const SettingsErrorPanel = memo(function SettingsErrorPanel({
  message,
  onRetry,
}: SettingsErrorPanelProps) {
  return (
    <View
      accessibilityRole="alert"
      className="mb-5 flex-row items-center rounded-2xl border border-red-200 bg-red-50 px-4 py-3"
    >
      <AlertCircle color="#DC2626" size={19} strokeWidth={2.3} />
      <Text className="ml-3 flex-1 text-[13px] font-semibold leading-5 text-red-800">
        {message}
      </Text>
      {onRetry ? (
        <Pressable
          accessibilityHint="Attempts to load this information again"
          accessibilityLabel="Retry"
          accessibilityRole="button"
          className="ml-3 min-h-11 justify-center rounded-full bg-white px-3 active:bg-red-100"
          onPress={onRetry}
        >
          <Text className="text-[13px] font-extrabold text-red-700">
            Retry
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
});
