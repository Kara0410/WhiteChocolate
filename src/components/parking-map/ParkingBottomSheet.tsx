import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  type ComponentRef,
} from 'react';
import BottomSheet, {
  BottomSheetView,
  useBottomSheetSpringConfigs,
} from '@gorhom/bottom-sheet';
import { StyleSheet, Text } from 'react-native';

import type { ParkingClusterResponse } from '@/types/parking-map';

export type ParkingBottomSheetProps = {
  item: ParkingClusterResponse | null;
  onClose: () => void;
  onCompact?: () => void;
};

export type ParkingBottomSheetHandle = {
  compact: () => void;
};

const ITEM_SWITCH_DELAY_MS = 150;

export const ParkingBottomSheet = forwardRef<
  ParkingBottomSheetHandle,
  ParkingBottomSheetProps
>(function ParkingBottomSheet({ item, onClose, onCompact }, ref) {
  const sheetRef = useRef<ComponentRef<typeof BottomSheet>>(null);
  const hasOpenedRef = useRef(false);
  const previousItemIdRef = useRef<string | null>(null);
  const switchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const snapPoints = useMemo(() => ['18%', '50%'], []);
  const animationConfigs = useBottomSheetSpringConfigs({
    damping: 34,
    overshootClamping: true,
    stiffness: 360,
  });

  useEffect(() => {
    if (switchTimerRef.current) {
      clearTimeout(switchTimerRef.current);
      switchTimerRef.current = null;
    }

    if (item !== null) {
      const isSwitchingItem =
        hasOpenedRef.current &&
        previousItemIdRef.current !== null &&
        previousItemIdRef.current !== item.id;

      hasOpenedRef.current = true;
      previousItemIdRef.current = item.id;

      if (isSwitchingItem) {
        sheetRef.current?.snapToIndex(0);
        switchTimerRef.current = setTimeout(() => {
          sheetRef.current?.snapToIndex(1);
          switchTimerRef.current = null;
        }, ITEM_SWITCH_DELAY_MS);
      } else {
        sheetRef.current?.snapToIndex(1);
      }

      return;
    }

    hasOpenedRef.current = false;
    previousItemIdRef.current = null;
    sheetRef.current?.close();
  }, [item]);

  useEffect(
    () => () => {
      if (switchTimerRef.current) {
        clearTimeout(switchTimerRef.current);
      }
    },
    [],
  );

  useImperativeHandle(
    ref,
    () => ({
      compact() {
        if (hasOpenedRef.current) {
          if (switchTimerRef.current) {
            clearTimeout(switchTimerRef.current);
            switchTimerRef.current = null;
          }
          sheetRef.current?.snapToIndex(0);
        }
      },
    }),
    [],
  );

  const handleSheetClose = useCallback(() => {
    if (!hasOpenedRef.current) {
      return;
    }

    if (switchTimerRef.current) {
      clearTimeout(switchTimerRef.current);
      switchTimerRef.current = null;
    }
    hasOpenedRef.current = false;
    onClose();
  }, [onClose]);

  const handleSheetChange = useCallback(
    (index: number) => {
      if (index === 0) {
        onCompact?.();
      }
    },
    [onCompact],
  );

  return (
    <BottomSheet
      ref={sheetRef}
      animateOnMount={false}
      animationConfigs={animationConfigs}
      backgroundStyle={styles.background}
      enableDynamicSizing={false}
      enableOverDrag={false}
      enablePanDownToClose
      handleIndicatorStyle={styles.handleIndicator}
      handleStyle={styles.handle}
      index={-1}
      onChange={handleSheetChange}
      onClose={handleSheetClose}
      overDragResistanceFactor={4}
      snapPoints={snapPoints}
      style={styles.sheet}
    >
      <BottomSheetView style={styles.content}>
        <Text style={styles.title}>Parking Details</Text>
      </BottomSheetView>
    </BottomSheet>
  );
});

const styles = StyleSheet.create({
  background: {
    backgroundColor: '#F3F5F8',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
  },
  content: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
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
    boxShadow: '0 -8px 24px rgba(0,0,0,0.12)',
    elevation: 14,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
  },
  title: {
    color: '#1A1C1E',
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
});
