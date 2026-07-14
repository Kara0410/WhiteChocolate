import { Text, View } from 'react-native';

export function EmailSeparator({ label }: { label: string }) {
  return (
    <View className="mt-6 flex-row items-center gap-3">
      <View className="h-px flex-1 bg-slate-200" />
      <Text className="text-[12px] font-bold text-slate-400">{label}</Text>
      <View className="h-px flex-1 bg-slate-200" />
    </View>
  );
}
