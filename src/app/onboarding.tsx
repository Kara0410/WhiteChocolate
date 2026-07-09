import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ComponentType,
} from 'react';
import { useRouter } from 'expo-router';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import {
  CarFront,
  Heart,
  LocateFixed,
  MapPin,
  MapPinned,
  Navigation,
  type LucideProps,
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useOnboarding } from '@/context/OnboardingContext';
import { useAccount } from '@/hooks/use-account';
import { useMapLocation } from '@/hooks/use-map-location';

type OnboardingStep = {
  id: 'welcome' | 'location' | 'account' | 'ready';
  title: string;
  subtitle: string;
  icon: ComponentType<LucideProps>;
};

type AccountMode = 'benefit' | 'login' | 'register';

const STEPS: OnboardingStep[] = [
  {
    id: 'welcome',
    title: 'Find parking faster in Munich',
    subtitle:
      'Search a destination, compare nearby public parking, and save your best spots.',
    icon: MapPinned,
  },
  {
    id: 'location',
    title: 'See parking near you',
    subtitle:
      'Allow location while using the app so ParkMunich can center the map and show nearby parking. You can still search manually.',
    icon: LocateFixed,
  },
  {
    id: 'account',
    title: 'Save your parking setup',
    subtitle:
      'Create a free account to keep favorites, vehicles, and preferences synced. Or continue as guest.',
    icon: Heart,
  },
  {
    id: 'ready',
    title: 'Ready to explore',
    subtitle:
      'Use ParkMunich as a guest, or create an account later to sync favorites and vehicles.',
    icon: Navigation,
  },
];

const SIGNED_IN_STEPS = STEPS.filter((step) => step.id !== 'account');
const INPUT_CLASS =
  'mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-[15px] font-semibold text-slate-900';

function StepIndicator({
  activeIndex,
  steps,
}: {
  activeIndex: number;
  steps: OnboardingStep[];
}) {
  return (
    <View className="mt-7 flex-row items-center justify-center gap-2">
      {steps.map((step, index) => (
        <View
          key={step.id}
          className={
            index === activeIndex
              ? 'h-2.5 w-8 rounded-full bg-blue-600'
              : 'h-2.5 w-2.5 rounded-full bg-slate-300'
          }
        />
      ))}
    </View>
  );
}

function FeatureIcons() {
  return (
    <View className="mt-8 flex-row justify-center gap-3">
      <View className="h-14 w-14 items-center justify-center rounded-[22px] bg-blue-50">
        <MapPin color="#2563EB" size={24} strokeWidth={2.5} />
      </View>
      <View className="h-14 w-14 items-center justify-center rounded-[22px] bg-rose-50">
        <Heart color="#E11D48" size={23} strokeWidth={2.5} />
      </View>
      <View className="h-14 w-14 items-center justify-center rounded-[22px] bg-amber-50">
        <CarFront color="#D97706" size={24} strokeWidth={2.5} />
      </View>
    </View>
  );
}

function PrimaryButton({
  disabled = false,
  isLoading = false,
  label,
  onPress,
}: {
  disabled?: boolean;
  isLoading?: boolean;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      className={`mt-8 min-h-14 flex-row items-center justify-center rounded-full px-5 ${
        disabled ? 'bg-blue-300' : 'bg-blue-600 active:bg-blue-700'
      }`}
      disabled={disabled}
      onPress={onPress}
      style={{ borderCurve: 'continuous' }}
    >
      {isLoading ? (
        <ActivityIndicator color="#FFFFFF" size="small" />
      ) : null}
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
  disabled = false,
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
      className="mt-4 min-h-11 items-center justify-center rounded-full px-4 active:bg-slate-100"
      disabled={disabled}
      onPress={onPress}
    >
      <Text
        className={`text-[14px] font-extrabold ${
          disabled ? 'text-slate-300' : 'text-slate-600'
        }`}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function BenefitLine({ children }: { children: string }) {
  return (
    <View className="flex-row items-center gap-3">
      <View className="h-2 w-2 rounded-full bg-blue-600" />
      <Text className="text-[13px] font-extrabold text-slate-700">
        {children}
      </Text>
    </View>
  );
}

export default function OnboardingScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const account = useAccount();
  const {
    completeOnboarding,
    markAccountSkipped,
    resetOnboardingForDev,
  } = useOnboarding();
  const {
    isLocationLoading,
    locationMessage,
    requestCurrentLocation,
  } = useMapLocation();
  const [activeIndex, setActiveIndex] = useState(0);
  const [shouldLocateOnEntry, setShouldLocateOnEntry] = useState(false);
  const [accountMode, setAccountMode] =
    useState<AccountMode>('benefit');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [localAccountError, setLocalAccountError] = useState<string | null>(
    null,
  );
  const [isSubmittingAccount, setIsSubmittingAccount] = useState(false);

  const steps = useMemo(
    () => (account.isSignedIn ? SIGNED_IN_STEPS : STEPS),
    [account.isSignedIn],
  );
  const stepIndex = Math.min(activeIndex, steps.length - 1);
  const step = steps[stepIndex];
  const StepIcon = step.icon;
  const isLocationStep = step.id === 'location';
  const isAccountStep = step.id === 'account';
  const isReadyStep = step.id === 'ready';

  useEffect(() => {
    setActiveIndex((current) => Math.min(current, steps.length - 1));
  }, [steps.length]);

  const enterApp = useCallback(() => {
    completeOnboarding();

    if (shouldLocateOnEntry) {
      router.replace({
        pathname: '/map',
        params: { locate: Date.now().toString() },
      });
      return;
    }

    router.replace('/map');
  }, [completeOnboarding, router, shouldLocateOnEntry]);

  const goNext = useCallback(() => {
    setActiveIndex((current) => Math.min(current + 1, steps.length - 1));
  }, [steps.length]);

  const requestLocationAndContinue = useCallback(async () => {
    if (isLocationLoading) {
      return;
    }

    const coordinates = await requestCurrentLocation();
    setShouldLocateOnEntry(coordinates !== null);
    goNext();
  }, [goNext, isLocationLoading, requestCurrentLocation]);

  const skipLocation = useCallback(() => {
    setShouldLocateOnEntry(false);
    goNext();
  }, [goNext]);

  const skipAccount = useCallback(() => {
    setLocalAccountError(null);
    markAccountSkipped();
    goNext();
  }, [goNext, markAccountSkipped]);

  const continueAsGuest = useCallback(() => {
    if (!account.isSignedIn) {
      markAccountSkipped();
    }

    setLocalAccountError(null);
    enterApp();
  }, [account.isSignedIn, enterApp, markAccountSkipped]);

  const submitAccount = useCallback(async () => {
    if (isSubmittingAccount) {
      return;
    }

    if (accountMode === 'register' && password !== confirmPassword) {
      setLocalAccountError('Passwords do not match.');
      return;
    }

    setIsSubmittingAccount(true);
    setLocalAccountError(null);

    try {
      const result =
        accountMode === 'register'
          ? await account.registerWithEmailPassword(email, password)
          : await account.loginWithEmailPassword(email, password);

      if (result.ok) {
        setPassword('');
        setConfirmPassword('');
        goNext();
      }
    } finally {
      setIsSubmittingAccount(false);
    }
  }, [
    account,
    accountMode,
    confirmPassword,
    email,
    goNext,
    isSubmittingAccount,
    password,
  ]);

  const switchAccountMode = useCallback((nextMode: AccountMode) => {
    setAccountMode(nextMode);
    setConfirmPassword('');
    setLocalAccountError(null);
  }, []);

  const primaryAction = useMemo(() => {
    if (isLocationStep) {
      return {
        disabled: isLocationLoading,
        isLoading: isLocationLoading,
        label: isLocationLoading ? 'Checking location' : 'Allow location',
        onPress: () => {
          void requestLocationAndContinue();
        },
      };
    }

    if (isReadyStep) {
      return {
        disabled: false,
        isLoading: false,
        label: 'Enter app',
        onPress: enterApp,
      };
    }

    return {
      disabled: false,
      isLoading: false,
      label: 'Get started',
      onPress: goNext,
    };
  }, [
    enterApp,
    goNext,
    isLocationLoading,
    isLocationStep,
    isReadyStep,
    requestLocationAndContinue,
  ]);

  const isPasswordMode =
    accountMode === 'login' || accountMode === 'register';
  const passwordsMatch = password === confirmPassword;
  const canSubmitAccount =
    !isSubmittingAccount &&
    email.trim().length > 0 &&
    password.length > 0 &&
    (accountMode !== 'register' ||
      (confirmPassword.length > 0 && passwordsMatch));

  return (
    <View className="flex-1 bg-slate-100">
      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          justifyContent: 'center',
          paddingBottom: Math.max(insets.bottom, 20) + 24,
          paddingHorizontal: 20,
          paddingTop: Math.max(insets.top, 20) + 24,
        }}
        showsVerticalScrollIndicator={false}
      >
        <View className="w-full max-w-[520px] self-center">
          <View
            key={step.id}
            className="rounded-[32px] border border-white/80 bg-white px-6 py-7"
            style={{
              borderCurve: 'continuous',
              boxShadow: '0 12px 30px rgba(15,23,42,0.09)',
            }}
          >
            <View className="self-start rounded-[26px] bg-blue-50 p-4">
              <StepIcon color="#2563EB" size={32} strokeWidth={2.4} />
            </View>

            {step.id === 'welcome' ? <FeatureIcons /> : null}

            <Text className="mt-8 text-[31px] font-black leading-[36px] text-slate-950">
              {step.title}
            </Text>
            <Text className="mt-3 text-[15px] font-semibold leading-6 text-slate-500">
              {step.subtitle}
            </Text>

            {isAccountStep ? (
              <>
                {account.loading ? (
                  <View className="mt-8 flex-row items-center gap-3 rounded-2xl bg-slate-100 px-4 py-3">
                    <ActivityIndicator color="#2563EB" size="small" />
                    <Text className="text-[13px] font-semibold text-slate-600">
                      Checking your account...
                    </Text>
                  </View>
                ) : null}

                {!account.loading && accountMode === 'benefit' ? (
                  <>
                    <View className="mt-6 gap-3">
                      <BenefitLine>Sync favorites</BenefitLine>
                      <BenefitLine>Save vehicles</BenefitLine>
                      <BenefitLine>
                        Restore data on a new phone later
                      </BenefitLine>
                    </View>
                    <PrimaryButton
                      label="Continue with email"
                      onPress={() => switchAccountMode('register')}
                    />
                    <SecondaryButton
                      label="Continue as guest"
                      onPress={skipAccount}
                    />
                    <Text className="mt-2 text-center text-[12px] font-semibold leading-5 text-slate-400">
                      Use email and password. No magic links or codes.
                    </Text>
                  </>
                ) : null}

                {!account.loading && isPasswordMode ? (
                  <>
                    <Text className="mt-6 text-[13px] font-extrabold text-slate-700">
                      {accountMode === 'register'
                        ? 'Create account'
                        : 'Sign in'}
                    </Text>
                    <TextInput
                      accessibilityLabel="Email address"
                      autoCapitalize="none"
                      autoComplete="email"
                      autoCorrect={false}
                      className={INPUT_CLASS}
                      editable={!isSubmittingAccount}
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
                      autoComplete={
                        accountMode === 'register'
                          ? 'new-password'
                          : 'current-password'
                      }
                      autoCorrect={false}
                      className={INPUT_CLASS}
                      editable={!isSubmittingAccount}
                      onChangeText={setPassword}
                      placeholder="Password"
                      placeholderTextColor="#94A3B8"
                      secureTextEntry
                      textContentType={
                        accountMode === 'register'
                          ? 'newPassword'
                          : 'password'
                      }
                      value={password}
                    />
                    {accountMode === 'register' ? (
                      <TextInput
                        accessibilityLabel="Confirm password"
                        autoCapitalize="none"
                        autoComplete="new-password"
                        autoCorrect={false}
                        className={INPUT_CLASS}
                        editable={!isSubmittingAccount}
                        onChangeText={setConfirmPassword}
                        placeholder="Confirm password"
                        placeholderTextColor="#94A3B8"
                        secureTextEntry
                        textContentType="newPassword"
                        value={confirmPassword}
                      />
                    ) : null}
                    {accountMode === 'register' &&
                    confirmPassword.length > 0 &&
                    !passwordsMatch ? (
                      <Text
                        accessibilityRole="alert"
                        className="mt-3 text-[13px] font-semibold leading-5 text-red-700"
                      >
                        Passwords do not match.
                      </Text>
                    ) : null}
                    <PrimaryButton
                      disabled={!canSubmitAccount}
                      isLoading={isSubmittingAccount}
                      label={
                        isSubmittingAccount
                          ? accountMode === 'register'
                            ? 'Creating account'
                            : 'Signing in'
                          : accountMode === 'register'
                            ? 'Create account'
                            : 'Sign in'
                      }
                      onPress={() => {
                        void submitAccount();
                      }}
                    />
                    <SecondaryButton
                      disabled={isSubmittingAccount}
                      label={
                        accountMode === 'register'
                          ? 'Already have an account? Sign in'
                          : 'New here? Create an account'
                      }
                      onPress={() =>
                        switchAccountMode(
                          accountMode === 'register' ? 'login' : 'register',
                        )
                      }
                    />
                    <SecondaryButton
                      disabled={isSubmittingAccount}
                      label="Continue as guest"
                      onPress={skipAccount}
                    />
                  </>
                ) : null}

                {localAccountError || account.error ? (
                  <Text
                    accessibilityRole="alert"
                    className="mt-3 text-[13px] font-semibold leading-5 text-red-700"
                  >
                    {localAccountError ?? account.error?.message}
                  </Text>
                ) : null}
              </>
            ) : null}

            {isLocationStep && locationMessage ? (
              <Text
                accessibilityRole="alert"
                className="mt-5 rounded-2xl bg-slate-100 px-4 py-3 text-[13px] font-semibold leading-5 text-slate-600"
              >
                {locationMessage}
              </Text>
            ) : null}

            {!isAccountStep ? (
              <PrimaryButton
                disabled={primaryAction.disabled}
                isLoading={primaryAction.isLoading}
                label={primaryAction.label}
                onPress={primaryAction.onPress}
              />
            ) : null}

            {isLocationStep ? (
              <SecondaryButton
                disabled={isLocationLoading}
                label="Not now"
                onPress={skipLocation}
              />
            ) : null}

            {isReadyStep ? (
              <SecondaryButton
                label="Set up my account later"
                onPress={continueAsGuest}
              />
            ) : null}

            {__DEV__ ? (
              <Pressable
                accessibilityLabel="Reset onboarding"
                accessibilityRole="button"
                className="mt-2 min-h-8 items-center justify-center"
                onPress={() => {
                  resetOnboardingForDev();
                  setActiveIndex(0);
                  setShouldLocateOnEntry(false);
                  setLocalAccountError(null);
                }}
              >
                <Text className="text-[11px] font-bold text-slate-300">
                  Reset onboarding
                </Text>
              </Pressable>
            ) : null}

            <StepIndicator activeIndex={stepIndex} steps={steps} />
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
