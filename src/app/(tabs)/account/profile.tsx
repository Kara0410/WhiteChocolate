import { useCallback } from 'react';
import { useRouter } from 'expo-router';
import { Text, Pressable, View } from 'react-native';

import { AccountPlaceholderScreen } from '@/components/account/account-placeholder-screen';
import { EmailSignInCard } from '@/components/account/email-sign-in-card';
import { useAccount } from '@/hooks/use-account';

export default function AccountProfileScreen() {
  const router = useRouter();
  const account = useAccount();

  const handleForgotPassword = useCallback(
    (email: string) => {
      router.push({
        pathname: '/auth/forgot-password',
        params: {
          email: email.trim(),
          source: 'profile',
        },
      });
    },
    [router],
  );

  const handleSignOut = useCallback(() => {
    void account.logout();
  }, [account]);

  const handleDeleteAccount = useCallback(() => {
    if (account.status === 'signingOut') {
      return;
    }

    router.push('/account/delete');
  }, [account.status, router]);

  if (account.isSignedIn || account.status === 'signingOut') {
    return (
      <AccountPlaceholderScreen
        description="You're signed in. Favorites and preferences are kept on this device while cloud sync is prepared."
        title="Profile"
      >
        <Text className="text-[15px] font-extrabold text-ink-primary">
          {account.displayName}
        </Text>
        <Text className="mt-1 text-[13px] font-semibold text-ink-secondary">
          {account.email}
        </Text>
        <Pressable
          accessibilityLabel="Sign out"
          accessibilityRole="button"
          className={`mt-5 min-h-12 items-center justify-center rounded-full ${
            account.status === 'signingOut'
              ? 'bg-surface-muted'
              : 'bg-accent-primary active:bg-accent-pressed'
          }`}
          disabled={account.status === 'signingOut'}
          onPress={handleSignOut}
          style={{ borderCurve: 'continuous' }}
        >
          <Text className="text-[15px] font-extrabold text-ink-on-accent">
            {account.status === 'signingOut' ? 'Signing out…' : 'Sign out'}
          </Text>
        </Pressable>
        <Text className="mt-3 text-[12px] font-semibold leading-5 text-ink-muted">
          Signing out keeps your favorites and preferences on this device.
          Nothing is deleted.
        </Text>
        {account.error ? (
          <Text
            accessibilityRole="alert"
            className="mt-3 text-[13px] font-semibold leading-5 text-feedback-error"
          >
            {account.error.message}
          </Text>
        ) : null}
        <View className="mt-7 border-t border-border-subtle pt-6">
          <Text className="text-[15px] font-extrabold text-feedback-error">
            Delete account
          </Text>
          <Text className="mt-2 text-[13px] font-semibold leading-5 text-ink-secondary">
            Permanently delete your account and associated server data. This
            action cannot be undone.
          </Text>
          <Pressable
            accessibilityHint="Opens the account deletion confirmation"
            accessibilityLabel="Delete account"
            accessibilityRole="button"
            className={`mt-4 min-h-12 items-center justify-center rounded-full border border-feedback-error ${
              account.status === 'signingOut'
                ? 'bg-feedback-error-soft opacity-60'
                : 'bg-feedback-error-soft active:bg-feedback-error-soft'
            }`}
            disabled={account.status === 'signingOut'}
            onPress={handleDeleteAccount}
            style={{ borderCurve: 'continuous' }}
          >
            <Text className="text-[15px] font-extrabold text-feedback-error">
              Delete account
            </Text>
          </Pressable>
        </View>
      </AccountPlaceholderScreen>
    );
  }

  return (
    <AccountPlaceholderScreen
      description="Sign in to use account features. The app remains anonymous-first, and parking stays available without an account."
      title="Profile"
    >
      <EmailSignInCard
        errorMessage={account.error?.message ?? null}
        loginWithEmailPassword={account.loginWithEmailPassword}
        onForgotPassword={handleForgotPassword}
        registerWithEmailPassword={account.registerWithEmailPassword}
      />
    </AccountPlaceholderScreen>
  );
}
