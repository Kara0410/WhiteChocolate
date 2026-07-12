import { memo, useCallback, useMemo, useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';

import type {
  AccountActionResult,
  RegisterActionResult,
} from '@/types/account';

type EmailSignInCardProps = {
  errorMessage: string | null;
  loginWithEmailPassword: (
    email: string,
    password: string,
  ) => Promise<AccountActionResult>;
  registerWithEmailPassword: (
    email: string,
    password: string,
  ) => Promise<RegisterActionResult>;
};

type AuthMode = 'login' | 'register';

const INPUT_CLASS =
  'mt-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-[15px] font-semibold text-slate-900';

export const EmailSignInCard = memo(function EmailSignInCard({
  errorMessage,
  loginWithEmailPassword,
  registerWithEmailPassword,
}: EmailSignInCardProps) {
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const isRegistering = mode === 'register';
  const passwordsMatch = password === confirmPassword;
  const canSubmit = useMemo(() => {
    if (busy || email.trim().length === 0 || password.length === 0) {
      return false;
    }

    return !isRegistering || (confirmPassword.length > 0 && passwordsMatch);
  }, [busy, confirmPassword.length, email, isRegistering, password, passwordsMatch]);

  const submit = useCallback(async () => {
    if (!canSubmit) {
      return;
    }

    if (isRegistering && !passwordsMatch) {
      setLocalError('Passwords do not match.');
      return;
    }

    setBusy(true);
    setLocalError(null);
    setNotice(null);

    try {
      if (isRegistering) {
        const result = await registerWithEmailPassword(email, password);

        if (!result.ok) {
          setLocalError(result.error.message);
          return;
        }

        if (result.status === 'confirmation-required') {
          setPassword('');
          setConfirmPassword('');
          setNotice(
            `Account created for ${result.email}. Confirm your email before signing in.`,
          );
          setMode('login');
          return;
        }

        setPassword('');
        setConfirmPassword('');
        return;
      }

      const result = await loginWithEmailPassword(email, password);

      if (!result.ok) {
        setLocalError(result.error.message);
        return;
      }

      setPassword('');
      setConfirmPassword('');
    } finally {
      setBusy(false);
    }
  }, [
    canSubmit,
    email,
    isRegistering,
    loginWithEmailPassword,
    password,
    passwordsMatch,
    registerWithEmailPassword,
  ]);

  const toggleMode = useCallback(() => {
    setMode((current) => (current === 'login' ? 'register' : 'login'));
    setConfirmPassword('');
    setLocalError(null);
    setNotice(null);
  }, []);

  const visibleError = localError ?? errorMessage;

  return (
    <View>
      <Text className="text-[15px] font-extrabold text-slate-900">
        {isRegistering ? 'Create an account' : 'Sign in with email'}
      </Text>
      <Text className="mt-2 text-[13px] font-semibold leading-5 text-slate-500">
        {isRegistering
          ? 'Use an email and password to save your parking setup later.'
          : 'Sign in with your email and password. No code or magic link required.'}
      </Text>

      <TextInput
        accessibilityLabel="Email address"
        autoCapitalize="none"
        autoComplete="email"
        autoCorrect={false}
        className={INPUT_CLASS}
        editable={!busy}
        inputMode="email"
        keyboardType="email-address"
        onChangeText={setEmail}
        placeholder="you@example.com"
        placeholderTextColor="#94A3B8"
        textContentType="emailAddress"
        value={email}
      />
      <TextInput
        accessibilityLabel="Password"
        autoCapitalize="none"
        autoComplete={isRegistering ? 'new-password' : 'current-password'}
        autoCorrect={false}
        className={INPUT_CLASS}
        editable={!busy}
        onChangeText={setPassword}
        placeholder="Password"
        placeholderTextColor="#94A3B8"
        secureTextEntry
        textContentType={isRegistering ? 'newPassword' : 'password'}
        value={password}
      />

      {isRegistering ? (
        <TextInput
          accessibilityLabel="Confirm password"
          autoCapitalize="none"
          autoComplete="new-password"
          autoCorrect={false}
          className={INPUT_CLASS}
          editable={!busy}
          onChangeText={setConfirmPassword}
          placeholder="Confirm password"
          placeholderTextColor="#94A3B8"
          secureTextEntry
          textContentType="newPassword"
          value={confirmPassword}
        />
      ) : null}

      <Pressable
        accessibilityLabel={isRegistering ? 'Create account' : 'Sign in'}
        accessibilityRole="button"
        className={`mt-4 min-h-12 items-center justify-center rounded-full ${
          canSubmit
            ? 'bg-blue-600 active:bg-blue-700'
            : 'bg-slate-300'
        }`}
        disabled={!canSubmit}
        onPress={() => {
          void submit();
        }}
        style={{ borderCurve: 'continuous' }}
      >
        <Text className="text-[15px] font-extrabold text-white">
          {busy
            ? isRegistering
              ? 'Creating account...'
              : 'Signing in...'
            : isRegistering
              ? 'Create account'
              : 'Sign in'}
        </Text>
      </Pressable>

      <Pressable
        accessibilityRole="button"
        className="mt-3 min-h-11 items-center justify-center"
        disabled={busy}
        onPress={toggleMode}
      >
        <Text className="text-[13px] font-extrabold text-blue-600">
          {isRegistering
            ? 'Already have an account? Sign in'
            : 'New here? Create an account'}
        </Text>
      </Pressable>

      {isRegistering && confirmPassword.length > 0 && !passwordsMatch ? (
        <Text
          accessibilityRole="alert"
          className="mt-2 text-[13px] font-semibold leading-5 text-red-700"
        >
          Passwords do not match.
        </Text>
      ) : null}

      {visibleError ? (
        <Text
          accessibilityRole="alert"
          className="mt-3 text-[13px] font-semibold leading-5 text-red-700"
        >
          {visibleError}
        </Text>
      ) : null}

      {notice ? (
        <Text
          accessibilityRole="alert"
          className="mt-3 rounded-2xl bg-blue-50 px-4 py-3 text-[13px] font-semibold leading-5 text-blue-800"
        >
          {notice}
        </Text>
      ) : null}

      <Text className="mt-4 text-[12px] font-semibold leading-5 text-slate-400">
        Signing in is optional. Parking, map, and search always work without
        an account.
      </Text>
    </View>
  );
});
