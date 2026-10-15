import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  ActivityIndicator,
  BackHandler,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { ArrowLeft, LockKeyhole, Mail } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAccount } from '@/hooks/use-account';
import { validateAccountEmail } from '@/utils/account-validation';
import { COLORS } from '@/constants/theme';

const INPUT_CLASS =
  'mt-4 rounded-2xl border border-border-subtle bg-surface-input px-4 py-3 text-[15px] font-semibold text-ink-primary';

function PrimaryButton({
  disabled,
  isLoading,
  label,
  onPress,
}: {
  disabled: boolean;
  isLoading: boolean;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      className={`mt-8 min-h-14 flex-row items-center justify-center rounded-full px-5 ${
        disabled ? 'bg-accent-soft' : 'bg-accent-primary active:bg-accent-pressed'
      }`}
      disabled={disabled}
      onPress={onPress}
      style={{ borderCurve: 'continuous' }}
    >
      {isLoading ? <ActivityIndicator color={COLORS.surface.default} size="small" /> : null}
      <Text
        className={`text-[15px] font-black text-ink-on-accent${
          isLoading ? ' ml-2' : ''
        }`}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function SecondaryButton({
  disabled,
  label,
  onPress,
}: {
  disabled?: boolean;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      className="mt-4 min-h-11 items-center justify-center rounded-full px-4 active:bg-background-default"
      disabled={disabled}
      onPress={onPress}
    >
      <Text
        className={`text-[14px] font-extrabold ${
          disabled ? 'text-ink-muted' : 'text-ink-secondary'
        }`}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const account = useAccount();
  const { email: emailParam, source: sourceParam } =
    useLocalSearchParams<{ email?: string; source?: string }>();
  const source = sourceParam === 'profile' ? 'profile' : 'onboarding';
  const initialEmail = typeof emailParam === 'string' ? emailParam : '';
  const [email, setEmail] = useState(initialEmail);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasSent, setHasSent] = useState(false);
  const [canResend, setCanResend] = useState(true);
  const [requestError, setRequestError] = useState<string | null>(null);
  const resendTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (resendTimeoutRef.current) {
        clearTimeout(resendTimeoutRef.current);
      }
    };
  }, []);

  const returnToLogin = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
      return;
    }

    if (source === 'profile') {
      router.replace('/account/profile');
      return;
    }

    router.replace({
      pathname: '/onboarding',
      params: { accountMode: 'login', step: 'account' },
    });
  }, [router, source]);

  useEffect(() => {
    const subscription = BackHandler.addEventListener(
      'hardwareBackPress',
      () => {
        if (isSubmitting) {
          return true;
        }

        returnToLogin();
        return true;
      },
    );

    return () => subscription.remove();
  }, [isSubmitting, returnToLogin]);

  const emailValidation = validateAccountEmail(email);
  const canSubmit = emailValidation.ok && !isSubmitting && canResend;

  const submit = useCallback(async () => {
    if (!canSubmit) {
      return;
    }

    setIsSubmitting(true);
    setRequestError(null);

    const result = await account.requestPasswordReset(email, source);

    if (!result.ok) {
      setRequestError(result.error.message);
    } else {
      setHasSent(true);
      setCanResend(false);
      if (resendTimeoutRef.current) {
        clearTimeout(resendTimeoutRef.current);
      }
      resendTimeoutRef.current = setTimeout(() => {
        setCanResend(true);
        resendTimeoutRef.current = null;
      }, 30_000);
    }

    setIsSubmitting(false);
  }, [account, canSubmit, email, source]);

  return (
    <View className="flex-1 bg-background-default">
      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          justifyContent: 'center',
          paddingBottom: Math.max(insets.bottom, 20) + 24,
          paddingHorizontal: 20,
          paddingTop: Math.max(insets.top, 16) + 16,
        }}
        keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View className="w-full max-w-[520px] self-center rounded-sheet border border-border-glass bg-surface-default px-6 py-7 shadow-overlay">
          <Pressable
            accessibilityLabel="Return to login"
            accessibilityRole="button"
            className="h-11 w-11 items-center justify-center rounded-full bg-background-default active:bg-surface-muted"
            disabled={isSubmitting}
            onPress={returnToLogin}
          >
            <ArrowLeft color={COLORS.icon.default} size={22} strokeWidth={2.6} />
          </Pressable>

          <View className="mt-7 h-16 w-16 items-center justify-center rounded-[24px] bg-accent-soft">
            <LockKeyhole color={COLORS.accent.primary} size={30} strokeWidth={2.4} />
          </View>
          <Text className="mt-6 text-[31px] font-black leading-9 text-ink-primary">
            Reset your password
          </Text>
          <Text className="mt-3 text-[15px] font-semibold leading-6 text-ink-secondary">
            Enter the email address connected to your account.
          </Text>

          <View className="mt-7 flex-row items-center rounded-2xl bg-surface-input px-4 py-3">
            <Mail color={COLORS.text.secondary} size={20} strokeWidth={2.2} />
            <Text className="ml-3 text-[13px] font-semibold text-ink-secondary">
              We will send instructions if an account exists.
            </Text>
          </View>

          <TextInput
            accessibilityLabel="Email address"
            autoCapitalize="none"
            autoComplete="email"
            autoCorrect={false}
            className={INPUT_CLASS}
            editable={!isSubmitting}
            inputMode="email"
            keyboardType="email-address"
            onChangeText={(value) => {
              setEmail(value);
              setHasSent(false);
              setCanResend(true);
              setRequestError(null);
              if (resendTimeoutRef.current) {
                clearTimeout(resendTimeoutRef.current);
                resendTimeoutRef.current = null;
              }
            }}
            placeholder="you@example.com"
            placeholderTextColor={COLORS.text.muted}
            textContentType="emailAddress"
            value={email}
          />

          {requestError ? (
            <Text
              accessibilityRole="alert"
              className="mt-3 text-[13px] font-semibold leading-5 text-feedback-error"
            >
              {requestError}
            </Text>
          ) : null}

          {hasSent ? (
            <Text
              accessibilityRole="alert"
              className="mt-5 rounded-2xl bg-accent-soft px-4 py-3 text-[13px] font-semibold leading-5 text-accent-primary"
            >
              If an account exists for this email, we sent password reset
              instructions.
            </Text>
          ) : null}

          <PrimaryButton
            disabled={!canSubmit}
            isLoading={isSubmitting}
            label={
              isSubmitting
                ? 'Sending reset link'
                : hasSent
                  ? canResend
                    ? 'Resend reset link'
                    : 'Reset link sent'
                  : 'Send reset link'
            }
            onPress={() => {
              void submit();
            }}
          />
          <SecondaryButton
            disabled={isSubmitting}
            label="Back to login"
            onPress={returnToLogin}
          />
        </View>
      </ScrollView>
    </View>
  );
}
