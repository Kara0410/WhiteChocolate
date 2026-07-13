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
  BackHandler,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import {
  ArrowLeft,
  Heart,
  Info,
  LocateFixed,
  Lock,
  MapPin,
  MapPinned,
  Navigation,
  User,
  type LucideProps,
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { APP_DISPLAY_NAME } from '@/constants/app';
import { useOnboarding } from '@/context/OnboardingContext';
import { useAccount } from '@/hooks/use-account';
import { useMapLocation } from '@/hooks/use-map-location';
import {
  clampOnboardingIndex,
  getBackNavigationDecision,
  getContinueWithoutLocationDecision,
  getRequestedLocationDecision,
  type AccountMode,
  type OnboardingStepId,
} from '@/utils/onboarding-flow';

type OnboardingStep = {
  id: OnboardingStepId;
  title: string;
  subtitle: string;
  icon: ComponentType<LucideProps>;
};

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
      `Allow location while using the app so ${APP_DISPLAY_NAME} can center the map and show nearby parking. You can still search manually.`,
    icon: LocateFixed,
  },
  {
    id: 'account',
    title: 'Create a free account',
    subtitle:
      'Create an account to save favorites and keep parking preferences ready for future sync.',
    icon: User,
  },
  {
    id: 'ready',
    title: 'Ready to explore',
    subtitle:
      `Use ${APP_DISPLAY_NAME} as a guest, or create an account later to save favorites and preferences.`,
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
        <Info color="#D97706" size={24} strokeWidth={2.5} />
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

function AccountBenefitRow({
  icon: Icon,
  showDivider = true,
  subtitle,
  title,
}: {
  icon: ComponentType<LucideProps>;
  showDivider?: boolean;
  subtitle: string;
  title: string;
}) {
  return (
    <View
      className={`flex-row items-center py-4 ${
        showDivider ? 'border-b border-slate-200' : ''
      }`}
    >
      <View className="h-14 w-14 items-center justify-center rounded-2xl bg-blue-50">
        <Icon color="#2563EB" size={27} strokeWidth={2.4} />
      </View>
      <View className="ml-4 flex-1">
        <Text className="text-[16px] font-extrabold text-slate-950">
          {title}
        </Text>
        <Text className="mt-1 text-[14px] font-semibold leading-5 text-slate-500">
          {subtitle}
        </Text>
      </View>
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
  const [registrationNotice, setRegistrationNotice] = useState<string | null>(
    null,
  );
  const [isSubmittingAccount, setIsSubmittingAccount] = useState(false);
  const [isCompletingOnboarding, setIsCompletingOnboarding] =
    useState(false);
  const [completionError, setCompletionError] = useState<string | null>(
    null,
  );

  const steps = useMemo(
    () => (account.isSignedIn ? SIGNED_IN_STEPS : STEPS),
    [account.isSignedIn],
  );
  const stepIndex = clampOnboardingIndex(activeIndex, steps.length);
  const step = steps[stepIndex];
  const StepIcon = step.icon;
  const isLocationStep = step.id === 'location';
  const isAccountStep = step.id === 'account';
  const isReadyStep = step.id === 'ready';

  useEffect(() => {
    setActiveIndex((current) => clampOnboardingIndex(current, steps.length));
    setAccountMode('benefit');
  }, [steps.length]);

  const enterApp = useCallback(async () => {
    if (isCompletingOnboarding) {
      return;
    }

    setIsCompletingOnboarding(true);
    setCompletionError(null);

    const result = await completeOnboarding();

    if (!result.ok) {
      setCompletionError(
        'Your setup could not be saved. Please try again before entering the app.',
      );
      setIsCompletingOnboarding(false);
      return;
    }

    if (shouldLocateOnEntry) {
      router.replace({
        pathname: '/map',
        params: { locate: Date.now().toString() },
      });
      return;
    }

    router.replace('/map');
  }, [
    completeOnboarding,
    isCompletingOnboarding,
    router,
    shouldLocateOnEntry,
  ]);

  const goNext = useCallback(() => {
    setActiveIndex((current) => Math.min(current + 1, steps.length - 1));
  }, [steps.length]);

  const requestLocationAndContinue = useCallback(async () => {
    if (isLocationLoading) {
      return;
    }

    const coordinates = await requestCurrentLocation();
    const decision = getRequestedLocationDecision(coordinates);
    setShouldLocateOnEntry(decision.shouldLocateOnEntry);

    if (decision.shouldAdvance) {
      goNext();
    }
  }, [goNext, isLocationLoading, requestCurrentLocation]);

  const skipLocation = useCallback(() => {
    const decision = getContinueWithoutLocationDecision();
    setShouldLocateOnEntry(decision.shouldLocateOnEntry);

    if (decision.shouldAdvance) {
      goNext();
    }
  }, [goNext]);

  const skipAccount = useCallback(() => {
    setLocalAccountError(null);
    markAccountSkipped();
    goNext();
  }, [goNext, markAccountSkipped]);

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
    setRegistrationNotice(null);

    try {
      if (accountMode === 'register') {
        const result = await account.registerWithEmailPassword(
          email,
          password,
        );

        if (!result.ok) {
          setLocalAccountError(result.error.message);
          return;
        }

        if (result.status === 'confirmation-required') {
          setPassword('');
          setConfirmPassword('');
          setRegistrationNotice(
            `Account created for ${result.email}. Confirm your email before signing in, or continue as a guest for now.`,
          );
          setAccountMode('benefit');
          return;
        }

        setPassword('');
        setConfirmPassword('');
        goNext();
        return;
      }

      const result = await account.loginWithEmailPassword(email, password);

      if (!result.ok) {
        setLocalAccountError(result.error.message);
        return;
      }

      setPassword('');
      setConfirmPassword('');
      goNext();
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
    setRegistrationNotice(null);
  }, []);

  const isPasswordMode =
    accountMode === 'login' || accountMode === 'register';
  const isBackDisabled =
    isLocationLoading || isSubmittingAccount || isCompletingOnboarding;
  const showBackButton = stepIndex > 0 || isPasswordMode;

  const goBack = useCallback(() => {
    if (isBackDisabled) {
      return false;
    }

    const decision = getBackNavigationDecision({
      accountMode,
      activeIndex: stepIndex,
      steps,
    });

    if (decision.action === 'stay') {
      return false;
    }

    setAccountMode(decision.accountMode);
    setLocalAccountError(null);
    setRegistrationNotice(null);
    setCompletionError(null);
    setActiveIndex(decision.activeIndex);
    return true;
  }, [accountMode, isBackDisabled, stepIndex, steps]);

  useEffect(() => {
    const subscription = BackHandler.addEventListener(
      'hardwareBackPress',
      () => goBack(),
    );

    return () => {
      subscription.remove();
    };
  }, [goBack]);

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
        disabled: isCompletingOnboarding,
        isLoading: isCompletingOnboarding,
        label: isCompletingOnboarding ? 'Preparing app' : 'Enter app',
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
    isCompletingOnboarding,
    isLocationLoading,
    isLocationStep,
    isReadyStep,
    requestLocationAndContinue,
  ]);

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
          paddingTop: Math.max(insets.top, 16) + 16,
        }}
        showsVerticalScrollIndicator={false}
      >
        <View className="w-full max-w-[520px] self-center">
          <View
            key={step.id}
            className={`border border-white/80 bg-white ${
              isAccountStep && accountMode === 'benefit'
                ? 'rounded-[36px] px-7 py-8'
                : 'rounded-[32px] px-6 py-7'
            }`}
            style={{
              borderCurve: 'continuous',
              boxShadow: '0 12px 30px rgba(15,23,42,0.09)',
            }}
          >
            <View className="min-h-11 flex-row items-center">
              {showBackButton ? (
                <Pressable
                  accessibilityLabel="Go to previous onboarding step"
                  accessibilityRole="button"
                  className={`h-11 w-11 items-center justify-center rounded-full ${
                    isBackDisabled
                      ? 'bg-slate-100'
                      : 'bg-slate-100 active:bg-slate-200'
                  }`}
                  disabled={isBackDisabled}
                  onPress={goBack}
                >
                  <ArrowLeft
                    color={isBackDisabled ? '#CBD5E1' : '#475569'}
                    size={22}
                    strokeWidth={2.6}
                  />
                </Pressable>
              ) : null}
            </View>

            <View
              className={
                isAccountStep && accountMode === 'benefit'
                  ? 'h-20 w-20 items-center justify-center self-start rounded-[28px] bg-blue-50'
                  : 'self-start rounded-[26px] bg-blue-50 p-4'
              }
            >
              {isAccountStep && accountMode === 'benefit' ? (
                <User color="#2563EB" size={39} strokeWidth={2.4} />
              ) : (
                <StepIcon color="#2563EB" size={32} strokeWidth={2.4} />
              )}
            </View>

            {step.id === 'welcome' ? <FeatureIcons /> : null}

            <Text
              className={
                isAccountStep && accountMode === 'benefit'
                  ? 'mt-8 text-[38px] font-black leading-[42px] tracking-[-1px] text-slate-950'
                  : 'mt-8 text-[31px] font-black leading-[36px] text-slate-950'
              }
            >
              {isAccountStep && accountMode === 'benefit'
                ? 'Create a free account'
                : step.title}
            </Text>
            <Text
              className={
                isAccountStep && accountMode === 'benefit'
                  ? 'mt-4 text-[17px] font-semibold leading-7 text-slate-500'
                  : 'mt-3 text-[15px] font-semibold leading-6 text-slate-500'
              }
            >
              {isAccountStep && accountMode === 'benefit'
                ? 'Create an account with your email and password, or continue as a guest and sign up later.'
                : step.subtitle}
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
                    <View className="mt-8">
                      <AccountBenefitRow
                        icon={Heart}
                        subtitle="Keep your best parking spots in one place."
                        title="Save your favorites"
                      />
                      <AccountBenefitRow
                        icon={Info}
                        showDivider={false}
                        subtitle="Get details like prices, regulations, and availability where available."
                        title="See more parking info"
                      />
                    </View>
                    <Pressable
                      accessibilityRole="button"
                      className="mt-8 h-16 items-center justify-center rounded-2xl bg-blue-600 active:bg-blue-700"
                      onPress={() => switchAccountMode('register')}
                      style={{ borderCurve: 'continuous' }}
                    >
                      <Text className="text-[17px] font-extrabold text-white">
                        Create an account
                      </Text>
                    </Pressable>
                    <Pressable
                      accessibilityRole="button"
                      className="mt-3 h-14 items-center justify-center rounded-2xl bg-slate-100 active:bg-slate-200"
                      onPress={skipAccount}
                      style={{ borderCurve: 'continuous' }}
                    >
                      <Text className="text-[16px] font-extrabold text-slate-900">
                        Continue as guest
                      </Text>
                    </Pressable>
                    <View className="mt-5 flex-row items-start">
                      <Lock color="#94A3B8" size={18} strokeWidth={2.4} />
                      <Text className="ml-3 flex-1 text-[13px] font-semibold leading-5 text-slate-400">
                        Sign in with the same email and password when you want
                        to use account features.
                      </Text>
                    </View>
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
                {registrationNotice ? (
                  <Text
                    accessibilityRole="alert"
                    className="mt-3 rounded-2xl bg-blue-50 px-4 py-3 text-[13px] font-semibold leading-5 text-blue-800"
                  >
                    {registrationNotice}
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
                label="Continue without location"
                onPress={skipLocation}
              />
            ) : null}

            {isReadyStep && completionError ? (
              <Text
                accessibilityRole="alert"
                className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-[13px] font-semibold leading-5 text-red-700"
              >
                {completionError}
              </Text>
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
                  setRegistrationNotice(null);
                  setCompletionError(null);
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
