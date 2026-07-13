import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  type ComponentRef,
} from 'react';
import BottomSheet, {
  BottomSheetBackdrop,
  BottomSheetScrollView,
  useBottomSheetSpringConfigs,
  type BottomSheetBackdropProps,
} from '@gorhom/bottom-sheet';
import {
  Heart,
  Info,
  Lock,
  User,
  X,
  type LucideIcon,
} from 'lucide-react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type CreateAccountSheetProps = {
  isVisible: boolean;
  onClose: () => void;
  onCreateAccount: () => void;
};

type BenefitRowProps = {
  icon: LucideIcon;
  title: string;
  subtitle: string;
  showDivider?: boolean;
};

function BenefitRow({
  icon: Icon,
  showDivider = true,
  subtitle,
  title,
}: BenefitRowProps) {
  return (
    <View
      className={`flex-row gap-4 py-4 ${
        showDivider ? 'border-b border-slate-200' : ''
      }`}
    >
      <View className="h-14 w-14 items-center justify-center rounded-2xl bg-blue-50">
        <Icon color="#2563EB" size={28} strokeWidth={2.4} />
      </View>
      <View className="flex-1 justify-center">
        <Text className="text-[17px] font-extrabold text-slate-950">
          {title}
        </Text>
        <Text className="mt-1 text-[14px] font-semibold leading-5 text-slate-500">
          {subtitle}
        </Text>
      </View>
    </View>
  );
}

export function CreateAccountSheet({
  isVisible,
  onClose,
  onCreateAccount,
}: CreateAccountSheetProps) {
  const sheetRef = useRef<ComponentRef<typeof BottomSheet>>(null);
  const insets = useSafeAreaInsets();
  const snapPoints = useMemo(() => ['88%'], []);
  const animationConfigs = useBottomSheetSpringConfigs({
    damping: 30,
    mass: 0.9,
    overshootClamping: false,
    stiffness: 280,
  });

  useEffect(() => {
    if (isVisible) {
      sheetRef.current?.snapToIndex(0);
      return;
    }

    sheetRef.current?.close();
  }, [isVisible]);

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop
        {...props}
        appearsOnIndex={0}
        disappearsOnIndex={-1}
        opacity={0.36}
        pressBehavior="close"
      />
    ),
    [],
  );

  return (
    <BottomSheet
      ref={sheetRef}
      animationConfigs={animationConfigs}
      backdropComponent={renderBackdrop}
      backgroundStyle={styles.background}
      enableDynamicSizing={false}
      enablePanDownToClose
      handleIndicatorStyle={styles.handleIndicator}
      handleStyle={styles.handle}
      index={-1}
      onClose={onClose}
      snapPoints={snapPoints}
      style={styles.sheet}
    >
      <BottomSheetScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: Math.max(insets.bottom, 16) + 20 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View className="flex-row items-start justify-between">
          <View className="h-20 w-20 items-center justify-center rounded-[28px] bg-blue-50">
            <User color="#2563EB" size={39} strokeWidth={2.4} />
          </View>
          <Pressable
            accessibilityLabel="Close create account prompt"
            accessibilityRole="button"
            className="h-11 w-11 items-center justify-center rounded-full bg-slate-100 active:bg-slate-200"
            hitSlop={8}
            onPress={onClose}
          >
            <X color="#475569" size={20} strokeWidth={2.5} />
          </Pressable>
        </View>

        <Text className="mt-8 text-[36px] font-black leading-[40px] text-slate-950">
          Create a free account
        </Text>
        <Text className="mt-4 text-[17px] font-semibold leading-7 text-slate-500">
          Create an account to save favorites and keep parking preferences
          ready for future sync.
        </Text>

        <View className="mt-6">
          <BenefitRow
            icon={Heart}
            subtitle="Keep your best parking areas in one place."
            title="Save your favorites"
          />
          <BenefitRow
            icon={Info}
            showDivider={false}
            subtitle="Get details like prices, regulations, and availability where available."
            title="See more parking info"
          />
        </View>

        <Pressable
          accessibilityLabel="Create an account"
          accessibilityRole="button"
          className="mt-6 min-h-14 items-center justify-center rounded-2xl bg-blue-600 px-5 active:bg-blue-700"
          onPress={onCreateAccount}
          style={{ borderCurve: 'continuous' }}
        >
          <Text className="text-[16px] font-extrabold text-white">
            Create an account
          </Text>
        </Pressable>

        <Pressable
          accessibilityLabel="Continue as guest"
          accessibilityRole="button"
          className="mt-3 min-h-14 items-center justify-center rounded-2xl bg-slate-100 px-5 active:bg-slate-200"
          onPress={onClose}
          style={{ borderCurve: 'continuous' }}
        >
          <Text className="text-[16px] font-extrabold text-slate-900">
            Continue as guest
          </Text>
        </Pressable>

        <View className="mt-6 flex-row gap-3">
          <Lock color="#94A3B8" size={22} strokeWidth={2.4} />
          <Text className="flex-1 text-[13px] font-semibold leading-5 text-slate-500">
            Use your email and password to sign in securely.
          </Text>
        </View>
      </BottomSheetScrollView>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  background: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 34,
    borderTopRightRadius: 34,
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 6,
  },
  handle: {
    paddingBottom: 8,
    paddingTop: 12,
  },
  handleIndicator: {
    backgroundColor: 'rgba(15,23,42,0.18)',
    borderRadius: 999,
    height: 5,
    width: 44,
  },
  sheet: {
    elevation: 80,
    zIndex: 80,
  },
});
