import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentType,
} from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  ActivityIndicator,
  BackHandler,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import {
  ArrowLeft,
  Check,
  ChevronRight,
  Heart,
  Info,
  LocateFixed,
  LogIn,
  MapPin,
  MapPinned,
  Navigation,
  User,
  UserPlus,
  type LucideProps,
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { APP_DISPLAY_NAME } from '@/constants/app';
import { EmailSeparator } from '@/components/auth/EmailSeparator';
import { GoogleAuthButton } from '@/components/auth/GoogleAuthButton';
import { useOnboarding } from '@/context/OnboardingContext';
import { useAccount } from '@/hooks/use-account';
import { useMapLocation } from '@/hooks/use-map-location';
import {
  getBackNavigationDecision,
  getContinueWithoutLocationDecision,
  getNextOnboardingStep,
  getOnboardingStepIndex,
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
    title: 'Choose how to continue',
    subtitle: 'Select an option to continue setting up the app.',
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

function AccountPathOption({
  disabled = false,
  icon: Icon,
  label,
  onPress,
  variant = 'secondary',
}: {
  disabled?: boolean;
  icon: ComponentType<LucideProps>;
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'guest';
}) {
  const isPrimary = variant === 'primary';
  const isGuest = variant === 'guest';

  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      className={`min-h-[72px] flex-row items-center rounded-2xl border px-5 active:opacity-90 ${
        isPrimary
          ? 'border-blue-600 bg-blue-600 active:bg-blue-700'
          : isGuest
            ? 'border-slate-200 bg-slate-100 active:bg-slate-200'
            : 'border-slate-200 bg-white active:bg-slate-50'
      } ${disabled ? 'opacity-50' : ''}`}
      disabled={disabled}
      onPress={onPress}
      style={{ borderCurve: 'continuous' }}
    >
      <Icon
        color={isPrimary ? '#FFFFFF' : '#2563EB'}
        size={21}
        strokeWidth={2.5}
      />
      <Text
        className={`ml-4 flex-1 text-[16px] font-extrabold ${
          isPrimary ? 'text-white' : 'text-slate-900'
        }`}
      >
        {label}
      </Text>
      <ChevronRight
        color={isPrimary ? '#FFFFFF' : '#64748B'}
        size={21}
        strokeWidth={2.5}
      />
    </Pressable>
  );
}

type EmailAuthMode = Extract<AccountMode, 'login' | 'register'>;

type EmailAuthViewProps = {
  accountErrorMessage: string | null;
  authMode: EmailAuthMode;
  canSubmit: boolean;
  confirmPassword: string;
  email: string;
  hasAttemptedSubmit: boolean;
  isAccountOperationRunning: boolean;
  isGoogleAuthAvailable: boolean;
  isSubmittingAccount: boolean;
  isSubmittingGoogle: boolean;
  localAccountError: string | null;
  onChangeEmail: (value: string) => void;
  onChangePassword: (value: string) => void;
  onChangeConfirmPassword: (value: string) => void;
  onContinueWithGoogle: () => void;
  onForgotPassword: () => void;
  onSubmit: () => void;
  onSwitchMode: (mode: EmailAuthMode) => void;
  password: string;
  passwordsMatch: boolean;
  registrationNotice: string | null;
};

function GoogleAuthWebNotice() {
  return (
    <Text className="mt-6 rounded-2xl bg-slate-100 px-4 py-3 text-center text-[13px] font-semibold leading-5 text-slate-600">
      Google sign-in is available in the iOS and Android app.
    </Text>
  );
}

function EmailAuthView({
  accountErrorMessage,
  authMode,
  canSubmit,
  confirmPassword,
  email,
  hasAttemptedSubmit,
  isAccountOperationRunning,
  isGoogleAuthAvailable,
  isSubmittingAccount,
  isSubmittingGoogle,
  localAccountError,
  onChangeConfirmPassword,
  onChangeEmail,
  onChangePassword,
  onContinueWithGoogle,
  onForgotPassword,
  onSubmit,
  onSwitchMode,
  password,
  passwordsMatch,
  registrationNotice,
}: EmailAuthViewProps) {
  const isRegister = authMode === 'register';
  const visibleError =
    localAccountError ??
    (hasAttemptedSubmit ? accountErrorMessage : null);

  return (
    <>
      {isGoogleAuthAvailable ? (
        <GoogleAuthButton
          disabled={isAccountOperationRunning}
          isLoading={isSubmittingGoogle}
          mode={authMode}
          onPress={onContinueWithGoogle}
        />
      ) : (
        <GoogleAuthWebNotice />
      )}
      <EmailSeparator label="or continue with email" />
      <TextInput
        accessibilityLabel="Email address"
        autoCapitalize="none"
        autoComplete="email"
        autoCorrect={false}
        className={INPUT_CLASS}
        editable={!isAccountOperationRunning}
        inputMode="email"
        keyboardType="email-address"
        onChangeText={onChangeEmail}
        placeholder="you@example.com"
        placeholderTextColor="#94A3B8"
        textContentType="emailAddress"
        value={email}
      />
      <TextInput
        accessibilityLabel="Password"
        autoCapitalize="none"
        autoComplete={isRegister ? 'new-password' : 'current-password'}
        autoCorrect={false}
        className={INPUT_CLASS}
        editable={!isAccountOperationRunning}
        onChangeText={onChangePassword}
        placeholder="Password"
        placeholderTextColor="#94A3B8"
        secureTextEntry
        textContentType={isRegister ? 'newPassword' : 'password'}
        value={password}
      />
      {isRegister ? (
        <TextInput
          accessibilityLabel="Confirm password"
          autoCapitalize="none"
          autoComplete="new-password"
          autoCorrect={false}
          className={INPUT_CLASS}
          editable={!isAccountOperationRunning}
          onChangeText={onChangeConfirmPassword}
          placeholder="Confirm password"
          placeholderTextColor="#94A3B8"
          secureTextEntry
          textContentType="newPassword"
          value={confirmPassword}
        />
      ) : null}
      {!isRegister ? (
        <Pressable
          accessibilityLabel="Reset forgotten password"
          accessibilityRole="button"
          className="mt-2 min-h-11 self-end justify-center px-2 active:opacity-70"
          disabled={isAccountOperationRunning}
          onPress={onForgotPassword}
        >
          <Text className="text-[14px] font-extrabold text-blue-700">
            Forgot password?
          </Text>
        </Pressable>
      ) : null}
      {isRegister && confirmPassword.length > 0 && !passwordsMatch ? (
        <Text
          accessibilityRole="alert"
          className="mt-3 text-[13px] font-semibold leading-5 text-red-700"
        >
          Passwords do not match.
        </Text>
      ) : null}
      <PrimaryButton
        disabled={!canSubmit}
        isLoading={isSubmittingAccount}
        label={
          isSubmittingAccount
            ? isRegister
              ? 'Creating account'
              : 'Signing in'
            : isRegister
              ? 'Create account'
              : 'Log in'
        }
        onPress={onSubmit}
      />
      <SecondaryButton
        disabled={isAccountOperationRunning}
        label={
          isRegister
            ? 'Already have an account? Log in'
            : 'Don’t have an account? Register'
        }
        onPress={() => onSwitchMode(isRegister ? 'login' : 'register')}
      />
      {visibleError ? (
        <Text
          accessibilityRole="alert"
          className="mt-3 text-[13px] font-semibold leading-5 text-red-700"
        >
          {visibleError}
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
  );
}

function LoginView(props: Omit<EmailAuthViewProps, 'authMode'>) {
  return <EmailAuthView {...props} authMode="login" />;
}

function RegisterView(props: Omit<EmailAuthViewProps, 'authMode'>) {
  return <EmailAuthView {...props} authMode="register" />;
}

function AccountChoiceView({
  disabled,
  onLogin,
  onRegister,
  onGuest,
}: {
  disabled: boolean;
  onGuest: () => void;
  onLogin: () => void;
  onRegister: () => void;
}) {
  return (
    <View className="mt-8 gap-3">
      <AccountPathOption
        disabled={disabled}
        icon={LogIn}
        label="Log in"
        onPress={onLogin}
      />
      <AccountPathOption
        disabled={disabled}
        icon={UserPlus}
        label="Register"
        onPress={onRegister}
        variant="primary"
      />
      <AccountPathOption
        disabled={disabled}
        icon={User}
        label="Continue as guest"
        onPress={onGuest}
        variant="guest"
      />
    </View>
  );
}

const GUEST_CAPABILITIES = [
  'Search destinations and nearby parking',
  'View parking information',
  'Open navigation in your maps app',
] as const;

function GuestConfirmationView({
  isConfirming,
  onBackToChoices,
  onConfirm,
}: {
  isConfirming: boolean;
  onBackToChoices: () => void;
  onConfirm: () => void;
}) {
  return (
    <View className="mt-7">
      <View className="gap-3 rounded-2xl bg-slate-50 px-4 py-4">
        {GUEST_CAPABILITIES.map((capability) => (
          <View key={capability} className="flex-row items-start gap-3">
            <Check color="#2563EB" size={19} strokeWidth={2.7} />
            <Text className="flex-1 text-[14px] font-semibold leading-5 text-slate-700">
              {capability}
            </Text>
          </View>
        ))}
      </View>
      <Text className="mt-4 text-[13px] font-semibold leading-5 text-slate-500">
        Favorites and synced preferences require an account. You can register
        later from the app.
      </Text>
      <PrimaryButton
        disabled={isConfirming}
        isLoading={isConfirming}
        label={
          isConfirming ? 'Starting onboarding' : 'Start onboarding as guest'
        }
        onPress={onConfirm}
      />
      <SecondaryButton
        disabled={isConfirming}
        label="Choose another option"
        onPress={onBackToChoices}
      />
    </View>
  );
}

export default function OnboardingScreen() {
  const router = useRouter();
  const { accountMode: requestedAccountMode, step: requestedStep } =
    useLocalSearchParams<{
      accountMode?: string;
      step?: string;
    }>();
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
  const [activeStepId, setActiveStepId] =
    useState<OnboardingStepId>('welcome');
  const [shouldLocateOnEntry, setShouldLocateOnEntry] = useState(false);
  const [accountMode, setAccountMode] =
    useState<AccountMode>('choice');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [localAccountError, setLocalAccountError] = useState<string | null>(
    null,
  );
  const [hasAttemptedAccountSubmit, setHasAttemptedAccountSubmit] =
    useState(false);
  const [registrationNotice, setRegistrationNotice] = useState<string | null>(
    null,
  );
  const [isSubmittingAccount, setIsSubmittingAccount] = useState(false);
  const [isSubmittingGoogle, setIsSubmittingGoogle] = useState(false);
  const [isConfirmingGuest, setIsConfirmingGuest] = useState(false);
  const [isCompletingOnboarding, setIsCompletingOnboarding] =
    useState(false);
  const [completionError, setCompletionError] = useState<string | null>(
    null,
  );
  const accountPathSelectionRef = useRef(false);

  useEffect(() => {
    if (
      account.isSignedIn ||
      requestedStep !== 'account' ||
      requestedAccountMode !== 'login'
    ) {
      return;
    }

    setActiveStepId('account');
    setAccountMode('login');
    setPassword('');
    setConfirmPassword('');
    setLocalAccountError(null);
    setHasAttemptedAccountSubmit(false);
    setRegistrationNotice(null);
    setCompletionError(null);
  }, [
    account.isSignedIn,
    requestedAccountMode,
    requestedStep,
  ]);

  const steps = useMemo(
    () => (account.isSignedIn ? SIGNED_IN_STEPS : STEPS),
    [account.isSignedIn],
  );
  const visibleStepId =
    account.isSignedIn && activeStepId === 'account'
      ? 'ready'
      : activeStepId;
  const step =
    steps.find((candidate) => candidate.id === visibleStepId) ?? steps[0]!;
  const activeIndex = Math.max(
    0,
    getOnboardingStepIndex(visibleStepId, steps),
  );
  const StepIcon = step.icon;
  const isLocationStep = step.id === 'location';
  const isAccountStep = step.id === 'account';
  const isReadyStep = step.id === 'ready';
  const accountTitle =
    accountMode === 'register'
      ? 'Create your account'
      : accountMode === 'login'
        ? 'Welcome back'
        : accountMode === 'guest'
          ? 'Continue as guest'
        : step.title;
  const accountSubtitle =
    accountMode === 'register'
      ? 'Create your account with your email and password.'
      : accountMode === 'login'
        ? 'Sign in with your email and password to continue.'
        : accountMode === 'guest'
          ? 'Explore the app without creating an account.'
        : step.subtitle;
  const readySubtitle = account.isSignedIn
    ? 'Your setup is complete. Start exploring parking around Munich.'
    : `Start exploring as a guest. You can create an account later to save favorites and preferences.`;

  const isPasswordMode =
    accountMode === 'login' || accountMode === 'register';
  const isAccountOperationRunning =
    isSubmittingAccount ||
    isSubmittingGoogle ||
    account.status === 'signingIn';

  useEffect(() => {
    if (account.isSignedIn && activeStepId === 'account') {
      setActiveStepId('ready');
      setAccountMode('choice');
    }
  }, [account.isSignedIn, activeStepId]);

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

  const goToStep = useCallback(
    (stepId: OnboardingStepId) => {
      if (steps.some((candidate) => candidate.id === stepId)) {
        setActiveStepId(stepId);
      }
    },
    [steps],
  );

  const goNext = useCallback(() => {
    const nextStepId = getNextOnboardingStep(visibleStepId, steps);

    if (nextStepId !== null) {
      goToStep(nextStepId);
    }
  }, [goToStep, steps, visibleStepId]);

  const continueAfterLocation = useCallback(() => {
    goToStep(account.isSignedIn ? 'ready' : 'account');
  }, [account.isSignedIn, goToStep]);

  const continueAfterAccountDecision = useCallback(() => {
    setIsConfirmingGuest(false);
    goToStep('ready');
  }, [goToStep]);

  const requestLocationAndContinue = useCallback(async () => {
    if (isLocationLoading) {
      return;
    }

    const coordinates = await requestCurrentLocation();
    const decision = getRequestedLocationDecision(coordinates);
    setShouldLocateOnEntry(decision.shouldLocateOnEntry);

    if (decision.shouldAdvance) {
      continueAfterLocation();
    }
  }, [
    continueAfterLocation,
    isLocationLoading,
    requestCurrentLocation,
  ]);

  const skipLocation = useCallback(() => {
    const decision = getContinueWithoutLocationDecision();
    setShouldLocateOnEntry(decision.shouldLocateOnEntry);

    if (decision.shouldAdvance) {
      continueAfterLocation();
    }
  }, [continueAfterLocation]);

  const confirmGuest = useCallback(() => {
    if (
      isAccountOperationRunning ||
      isConfirmingGuest ||
      accountPathSelectionRef.current
    ) {
      return;
    }

    accountPathSelectionRef.current = true;
    setIsConfirmingGuest(true);
    setLocalAccountError(null);
    setPassword('');
    setConfirmPassword('');
    markAccountSkipped();
    continueAfterAccountDecision();
  }, [
    continueAfterAccountDecision,
    isAccountOperationRunning,
    isConfirmingGuest,
    markAccountSkipped,
  ]);

  const continueToReady = useCallback(() => {
    setPassword('');
    setConfirmPassword('');
    setLocalAccountError(null);
    setHasAttemptedAccountSubmit(false);
    setRegistrationNotice(null);
    setAccountMode('choice');
    goToStep('ready');
  }, [goToStep]);

  const submitAccount = useCallback(async () => {
    if (isSubmittingAccount || !isPasswordMode) {
      return;
    }

    if (accountMode === 'register' && password !== confirmPassword) {
      setLocalAccountError('Passwords do not match.');
      return;
    }

    setIsSubmittingAccount(true);
    setHasAttemptedAccountSubmit(true);
    setLocalAccountError(null);
    setRegistrationNotice(null);

    try {
      if (accountMode === 'register') {
        const result = await account.registerWithEmailPassword(
          email.trim(),
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
            `Account created for ${result.email}. Confirm your email before signing in.`,
          );
          setAccountMode('register');
          return;
        }

        continueToReady();
        return;
      }

      const result = await account.loginWithEmailPassword(
        email.trim(),
        password,
      );

      if (!result.ok) {
        setLocalAccountError(result.error.message);
        return;
      }

      continueToReady();
    } finally {
      setIsSubmittingAccount(false);
    }
  }, [
    account,
    accountMode,
    confirmPassword,
    continueToReady,
    email,
    isPasswordMode,
    isSubmittingAccount,
    password,
  ]);

  const continueWithGoogle = useCallback(async () => {
    if (
      !isPasswordMode ||
      isAccountOperationRunning ||
      isSubmittingGoogle
    ) {
      return;
    }

    setIsSubmittingGoogle(true);
    setHasAttemptedAccountSubmit(false);
    setLocalAccountError(null);
    setRegistrationNotice(null);

    try {
      const result = await account.continueWithGoogle();

      if (!result.ok) {
        if (result.error.code !== 'GOOGLE_AUTH_CANCELLED') {
          setLocalAccountError(result.error.message);
        }
        return;
      }

      continueToReady();
    } finally {
      setIsSubmittingGoogle(false);
    }
  }, [
    account,
    continueToReady,
    isAccountOperationRunning,
    isPasswordMode,
    isSubmittingGoogle,
  ]);

  const openForgotPassword = useCallback(() => {
    if (isAccountOperationRunning) {
      return;
    }

    const trimmedEmail = email.trim();
    router.push({
      pathname: '/auth/forgot-password',
      params: trimmedEmail
        ? { email: trimmedEmail, source: 'onboarding' }
        : { source: 'onboarding' },
    });
  }, [email, isAccountOperationRunning, router]);

  const switchAccountMode = useCallback((nextMode: AccountMode) => {
    setAccountMode(nextMode);
    setPassword('');
    setConfirmPassword('');
    setLocalAccountError(null);
    setHasAttemptedAccountSubmit(false);
    setRegistrationNotice(null);
    setIsConfirmingGuest(false);
    setCompletionError(null);
  }, []);

  const selectAccountPath = useCallback(
    (nextMode: AccountMode | 'guest') => {
      if (isAccountOperationRunning || accountPathSelectionRef.current) {
        return;
      }

      if (nextMode === 'login' || nextMode === 'register') {
        switchAccountMode(nextMode);
        return;
      }

      if (nextMode === 'guest') {
        switchAccountMode('guest');
      }
    },
    [isAccountOperationRunning, switchAccountMode],
  );
  const isBackDisabled =
    isLocationLoading ||
    isAccountOperationRunning ||
    isConfirmingGuest ||
    isCompletingOnboarding;
  const showBackButton =
    visibleStepId !== 'welcome' || (isAccountStep && accountMode !== 'choice');

  const goBack = useCallback(() => {
    if (isBackDisabled) {
      return false;
    }

    const decision = getBackNavigationDecision({
      accountMode,
      activeStepId: visibleStepId,
      steps,
    });

    if (decision.action === 'stay') {
      return false;
    }

    accountPathSelectionRef.current = false;
    switchAccountMode(decision.accountMode);
    setIsConfirmingGuest(false);
    setCompletionError(null);
    goToStep(decision.stepId);
    return true;
  }, [
    accountMode,
    goToStep,
    isBackDisabled,
    steps,
    switchAccountMode,
    visibleStepId,
  ]);

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
    !isAccountOperationRunning &&
    email.trim().length > 0 &&
    password.length > 0 &&
    (accountMode !== 'register' ||
      (confirmPassword.length > 0 && passwordsMatch));
  const emailAuthViewProps: Omit<EmailAuthViewProps, 'authMode'> = {
    accountErrorMessage: account.error?.message ?? null,
    canSubmit: canSubmitAccount,
    confirmPassword,
    email,
    hasAttemptedSubmit: hasAttemptedAccountSubmit,
    isAccountOperationRunning,
    isGoogleAuthAvailable: Platform.OS !== 'web',
    isSubmittingAccount,
    isSubmittingGoogle,
    localAccountError,
    onChangeConfirmPassword: setConfirmPassword,
    onChangeEmail: setEmail,
    onChangePassword: setPassword,
    onContinueWithGoogle: () => {
      void continueWithGoogle();
    },
    onForgotPassword: openForgotPassword,
    onSubmit: () => {
      void submitAccount();
    },
    onSwitchMode: (mode) => switchAccountMode(mode),
    password,
    passwordsMatch,
    registrationNotice,
  };

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
        keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View className="w-full max-w-[520px] self-center">
          <View
            key={step.id}
            className={`border border-white/80 bg-white ${
              isAccountStep && accountMode === 'choice'
                ? 'rounded-[36px] px-7 py-8 shadow-overlay'
                : 'rounded-[32px] px-6 py-7 shadow-overlay'
            }`}
            style={{ borderCurve: 'continuous' }}
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
                isAccountStep && accountMode === 'choice'
                  ? 'h-16 w-16 items-center justify-center self-start rounded-[24px] bg-blue-50'
                  : 'self-start rounded-[26px] bg-blue-50 p-4'
              }
            >
              {isAccountStep && accountMode === 'choice' ? (
                <User color="#2563EB" size={32} strokeWidth={2.4} />
              ) : (
                <StepIcon color="#2563EB" size={32} strokeWidth={2.4} />
              )}
            </View>

            {step.id === 'welcome' ? <FeatureIcons /> : null}

            <Text
              className={
                isAccountStep && accountMode === 'choice'
                  ? 'mt-6 text-[36px] font-black leading-[40px] tracking-[-1px] text-slate-950'
                  : 'mt-8 text-[31px] font-black leading-[36px] text-slate-950'
              }
            >
              {isAccountStep ? accountTitle : step.title}
            </Text>
            <Text
              className={
                isAccountStep && accountMode === 'choice'
                  ? 'mt-4 text-[17px] font-semibold leading-7 text-slate-500'
                  : 'mt-3 text-[15px] font-semibold leading-6 text-slate-500'
              }
            >
              {isAccountStep
                ? accountSubtitle
                : isReadyStep
                  ? readySubtitle
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

                {!account.loading && accountMode === 'choice' ? (
                  <AccountChoiceView
                    disabled={isAccountOperationRunning}
                    onGuest={() => selectAccountPath('guest')}
                    onLogin={() => selectAccountPath('login')}
                    onRegister={() => selectAccountPath('register')}
                  />
                ) : null}

                {!account.loading && accountMode === 'login' ? (
                  <LoginView {...emailAuthViewProps} />
                ) : null}

                {!account.loading && accountMode === 'register' ? (
                  <RegisterView {...emailAuthViewProps} />
                ) : null}

                {!account.loading && accountMode === 'guest' ? (
                  <GuestConfirmationView
                    isConfirming={isConfirmingGuest}
                    onBackToChoices={() => switchAccountMode('choice')}
                    onConfirm={confirmGuest}
                  />
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
                  accountPathSelectionRef.current = false;
                  setActiveStepId('welcome');
                  setShouldLocateOnEntry(false);
                  setLocalAccountError(null);
                  setHasAttemptedAccountSubmit(false);
                  setRegistrationNotice(null);
                  setCompletionError(null);
                }}
              >
                <Text className="text-[11px] font-bold text-slate-300">
                  Reset onboarding
                </Text>
              </Pressable>
            ) : null}

            <StepIndicator activeIndex={activeIndex} steps={steps} />
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
