import { ActivityIndicator, Image, Pressable, Text, View } from 'react-native';

import { getGoogleAuthCopy } from '@/utils/onboarding-flow';
import type { GoogleAuthMode } from '@/utils/onboarding-flow';

const GOOGLE_G_LOGO = require('../../../assets/images/google-g-logo.png');

type GoogleAuthButtonProps = {
  disabled: boolean;
  isLoading: boolean;
  mode: GoogleAuthMode;
  onPress: () => void;
};

export function GoogleAuthButton({
  disabled,
  isLoading,
  mode,
  onPress,
}: GoogleAuthButtonProps) {
  const copy = getGoogleAuthCopy(mode);

  return (
    <Pressable
      accessibilityLabel={copy.actionLabel}
      accessibilityState={{ busy: isLoading, disabled }}
      accessibilityRole="button"
      className={`mt-6 min-h-14 flex-row items-center justify-center rounded-2xl border px-5 ${
        disabled
          ? 'border-slate-200 bg-slate-100 opacity-60'
          : 'border-[#747775] bg-white active:bg-slate-50'
      }`}
      disabled={disabled}
      onPress={onPress}
      style={{ borderCurve: 'continuous' }}
    >
      <View className="absolute left-4 h-[18px] w-[18px] items-center justify-center">
        {isLoading ? (
          <ActivityIndicator color="#334155" size="small" />
        ) : (
          <Image
            accessibilityIgnoresInvertColors
            className="h-[18px] w-[18px]"
            resizeMode="contain"
            source={GOOGLE_G_LOGO}
          />
        )}
      </View>
      <Text
        className={`px-7 text-center text-[15px] font-extrabold ${
          disabled ? 'text-[#747775]' : 'text-[#1F1F1F]'
        }`}
      >
        {isLoading ? copy.loadingLabel : copy.actionLabel}
      </Text>
    </Pressable>
  );
}
