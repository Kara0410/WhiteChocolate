import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from 'react';
import { BackHandler } from 'react-native';
import { useRouter } from 'expo-router';

import { CreateAccountSheet } from '@/components/auth/CreateAccountSheet';
import { useAccount } from '@/hooks/use-account';

type CreateAccountSheetOptions = {
  origin?: string;
};

type AuthSheetContextValue = {
  isCreateAccountSheetVisible: boolean;
  showCreateAccountSheet: (options?: CreateAccountSheetOptions) => boolean;
  hideCreateAccountSheet: () => void;
};

const AuthSheetContext = createContext<AuthSheetContextValue | null>(null);

export function AuthSheetProvider({ children }: PropsWithChildren) {
  const router = useRouter();
  const account = useAccount();
  const [isCreateAccountSheetVisible, setIsCreateAccountSheetVisible] =
    useState(false);

  const hideCreateAccountSheet = useCallback(() => {
    setIsCreateAccountSheetVisible(false);
  }, []);

  const showCreateAccountSheet = useCallback(
    (options?: CreateAccountSheetOptions) => {
      if (account.loading || account.isSignedIn) {
        return false;
      }

      void options?.origin;
      setIsCreateAccountSheetVisible(true);
      return true;
    },
    [account.isSignedIn, account.loading],
  );

  const handleCreateAccount = useCallback(() => {
    hideCreateAccountSheet();
    router.push('/account/profile');
  }, [hideCreateAccountSheet, router]);

  useEffect(() => {
    if (account.isSignedIn && isCreateAccountSheetVisible) {
      hideCreateAccountSheet();
    }
  }, [
    account.isSignedIn,
    hideCreateAccountSheet,
    isCreateAccountSheetVisible,
  ]);

  useEffect(() => {
    const subscription = BackHandler.addEventListener(
      'hardwareBackPress',
      () => {
        if (!isCreateAccountSheetVisible) {
          return false;
        }

        hideCreateAccountSheet();
        return true;
      },
    );

    return () => subscription.remove();
  }, [hideCreateAccountSheet, isCreateAccountSheetVisible]);

  const value = useMemo(
    () => ({
      isCreateAccountSheetVisible,
      showCreateAccountSheet,
      hideCreateAccountSheet,
    }),
    [
      hideCreateAccountSheet,
      isCreateAccountSheetVisible,
      showCreateAccountSheet,
    ],
  );

  return (
    <AuthSheetContext.Provider value={value}>
      {children}
      <CreateAccountSheet
        isVisible={isCreateAccountSheetVisible}
        onClose={hideCreateAccountSheet}
        onCreateAccount={handleCreateAccount}
      />
    </AuthSheetContext.Provider>
  );
}

export function useAuthSheet() {
  const value = useContext(AuthSheetContext);

  if (value === null) {
    throw new Error('useAuthSheet must be used within AuthSheetProvider');
  }

  return value;
}
