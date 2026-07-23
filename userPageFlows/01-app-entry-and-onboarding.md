# App Entry and Onboarding

## Flow 1: Launch and route protection

**Entry condition:** The user launches the app or opens its root route.

1. The app loads stored onboarding state and account state.
2. While onboarding state is loading, the user sees the onboarding loading screen. Authentication callback and password-recovery routes are allowed to remain visible during this check.
3. The app decides where to send the user:
   - Incomplete onboarding, missing state, malformed state, or an older onboarding version -> `/onboarding`.
   - Completed current-version onboarding -> `/map`.
   - An authentication or password-recovery deep link -> the matching unprotected auth page.

## Flow 2: Welcome step

**Entry condition:** Onboarding is required.

1. The user sees a white onboarding card with feature icons and the title `Find parking faster in Munich`.
2. Supporting copy explains that the app can search destinations, compare nearby public parking, and save spots.
3. The first progress indicator is active.
4. The user taps `Get started`.
5. The app advances to the location step.

**Back behavior:** There is no visible back button on the welcome step. Android hardware Back stays on this step.

## Flow 3: Allow location during onboarding

**Entry condition:** The user is on `See parking near you`.

1. The user sees an explanation that location centers the map and finds nearby parking, while manual search remains available.
2. The user taps `Allow location`.
3. The button changes to `Checking location` with a spinner and navigation controls are temporarily disabled.
4. The operating-system location request runs.
5. If usable coordinates are returned:
   - The app remembers that it should locate the user on first map entry.
   - A signed-out user advances to account choice.
   - A signed-in user skips account choice and advances to `Ready to explore`.
6. When onboarding finishes, the map opens with a `locate` request so the current position is focused.

**Failure/denial branch:**

- If no usable coordinates are returned, the user remains on the location step.
- A location status message appears inside a grey information panel.
- The user may try `Allow location` again or choose `Continue without location`.

## Flow 4: Continue without location

1. On the location step, the user taps `Continue without location`.
2. The app records that it should not locate the user on initial map entry.
3. The user advances to account choice, or directly to the ready step when already signed in.
4. After `Enter app`, the map opens in its default Munich view.

## Flow 5: Choose an account path

**Entry condition:** The user is signed out and reaches `Choose how to continue`.

The page shows three large choices:

- `Log in`
- `Register`
- `Continue as guest`

Account state may briefly show `Checking your account...` before these choices appear.

### Branch A: Log in

1. Tap `Log in`.
2. The title changes to `Welcome back`.
3. The user sees email and password fields, `Forgot password?`, a disabled-until-valid `Log in` button, and a link to switch to registration.
4. Native builds also show `Sign in with Google`; web shows a notice that Google sign-in is available in the iOS and Android app.
5. Enter email and password, then tap `Log in`.
6. The button shows `Signing in` while the request runs.
7. Success advances to `Ready to explore`.
8. Failure keeps the form visible and shows an error below it.

### Branch B: Register

1. Tap `Register`.
2. The title changes to `Create your account`.
3. The user sees email, password, and confirm-password fields plus a `Create account` button.
4. The button remains disabled until all fields are present and both passwords match.
5. If confirmation differs, `Passwords do not match.` appears.
6. Tap `Create account`; the button shows `Creating account`.
7. If the backend creates an immediately usable session, the app advances to the ready step.
8. If email confirmation is required, the user stays on the form and sees `Account created for [email]. Confirm your email before signing in.`
9. Backend validation or network failures appear as an inline error.

### Branch C: Continue as guest

1. Tap `Continue as guest`.
2. The title changes to `Continue as guest`.
3. The user sees a capability list: search destinations, view parking information, and open navigation in a maps app.
4. The page warns that favorites and synced preferences require an account.
5. Tap `Start onboarding as guest`.
6. The app marks the account step as skipped and advances to `Ready to explore`.
7. Tap `Choose another option` to return to the three account choices instead.

## Flow 6: Switch between login and registration

- From login, tap `Don’t have an account? Register`.
- From registration, tap `Already have an account? Log in`.
- Switching clears password, confirm-password, local error, registration notice, and submission state while keeping the email value.

## Flow 7: Back navigation inside onboarding

- Location -> Welcome.
- Account choice -> Location.
- Login/Register/Guest confirmation -> Account choice first.
- Ready -> Account choice for signed-out users, or Location for signed-in users.
- Controls are disabled during active location, account, guest-confirmation, or completion operations.

## Flow 8: Ready and enter the app

1. The user sees `Ready to explore`.
2. Signed-in copy says setup is complete; guest copy explains an account can be created later.
3. Tap `Enter app`.
4. The button changes to `Preparing app` while onboarding completion is saved.
5. Success opens `/map`.
6. If location was granted during onboarding, the map also receives a request to focus the current position.
7. If saving fails, the user remains here and sees `Your setup could not be saved. Please try again before entering the app.`

## Development-only reset

In development builds, `Reset onboarding` appears at the bottom of onboarding and as a floating button on the map. It clears the current onboarding progress and returns to the welcome step. This is not a production user flow.

