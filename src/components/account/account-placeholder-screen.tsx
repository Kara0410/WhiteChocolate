import { memo, type ReactNode, useCallback } from 'react';
import { ChevronLeft } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '@/constants/theme';

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
      <View className="flex-1 bg-background-default">
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
            className="mb-5 min-h-11 flex-row items-center self-start rounded-full bg-surface-default px-3 shadow-floating active:bg-surface-muted"
            hitSlop={8}
            onPress={goBack}
            style={{ borderCurve: 'continuous' }}
          >
            <ChevronLeft color={COLORS.icon.default} size={20} strokeWidth={2.6} />
            <Text className="mr-1 text-[14px] font-extrabold text-ink-secondary">
              Back
            </Text>
          </Pressable>

          <Text className="text-[30px] font-black tracking-[-0.8px] text-ink-primary">
            {title}
          </Text>
          <Text className="mt-2 text-[14px] font-semibold leading-6 text-ink-secondary">
            {description}
          </Text>

          <View
            className="mt-6 rounded-card border border-border-glass bg-surface-default p-5 shadow-card"
            style={{ borderCurve: 'continuous' }}
          >
            {children ?? (
              <>
                <Text className="text-[15px] font-extrabold text-ink-primary">
                  Foundation ready
                </Text>
                <Text className="mt-2 text-[13px] font-semibold leading-5 text-ink-secondary">
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
