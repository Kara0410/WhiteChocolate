import { memo, useCallback, useMemo, useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';

import type {
  AccountActionResult,
  RegisterActionResult,
} from '@/types/account';
import { COLORS } from '@/constants/theme';

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
  onForgotPassword?: (email: string) => void;
};

type AuthMode = 'login' | 'register';

const INPUT_CLASS =
  'mt-2 rounded-2xl border border-border-subtle bg-surface-input px-4 py-3 text-[15px] font-semibold text-ink-primary';

export const EmailSignInCard = memo(function EmailSignInCard({
  errorMessage,
  loginWithEmailPassword,
  onForgotPassword,
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
      <Text className="text-[15px] font-extrabold text-ink-primary">
        {isRegistering ? 'Create an account' : 'Sign in with email'}
      </Text>
      <Text className="mt-2 text-[13px] font-semibold leading-5 text-ink-secondary">
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
        placeholderTextColor={COLORS.text.muted}
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
        placeholderTextColor={COLORS.text.muted}
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
          placeholderTextColor={COLORS.text.muted}
          secureTextEntry
          textContentType="newPassword"
          value={confirmPassword}
        />
      ) : null}

      {!isRegistering && onForgotPassword ? (
        <Pressable
          accessibilityLabel="Reset forgotten password"
          accessibilityRole="button"
          className="mt-2 min-h-11 self-end justify-center rounded-full px-2 active:bg-accent-soft"
          disabled={busy}
          onPress={() => onForgotPassword(email)}
        >
          <Text className="text-[13px] font-extrabold text-accent-primary">
            Forgot password?
          </Text>
        </Pressable>
      ) : null}

      <Pressable
        accessibilityLabel={isRegistering ? 'Create account' : 'Sign in'}
        accessibilityRole="button"
        className={`mt-4 min-h-12 items-center justify-center rounded-full ${
          canSubmit
            ? 'bg-accent-primary active:bg-accent-pressed'
            : 'bg-surface-muted'
        }`}
        disabled={!canSubmit}
        onPress={() => {
          void submit();
        }}
        style={{ borderCurve: 'continuous' }}
      >
        <Text className="text-[15px] font-extrabold text-ink-on-accent">
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
        <Text className="text-[13px] font-extrabold text-accent-primary">
          {isRegistering
            ? 'Already have an account? Sign in'
            : 'New here? Create an account'}
        </Text>
      </Pressable>

      {isRegistering && confirmPassword.length > 0 && !passwordsMatch ? (
        <Text
          accessibilityRole="alert"
          className="mt-2 text-[13px] font-semibold leading-5 text-feedback-error"
        >
          Passwords do not match.
        </Text>
      ) : null}

      {visibleError ? (
        <Text
          accessibilityRole="alert"
          className="mt-3 text-[13px] font-semibold leading-5 text-feedback-error"
        >
          {visibleError}
        </Text>
      ) : null}

      {notice ? (
        <Text
          accessibilityRole="alert"
          className="mt-3 rounded-2xl bg-accent-soft px-4 py-3 text-[13px] font-semibold leading-5 text-accent-primary"
        >
          {notice}
        </Text>
      ) : null}

      <Text className="mt-4 text-[12px] font-semibold leading-5 text-ink-muted">
        Signing in is optional. Parking, map, and search always work without
        an account.
      </Text>
    </View>
  );
});
