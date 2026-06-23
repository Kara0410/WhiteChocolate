import { Modal, Pressable, Text, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { C, FONT_DISPLAY, R } from '@/constants/theme';

type Props = {
  visible: boolean;
  onContinue: () => void;
  onDismiss: () => void;
};

const BULLETS = [
  'No account required to browse or report.',
  'Reports are device-attributed for rate limiting.',
  'You can revoke permission at any time.',
];

export default function ConsentModal({ visible, onContinue, onDismiss }: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onDismiss}>
      <View style={{ flex: 1, backgroundColor: 'rgba(23,33,38,0.32)', justifyContent: 'flex-end' }}>
        <Pressable style={{ flex: 1 }} onPress={onDismiss} />
        <BlurView
          intensity={60}
          tint="light"
          style={{
            margin: 18,
            marginBottom: 28,
            borderRadius: R.xl,
            padding: 20,
            borderWidth: 1,
            borderColor: 'rgba(255,255,255,0.7)',
            overflow: 'hidden',
          }}
        >
          <Text style={{ color: '#7C5F1E', fontSize: 12, fontWeight: '800', letterSpacing: 1.4, textTransform: 'uppercase', marginBottom: 8 }}>
            Before location access
          </Text>
          <Text style={{ fontFamily: FONT_DISPLAY, color: C.text, fontSize: 22, fontWeight: '700', letterSpacing: -0.4, marginBottom: 10 }}>
            Use your location only to rank nearby zones.
          </Text>
          <Text style={{ color: '#46575C', fontSize: 15, lineHeight: 21, marginBottom: 12 }}>
            Munich Parking can show the map without your location. If you allow it, we use coarse
            position for nearby predictions and fresh-check requests.
          </Text>
          {BULLETS.map((b) => (
            <View key={b} style={{ flexDirection: 'row', gap: 8, marginBottom: 6 }}>
              <Text style={{ color: '#46575C', fontSize: 15, lineHeight: 21 }}>·</Text>
              <Text style={{ flex: 1, color: '#46575C', fontSize: 14, lineHeight: 20 }}>{b}</Text>
            </View>
          ))}
          <Pressable
            onPress={onContinue}
            style={{
              marginTop: 14,
              minHeight: 48,
              borderRadius: R.md,
              backgroundColor: C.deep,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={{ color: '#fff', fontWeight: '900', fontSize: 15 }}>Continue to OS prompt</Text>
          </Pressable>
          <Pressable
            onPress={onDismiss}
            style={{ marginTop: 8, minHeight: 44, alignItems: 'center', justifyContent: 'center' }}
          >
            <Text style={{ color: C.deep, fontWeight: '900', fontSize: 15 }}>Not now</Text>
          </Pressable>
        </BlurView>
      </View>
    </Modal>
  );
}
