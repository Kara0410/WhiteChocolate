import { Text, View } from 'react-native';

export function EmailSeparator({ label }: { label: string }) {
  return (
    <View className="mt-6 flex-row items-center gap-3">
      <View className="h-px flex-1 bg-surface-muted" />
      <Text className="text-[12px] font-bold text-ink-muted">{label}</Text>
      <View className="h-px flex-1 bg-surface-muted" />
    </View>
  );
}
