import { memo, type ReactNode, useCallback } from 'react';
import { ChevronLeft } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type AccountPlaceholderScreenProps = {
  title: string;
  description: string;
  children?: ReactNode;
};

export const AccountPlaceholderScreen = memo(
  function AccountPlaceholderScreen({
    title,
    description,
    children,
  }: AccountPlaceholderScreenProps) {
    const insets = useSafeAreaInsets();
    const router = useRouter();

    const goBack = useCallback(() => {
      if (router.canGoBack()) {
        router.back();
        return;
      }

      router.replace('/account');
    }, [router]);

    return (
      <View className="flex-1 bg-slate-100">
        <ScrollView
          contentContainerStyle={{
            paddingBottom: Math.max(insets.bottom, 10) + 112,
            paddingHorizontal: 20,
            paddingTop: Math.max(insets.top, 12) + 12,
          }}
          contentInsetAdjustmentBehavior="automatic"
        >
          <Pressable
            accessibilityHint="Returns to the account page"
            accessibilityLabel="Back to account"
            accessibilityRole="button"
            className="mb-5 min-h-11 flex-row items-center self-start rounded-full bg-white px-3 active:bg-slate-200"
            hitSlop={8}
            onPress={goBack}
            style={{
              borderCurve: 'continuous',
              boxShadow: '0 3px 10px rgba(15,23,42,0.07)',
            }}
          >
            <ChevronLeft color="#334155" size={20} strokeWidth={2.6} />
            <Text className="mr-1 text-[14px] font-extrabold text-slate-700">
              Back
            </Text>
          </Pressable>

          <Text className="text-[30px] font-black tracking-[-0.8px] text-slate-950">
            {title}
          </Text>
          <Text className="mt-2 text-[14px] font-semibold leading-6 text-slate-500">
            {description}
          </Text>

          <View
            className="mt-6 rounded-[28px] border border-white/80 bg-white p-5"
            style={{
              borderCurve: 'continuous',
              boxShadow: '0 4px 12px rgba(15,23,42,0.06)',
            }}
          >
            {children ?? (
              <>
                <Text className="text-[15px] font-extrabold text-slate-900">
                  Foundation ready
                </Text>
                <Text className="mt-2 text-[13px] font-semibold leading-5 text-slate-500">
                  This route is connected. Its full workflow belongs to a later
                  implementation phase.
                </Text>
              </>
            )}
          </View>
        </ScrollView>
      </View>
    );
  },
);
