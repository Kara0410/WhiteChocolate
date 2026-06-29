import {
  useCallback,
  useMemo,
  useRef,
  type ComponentRef,
} from 'react';
import BottomSheet, {
  BottomSheetScrollView,
  useBottomSheetSpringConfigs,
} from '@gorhom/bottom-sheet';
import { CreditCard, MapPin, ShieldCheck, X } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type YouBottomSheetProps = {
  onClose: () => void;
};

export function YouBottomSheet({ onClose }: YouBottomSheetProps) {
  const sheetRef = useRef<ComponentRef<typeof BottomSheet>>(null);
  const shouldOpenBillingRef = useRef(false);
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const snapPoints = useMemo(() => ['18%', '64%'], []);
  const animationConfigs = useBottomSheetSpringConfigs({
    damping: 30,
    mass: 0.9,
    overshootClamping: false,
    stiffness: 280,
  });

  const closeSheet = useCallback(() => {
    sheetRef.current?.close();
  }, []);

  const openBilling = useCallback(() => {
    shouldOpenBillingRef.current = true;
    sheetRef.current?.close();
  }, []);

  const handleSheetClose = useCallback(() => {
    const shouldOpenBilling = shouldOpenBillingRef.current;
    shouldOpenBillingRef.current = false;
    onClose();

    if (shouldOpenBilling) {
      router.push('/billing');
    }
  }, [onClose, router]);

  return (
    <BottomSheet
      ref={sheetRef}
      animationConfigs={animationConfigs}
      backgroundStyle={styles.background}
      enableDynamicSizing={false}
      enableOverDrag={false}
      enablePanDownToClose
      handleIndicatorStyle={styles.handleIndicator}
      handleStyle={styles.handle}
      index={1}
      onClose={handleSheetClose}
      overDragResistanceFactor={4}
      snapPoints={snapPoints}
      style={styles.sheet}
    >
      <BottomSheetScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: Math.max(insets.bottom, 10) + 108 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View className="mb-6 flex-row items-center justify-between">
          <View className="flex-1 pr-3">
            <Text className="text-[26px] font-extrabold text-slate-950">
              You
            </Text>
            <Text className="mt-1 text-[14px] font-semibold text-slate-500">
              Profile, privacy, and subscription
            </Text>
          </View>
          <Pressable
            accessibilityLabel="Close profile"
            accessibilityRole="button"
            className="h-11 w-11 items-center justify-center rounded-full bg-white active:bg-slate-100"
            hitSlop={8}
            onPress={closeSheet}
            style={styles.closeButton}
          >
            <X color="#475569" size={19} strokeWidth={2.5} />
          </Pressable>
        </View>

        <View className="mb-4 flex-row items-center rounded-[28px] bg-slate-950 px-5 py-5">
          <View className="h-14 w-14 items-center justify-center rounded-2xl bg-blue-500">
            <Text className="text-[24px] font-black text-white">M</Text>
          </View>
          <View className="ml-4 flex-1">
            <Text className="text-[18px] font-extrabold text-white">
              Munich driver
            </Text>
            <Text className="mt-1 text-[13px] font-semibold text-slate-400">
              Anonymous reporting enabled
            </Text>
          </View>
        </View>

        <View className="mb-4 rounded-[28px] bg-white px-5 py-2" style={styles.card}>
          <View className="flex-row items-center border-b border-slate-100 py-4">
            <View className="h-10 w-10 items-center justify-center rounded-full bg-emerald-50">
              <MapPin color="#059669" size={19} strokeWidth={2.3} />
            </View>
            <View className="ml-3 flex-1">
              <Text className="text-[15px] font-extrabold text-slate-900">
                Location permission
              </Text>
              <Text className="mt-1 text-[13px] font-semibold text-slate-500">
                Allowed
              </Text>
            </View>
          </View>
          <View className="flex-row items-center py-4">
            <View className="h-10 w-10 items-center justify-center rounded-full bg-blue-50">
              <ShieldCheck color="#2563EB" size={19} strokeWidth={2.3} />
            </View>
            <View className="ml-3 flex-1">
              <Text className="text-[15px] font-extrabold text-slate-900">
                Privacy
              </Text>
              <Text className="mt-1 text-[13px] font-semibold text-slate-500">
                Data and consent controls
              </Text>
            </View>
          </View>
        </View>

        <View className="rounded-[28px] bg-white p-5" style={styles.card}>
          <View className="flex-row items-center">
            <View className="h-10 w-10 items-center justify-center rounded-full bg-amber-50">
              <CreditCard color="#D97706" size={19} strokeWidth={2.3} />
            </View>
            <View className="ml-3 flex-1">
              <Text className="text-[15px] font-extrabold text-slate-900">
                Munich pilot
              </Text>
              <Text className="mt-1 text-[13px] font-semibold text-emerald-600">
                Active
              </Text>
            </View>
          </View>
          <Pressable
            accessibilityRole="button"
            className="mt-4 h-12 items-center justify-center rounded-2xl bg-slate-950 active:bg-slate-800"
            onPress={openBilling}
          >
            <Text className="text-[14px] font-extrabold text-white">
              Manage subscription
            </Text>
          </Pressable>
        </View>
      </BottomSheetScrollView>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  background: {
    backgroundColor: '#F3F5F8',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
  },
  card: {
    borderCurve: 'continuous',
    boxShadow: '0 10px 26px rgba(15,23,42,0.07)',
  },
  closeButton: {
    borderCurve: 'continuous',
    boxShadow: '0 8px 20px rgba(15,23,42,0.08)',
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 4,
  },
  handle: {
    paddingBottom: 10,
    paddingTop: 12,
  },
  handleIndicator: {
    backgroundColor: 'rgba(0,0,0,0.16)',
    borderRadius: 999,
    height: 5,
    width: 42,
  },
  sheet: {
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    boxShadow: '0 -8px 24px rgba(0,0,0,0.12)',
    elevation: 14,
  },
});
