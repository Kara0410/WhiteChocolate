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
        <Text className="text-[15px] font-extrabold text-slate-900">
          {account.displayName}
        </Text>
        <Text className="mt-1 text-[13px] font-semibold text-slate-500">
          {account.email}
        </Text>
        <Pressable
          accessibilityLabel="Sign out"
          accessibilityRole="button"
          className={`mt-5 min-h-12 items-center justify-center rounded-full ${
            account.status === 'signingOut'
              ? 'bg-slate-300'
              : 'bg-slate-950 active:bg-slate-800'
          }`}
          disabled={account.status === 'signingOut'}
          onPress={handleSignOut}
          style={{ borderCurve: 'continuous' }}
        >
          <Text className="text-[15px] font-extrabold text-white">
            {account.status === 'signingOut' ? 'Signing out…' : 'Sign out'}
          </Text>
        </Pressable>
        <Text className="mt-3 text-[12px] font-semibold leading-5 text-slate-400">
          Signing out keeps your favorites and preferences on this device.
          Nothing is deleted.
        </Text>
        {account.error ? (
          <Text
            accessibilityRole="alert"
            className="mt-3 text-[13px] font-semibold leading-5 text-red-700"
          >
            {account.error.message}
          </Text>
        ) : null}
        <View className="mt-7 border-t border-slate-200 pt-6">
          <Text className="text-[15px] font-extrabold text-red-700">
            Delete account
          </Text>
          <Text className="mt-2 text-[13px] font-semibold leading-5 text-slate-500">
            Permanently delete your account and associated server data. This
            action cannot be undone.
          </Text>
          <Pressable
            accessibilityHint="Opens the account deletion confirmation"
            accessibilityLabel="Delete account"
            accessibilityRole="button"
            className={`mt-4 min-h-12 items-center justify-center rounded-full border border-red-300 ${
              account.status === 'signingOut'
                ? 'bg-red-100 opacity-60'
                : 'bg-red-50 active:bg-red-100'
            }`}
            disabled={account.status === 'signingOut'}
            onPress={handleDeleteAccount}
            style={{ borderCurve: 'continuous' }}
          >
            <Text className="text-[15px] font-extrabold text-red-700">
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
