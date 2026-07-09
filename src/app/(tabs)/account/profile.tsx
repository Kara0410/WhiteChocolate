import { useCallback } from 'react';
import { Text, Pressable } from 'react-native';

import { AccountPlaceholderScreen } from '@/components/account/account-placeholder-screen';
import { EmailSignInCard } from '@/components/account/email-sign-in-card';
import { useAccount } from '@/hooks/use-account';

export default function AccountProfileScreen() {
  const account = useAccount();

  const handleSignOut = useCallback(() => {
    void account.logout();
  }, [account]);

  if (account.isSignedIn || account.status === 'signingOut') {
    return (
      <AccountPlaceholderScreen
        description="You're signed in. Cloud sync for garage and favorites arrives in a later phase."
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
          Signing out keeps your garage, favorites, and preferences on this
          device. Nothing is deleted.
        </Text>
        {account.error ? (
          <Text
            accessibilityRole="alert"
            className="mt-3 text-[13px] font-semibold leading-5 text-red-700"
          >
            {account.error.message}
          </Text>
        ) : null}
      </AccountPlaceholderScreen>
    );
  }

  return (
    <AccountPlaceholderScreen
      description="Sign in to enable garage and favorites sync in a later phase. The app remains anonymous-first."
      title="Profile"
    >
      <EmailSignInCard
        errorMessage={account.error?.message ?? null}
        loginWithEmailPassword={account.loginWithEmailPassword}
        registerWithEmailPassword={account.registerWithEmailPassword}
      />
    </AccountPlaceholderScreen>
  );
}
