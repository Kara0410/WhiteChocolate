import { AccountPlaceholderScreen } from '@/components/account/account-placeholder-screen';
import { useAccount } from '@/hooks/use-account';

export default function AccountDeleteScreen() {
  const account = useAccount();

  return (
    <AccountPlaceholderScreen
      description={
        account.isSignedIn
          ? 'In-app account deletion is being built and will appear here. Signing out keeps your local data on this device and does not delete anything.'
          : 'No app account is connected. Account deletion will appear here when an account is connected.'
      }
      title="Data controls"
    />
  );
}
