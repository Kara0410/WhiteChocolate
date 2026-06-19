import { Text, View } from 'react-native';
import type { ReactNode } from 'react';
import { C } from '@/constants/theme';

type Props = {
  title: string;
  subtitle: string;
  action?: ReactNode;
};

export default function TopBar({ title, subtitle, action }: Props) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 14 }}>
      <View style={{ flex: 1 }}>
        <Text style={{ color: C.muted, fontSize: 13, fontWeight: '600', marginBottom: 3 }}>
          {subtitle}
        </Text>
        <Text style={{ color: C.text, fontSize: 30, fontWeight: '800', letterSpacing: -1.5, lineHeight: 34 }}>
          {title}
        </Text>
      </View>
      {action}
    </View>
  );
}
