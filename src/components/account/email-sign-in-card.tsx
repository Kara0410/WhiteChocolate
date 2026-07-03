import { memo, useCallback, useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';

import type { AccountActionResult } from '@/types/account';

type EmailSignInCardProps = {
  errorMessage: string | null;
  pendingEmail: string | null;
  startEmailSignIn: (email: string) => Promise<AccountActionResult>;
  verifyEmailOtp: (
    email: string,
    token: string,
  ) => Promise<AccountActionResult>;
  cancelEmailSignIn: () => void;
};

const INPUT_CLASS =
  'mt-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-[15px] font-semibold text-slate-900';

export const EmailSignInCard = memo(function EmailSignInCard({
  errorMessage,
  pendingEmail,
  startEmailSignIn,
  verifyEmailOtp,
  cancelEmailSignIn,
}: EmailSignInCardProps) {
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState<'idle' | 'sending' | 'verifying'>('idle');
  const [notice, setNotice] = useState<string | null>(null);

  const sendCode = useCallback(
    async (targetEmail: string) => {
      setBusy('sending');
      setNotice(null);

      const result = await startEmailSignIn(targetEmail);

      setBusy('idle');

      if (result.ok) {
        setCode('');
        setNotice(
          'Check your email for a 6-digit sign-in code. It can take a minute to arrive.',
        );
      }
    },
    [startEmailSignIn],
  );

  const handleSend = useCallback(() => {
    void sendCode(email);
  }, [email, sendCode]);

  const handleResend = useCallback(() => {
    if (pendingEmail) {
      void sendCode(pendingEmail);
    }
  }, [pendingEmail, sendCode]);

  const handleVerify = useCallback(async () => {
    if (!pendingEmail) {
      return;
    }

    setBusy('verifying');
    await verifyEmailOtp(pendingEmail, code);
    setBusy('idle');
  }, [code, pendingEmail, verifyEmailOtp]);

  const handleUseDifferentEmail = useCallback(() => {
    cancelEmailSignIn();
    setCode('');
    setNotice(null);
  }, [cancelEmailSignIn]);

  const isBusy = busy !== 'idle';

  return (
    <View>
      <Text className="text-[15px] font-extrabold text-slate-900">
        {pendingEmail ? 'Enter your sign-in code' : 'Sign in with email'}
      </Text>
      <Text className="mt-2 text-[13px] font-semibold leading-5 text-slate-500">
        {pendingEmail
          ? `We sent a 6-digit code to ${pendingEmail}.`
          : 'No password needed. We email you a one-time sign-in code.'}
      </Text>

      {pendingEmail ? (
        <>
          <TextInput
            accessibilityLabel="Sign-in code"
            autoComplete="one-time-code"
            className={INPUT_CLASS}
            editable={!isBusy}
            inputMode="numeric"
            maxLength={6}
            onChangeText={setCode}
            placeholder="123456"
            placeholderTextColor="#94A3B8"
            textContentType="oneTimeCode"
            value={code}
          />
          <Pressable
            accessibilityLabel="Verify sign-in code"
            accessibilityRole="button"
            className={`mt-4 min-h-12 items-center justify-center rounded-full ${
              isBusy || code.trim().length < 6
                ? 'bg-slate-300'
                : 'bg-blue-600 active:bg-blue-700'
            }`}
            disabled={isBusy || code.trim().length < 6}
            onPress={handleVerify}
            style={{ borderCurve: 'continuous' }}
          >
            <Text className="text-[15px] font-extrabold text-white">
              {busy === 'verifying' ? 'Verifying…' : 'Verify code'}
            </Text>
          </Pressable>
          <View className="mt-3 flex-row justify-between">
            <Pressable
              accessibilityLabel="Resend sign-in code"
              accessibilityRole="button"
              className="min-h-11 justify-center"
              disabled={isBusy}
              onPress={handleResend}
            >
              <Text className="text-[13px] font-extrabold text-blue-600">
                {busy === 'sending' ? 'Sending…' : 'Resend code'}
              </Text>
            </Pressable>
            <Pressable
              accessibilityLabel="Use a different email"
              accessibilityRole="button"
              className="min-h-11 justify-center"
              disabled={isBusy}
              onPress={handleUseDifferentEmail}
            >
              <Text className="text-[13px] font-extrabold text-slate-500">
                Use a different email
              </Text>
            </Pressable>
          </View>
        </>
      ) : (
        <>
          <TextInput
            accessibilityLabel="Email address"
            autoCapitalize="none"
            autoComplete="email"
            autoCorrect={false}
            className={INPUT_CLASS}
            editable={!isBusy}
            inputMode="email"
            keyboardType="email-address"
            onChangeText={setEmail}
            placeholder="you@example.com"
            placeholderTextColor="#94A3B8"
            textContentType="emailAddress"
            value={email}
          />
          <Pressable
            accessibilityLabel="Send sign-in code"
            accessibilityRole="button"
            className={`mt-4 min-h-12 items-center justify-center rounded-full ${
              isBusy || email.trim().length === 0
                ? 'bg-slate-300'
                : 'bg-blue-600 active:bg-blue-700'
            }`}
            disabled={isBusy || email.trim().length === 0}
            onPress={handleSend}
            style={{ borderCurve: 'continuous' }}
          >
            <Text className="text-[15px] font-extrabold text-white">
              {busy === 'sending' ? 'Sending…' : 'Send sign-in code'}
            </Text>
          </Pressable>
        </>
      )}

      {notice && !errorMessage ? (
        <Text className="mt-3 text-[13px] font-semibold leading-5 text-emerald-700">
          {notice}
        </Text>
      ) : null}

      {errorMessage ? (
        <Text
          accessibilityRole="alert"
          className="mt-3 text-[13px] font-semibold leading-5 text-red-700"
        >
          {errorMessage}
        </Text>
      ) : null}

      <Text className="mt-4 text-[12px] font-semibold leading-5 text-slate-400">
        Signing in is optional. Parking, map, and search always work without
        an account.
      </Text>
    </View>
  );
});
