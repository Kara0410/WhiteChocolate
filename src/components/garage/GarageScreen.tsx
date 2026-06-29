import {
  memo,
  useCallback,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Pressable,
  Text,
  TextInput,
  View,
  type LayoutChangeEvent,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  CarFront,
  Check,
  ChevronLeft,
  Plus,
  Trash2,
  X,
} from 'lucide-react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  FadeInDown,
  FadeOutUp,
  LinearTransition,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useVehicles } from '@/context/VehicleContext';
import type {
  Vehicle,
  VehicleFieldErrors,
} from '@/types/vehicle';

const DELETE_ACTION_WIDTH = 82;
const REVEAL_THRESHOLD = 44;
const FULL_DELETE_DISTANCE = 138;
const ROW_GAP = 12;

function Field({
  error,
  label,
  children,
}: {
  error?: string;
  label: string;
  children: ReactNode;
}) {
  return (
    <View>
      <Text className="mb-2 text-[13px] font-extrabold uppercase tracking-[0.7px] text-slate-500">
        {label}
      </Text>
      {children}
      {error ? (
        <Text className="mt-2 text-[13px] font-semibold text-red-600">
          {error}
        </Text>
      ) : null}
    </View>
  );
}

const VehicleCard = memo(function VehicleCard({
  index,
  isActive,
  isAnyRowOpen,
  isOpen,
  onCloseOpenRow,
  onDelete,
  onOpenRow,
  onPress,
  vehicle,
}: {
  index: number;
  isActive: boolean;
  isAnyRowOpen: boolean;
  isOpen: boolean;
  onCloseOpenRow: () => void;
  onDelete: (vehicleId: string) => void;
  onOpenRow: (vehicleId: string) => void;
  onPress: (vehicleId: string) => void;
  vehicle: Vehicle;
}) {
  const translateX = useSharedValue(0);
  const startX = useSharedValue(0);
  const rowWidth = useSharedValue(0);
  const opacity = useSharedValue(1);
  const pressedScale = useSharedValue(1);
  const containerHeight = useSharedValue(0);
  const containerMargin = useSharedValue(ROW_GAP);
  const isDeleting = useSharedValue(false);
  const [hasMeasured, setHasMeasured] = useState(false);

  const handleLayout = useCallback(
    (event: LayoutChangeEvent) => {
      if (isDeleting.value) {
        return;
      }

      const { height, width } = event.nativeEvent.layout;
      rowWidth.value = width;
      containerHeight.value = height;
      setHasMeasured(true);
    },
    [containerHeight, isDeleting, rowWidth],
  );

  const finishDelete = useCallback(() => {
    onCloseOpenRow();
    onDelete(vehicle.id);
  }, [onCloseOpenRow, onDelete, vehicle.id]);

  const animateDelete = useCallback(() => {
    if (isDeleting.value) {
      return;
    }

    isDeleting.value = true;
    opacity.value = withTiming(0, { duration: 160 });
    pressedScale.value = withTiming(0.98, { duration: 120 });
    translateX.value = withTiming(
      -Math.max(rowWidth.value + DELETE_ACTION_WIDTH, FULL_DELETE_DISTANCE),
      { duration: 210 },
    );
    containerMargin.value = withTiming(0, { duration: 180 });
    containerHeight.value = withTiming(
      0,
      { duration: 210 },
      (finished) => {
        if (finished) {
          runOnJS(finishDelete)();
        }
      },
    );
  }, [
    containerHeight,
    containerMargin,
    finishDelete,
    isDeleting,
    opacity,
    pressedScale,
    rowWidth,
    translateX,
  ]);

  const closeRow = useCallback(() => {
    translateX.value = withSpring(0, {
      damping: 24,
      mass: 0.9,
      stiffness: 280,
    });
    onCloseOpenRow();
  }, [onCloseOpenRow, translateX]);

  const handlePress = useCallback(() => {
    if (isOpen || isAnyRowOpen) {
      closeRow();
      return;
    }

    onPress(vehicle.id);
  }, [closeRow, isAnyRowOpen, isOpen, onPress, vehicle.id]);

  const panGesture = useMemo(
    () =>
      Gesture.Pan()
        .activeOffsetX([-12, 12])
        .failOffsetY([-12, 12])
        .onBegin(() => {
          startX.value = translateX.value;
          runOnJS(onOpenRow)(vehicle.id);
        })
        .onUpdate((event) => {
          const rawX = Math.min(0, startX.value + event.translationX);
          const maxOpenDistance = -Math.min(rowWidth.value, 168);
          translateX.value =
            rawX < maxOpenDistance
              ? maxOpenDistance + (rawX - maxOpenDistance) * 0.28
              : rawX;
        })
        .onEnd(() => {
          const deleteThreshold = Math.min(
            FULL_DELETE_DISTANCE,
            Math.max(110, rowWidth.value * 0.5),
          );

          if (Math.abs(translateX.value) >= deleteThreshold) {
            runOnJS(animateDelete)();
            return;
          }

          if (Math.abs(translateX.value) >= REVEAL_THRESHOLD) {
            translateX.value = withSpring(-DELETE_ACTION_WIDTH, {
              damping: 26,
              mass: 0.9,
              stiffness: 280,
            });
            runOnJS(onOpenRow)(vehicle.id);
            return;
          }

          translateX.value = withSpring(0, {
            damping: 24,
            mass: 0.9,
            stiffness: 280,
          });
          runOnJS(onCloseOpenRow)();
        }),
    [
      animateDelete,
      onCloseOpenRow,
      onOpenRow,
      rowWidth,
      startX,
      translateX,
      vehicle.id,
    ],
  );

  const rowAnimatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [
      { translateX: translateX.value },
      { scale: pressedScale.value },
    ],
  }));
  const deleteAnimatedStyle = useAnimatedStyle(() => {
    const progress = Math.min(
      1,
      Math.abs(translateX.value) / REVEAL_THRESHOLD,
    );

    return {
      opacity: progress,
      transform: [{ scale: 0.92 + progress * 0.08 }],
    };
  });
  const containerAnimatedStyle = useAnimatedStyle(() => ({
    height: hasMeasured ? containerHeight.value : undefined,
    marginBottom: hasMeasured ? containerMargin.value : ROW_GAP,
  }));

  return (
    <Animated.View
      className="overflow-hidden rounded-[28px]"
      entering={FadeInDown.delay(Math.min(index * 35, 180))
        .duration(280)
        .springify()
        .damping(24)
        .stiffness(260)}
      exiting={FadeOutUp.duration(160)}
      layout={LinearTransition.springify().damping(26).stiffness(260)}
      onLayout={handleLayout}
      style={containerAnimatedStyle}
    >
      <Animated.View
        className="absolute bottom-0 right-0 top-0 w-[82px] items-center justify-center rounded-[28px] bg-red-600"
        style={deleteAnimatedStyle}
      >
        <Pressable
          accessibilityLabel={`Delete ${vehicle.nickname}`}
          accessibilityRole="button"
          className="h-full w-full items-center justify-center active:bg-red-700"
          onPress={animateDelete}
        >
          <Trash2 color="#FFFFFF" size={22} strokeWidth={2.4} />
        </Pressable>
      </Animated.View>

      <GestureDetector gesture={panGesture}>
        <Animated.View style={rowAnimatedStyle}>
          <Pressable
            accessibilityLabel={`Use ${vehicle.nickname}`}
            accessibilityRole="button"
            accessibilityState={{ selected: isActive }}
            className={`flex-row items-center rounded-[28px] border px-4 py-4 ${
              isActive
                ? 'border-blue-200 bg-blue-50'
                : 'border-white/80 bg-white'
            }`}
            onPress={handlePress}
            onPressIn={() => {
              pressedScale.value = withTiming(0.985, { duration: 90 });
            }}
            onPressOut={() => {
              pressedScale.value = withSpring(1, {
                damping: 18,
                stiffness: 260,
              });
            }}
            style={{
              borderCurve: 'continuous',
              boxShadow: '0 4px 12px rgba(15,23,42,0.07)',
            }}
          >
            <View
              className={`h-12 w-12 items-center justify-center rounded-2xl ${
                isActive ? 'bg-blue-600' : 'bg-slate-100'
              }`}
            >
              <CarFront
                color={isActive ? '#FFFFFF' : '#475569'}
                size={22}
                strokeWidth={2.3}
              />
            </View>
            <View className="ml-4 flex-1">
              <Text
                className="text-[16px] font-extrabold text-slate-950"
                numberOfLines={1}
              >
                {vehicle.nickname}
              </Text>
              <Text
                className="mt-1 text-[13px] font-bold tracking-[0.8px] text-slate-500"
                numberOfLines={1}
              >
                {vehicle.licensePlate}
              </Text>
            </View>
            {isActive ? (
              <View className="ml-3 flex-row items-center rounded-full bg-blue-600 px-3 py-2">
                <Check color="#FFFFFF" size={14} strokeWidth={3} />
                <Text className="ml-1 text-[11px] font-extrabold text-white">
                  Currently using
                </Text>
              </View>
            ) : null}
          </Pressable>
        </Animated.View>
      </GestureDetector>
    </Animated.View>
  );
});

export function GarageScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const {
    activeVehicleId,
    addVehicle,
    removeVehicle,
    setActiveVehicle,
    vehicles,
  } = useVehicles();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [nickname, setNickname] = useState('');
  const [licensePlate, setLicensePlate] = useState('');
  const [errors, setErrors] = useState<VehicleFieldErrors>({});
  const [openRowId, setOpenRowId] = useState<string | null>(null);

  const goBack = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
      return;
    }

    router.replace('/map');
  }, [router]);

  const resetForm = useCallback(() => {
    setNickname('');
    setLicensePlate('');
    setErrors({});
  }, []);

  const closeAddCar = useCallback(() => {
    Keyboard.dismiss();
    setIsAddOpen(false);
    resetForm();
  }, [resetForm]);

  const openAddCar = useCallback(() => {
    resetForm();
    setIsAddOpen(true);
  }, [resetForm]);

  const saveCar = useCallback(() => {
    const result = addVehicle({ nickname, licensePlate });

    if (!result.ok) {
      setErrors(result.errors);
      return;
    }

    closeAddCar();
  }, [addVehicle, closeAddCar, licensePlate, nickname]);

  const closeOpenRow = useCallback(() => {
    setOpenRowId(null);
  }, []);

  const handleDelete = useCallback(
    (vehicleId: string) => {
      setOpenRowId((current) => (current === vehicleId ? null : current));
      removeVehicle(vehicleId);
    },
    [removeVehicle],
  );

  const renderVehicle = useCallback(
    ({ item, index }: { item: Vehicle; index: number }) => (
      <VehicleCard
        index={index}
        isActive={item.id === activeVehicleId}
        isAnyRowOpen={openRowId !== null}
        isOpen={item.id === openRowId}
        onCloseOpenRow={closeOpenRow}
        onDelete={handleDelete}
        onOpenRow={setOpenRowId}
        onPress={setActiveVehicle}
        vehicle={item}
      />
    ),
    [
      activeVehicleId,
      closeOpenRow,
      handleDelete,
      openRowId,
      setActiveVehicle,
    ],
  );

  const vehicleCountLabel =
    vehicles.length === 1 ? '1 saved car' : `${vehicles.length} saved cars`;

  return (
    <View className="flex-1 bg-slate-100">
      <FlatList
        contentContainerStyle={{
          paddingBottom: Math.max(insets.bottom, 10) + 112,
          paddingHorizontal: 20,
          paddingTop: Math.max(insets.top, 12) + 12,
        }}
        contentInsetAdjustmentBehavior="automatic"
        data={vehicles}
        initialNumToRender={8}
        keyExtractor={(vehicle) => vehicle.id}
        keyboardDismissMode="on-drag"
        ListHeaderComponent={
          <View className="mb-6">
            <Pressable
              accessibilityLabel="Back to map"
              accessibilityRole="button"
              className="mb-5 h-11 flex-row items-center self-start rounded-full bg-white px-3 active:bg-slate-200"
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
            <View className="flex-row items-center justify-between">
              <View className="flex-1 pr-4">
                <Text className="text-[30px] font-black tracking-[-0.8px] text-slate-950">
                  My Garage
                </Text>
                <Text className="mt-1 text-[14px] font-semibold text-slate-500">
                  {vehicleCountLabel}
                </Text>
              </View>
              <Pressable
                accessibilityLabel="Add car"
                accessibilityRole="button"
                className="h-12 flex-row items-center rounded-full bg-blue-600 px-4 active:bg-blue-700"
                onPress={openAddCar}
                style={{
                  boxShadow: '0 5px 14px rgba(37,99,235,0.2)',
                }}
              >
                <Plus color="#FFFFFF" size={18} strokeWidth={2.7} />
                <Text className="ml-2 text-[14px] font-extrabold text-white">
                  Add car
                </Text>
              </Pressable>
            </View>
            {vehicles.length > 0 ? (
              <Text className="mt-5 text-[12px] font-bold uppercase tracking-[0.8px] text-slate-400">
                Tap to select · Swipe left to delete
              </Text>
            ) : null}
          </View>
        }
        ListEmptyComponent={
          <Animated.View
            className="items-center rounded-[30px] border border-dashed border-slate-300 bg-white/80 px-6 py-14"
            entering={FadeInDown.duration(260).springify().damping(24)}
          >
            <View className="mb-4 h-16 w-16 items-center justify-center rounded-full bg-blue-50">
              <CarFront color="#2563EB" size={29} strokeWidth={2.2} />
            </View>
            <Text className="text-[19px] font-extrabold text-slate-950">
              No cars yet
            </Text>
            <Text className="mt-2 text-center text-[14px] font-medium leading-5 text-slate-500">
              Add your first car to start your garage.
            </Text>
            <Pressable
              accessibilityRole="button"
              className="mt-6 h-12 flex-row items-center rounded-full bg-slate-950 px-5 active:bg-slate-800"
              onPress={openAddCar}
            >
              <Plus color="#FFFFFF" size={18} strokeWidth={2.7} />
              <Text className="ml-2 text-[14px] font-extrabold text-white">
                Add car
              </Text>
            </Pressable>
          </Animated.View>
        }
        maxToRenderPerBatch={8}
        renderItem={renderVehicle}
        showsVerticalScrollIndicator={false}
        updateCellsBatchingPeriod={50}
        windowSize={5}
      />

      <Modal
        animationType="fade"
        onRequestClose={closeAddCar}
        statusBarTranslucent
        transparent
        visible={isAddOpen}
      >
        <KeyboardAvoidingView
          behavior={process.env.EXPO_OS === 'ios' ? 'padding' : undefined}
          className="flex-1 justify-end"
        >
          <Pressable
            accessibilityLabel="Cancel adding car"
            className="absolute inset-0 bg-slate-950/45"
            onPress={closeAddCar}
          />
          <View
            className="rounded-t-[32px] bg-slate-100 px-5 pt-3"
            style={{
              borderCurve: 'continuous',
              boxShadow: '0 -6px 18px rgba(15,23,42,0.14)',
              paddingBottom: Math.max(insets.bottom, 18) + 8,
            }}
          >
            <View className="mb-3 h-1.5 w-11 self-center rounded-full bg-slate-300" />
            <View className="mb-6 flex-row items-center justify-between">
              <View>
                <Text className="text-[25px] font-black text-slate-950">
                  Add car
                </Text>
                <Text className="mt-1 text-[13px] font-semibold text-slate-500">
                  Save a vehicle to your garage
                </Text>
              </View>
              <Pressable
                accessibilityLabel="Cancel"
                accessibilityRole="button"
                className="h-11 w-11 items-center justify-center rounded-full bg-white active:bg-slate-200"
                hitSlop={8}
                onPress={closeAddCar}
              >
                <X color="#475569" size={19} strokeWidth={2.5} />
              </Pressable>
            </View>

            <View className="gap-5">
              <Field error={errors.nickname} label="Nickname">
                <TextInput
                  autoCapitalize="words"
                  autoCorrect={false}
                  className={`h-14 rounded-2xl border bg-white px-4 text-[16px] font-semibold text-slate-950 ${
                    errors.nickname ? 'border-red-400' : 'border-slate-200'
                  }`}
                  maxLength={40}
                  onChangeText={(value) => {
                    setNickname(value);
                    setErrors((current) => ({
                      ...current,
                      nickname: undefined,
                    }));
                  }}
                  placeholder="e.g. Family car"
                  placeholderTextColor="#94A3B8"
                  returnKeyType="next"
                  value={nickname}
                />
              </Field>

              <Field error={errors.licensePlate} label="License plate">
                <TextInput
                  autoCapitalize="characters"
                  autoCorrect={false}
                  className={`h-14 rounded-2xl border bg-white px-4 text-[16px] font-bold tracking-[1px] text-slate-950 ${
                    errors.licensePlate ? 'border-red-400' : 'border-slate-200'
                  }`}
                  maxLength={20}
                  onChangeText={(value) => {
                    setLicensePlate(value);
                    setErrors((current) => ({
                      ...current,
                      licensePlate: undefined,
                    }));
                  }}
                  onSubmitEditing={saveCar}
                  placeholder="e.g. M AB 1234"
                  placeholderTextColor="#94A3B8"
                  returnKeyType="done"
                  value={licensePlate}
                />
              </Field>
            </View>

            <View className="mt-7 flex-row gap-3">
              <Pressable
                accessibilityRole="button"
                className="h-[52px] flex-1 items-center justify-center rounded-2xl border border-slate-200 bg-white active:bg-slate-200"
                onPress={closeAddCar}
              >
                <Text className="text-[15px] font-extrabold text-slate-700">
                  Cancel
                </Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                className="h-[52px] flex-1 items-center justify-center rounded-2xl bg-blue-600 active:bg-blue-700"
                onPress={saveCar}
              >
                <Text className="text-[15px] font-extrabold text-white">
                  Save car
                </Text>
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}
