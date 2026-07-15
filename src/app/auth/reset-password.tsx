import { useCallback, useEffect, useRef, useState } from 'react';
import * as Linking from 'expo-linking';
import { useRouter } from 'expo-router';
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
import { ArrowLeft, KeyRound, LockKeyhole } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAccount } from '@/hooks/use-account';
import { passwordsDoNotMatchError } from '@/utils/account-errors';

const INPUT_CLASS =
  'mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-[15px] font-semibold text-slate-900';

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
        disabled ? 'bg-blue-300' : 'bg-blue-600 active:bg-blue-700'
      }`}
      disabled={disabled}
      onPress={onPress}
      style={{ borderCurve: 'continuous' }}
    >
      {isLoading ? <ActivityIndicator color="#FFFFFF" size="small" /> : null}
      <Text
        className={`text-[15px] font-black text-white${
          isLoading ? ' ml-2' : ''
        }`}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function SecondaryButton({
  label,
  onPress,
}: {
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      className="mt-4 min-h-11 items-center justify-center rounded-full px-4 active:bg-slate-100"
      onPress={onPress}
    >
      <Text className="text-[14px] font-extrabold text-slate-600">
        {label}
      </Text>
    </Pressable>
  );
}

export default function ResetPasswordScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const account = useAccount();
  const callbackUrl = Linking.useLinkingURL();
  const processedCallbackRef = useRef(false);
  const [isVerifying, setIsVerifying] = useState(true);
  const [isRecoveryValid, setIsRecoveryValid] = useState(false);
  const [callbackError, setCallbackError] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFinishingRecovery, setIsFinishingRecovery] = useState(false);
  const [updateError, setUpdateError] = useState<string | null>(null);
  const [isUpdated, setIsUpdated] = useState(false);

  useEffect(() => {
    if (processedCallbackRef.current) {
      return;
    }

    processedCallbackRef.current = true;

    if (callbackUrl === null) {
      setIsVerifying(false);
      setCallbackError(
        'This password reset link is invalid. Request a new one.',
      );
      return;
    }

    void account.completePasswordRecovery(callbackUrl).then((result) => {
      setIsVerifying(false);

      if (!result.ok) {
        setCallbackError(result.error.message);
        return;
      }

      setIsRecoveryValid(true);
    });
  }, [account, callbackUrl]);

  const returnToLogin = useCallback(async () => {
    if (isVerifying || isSubmitting || isFinishingRecovery) {
      return;
    }

    if (isRecoveryValid && !isUpdated) {
      setIsFinishingRecovery(true);
      const cleanupResult = await account.finishPasswordRecovery();
      setIsFinishingRecovery(false);

      if (!cleanupResult.ok) {
        setUpdateError(
          'The recovery session could not be closed. Please try again.',
        );
        return;
      }

      setIsRecoveryValid(false);
    }

    router.replace({
      pathname: '/onboarding',
      params: { accountMode: 'login', step: 'account' },
    });
  }, [
    account,
    isFinishingRecovery,
    isRecoveryValid,
    isSubmitting,
    isUpdated,
    isVerifying,
    router,
  ]);

  useEffect(() => {
    const subscription = BackHandler.addEventListener(
      'hardwareBackPress',
      () => {
        if (isVerifying || isSubmitting) {
          return true;
        }

        void returnToLogin();
        return true;
      },
    );

    return () => subscription.remove();
  }, [isSubmitting, isVerifying, returnToLogin]);

  const passwordsMatch = password === confirmPassword;
  const canSubmit =
    isRecoveryValid &&
    !isSubmitting &&
    password.length > 0 &&
    confirmPassword.length > 0 &&
    passwordsMatch;

  const updatePassword = useCallback(async () => {
    if (!canSubmit) {
      return;
    }

    setIsSubmitting(true);
    setUpdateError(null);

    const result = await account.updateRecoveredPassword(password);

    if (!result.ok) {
      setUpdateError(result.error.message);
      setIsSubmitting(false);
      return;
    }

    const cleanupResult = await account.finishPasswordRecovery();
    if (!cleanupResult.ok) {
      setUpdateError(
        'Your password was updated, but the recovery session could not be closed. Please try again.',
      );
      setIsSubmitting(false);
      return;
    }

    setPassword('');
    setConfirmPassword('');
    setIsRecoveryValid(false);
    setIsUpdated(true);
    setIsSubmitting(false);
  }, [account, canSubmit, password]);

  const showPasswordLengthError =
    password.length > 0 && password.length < 8;
  const showMismatchError =
    confirmPassword.length > 0 && !passwordsMatch;

  return (
    <View className="flex-1 bg-slate-100">
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
        <View className="w-full max-w-[520px] self-center rounded-[32px] border border-white/80 bg-white px-6 py-7 shadow-overlay">
          <Pressable
            accessibilityLabel="Return to login"
            accessibilityRole="button"
            className="h-11 w-11 items-center justify-center rounded-full bg-slate-100 active:bg-slate-200"
            disabled={isVerifying || isSubmitting || isFinishingRecovery}
            onPress={() => {
              void returnToLogin();
            }}
          >
            <ArrowLeft color="#475569" size={22} strokeWidth={2.6} />
          </Pressable>

          {isVerifying ? (
            <View className="items-center py-16">
              <ActivityIndicator color="#2563EB" size="large" />
              <Text className="mt-5 text-center text-[15px] font-extrabold text-slate-900">
                Verifying your reset link…
              </Text>
            </View>
          ) : callbackError ? (
            <>
              <View className="mt-7 h-16 w-16 items-center justify-center rounded-[24px] bg-amber-50">
                <KeyRound color="#D97706" size={30} strokeWidth={2.4} />
              </View>
              <Text className="mt-6 text-[31px] font-black leading-9 text-slate-950">
                Reset link unavailable
              </Text>
              <Text
                accessibilityRole="alert"
                className="mt-3 text-[15px] font-semibold leading-6 text-slate-600"
              >
                {callbackError}
              </Text>
              <PrimaryButton
                disabled={false}
                isLoading={false}
                label="Request a new link"
                onPress={() => router.replace('/auth/forgot-password')}
              />
              <SecondaryButton
                label="Return to login"
                onPress={() => {
                  void returnToLogin();
                }}
              />
            </>
          ) : isUpdated ? (
            <>
              <View className="mt-7 h-16 w-16 items-center justify-center rounded-[24px] bg-emerald-50">
                <LockKeyhole color="#059669" size={30} strokeWidth={2.4} />
              </View>
              <Text className="mt-6 text-[31px] font-black leading-9 text-slate-950">
                Password updated
              </Text>
              <Text className="mt-3 text-[15px] font-semibold leading-6 text-slate-600">
                You can now log in with your new password.
              </Text>
              <PrimaryButton
                disabled={false}
                isLoading={false}
                label="Return to login"
                onPress={() => {
                  void returnToLogin();
                }}
              />
            </>
          ) : (
            <>
              <View className="mt-7 h-16 w-16 items-center justify-center rounded-[24px] bg-blue-50">
                <LockKeyhole color="#2563EB" size={30} strokeWidth={2.4} />
              </View>
              <Text className="mt-6 text-[31px] font-black leading-9 text-slate-950">
                Choose a new password
              </Text>
              <Text className="mt-3 text-[15px] font-semibold leading-6 text-slate-500">
                Use a new password to protect your account.
              </Text>

              <TextInput
                accessibilityLabel="New password"
                autoCapitalize="none"
                autoComplete="new-password"
                autoCorrect={false}
                className={INPUT_CLASS}
                editable={!isSubmitting}
                onChangeText={setPassword}
                placeholder="New password"
                placeholderTextColor="#94A3B8"
                secureTextEntry
                textContentType="newPassword"
                value={password}
              />
              <TextInput
                accessibilityLabel="Confirm new password"
                autoCapitalize="none"
                autoComplete="new-password"
                autoCorrect={false}
                className={INPUT_CLASS}
                editable={!isSubmitting}
                onChangeText={setConfirmPassword}
                placeholder="Confirm new password"
                placeholderTextColor="#94A3B8"
                secureTextEntry
                textContentType="newPassword"
                value={confirmPassword}
              />
              {showPasswordLengthError ? (
                <Text className="mt-3 text-[13px] font-semibold leading-5 text-red-700">
                  Use a password with at least 8 characters.
                </Text>
              ) : null}
              {showMismatchError ? (
                <Text className="mt-3 text-[13px] font-semibold leading-5 text-red-700">
                  {passwordsDoNotMatchError().message}
                </Text>
              ) : null}
              {updateError ? (
                <Text
                  accessibilityRole="alert"
                  className="mt-3 text-[13px] font-semibold leading-5 text-red-700"
                >
                  {updateError}
                </Text>
              ) : null}
              <PrimaryButton
                disabled={!canSubmit}
                isLoading={isSubmitting || isFinishingRecovery}
                label={
                  isSubmitting || isFinishingRecovery
                    ? 'Updating password'
                    : 'Update password'
                }
                onPress={() => {
                  void updatePassword();
                }}
              />
            </>
          )}
        </View>
      </ScrollView>
    </View>
  );
}
