import { Modal, Pressable, Text, View } from 'react-native';
import { BlurView } from 'expo-blur';

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
      <View className="flex-1 justify-end bg-warm-overlay-ink">
        <Pressable className="flex-1" onPress={onDismiss} />
        <BlurView
          intensity={60}
          tint="light"
          className="m-[18px] mb-7 overflow-hidden rounded-sheet border border-warm-panel-border bg-warm-panel p-5"
        >
          <Text className="mb-2 text-[12px] font-extrabold uppercase tracking-overline text-warm-accent-text">
            Before location access
          </Text>
          <Text className="mb-2.5 font-display text-[22px] font-bold tracking-[-0.4px] text-warm-text">
            Use your location only to rank nearby parking segments.
          </Text>
          <Text className="mb-3 text-[15px] leading-[21px] text-warm-body">
            Munich Parking can show the map without your location. If you allow it, we use coarse
            position for nearby predictions and fresh-check requests.
          </Text>
          {BULLETS.map((bullet) => (
            <View key={bullet} className="mb-1.5 flex-row gap-2">
              <Text className="text-[15px] leading-[21px] text-warm-body">·</Text>
              <Text className="flex-1 text-[14px] leading-5 text-warm-body">{bullet}</Text>
            </View>
          ))}
          <Pressable
            onPress={onContinue}
            className="mt-3.5 min-h-12 items-center justify-center rounded-control bg-warm-deep"
          >
            <Text className="text-[15px] font-black text-white">Continue to OS prompt</Text>
          </Pressable>
          <Pressable
            onPress={onDismiss}
            className="mt-2 min-h-11 items-center justify-center"
          >
            <Text className="text-[15px] font-black text-warm-deep">Not now</Text>
          </Pressable>
        </BlurView>
      </View>
    </Modal>
  );
}
