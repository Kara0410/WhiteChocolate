# Account, Sign-In, and Registration

## Flow 1: Open `YOU`

1. Tap `YOU` in the bottom navigation.
2. Any map overlay closes.
3. `/account` opens with a `Back` pill, `You` heading, and `Profile, preferences, and account controls`.
4. While account state is loading, skeleton cards are shown.
5. If account refresh fails, an error panel with `Retry` appears.
6. Loaded content shows the profile header and sections for membership, app data, preferences, support, legal/about, and signed-in account actions.

Tap `Back` to return to router history, or to `/map` if there is no history.

## Flow 2: Anonymous account page

The profile header shows the anonymous display name, `Using without an account`, and `Free plan` or another membership status.

In `Account & membership`, the user sees:

- informational `Continue without account`,
- `Sign In / Sign Up`,
- disabled `Restore purchases` marked `Future`, and
- a disabled membership card whose button says `Coming later`.

Tap `Sign In / Sign Up` to open the `Create a free account` sheet described in the Favorites flow.

## Flow 3: Open email authentication from the account prompt

1. In `Create a free account`, tap `Sign In / Sign Up with email`.
2. The prompt closes.
3. `/account/profile` opens.
4. The page shows `Profile`, anonymous-first explanation, and a sign-in card.

## Flow 4: Sign in with email from Profile

1. The card starts in `Sign in with email` mode.
2. Enter email and password.
3. `Sign in` remains disabled until both values exist.
4. Tap `Sign in`.
5. The button changes to `Signing in...` and fields/actions are disabled.
6. Success changes Profile into its signed-in state.
7. Failure shows an inline error while keeping the form.
8. `Forgot password?` opens the password reset request flow and preserves the typed email.

## Flow 5: Register with email from Profile

1. Tap `New here? Create an account`.
2. The card changes to `Create an account` and adds Confirm password.
3. Enter email, password, and matching confirmation.
4. Mismatch displays `Passwords do not match.` and disables submission.
5. Tap `Create account`; the button changes to `Creating account...`.
6. Immediate-session success changes Profile into its signed-in state.
7. Confirmation-required success returns the card to login mode and shows `Account created for [email]. Confirm your email before signing in.`
8. Backend validation/network failure appears inline.
9. Tap `Already have an account? Sign in` to switch back.

## Flow 6: Signed-in account page

The profile header shows display name, email, avatar/initial, and membership label.

`Account & membership` includes:

- `Profile details` -> `/account/profile`,
- disabled restoration marked as future,
- `Sign out`, and
- disabled premium/membership purchase UI.

`Account actions` appears and contains `Delete account`.

## Flow 7: Signed-in Profile

1. Open `Profile details`.
2. The page shows name, email, signed-in explanation, `Sign out`, and `Delete account`.
3. Tap `Sign out`:
   - button changes to `Signing out...`,
   - success returns the profile to the anonymous sign-in card,
   - favorites and preferences remain on the device,
   - failure appears inline.
4. Tap `Delete account` to open the destructive deletion confirmation flow.

## Flow 8: Sign out from the main account page

1. Tap `Sign out` in `Account & membership`.
2. The logout request runs.
3. Success changes the account page to anonymous state.
4. The page states that favorites and preferences stay on the device; nothing is deleted.

## Authentication limitations visible to the user

- Google authentication is offered in native flows, not the web onboarding form.
- Signing in is optional for parking map and search.
- Favorites are currently gated behind sign-in.
- Premium purchasing and purchase restoration are not configured.
- Cloud sync is described as prepared/future; current favorites and preferences remain device-based.

