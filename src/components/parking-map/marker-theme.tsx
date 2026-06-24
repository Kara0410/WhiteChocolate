import type { ReactNode } from 'react';
import { Text, View } from 'react-native';

export { AVAILABILITY_PALETTES } from '@/utils/parking-marker-svg';

export function MarkerText({
  children,
  color,
  size,
}: {
  children: ReactNode;
  color: string;
  size: number;
}) {
  return (
    <View style={{ alignItems: 'center', justifyContent: 'center' }}>
      <Text
        style={{
          color,
          fontSize: size,
          fontWeight: '800',
          fontVariant: ['tabular-nums'],
          letterSpacing: -0.5,
        }}
      >
        {children}
      </Text>
    </View>
  );
}
