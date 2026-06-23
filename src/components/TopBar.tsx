import { Text, View } from 'react-native';
import type { ReactNode } from 'react';
import { C, FONT_DISPLAY } from '@/constants/theme';

type Props = {
  title: string;
  subtitle: string;
  action?: ReactNode;
};

export default function TopBar({ title, subtitle, action }: Props) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 14 }}>
      <View style={{ flex: 1 }}>
        <Text
          style={{
            color: '#7C5F1E',
            fontSize: 12,
            fontWeight: '800',
            letterSpacing: 1.4,
            textTransform: 'uppercase',
            marginBottom: 5,
          }}
        >
          {subtitle}
        </Text>
        <Text
          style={{
            fontFamily: FONT_DISPLAY,
            color: C.text,
            fontSize: 27,
            fontWeight: '700',
            letterSpacing: -0.6,
            lineHeight: 30,
          }}
        >
          {title}
        </Text>
      </View>
      {action}
    </View>
  );
}
