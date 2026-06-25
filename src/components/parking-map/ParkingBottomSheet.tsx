import {
  useCallback,
  useEffect,
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
};

const SNAP_POINTS = ['50%'];

export function ParkingBottomSheet({
  item,
  onClose,
}: ParkingBottomSheetProps) {
  const sheetRef = useRef<ComponentRef<typeof BottomSheet>>(null);
  const hasOpenedRef = useRef(false);
  const animationConfigs = useBottomSheetSpringConfigs({
    damping: 34,
    overshootClamping: true,
    stiffness: 360,
  });

  useEffect(() => {
    if (item?.type === 'spot') {
      hasOpenedRef.current = true;
      sheetRef.current?.snapToIndex(0);
      return;
    }

    hasOpenedRef.current = false;
    sheetRef.current?.close();
  }, [item]);

  const handleSheetClose = useCallback(() => {
    if (!hasOpenedRef.current) {
      return;
    }

    hasOpenedRef.current = false;
    onClose();
  }, [onClose]);

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
      onClose={handleSheetClose}
      overDragResistanceFactor={4}
      snapPoints={SNAP_POINTS}
      style={styles.sheet}
    >
      <BottomSheetView style={styles.content}>
        <Text style={styles.title}>Parking Details</Text>
      </BottomSheetView>
    </BottomSheet>
  );
}

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
    backgroundColor: 'rgba(0,0,0,0.15)',
    borderRadius: 999,
    height: 5,
    width: 42,
  },
  sheet: {
    boxShadow: '0 -8px 24px rgba(26,28,30,0.12)',
    elevation: 16,
    shadowColor: '#1A1C1E',
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
